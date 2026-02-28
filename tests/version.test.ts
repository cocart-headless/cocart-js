import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoCart } from '../src/cocart.js';
import { CoCartError } from '../src/exceptions/cocart-error.js';
import { VersionError } from '../src/exceptions/version-error.js';

// Helper to mock global fetch
function mockFetch(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('Legacy Plugin Support', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // --- Default main plugin ---

  describe('mainPlugin configuration', () => {
    it('defaults to basic', () => {
      const client = new CoCart('https://store.com');
      expect(client.getMainPlugin()).toBe('basic');
    });

    it('accepts mainPlugin option in constructor', () => {
      const client = new CoCart('https://store.com', { mainPlugin: 'legacy' });
      expect(client.getMainPlugin()).toBe('legacy');
    });

    it('setMainPlugin returns this for chaining', () => {
      const client = new CoCart('https://store.com');
      const result = client.setMainPlugin('legacy');
      expect(result).toBe(client);
      expect(client.getMainPlugin()).toBe('legacy');
    });
  });

  // --- VersionError ---

  describe('VersionError', () => {
    it('extends CoCartError', () => {
      const error = new VersionError('test()->method');
      expect(error).toBeInstanceOf(CoCartError);
    });

    it('message contains method name and CoCart Basic', () => {
      const error = new VersionError('products()->findBySlug');
      expect(error.message).toContain('products()->findBySlug');
      expect(error.message).toContain('CoCart Basic');
    });

    it('has cocart_version_required error code', () => {
      const error = new VersionError('test');
      expect(error.errorCode).toBe('cocart_version_required');
    });
  });

  // --- Basic-only guards throw on legacy ---

  describe('basic-only methods throw on legacy', () => {
    function createLegacyClient() {
      return new CoCart('https://store.com', { mainPlugin: 'legacy' });
    }

    it('cart().create() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.cart().create()).rejects.toThrow(VersionError);
    });

    it('products().findBySlug() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.products().findBySlug('test')).rejects.toThrow(VersionError);
    });

    it('products().variation() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.products().variation(1, 2)).rejects.toThrow(VersionError);
    });

    it('products().category() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.products().category(1)).rejects.toThrow(VersionError);
    });

    it('products().tag() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.products().tag(1)).rejects.toThrow(VersionError);
    });

    it('products().attributeBySlug() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.products().attributeBySlug('color')).rejects.toThrow(VersionError);
    });

    it('products().attributeTermsBySlug() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.products().attributeTermsBySlug('color')).rejects.toThrow(VersionError);
    });

    it('products().attributeTermBySlug() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.products().attributeTermBySlug('color', 'blue')).rejects.toThrow(VersionError);
    });

    it('products().brands() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.products().brands()).rejects.toThrow(VersionError);
    });

    it('products().brand() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.products().brand(1)).rejects.toThrow(VersionError);
    });

    it('products().byBrand() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.products().byBrand('nike')).rejects.toThrow(VersionError);
    });

    it('products().myReviews() throws VersionError', async () => {
      const client = createLegacyClient();
      await expect(client.products().myReviews()).rejects.toThrow(VersionError);
    });
  });

  // --- Methods that work on both versions ---

  describe('methods that work on legacy', () => {
    it('cart().get() works on legacy', async () => {
      globalThis.fetch = mockFetch(200, { items: [] });
      const client = new CoCart('https://store.com', { mainPlugin: 'legacy' });
      const response = await client.cart().get();
      expect(response.statusCode).toBe(200);
    });

    it('products().all() works on legacy', async () => {
      globalThis.fetch = mockFetch(200, []);
      const client = new CoCart('https://store.com', { mainPlugin: 'legacy' });
      const response = await client.products().all();
      expect(response.statusCode).toBe(200);
    });

    it('products().find() works on legacy', async () => {
      globalThis.fetch = mockFetch(200, { id: 1 });
      const client = new CoCart('https://store.com', { mainPlugin: 'legacy' });
      const response = await client.products().find(1);
      expect(response.statusCode).toBe(200);
    });

    it('products().categories() works on legacy', async () => {
      globalThis.fetch = mockFetch(200, []);
      const client = new CoCart('https://store.com', { mainPlugin: 'legacy' });
      const response = await client.products().categories();
      expect(response.statusCode).toBe(200);
    });

    it('products().tags() works on legacy', async () => {
      globalThis.fetch = mockFetch(200, []);
      const client = new CoCart('https://store.com', { mainPlugin: 'legacy' });
      const response = await client.products().tags();
      expect(response.statusCode).toBe(200);
    });
  });

  // --- Basic-only methods work on basic ---

  describe('basic-only methods work on basic', () => {
    it('cart().create() works on basic', async () => {
      globalThis.fetch = mockFetch(200, { cart_key: 'abc' });
      const client = new CoCart('https://store.com');
      const response = await client.cart().create();
      expect(response.statusCode).toBe(200);
    });

    it('products().findBySlug() works on basic', async () => {
      globalThis.fetch = mockFetch(200, { slug: 'test' });
      const client = new CoCart('https://store.com');
      const response = await client.products().findBySlug('test');
      expect(response.statusCode).toBe(200);
    });
  });

  // --- Field parameter normalization ---

  describe('field parameter normalization', () => {
    it('legacy converts _fields to fields', async () => {
      const fetchMock = mockFetch(200, { items: [] });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com', { mainPlugin: 'legacy' });
      await client.cart().get({ _fields: 'items,totals' });

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('fields=');
      expect(url).not.toContain('_fields=');
    });

    it('basic converts fields to _fields', async () => {
      const fetchMock = mockFetch(200, { items: [] });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().get({ fields: 'items,totals' });

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('_fields=');
      expect(url).not.toMatch(/[^_]fields=/);
    });
  });
});
