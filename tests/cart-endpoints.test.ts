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

  describe('addItems()', () => {
    it('sends the grouped product id and a quantity map, in shorthand form', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().addItems(100, { '101': 2, '102': 1 });

      expect(fetchMock.mock.calls).toHaveLength(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/cart/add-items');
      expect(opts.method).toBe('POST');

      const body = JSON.parse(opts.body as string);
      expect(body.id).toBe('100');
      expect(body.quantity).toEqual({ '101': '2', '102': '1' });
      expect(body.items).toBeUndefined();
    });

    it('accepts the full array form', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().addItems(100, [
        { id: 101, quantity: 2 },
        { id: 102, quantity: 1 },
      ]);

      const [, opts] = fetchMock.mock.calls[0];
      const body = JSON.parse(opts.body as string);
      expect(body.id).toBe('100');
      expect(body.quantity).toEqual({ '101': '2', '102': '1' });
    });

    it('throws without making a request when given no items', async () => {
      const fetchMock = mockFetch(200, {});
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await expect(client.cart().addItems(100, {})).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws without making a request when given an invalid grouped product id', async () => {
      const fetchMock = mockFetch(200, {});
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await expect(client.cart().addItems(-1, { '101': 1 })).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('updateCustomer()', () => {
    it('sends namespace, unprefixed billing, and s_-prefixed shipping mirrored from billing', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().updateCustomer({
        first_name: 'John',
        address_1: '123 Main St',
        country: 'US',
      });

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/cart/update');
      expect(opts.method).toBe('POST');

      const body = JSON.parse(opts.body as string);
      expect(body.namespace).toBe('update-customer');
      expect(body.first_name).toBe('John');
      expect(body.address_1).toBe('123 Main St');
      expect(body.country).toBe('US');
      // Mirrored into s_-prefixed shipping fields since no separate shipping was given
      expect(body.s_first_name).toBe('John');
      expect(body.s_address_1).toBe('123 Main St');
      expect(body.s_country).toBe('US');
      expect(body.ship_to_different_address).toBeUndefined();
    });

    it('sends a distinct s_-prefixed shipping address and sets ship_to_different_address', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().updateCustomer(
        { first_name: 'John', address_1: '123 Main St', country: 'US' },
        { first_name: 'Jane', address_1: '456 Oak Ave', country: 'CA' },
      );

      const [, opts] = fetchMock.mock.calls[0];
      const body = JSON.parse(opts.body as string);

      expect(body.first_name).toBe('John');
      expect(body.address_1).toBe('123 Main St');
      expect(body.s_first_name).toBe('Jane');
      expect(body.s_address_1).toBe('456 Oak Ave');
      expect(body.s_country).toBe('CA');
      expect(body.ship_to_different_address).toBe(true);
    });
  });

  describe('updateItem()', () => {
    it('allows quantity 0 (removes the item, per the API\'s own behavior) without throwing', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().updateItem('item_a', 0);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/cart/item/item_a');
      expect(JSON.parse(opts.body as string).quantity).toBe('0');
    });

    it('still rejects a negative quantity', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await expect(client.cart().updateItem('item_a', -1)).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('setShippingMethod()', () => {
    it('sends rate_id to cart/set-shipping-method', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().setShippingMethod('flat_rate:2');

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/cart/set-shipping-method');
      const body = JSON.parse(opts.body as string);
      expect(body.rate_id).toBe('flat_rate:2');
      expect(body.package_id).toBeUndefined();
    });

    it('includes package_id when provided', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().setShippingMethod('flat_rate:2', 'default');

      const [, opts] = fetchMock.mock.calls[0];
      const body = JSON.parse(opts.body as string);
      expect(body.rate_id).toBe('flat_rate:2');
      expect(body.package_id).toBe('default');
    });
  });

  describe('updateItems()', () => {
    it('issues one item/{key} request per entry, sequentially, in shorthand form', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      const response = await client.cart().updateItems({ item_a: 2, item_b: 5 });

      expect(fetchMock.mock.calls).toHaveLength(2);

      const [url1, opts1] = fetchMock.mock.calls[0];
      expect(url1).toContain('/cart/item/item_a');
      expect(JSON.parse(opts1.body as string).quantity).toBe('2');

      const [url2, opts2] = fetchMock.mock.calls[1];
      expect(url2).toContain('/cart/item/item_b');
      expect(JSON.parse(opts2.body as string).quantity).toBe('5');

      // Returns the last response, never posts to the namespace-dispatch-only cart/update.
      expect(response.get('cart_key')).toBe('ck_1');
      expect(fetchMock.mock.calls.every(([url]) => !String(url).endsWith('/cart/update'))).toBe(true);
    });

    it('accepts the full array form', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().updateItems([{ item_key: 'item_a', quantity: 3 }]);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/cart/item/item_a');
      expect(JSON.parse(opts.body as string).quantity).toBe('3');
    });

    it('throws without making a request when given no items', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await expect(client.cart().updateItems({})).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('removeItems()', () => {
    it('issues one DELETE item/{key} request per key, sequentially', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      const response = await client.cart().removeItems(['item_a', 'item_b']);

      expect(fetchMock.mock.calls).toHaveLength(2);

      const [url1, opts1] = fetchMock.mock.calls[0];
      expect(url1).toContain('/cart/item/item_a');
      expect(opts1.method).toBe('DELETE');

      const [url2, opts2] = fetchMock.mock.calls[1];
      expect(url2).toContain('/cart/item/item_b');
      expect(opts2.method).toBe('DELETE');

      expect(response.get('cart_key')).toBe('ck_1');
    });

    it('throws without making a request when given no item keys', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await expect(client.cart().removeItems([])).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('calculateShipping() (deprecated)', () => {
    it('delegates to calculate() against cart/calculate, ignoring the address', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().calculateShipping({ country: 'US', postcode: '90210' });

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/cart/calculate');
      expect(url).not.toContain('/cart/calculate/shipping');
      expect(opts.method).toBe('POST');
    });
  });

  describe('batch()', () => {
    it('posts once to cocart/batch with the requests array as the body', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      client.setAuth('user', 'pass');
      await client.batch([{ method: 'POST', path: '/cocart/v2/cart/item/item_a', body: { quantity: '2' } }]);

      expect(fetchMock.mock.calls).toHaveLength(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/cocart/batch');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body as string).requests).toHaveLength(1);
    });

    it('appends cart_key as a query param for guest customers', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_guest' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      client.setCartKey('ck_guest');
      await client.batch([{ method: 'GET', path: '/cocart/v2/cart' }]);

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('cart_key=ck_guest');
    });

    it('throws without making a request when given no sub-requests', async () => {
      const fetchMock = mockFetch(200, {});
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await expect(client.batch([])).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('surfaces rest_no_route as cocart_plugin_required', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        status: 404,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ code: 'rest_no_route', message: 'No route found' })),
      });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await expect(client.batch([{ method: 'GET', path: '/cocart/v2/cart' }])).rejects.toMatchObject({
        errorCode: 'cocart_plugin_required',
      });
    });
  });

  describe('batchUpdateItems() / batchRemoveItems()', () => {
    it('batchUpdateItems() issues one request total to cocart/batch, in shorthand form', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().batchUpdateItems({ item_a: 2, item_b: 5 });

      expect(fetchMock.mock.calls).toHaveLength(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/cocart/batch');
      const requests = JSON.parse(opts.body as string).requests;
      expect(requests).toHaveLength(2);
      expect(requests[0]).toMatchObject({ method: 'POST', path: '/cocart/v2/cart/item/item_a', body: { quantity: '2' } });
      expect(requests[1]).toMatchObject({ method: 'POST', path: '/cocart/v2/cart/item/item_b', body: { quantity: '5' } });
    });

    it('batchUpdateItems() throws without making a request when given no items', async () => {
      const fetchMock = mockFetch(200, {});
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await expect(client.cart().batchUpdateItems({})).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('batchRemoveItems() issues one request total to cocart/batch', async () => {
      const fetchMock = mockFetch(200, { cart_key: 'ck_1' });
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await client.cart().batchRemoveItems(['item_a', 'item_b']);

      expect(fetchMock.mock.calls).toHaveLength(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/cocart/batch');
      const requests = JSON.parse(opts.body as string).requests;
      expect(requests).toHaveLength(2);
      expect(requests[0]).toMatchObject({ method: 'DELETE', path: '/cocart/v2/cart/item/item_a' });
      expect(requests[1]).toMatchObject({ method: 'DELETE', path: '/cocart/v2/cart/item/item_b' });
    });

    it('batchRemoveItems() throws without making a request when given no item keys', async () => {
      const fetchMock = mockFetch(200, {});
      globalThis.fetch = fetchMock;

      const client = new CoCart('https://store.com');
      await expect(client.cart().batchRemoveItems([])).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
