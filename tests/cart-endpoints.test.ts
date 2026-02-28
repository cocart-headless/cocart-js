import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoCart } from '../src/cocart.js';

function mockFetch(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('Cart endpoint methods', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('create() sends POST to cart endpoint', async () => {
    const fetchMock = mockFetch(200, { cart_key: 'ck_new' });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    const response = await client.cart().create();

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/cart');
    expect(opts.method).toBe('POST');
    expect(response.get('cart_key')).toBe('ck_new');
  });

  it('getItems() sends GET to cart/items', async () => {
    const fetchMock = mockFetch(200, { items: [{ name: 'Widget' }] });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.cart().getItems();

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/cart/items');
    expect(opts.method).toBe('GET');
  });

  it('getItem() sends GET to cart/item/{key}', async () => {
    const fetchMock = mockFetch(200, { item_key: 'abc', name: 'Widget' });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.cart().getItem('abc');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/cart/item/abc');
    expect(opts.method).toBe('GET');
  });
});
