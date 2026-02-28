import { Response } from './response.js';
import { CoCartError } from './exceptions/cocart-error.js';
import { AuthenticationError } from './exceptions/authentication-error.js';
import { ValidationError } from './exceptions/validation-error.js';
import { VersionError } from './exceptions/version-error.js';
import { MemoryStorage } from './storage/memory-storage.js';
import type { StorageInterface } from './storage/storage.interface.js';
import type { CoCartOptions, AuthCredentials, CoCartEventMap, CoCartEventListener } from './cocart.types.js';
import { Cart } from './endpoints/cart.js';
import { Products } from './endpoints/products.js';
import { Store } from './endpoints/store.js';
import { Sessions } from './endpoints/sessions.js';
import { JwtManager } from './jwt-manager.js';

/**
 * CoCart TypeScript SDK
 *
 * A frontend TypeScript SDK for interacting with the CoCart REST API.
 * Supports both guest customers (via cart_key) and authenticated users
 * (via Basic Auth or JWT).
 */
export class CoCart {
  static readonly VERSION = '1.0.0';
  static readonly API_VERSION = 'v2';

  private storeUrl: string;
  private restPrefix: string = 'wp-json';
  private namespace: string = 'cocart';
  private storageKey: string = 'cocart_cart_key';
  private cartKey: string | null = null;
  private auth: AuthCredentials | null = null;
  private jwtToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private consumerKey: string | null = null;
  private consumerSecret: string | null = null;
  private maxRetries: number = 0;
  private timeout: number = 30_000;
  private customHeaders: Record<string, string> = {};
  private lastResponseValue: Response | null = null;
  private storage: StorageInterface;
  private debug: boolean = false;
  private authHeaderName: string = 'Authorization';
  private responseTransformer: ((response: Response) => Response) | null = null;
  private etagEnabled: boolean = true;
  private etagCache: Map<string, string> = new Map();
  private mainPlugin: 'basic' | 'legacy' = 'basic';

  // Event listeners
  private listeners: { [K in keyof CoCartEventMap]?: Set<CoCartEventListener<K>> } = {};

  // Lazy-loaded instances
  private jwtManagerInstance: JwtManager | null = null;
  private cartInstance: Cart | null = null;
  private productsInstance: Products | null = null;
  private storeInstance: Store | null = null;
  private sessionsInstance: Sessions | null = null;

  constructor(storeUrl: string, options: CoCartOptions = {}) {
    this.storeUrl = storeUrl.replace(/\/+$/, '');
    this.storage = options.storage ?? new MemoryStorage();

    if (options.cartKey) this.cartKey = options.cartKey;
    if (options.username && options.password) {
      this.auth = { username: options.username, password: options.password };
    }
    if (options.jwtToken) this.jwtToken = options.jwtToken;
    if (options.jwtRefreshToken) this.refreshTokenValue = options.jwtRefreshToken;
    if (options.consumerKey && options.consumerSecret) {
      this.consumerKey = options.consumerKey;
      this.consumerSecret = options.consumerSecret;
    }
    if (options.timeout !== undefined) this.timeout = options.timeout;
    if (options.restPrefix !== undefined) this.restPrefix = options.restPrefix.replace(/^\/+|\/+$/g, '');
    if (options.namespace !== undefined) this.namespace = options.namespace.replace(/^\/+|\/+$/g, '');
    if (options.headers) this.customHeaders = { ...options.headers };
    if (options.storageKey) this.storageKey = options.storageKey;
    if (options.maxRetries !== undefined) this.maxRetries = Math.max(0, options.maxRetries);
    if (options.debug !== undefined) this.debug = options.debug;
    if (options.authHeaderName) this.authHeaderName = options.authHeaderName;
    if (options.responseTransformer) this.responseTransformer = options.responseTransformer;
    if (options.etag !== undefined) this.etagEnabled = options.etag;
    if (options.mainPlugin) this.mainPlugin = options.mainPlugin;
  }

  /** Create a new instance with fluent interface. */
  static create(storeUrl: string): CoCart {
    return new CoCart(storeUrl);
  }

  /**
   * Restore the cart key from storage.
   * Call this once after construction if using async storage (e.g. EncryptedStorage).
   */
  async restoreSession(): Promise<void> {
    if (this.cartKey === null) {
      const stored = await this.storage.get(this.storageKey);
      if (stored) this.cartKey = stored;
    }
  }

  // --- Cart key ---

  setCartKey(cartKey: string): this {
    this.cartKey = cartKey;
    return this;
  }

  getCartKey(): string | null {
    return this.cartKey;
  }

  // --- Authentication ---

  setAuth(username: string, password: string): this {
    this.auth = { username, password };
    this.jwtToken = null;
    return this;
  }

  setJwtToken(token: string): this {
    this.jwtToken = token;
    this.auth = null;
    return this;
  }

  getJwtToken(): string | null {
    return this.jwtToken;
  }

  setRefreshToken(token: string): this {
    this.refreshTokenValue = token;
    return this;
  }

  getRefreshToken(): string | null {
    return this.refreshTokenValue;
  }

  hasJwtToken(): boolean {
    return this.jwtToken !== null && this.jwtToken !== '';
  }

  clearJwtToken(): this {
    this.jwtToken = null;
    this.refreshTokenValue = null;
    return this;
  }

  setWooCommerceCredentials(key: string, secret: string): this {
    this.consumerKey = key;
    this.consumerSecret = secret;
    return this;
  }

  // --- Configuration ---

  setTimeout(ms: number): this {
    this.timeout = ms;
    return this;
  }

  setMaxRetries(retries: number): this {
    this.maxRetries = Math.max(0, retries);
    return this;
  }

  setRestPrefix(prefix: string): this {
    this.restPrefix = prefix.replace(/^\/+|\/+$/g, '');
    return this;
  }

  getRestPrefix(): string {
    return this.restPrefix;
  }

  setNamespace(ns: string): this {
    this.namespace = ns.replace(/^\/+|\/+$/g, '');
    return this;
  }

  getNamespace(): string {
    return this.namespace;
  }

  addHeader(name: string, value: string): this {
    this.customHeaders[name] = value;
    return this;
  }

  setStorage(storage: StorageInterface): this {
    this.storage = storage;
    return this;
  }

  getStorage(): StorageInterface {
    return this.storage;
  }

  setDebug(enabled: boolean): this {
    this.debug = enabled;
    return this;
  }

  /** Set a custom authorization header name (default: 'Authorization'). */
  setAuthHeaderName(name: string): this {
    this.authHeaderName = name;
    return this;
  }

  /** Enable or disable ETag conditional requests. */
  setETag(enabled: boolean): this {
    this.etagEnabled = enabled;
    return this;
  }

  /** Clear the ETag cache, forcing fresh responses on subsequent GET requests. */
  clearETagCache(): this {
    this.etagCache.clear();
    return this;
  }

  /** Get the configured CoCart main plugin identifier. */
  getMainPlugin(): 'basic' | 'legacy' {
    return this.mainPlugin;
  }

  /** Set the CoCart main plugin identifier ('basic' or 'legacy'). */
  setMainPlugin(plugin: 'basic' | 'legacy'): this {
    this.mainPlugin = plugin;
    return this;
  }

  /**
   * Guard that throws if a method requires CoCart Basic but the SDK
   * is configured for the legacy plugin.
   */
  requiresBasic(method: string): void {
    if (this.mainPlugin === 'legacy') {
      throw new VersionError(method);
    }
  }

  /** Set a response transformer applied to every API response before returning. */
  setResponseTransformer(fn: ((response: Response) => Response) | null): this {
    this.responseTransformer = fn;
    return this;
  }

  // --- Events ---

  /**
   * Register an event listener.
   *
   * @example
   * client.on('request', ({ method, url }) => console.log(`→ ${method} ${url}`));
   * client.on('response', ({ status, url, duration }) => console.log(`← ${status} ${url} (${duration}ms)`));
   * client.on('error', ({ error }) => Sentry.captureException(error));
   * client.on('retry', ({ attempt, delay }) => console.log(`Retrying in ${delay}ms...`));
   */
  on<K extends keyof CoCartEventMap>(event: K, listener: CoCartEventListener<K>): this {
    if (!this.listeners[event]) {
      (this.listeners as Record<string, Set<unknown>>)[event] = new Set();
    }
    this.listeners[event]!.add(listener);
    return this;
  }

  /** Remove an event listener. */
  off<K extends keyof CoCartEventMap>(event: K, listener: CoCartEventListener<K>): this {
    this.listeners[event]?.delete(listener);
    return this;
  }

  /** Emit an event to all registered listeners. */
  private emit<K extends keyof CoCartEventMap>(event: K, data: CoCartEventMap[K]): void {
    if (this.debug) {
      this.logDebug(event, data);
    }
    if (this.listeners[event]) {
      for (const listener of this.listeners[event]!) {
        try {
          listener(data);
        } catch {
          // Swallow listener errors to avoid breaking the SDK flow
        }
      }
    }
  }

  private logDebug<K extends keyof CoCartEventMap>(event: K, data: CoCartEventMap[K]): void {
    const prefix = '[CoCart]';
    const d = data as Record<string, unknown>;
    switch (event) {
      case 'request':
        console.log(`${prefix} ${d['method']} ${d['url']}`);
        break;
      case 'response':
        console.log(`${prefix} ${d['method']} ${d['url']} → ${d['status']} (${d['duration']}ms)`);
        break;
      case 'error':
        console.error(`${prefix} ${d['method']} ${d['url']} → Error:`, d['error']);
        break;
      case 'retry':
        console.log(`${prefix} Retry ${d['attempt']}/${d['maxRetries']} after ${d['delay']}ms (${d['reason']})`);
        break;
      case 'auth:refresh':
        console.log(`${prefix} JWT token refresh ${d['success'] ? 'succeeded' : 'failed'}`);
        break;
    }
  }

  // --- Auth convenience ---

  /** Get or create the JWT Manager instance. */
  jwt(): JwtManager {
    if (this.jwtManagerInstance === null) {
      this.jwtManagerInstance = new JwtManager(this, this.storage, {
        autoRefresh: true,
      });
    }
    return this.jwtManagerInstance;
  }

  /**
   * Login with username and password via JWT authentication.
   *
   * Requires the CoCart JWT Authentication plugin to be installed.
   * Throws AuthenticationError if JWT tokens are not found in the response.
   */
  async login(username: string, password: string): Promise<Response> {
    return this.jwt().login(username, password);
  }

  /** Logout — call server logout endpoint, then clear local JWT tokens. */
  async logout(): Promise<this> {
    try {
      await this.post('logout');
    } catch {
      // Continue even if server call fails
    }
    await this.jwt().clearTokens();
    return this;
  }

  isAuthenticated(): boolean {
    return this.auth !== null || (this.jwtToken !== null && this.jwtToken !== '');
  }

  isGuest(): boolean {
    return !this.isAuthenticated();
  }

  /** Clear authentication and cart key. */
  async clearSession(): Promise<this> {
    this.auth = null;
    this.jwtToken = null;
    this.refreshTokenValue = null;
    this.cartKey = null;
    await this.storage.delete(this.storageKey);
    return this;
  }

  /** Transfer cart from guest to authenticated user. */
  async transferCartToCustomer(username: string, password: string): Promise<Response> {
    const guestCartKey = this.cartKey;
    this.setAuth(username, password);

    if (guestCartKey) {
      return this.cart().get({ cart_key: guestCartKey });
    }
    return this.cart().get();
  }

  // --- Endpoints (lazy-loaded) ---

  cart(): Cart {
    if (this.cartInstance === null) {
      this.cartInstance = new Cart(this);
    }
    return this.cartInstance;
  }

  products(): Products {
    if (this.productsInstance === null) {
      this.productsInstance = new Products(this);
    }
    return this.productsInstance;
  }

  store(): Store {
    if (this.storeInstance === null) {
      this.storeInstance = new Store(this);
    }
    return this.storeInstance;
  }

  sessions(): Sessions {
    if (this.sessionsInstance === null) {
      this.sessionsInstance = new Sessions(this);
    }
    return this.sessionsInstance;
  }

  // --- HTTP methods ---

  async get(endpoint: string, params?: Record<string, string>): Promise<Response> {
    return this.request('GET', endpoint, params);
  }

  async post(endpoint: string, data?: Record<string, unknown>, params?: Record<string, string>): Promise<Response> {
    return this.request('POST', endpoint, params, data);
  }

  async put(endpoint: string, data?: Record<string, unknown>, params?: Record<string, string>): Promise<Response> {
    return this.request('PUT', endpoint, params, data);
  }

  async delete(endpoint: string, params?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', endpoint, params);
  }

  /**
   * Make an HTTP request to the API.
   *
   * If a JwtManager with auto-refresh is attached and the request fails
   * with an authentication error, the token is refreshed and retried once.
   */
  async request(
    method: string,
    endpoint: string,
    params?: Record<string, string>,
    data?: Record<string, unknown> | null,
  ): Promise<Response> {
    try {
      return await this.executeRequest(method, endpoint, params, data);
    } catch (e) {
      if (
        e instanceof AuthenticationError &&
        this.jwtManagerInstance?.isAutoRefreshEnabled() &&
        this.refreshTokenValue !== null
      ) {
        try {
          await this.jwtManagerInstance.refresh();
          this.emit('auth:refresh', { success: true });
          return await this.executeRequest(method, endpoint, params, data);
        } catch {
          this.emit('auth:refresh', { success: false });
          throw e;
        }
      }
      throw e;
    }
  }

  /**
   * Make an HTTP request using a full REST route (relative to wp-json/).
   * Does NOT prepend the namespace/version prefix.
   */
  async requestRaw(
    method: string,
    route: string,
    params?: Record<string, string>,
    data?: Record<string, unknown> | null,
  ): Promise<Response> {
    let url = `${this.storeUrl}/${this.restPrefix}/${route.replace(/^\/+/, '')}`;

    if (params && Object.keys(params).length > 0) {
      url += '?' + new URLSearchParams(params).toString();
    }

    const headers = this.buildHeaders();
    const body = data ? JSON.stringify(data) : undefined;

    const fetchResponse = await this.fetchWithTimeout(method, url, headers, body);
    const responseBody = await fetchResponse.text();

    this.lastResponseValue = new Response(
      fetchResponse.status,
      fetchResponse.headers,
      responseBody,
    );

    await this.extractCartKeyFromHeaders(this.lastResponseValue);

    if (fetchResponse.status >= 400) {
      this.handleErrorResponse(this.lastResponseValue);
    }

    return this.applyTransformer(this.lastResponseValue);
  }

  getLastResponse(): Response | null {
    return this.lastResponseValue;
  }

  getStoreUrl(): string {
    return this.storeUrl;
  }

  // --- Internal ---

  private async executeRequest(
    method: string,
    endpoint: string,
    params?: Record<string, string>,
    data?: Record<string, unknown> | null,
  ): Promise<Response> {
    const url = this.buildUrl(endpoint, params);
    const headers = this.buildHeaders();
    const body = data ? JSON.stringify(data) : undefined;

    // ETag: add If-None-Match for GET requests
    if (method === 'GET' && this.etagEnabled && !params?.['_skip_cache']) {
      const cachedEtag = this.etagCache.get(url);
      if (cachedEtag) {
        headers['If-None-Match'] = cachedEtag;
      }
    }

    this.emit('request', { method, url, headers, body });

    let attempt = 0;
    const startTime = Date.now();

    while (true) {
      let fetchResponse: globalThis.Response;

      try {
        fetchResponse = await this.fetchWithTimeout(method, url, headers, body);
      } catch (e) {
        if (attempt < this.maxRetries && this.isTransientError(e)) {
          attempt++;
          const delay = this.getRetryDelay(attempt);
          this.emit('retry', { method, url, attempt, maxRetries: this.maxRetries, delay, reason: 'transient_error' });
          await this.retrySleep(attempt);
          continue;
        }
        const error = e instanceof CoCartError ? e : new CoCartError(
          e instanceof Error ? e.message : 'Network error',
          0,
          'network_error',
        );
        this.emit('error', { method, url, error });
        throw error;
      }

      const responseBody = await fetchResponse.text();
      const duration = Date.now() - startTime;

      this.lastResponseValue = new Response(
        fetchResponse.status,
        fetchResponse.headers,
        responseBody,
      );

      await this.extractCartKeyFromHeaders(this.lastResponseValue);

      // ETag: cache the ETag from the response
      if (method === 'GET' && this.etagEnabled) {
        const etag = this.lastResponseValue.getETag();
        if (etag) {
          this.etagCache.set(url, etag);
        }
      }

      // Retry on transient HTTP status codes (429, 503)
      if (attempt < this.maxRetries && this.isRetryableStatus(fetchResponse.status)) {
        attempt++;
        const delay = this.getRetryDelay(attempt, this.lastResponseValue);
        this.emit('retry', { method, url, attempt, maxRetries: this.maxRetries, delay, reason: `http_${fetchResponse.status}` });
        await this.retrySleep(attempt, this.lastResponseValue);
        continue;
      }

      if (fetchResponse.status >= 400) {
        this.emit('response', { method, url, status: fetchResponse.status, duration });
        this.handleErrorResponse(this.lastResponseValue, method, url);
      }

      this.emit('response', { method, url, status: fetchResponse.status, duration });
      return this.applyTransformer(this.lastResponseValue);
    }
  }

  private async fetchWithTimeout(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string,
  ): Promise<globalThis.Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      return await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new CoCartError(
          `Request timed out after ${this.timeout}ms`,
          0,
          'request_timeout',
        );
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const resolvedParams = { ...(params ?? {}) };

    // Add cart_key if set and not authenticated
    if (this.cartKey && !this.isAuthenticated()) {
      resolvedParams['cart_key'] = this.cartKey;
    }

    // Normalize field filtering parameter based on main plugin
    if (this.mainPlugin === 'legacy') {
      // Legacy plugin uses CoCart's custom 'fields' parameter
      if ('_fields' in resolvedParams && !('fields' in resolvedParams)) {
        resolvedParams['fields'] = resolvedParams['_fields'];
        delete resolvedParams['_fields'];
      }
    } else {
      // CoCart Basic uses WordPress standard '_fields'
      if ('fields' in resolvedParams && !('_fields' in resolvedParams)) {
        resolvedParams['_fields'] = resolvedParams['fields'];
        delete resolvedParams['fields'];
      }
    }

    let url = `${this.storeUrl}/${this.restPrefix}/${this.namespace}/${CoCart.API_VERSION}/${endpoint.replace(/^\/+/, '')}`;

    if (Object.keys(resolvedParams).length > 0) {
      url += '?' + new URLSearchParams(resolvedParams).toString();
    }

    return url;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': `CoCart-TS-SDK/${CoCart.VERSION}`,
    };

    // Authentication
    if (this.jwtToken) {
      headers[this.authHeaderName] = `Bearer ${this.jwtToken}`;
    } else if (this.auth) {
      headers[this.authHeaderName] = `Basic ${btoa(`${this.auth.username}:${this.auth.password}`)}`;
    } else if (this.consumerKey && this.consumerSecret) {
      headers[this.authHeaderName] = `Basic ${btoa(`${this.consumerKey}:${this.consumerSecret}`)}`;
    }

    // Cart key header
    if (this.cartKey && !this.isAuthenticated()) {
      headers['Cart-Key'] = this.cartKey;
    }

    return { ...headers, ...this.customHeaders };
  }

  private async extractCartKeyFromHeaders(response: Response): Promise<void> {
    const cartKey = response.getHeader('Cart-Key');
    if (cartKey !== null) {
      this.cartKey = cartKey;
      await this.storage.set(this.storageKey, cartKey);
    }
  }

  private handleErrorResponse(response: Response, method?: string, url?: string): never {
    const data = response.toObject() as Record<string, unknown>;
    const code = (data['code'] as string) ?? 'unknown_error';
    const apiMessage = (data['message'] as string) ?? 'An unknown error occurred';
    const httpCode = response.statusCode;

    // Build a contextual message: "POST /cart/add-item: Product not found [cocart_product_not_found]"
    const context = method && url ? `${method} ${url}: ` : '';
    const codeLabel = code !== 'unknown_error' ? ` [${code}]` : '';
    const message = `${context}${apiMessage}${codeLabel}`;

    // Authentication errors
    if (httpCode === 401 || httpCode === 403 || (typeof code === 'string' && code.includes('authenticat'))) {
      throw new AuthenticationError(message, httpCode, code, data);
    }

    // Validation errors
    if (httpCode === 400 || (typeof code === 'string' && (code.includes('invalid') || code.includes('missing')))) {
      throw new ValidationError(message, httpCode, code, data);
    }

    throw new CoCartError(message, httpCode, code, data);
  }

  private isTransientError(e: unknown): boolean {
    if (e instanceof CoCartError) {
      const msg = e.message.toLowerCase();
      return msg.includes('timeout') || msg.includes('timed out') || msg.includes('connection');
    }
    return false;
  }

  private isRetryableStatus(status: number): boolean {
    return status === 429 || status === 503;
  }

  private getRetryDelay(attempt: number, response?: Response): number {
    if (response) {
      const retryAfter = response.getHeader('Retry-After');
      if (retryAfter !== null && !isNaN(Number(retryAfter))) {
        return Math.min(Number(retryAfter), 60) * 1000;
      }
    }
    return Math.min(Math.pow(2, attempt - 1), 30) * 1000;
  }

  private async retrySleep(attempt: number, response?: Response): Promise<void> {
    // Honor Retry-After header
    if (response) {
      const retryAfter = response.getHeader('Retry-After');
      if (retryAfter !== null && !isNaN(Number(retryAfter))) {
        await this.sleep(Math.min(Number(retryAfter), 60) * 1000);
        return;
      }
    }

    // Exponential backoff: 1s, 2s, 4s, ...
    await this.sleep(Math.min(Math.pow(2, attempt - 1), 30) * 1000);
  }

  private applyTransformer(response: Response): Response {
    if (this.responseTransformer) {
      return this.responseTransformer(response);
    }
    return response;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
