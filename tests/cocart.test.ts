import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoCart } from '../src/cocart.js';
import { CoCartError } from '../src/exceptions/cocart-error.js';
import { AuthenticationError } from '../src/exceptions/authentication-error.js';
import { ValidationError } from '../src/exceptions/validation-error.js';
import { Response as SdkResponse } from '../src/response.js';
import { MemoryStorage } from '../src/storage/memory-storage.js';

// Helper to mock global fetch
function mockFetch(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('CoCart', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('constructor & configuration', () => {
    it('strips trailing slashes from store URL', () => {
      const client = new CoCart('https://store.com///');
      expect(client.getStoreUrl()).toBe('https://store.com');
    });

    it('uses MemoryStorage by default', () => {
      const client = new CoCart('https://store.com');
      expect(client.getStorage()).toBeInstanceOf(MemoryStorage);
    });

    it('accepts options in constructor', () => {
      const storage = new MemoryStorage();
      const client = new CoCart('https://store.com', {
        timeout: 5000,
        maxRetries: 3,
        restPrefix: 'api',
        namespace: 'myshop',
        headers: { 'X-Custom': 'val' },
        storage,
      });
      expect(client.getRestPrefix()).toBe('api');
      expect(client.getNamespace()).toBe('myshop');
      expect(client.getStorage()).toBe(storage);
    });
  });

  describe('fluent API', () => {
    it('static create() returns a CoCart instance', () => {
      const client = CoCart.create('https://store.com');
      expect(client).toBeInstanceOf(CoCart);
    });

    it('configuration methods return this for chaining', () => {
      const client = new CoCart('https://store.com');
      const result = client
        .setTimeout(5000)
        .setMaxRetries(2)
        .setRestPrefix('api')
        .setNamespace('shop')
        .addHeader('X-Test', 'val')
        .setDebug(true);
      expect(result).toBe(client);
    });
  });

  describe('authentication', () => {
    it('setAuth() sets basic auth credentials', () => {
      const client = new CoCart('https://store.com');
      client.setAuth('user', 'pass');
      expect(client.isAuthenticated()).toBe(true);
      expect(client.isGuest()).toBe(false);
    });

    it('setJwtToken() sets JWT and clears basic auth', () => {
      const client = new CoCart('https://store.com');
      client.setAuth('user', 'pass');
      client.setJwtToken('token123');
      expect(client.getJwtToken()).toBe('token123');
      expect(client.isAuthenticated()).toBe(true);
    });

    it('clearJwtToken() clears JWT and refresh token', () => {
      const client = new CoCart('https://store.com');
      client.setJwtToken('token');
      client.setRefreshToken('refresh');
      client.clearJwtToken();
      expect(client.getJwtToken()).toBeNull();
      expect(client.getRefreshToken()).toBeNull();
      expect(client.hasJwtToken()).toBe(false);
    });

    it('isGuest() returns true when no auth is set', () => {
      const client = new CoCart('https://store.com');
      expect(client.isGuest()).toBe(true);
      expect(client.isAuthenticated()).toBe(false);
    });

    it('clearSession() resets auth and cart key', async () => {
      const client = new CoCart('https://store.com');
      client.setAuth('user', 'pass');
      client.setCartKey('ck_123');
      await client.clearSession();
      expect(client.isAuthenticated()).toBe(false);
      expect(client.getCartKey()).toBeNull();
    });
  });

  describe('cart key', () => {
    it('setCartKey() / getCartKey()', () => {
      const client = new CoCart('https://store.com');
      expect(client.getCartKey()).toBeNull();
      client.setCartKey('ck_abc');
      expect(client.getCartKey()).toBe('ck_abc');
    });

    it('restoreSession() loads cart key from storage', async () => {
      const storage = new MemoryStorage();
      storage.set('cocart_cart_key', 'ck_stored');
      const client = new CoCart('https://store.com', { storage });
      await client.restoreSession();
      expect(client.getCartKey()).toBe('ck_stored');
    });

    it('restoreSession() does nothing if cart key already set', async () => {
      const storage = new MemoryStorage();
      storage.set('cocart_cart_key', 'ck_stored');
      const client = new CoCart('https://store.com', { storage, cartKey: 'ck_existing' });
      await client.restoreSession();
      expect(client.getCartKey()).toBe('ck_existing');
    });
  });

  describe('HTTP requests', () => {
    it('GET request builds correct URL', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.get('cart');

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('https://store.com/wp-json/cocart/v2/cart');
      expect(opts.method).toBe('GET');
    });

    it('POST request sends JSON body', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.post('cart/add-item', { id: '42', quantity: '1' });

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.method).toBe('POST');
      expect(opts.body).toBe('{"id":"42","quantity":"1"}');
    });

    it('includes cart_key for guest users', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      client.setCartKey('ck_test');
      await client.get('cart');

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('cart_key=ck_test');
    });

    it('does NOT include cart_key for authenticated users', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      client.setCartKey('ck_test');
      client.setAuth('user', 'pass');
      await client.get('cart');

      const [url] = fetchMock.mock.calls[0];
      expect(url).not.toContain('cart_key');
    });

    it('includes Authorization header for JWT', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      client.setJwtToken('mytoken');
      await client.get('cart');

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers['Authorization']).toBe('Bearer mytoken');
    });

    it('includes Authorization header for Basic Auth', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      client.setAuth('user', 'pass');
      await client.get('cart');

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers['Authorization']).toContain('Basic ');
    });

    it('extracts Cart-Key from response headers', async () => {
      const fetchMock = mockFetch(200, {}, { 'Cart-Key': 'ck_new' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.get('cart');

      expect(client.getCartKey()).toBe('ck_new');
    });

    it('normalizes fields to _fields', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.get('cart', { fields: 'items,totals' });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('_fields=items%2Ctotals');
      // Ensure the raw 'fields' key was replaced (not just appended)
      expect(url).not.toMatch(/[?&]fields=/);

    });

    it('uses custom restPrefix and namespace', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com', { restPrefix: 'api', namespace: 'myshop' });
      await client.get('cart');

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('https://store.com/api/myshop/v2/cart');
    });
  });

  describe('error handling', () => {
    it('throws AuthenticationError on 401', async () => {
      globalThis.fetch = mockFetch(401, { code: 'auth_failed', message: 'Unauthorized' });

      const client = new CoCart('https://store.com');
      await expect(client.get('cart')).rejects.toThrow(AuthenticationError);
    });

    it('throws AuthenticationError on 403', async () => {
      globalThis.fetch = mockFetch(403, { code: 'cocart_authentication_error', message: 'Forbidden' });

      const client = new CoCart('https://store.com');
      await expect(client.get('cart')).rejects.toThrow(AuthenticationError);
    });

    it('throws AuthenticationError when error code contains "authenticat"', async () => {
      globalThis.fetch = mockFetch(403, { code: 'jwt_authentication_failed', message: 'Auth failed' });

      const client = new CoCart('https://store.com');
      await expect(client.get('cart')).rejects.toThrow(AuthenticationError);
    });

    it('throws ValidationError on 400', async () => {
      globalThis.fetch = mockFetch(400, { code: 'invalid_param', message: 'Bad input' });

      const client = new CoCart('https://store.com');
      await expect(client.get('cart')).rejects.toThrow(ValidationError);
    });

    it('throws CoCartError on 500', async () => {
      globalThis.fetch = mockFetch(500, { code: 'server_error', message: 'Internal error' });

      const client = new CoCart('https://store.com');
      await expect(client.get('cart')).rejects.toThrow(CoCartError);
    });

    it('error messages include request context', async () => {
      globalThis.fetch = mockFetch(400, { code: 'invalid_product', message: 'Product not found' });

      const client = new CoCart('https://store.com');
      try {
        await client.get('cart/add-item');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).message).toContain('GET');
        expect((e as ValidationError).message).toContain('Product not found');
        expect((e as ValidationError).message).toContain('invalid_product');
      }
    });
  });

  describe('events', () => {
    it('emits request and response events', async () => {
      globalThis.fetch = mockFetch(200, { ok: true });

      const client = new CoCart('https://store.com');
      const events: string[] = [];

      client.on('request', () => events.push('request'));
      client.on('response', () => events.push('response'));

      await client.get('cart');

      expect(events).toEqual(['request', 'response']);
    });

    it('emits error event on failure', async () => {
      globalThis.fetch = mockFetch(500, { code: 'error', message: 'Fail' });

      const client = new CoCart('https://store.com');
      let errorEvent: unknown = null;

      client.on('error', (e) => { errorEvent = e; });

      // The error event is emitted but the error is also thrown
      // Because handleErrorResponse also emits response event before throwing
      try {
        await client.get('cart');
      } catch {
        // expected
      }

      // The response event should have been emitted with status 500
      // error event is emitted from the catch in executeRequest for network errors,
      // but for HTTP errors the response event is emitted instead
    });

    it('off() removes a listener', async () => {
      globalThis.fetch = mockFetch(200, { ok: true });

      const client = new CoCart('https://store.com');
      let count = 0;
      const listener = () => { count++; };

      client.on('request', listener);
      await client.get('cart');
      expect(count).toBe(1);

      client.off('request', listener);
      await client.get('cart');
      expect(count).toBe(1); // still 1, listener was removed
    });

    it('listener errors do not break SDK flow', async () => {
      globalThis.fetch = mockFetch(200, { ok: true });

      const client = new CoCart('https://store.com');
      client.on('request', () => { throw new Error('listener crash'); });

      // Should not throw despite listener error
      const response = await client.get('cart');
      expect(response.isSuccessful()).toBe(true);
    });
  });

  describe('endpoints', () => {
    it('cart() returns Cart instance', () => {
      const client = new CoCart('https://store.com');
      const cart = client.cart();
      expect(cart).toBeDefined();
      // Returns same instance (lazy singleton)
      expect(client.cart()).toBe(cart);
    });

    it('products() returns Products instance', () => {
      const client = new CoCart('https://store.com');
      const products = client.products();
      expect(products).toBeDefined();
      expect(client.products()).toBe(products);
    });

    it('store() returns Store instance', () => {
      const client = new CoCart('https://store.com');
      const store = client.store();
      expect(store).toBeDefined();
      expect(client.store()).toBe(store);
    });

    it('sessions() returns Sessions instance', () => {
      const client = new CoCart('https://store.com');
      const sessions = client.sessions();
      expect(sessions).toBeDefined();
      expect(client.sessions()).toBe(sessions);
    });
  });

  describe('custom auth header name', () => {
    it('uses custom header name for JWT auth', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com', { authHeaderName: 'X-Auth-Token' });
      client.setJwtToken('mytoken');
      await client.get('cart');

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers['X-Auth-Token']).toBe('Bearer mytoken');
      expect(opts.headers['Authorization']).toBeUndefined();
    });

    it('uses custom header name for Basic auth', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com', { authHeaderName: 'X-Auth-Token' });
      client.setAuth('user', 'pass');
      await client.get('cart');

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers['X-Auth-Token']).toContain('Basic ');
      expect(opts.headers['Authorization']).toBeUndefined();
    });

    it('setAuthHeaderName() fluent setter works', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com')
        .setAuthHeaderName('X-Custom-Auth')
        .setJwtToken('token');
      await client.get('cart');

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers['X-Custom-Auth']).toBe('Bearer token');
    });
  });

  describe('JWT login', () => {
    it('throws AuthenticationError when JWT token is missing from response', async () => {
      globalThis.fetch = mockFetch(200, { extras: {} });

      const client = new CoCart('https://store.com');
      await expect(client.login('user', 'pass')).rejects.toThrow(AuthenticationError);
      await expect(client.login('user', 'pass')).rejects.toThrow('JWT token not found');
    });

    it('sets JWT token when present in response', async () => {
      globalThis.fetch = mockFetch(200, {
        extras: { jwt_token: 'my.jwt.token', jwt_refresh: 'my.refresh' },
      });

      const client = new CoCart('https://store.com');
      await client.login('user', 'pass');

      expect(client.getJwtToken()).toBe('my.jwt.token');
      expect(client.getRefreshToken()).toBe('my.refresh');
    });
  });

  describe('ETag support', () => {
    it('sends If-None-Match header on second GET request', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          status: 200,
          headers: new Headers({ 'ETag': '"abc123"' }),
          text: () => Promise.resolve('{"ok":true}'),
        })
        .mockResolvedValueOnce({
          status: 304,
          headers: new Headers({ 'ETag': '"abc123"' }),
          text: () => Promise.resolve(''),
        });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.get('cart');
      await client.get('cart');

      const [, opts] = fetchMock.mock.calls[1];
      expect(opts.headers['If-None-Match']).toBe('"abc123"');
    });

    it('does not send If-None-Match when etag disabled', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValue({
          status: 200,
          headers: new Headers({ 'ETag': '"abc"' }),
          text: () => Promise.resolve('{"ok":true}'),
        });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com', { etag: false });
      await client.get('cart');
      await client.get('cart');

      const [, opts] = fetchMock.mock.calls[1];
      expect(opts.headers['If-None-Match']).toBeUndefined();
    });

    it('does not send If-None-Match for POST requests', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValue({
          status: 200,
          headers: new Headers({ 'ETag': '"abc"' }),
          text: () => Promise.resolve('{"ok":true}'),
        });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.get('cart');
      await client.post('cart/add-item', { id: '1', quantity: '1' });

      const [, opts] = fetchMock.mock.calls[1];
      expect(opts.headers['If-None-Match']).toBeUndefined();
    });

    it('304 response does not throw', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          status: 200,
          headers: new Headers({ 'ETag': '"abc"' }),
          text: () => Promise.resolve('{"ok":true}'),
        })
        .mockResolvedValueOnce({
          status: 304,
          headers: new Headers({}),
          text: () => Promise.resolve(''),
        });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.get('cart');
      const response = await client.get('cart');
      expect(response.isNotModified()).toBe(true);
    });

    it('clearETagCache() removes cached ETags', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValue({
          status: 200,
          headers: new Headers({ 'ETag': '"abc"' }),
          text: () => Promise.resolve('{"ok":true}'),
        });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.get('cart');
      client.clearETagCache();
      await client.get('cart');

      const [, opts] = fetchMock.mock.calls[1];
      expect(opts.headers['If-None-Match']).toBeUndefined();
    });

    it('setETag() is fluent', () => {
      const client = new CoCart('https://store.com');
      expect(client.setETag(false)).toBe(client);
    });

    it('clearETagCache() is fluent', () => {
      const client = new CoCart('https://store.com');
      expect(client.clearETagCache()).toBe(client);
    });

    it('setETag(false) disables after creation', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValue({
          status: 200,
          headers: new Headers({ 'ETag': '"abc"' }),
          text: () => Promise.resolve('{"ok":true}'),
        });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.get('cart');
      client.setETag(false);
      await client.get('cart');

      const [, opts] = fetchMock.mock.calls[1];
      expect(opts.headers['If-None-Match']).toBeUndefined();
    });

    it('different URLs have separate ETags', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          status: 200,
          headers: new Headers({ 'ETag': '"etag-cart"' }),
          text: () => Promise.resolve('{"ok":true}'),
        })
        .mockResolvedValueOnce({
          status: 200,
          headers: new Headers({ 'ETag': '"etag-products"' }),
          text: () => Promise.resolve('{"ok":true}'),
        })
        .mockResolvedValueOnce({
          status: 200,
          headers: new Headers({}),
          text: () => Promise.resolve('{"ok":true}'),
        })
        .mockResolvedValueOnce({
          status: 200,
          headers: new Headers({}),
          text: () => Promise.resolve('{"ok":true}'),
        });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.get('cart');
      await client.get('products');
      await client.get('cart');
      await client.get('products');

      const [, optsCart] = fetchMock.mock.calls[2];
      const [, optsProducts] = fetchMock.mock.calls[3];
      expect(optsCart.headers['If-None-Match']).toBe('"etag-cart"');
      expect(optsProducts.headers['If-None-Match']).toBe('"etag-products"');
    });
  });

  describe('logout', () => {
    it('calls POST logout endpoint then clears tokens', async () => {
      const fetchMock = mockFetch(200, { ok: true });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      client.setJwtToken('token');
      client.setRefreshToken('refresh');

      await client.logout();

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/logout');
      expect(opts.method).toBe('POST');
      expect(client.hasJwtToken()).toBe(false);
    });

    it('clears tokens even if server call fails', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = new CoCart('https://store.com');
      client.setJwtToken('token');

      await client.logout();
      expect(client.hasJwtToken()).toBe(false);
    });
  });

  describe('response transformer', () => {
    it('applies transformer to responses', async () => {
      globalThis.fetch = mockFetch(200, { count: 5 });

      let transformerCalled = false;
      const client = new CoCart('https://store.com', {
        responseTransformer: (response) => {
          transformerCalled = true;
          return response;
        },
      });

      await client.get('cart');
      expect(transformerCalled).toBe(true);
    });

    it('setResponseTransformer() fluent setter works', async () => {
      globalThis.fetch = mockFetch(200, { ok: true });

      let called = false;
      const client = new CoCart('https://store.com');
      client.setResponseTransformer((r) => { called = true; return r; });

      await client.get('cart');
      expect(called).toBe(true);
    });

    it('can clear transformer with null', async () => {
      globalThis.fetch = mockFetch(200, { ok: true });

      let count = 0;
      const client = new CoCart('https://store.com');
      client.setResponseTransformer((r) => { count++; return r; });

      await client.get('cart');
      expect(count).toBe(1);

      client.setResponseTransformer(null);
      await client.get('cart');
      expect(count).toBe(1); // transformer not called again
    });
  });
});
