import type { CoCart } from './cocart.js';
import type { Response } from './response.js';
import type { StorageInterface } from './storage/storage.interface.js';
import type { JwtOptions } from './cocart.types.js';
import { AuthenticationError } from './exceptions/authentication-error.js';

/**
 * JWT Manager
 *
 * Handles JWT token lifecycle: acquisition via login, refresh, validation,
 * and optional persistence using a storage adapter.
 */
export class JwtManager {
  private client: CoCart;
  private storage: StorageInterface | null;
  private tokenStorageKey: string = 'cocart_jwt_token';
  private refreshTokenStorageKey: string = 'cocart_jwt_refresh_token';
  private autoRefresh: boolean = false;
  private isRefreshing: boolean = false;

  constructor(
    client: CoCart,
    storage: StorageInterface | null = null,
    options: JwtOptions = {},
  ) {
    this.client = client;
    this.storage = storage;

    if (options.autoRefresh !== undefined) this.autoRefresh = options.autoRefresh;
    if (options.tokenStorageKey) this.tokenStorageKey = options.tokenStorageKey;
    if (options.refreshTokenStorageKey) this.refreshTokenStorageKey = options.refreshTokenStorageKey;
  }

  /**
   * Restore tokens from storage into the client.
   * Call this once after construction if using async storage.
   */
  async restoreTokensFromStorage(): Promise<void> {
    if (!this.storage) return;

    const storedToken = await this.storage.get(this.tokenStorageKey);
    const storedRefresh = await this.storage.get(this.refreshTokenStorageKey);

    if (storedToken) this.client.setJwtToken(storedToken);
    if (storedRefresh) this.client.setRefreshToken(storedRefresh);
  }

  /**
   * Login with username and password to acquire JWT tokens.
   *
   * Requires the CoCart JWT Authentication plugin. Throws an
   * AuthenticationError if the plugin is not installed.
   */
  async login(username: string, password: string): Promise<Response> {
    const response = await this.client.post('login', {
      username,
      password,
    });

    const data = response.toObject() as Record<string, unknown>;
    const extras = data['extras'] as Record<string, unknown> | undefined;
    const jwtToken = extras?.['jwt_token'] as string | undefined;
    const refreshToken = extras?.['jwt_refresh'] as string | undefined;

    if (jwtToken) {
      this.client.setJwtToken(jwtToken);
      if (refreshToken) {
        this.client.setRefreshToken(refreshToken);
      }
      await this.persistTokens();
    } else {
      throw new AuthenticationError(
        'JWT token not found in login response. Is the CoCart JWT Authentication plugin installed?',
        0,
        'cocart_jwt_missing',
      );
    }

    return response;
  }

  /**
   * Refresh the JWT access token using the refresh token.
   */
  async refresh(refreshToken?: string): Promise<Response> {
    const token = refreshToken ?? this.client.getRefreshToken();

    if (!token) {
      throw new AuthenticationError(
        'No refresh token available. Please login first.',
        0,
        'cocart_jwt_no_refresh_token',
      );
    }

    const route = `${this.client.getNamespace()}/jwt/refresh-token`;
    const response = await this.client.requestRaw('POST', route, undefined, {
      refresh_token: token,
    });

    const data = response.toObject() as Record<string, unknown>;
    const newToken = data['token'] as string | undefined;
    const newRefreshToken = data['refresh_token'] as string | undefined;

    if (newToken) this.client.setJwtToken(newToken);
    if (newRefreshToken) this.client.setRefreshToken(newRefreshToken);

    await this.persistTokens();

    return response;
  }

  /**
   * Validate the current JWT token with the server.
   */
  async validate(): Promise<boolean> {
    if (!this.client.hasJwtToken()) return false;

    try {
      const route = `${this.client.getNamespace()}/jwt/validate-token`;
      const response = await this.client.requestRaw('POST', route);
      return response.isSuccessful();
    } catch (e) {
      if (e instanceof AuthenticationError) return false;
      throw e;
    }
  }

  /**
   * Execute a callback with automatic token refresh on authentication error.
   */
  async withAutoRefresh<T>(callback: (client: CoCart) => Promise<T>): Promise<T> {
    try {
      return await callback(this.client);
    } catch (e) {
      if (e instanceof AuthenticationError && !this.isRefreshing && this.client.getRefreshToken()) {
        this.isRefreshing = true;
        try {
          await this.refresh();
          const result = await callback(this.client);
          return result;
        } catch {
          throw e;
        } finally {
          this.isRefreshing = false;
        }
      }
      throw e;
    }
  }

  /** Clear all JWT tokens from client and storage. */
  async clearTokens(): Promise<this> {
    this.client.clearJwtToken();
    if (this.storage) {
      await this.storage.delete(this.tokenStorageKey);
      await this.storage.delete(this.refreshTokenStorageKey);
    }
    return this;
  }

  /** Check if tokens are available. */
  hasTokens(): boolean {
    return this.client.hasJwtToken();
  }

  /**
   * Check if the current JWT token is expired by decoding its payload.
   *
   * @param leeway Seconds of leeway before actual expiry (default: 30)
   */
  isTokenExpired(leeway: number = 30): boolean {
    const token = this.client.getJwtToken();
    if (!token) return true;

    const payload = this.decodeTokenPayload(token);
    if (!payload) return true;
    if (!payload['exp']) return false;

    return Date.now() / 1000 >= (payload['exp'] as number) - leeway;
  }

  /** Get the expiry timestamp of the current JWT token. */
  getTokenExpiry(): number | null {
    const token = this.client.getJwtToken();
    if (!token) return null;

    const payload = this.decodeTokenPayload(token);
    return (payload?.['exp'] as number) ?? null;
  }

  setAutoRefresh(enabled: boolean): this {
    this.autoRefresh = enabled;
    return this;
  }

  isAutoRefreshEnabled(): boolean {
    return this.autoRefresh;
  }

  getClient(): CoCart {
    return this.client;
  }

  // --- Internal ---

  /**
   * Decode the payload section of a JWT token without verification.
   */
  private decodeTokenPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    try {
      const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  private async persistTokens(): Promise<void> {
    if (!this.storage) return;

    const token = this.client.getJwtToken();
    const refreshToken = this.client.getRefreshToken();

    if (token) await this.storage.set(this.tokenStorageKey, token);
    if (refreshToken) await this.storage.set(this.refreshTokenStorageKey, refreshToken);
  }
}
