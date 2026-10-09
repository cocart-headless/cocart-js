import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoCart } from '../src/cocart.js';

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('CoCart Plus 2.0 routes', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('cart().getMini() reads cart/mini', async () => {
    const fetchMock = mockFetch(200, {});
    globalThis.fetch = fetchMock;

    await new CoCart('https://store.com').cart().getMini();

    expect(fetchMock.mock.calls[0][0]).toContain('/cocart/v2/cart/mini');
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('cart().removeCoupons() and removeAllItems() send DELETE to cart/coupons and cart/items', async () => {
    const fetchMock = mockFetch(200, {});
    globalThis.fetch = fetchMock;
    const cart = new CoCart('https://store.com').cart();

    await cart.removeCoupons();
    await cart.removeAllItems();

    expect(fetchMock.mock.calls.map(([url, opts]) => `${opts.method} ${new URL(url).pathname}`)).toEqual([
      'DELETE /wp-json/cocart/v2/cart/coupons',
      'DELETE /wp-json/cocart/v2/cart/items',
    ]);
  });

  it('applyCoupon() and checkCoupons() pass the email when given', async () => {
    const fetchMock = mockFetch(200, {});
    globalThis.fetch = fetchMock;
    const cart = new CoCart('https://store.com').cart();

    await cart.applyCoupon('vip', 'jane@example.com');
    await cart.checkCoupons('jane@example.com');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ code: 'vip', email: 'jane@example.com' });
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('email')).toBe('jane@example.com');
  });

  it('addFee() sends the amount as a string, and tax_class only when given', async () => {
    const fetchMock = mockFetch(200, {});
    globalThis.fetch = fetchMock;
    const cart = new CoCart('https://store.com').cart();

    await cart.addFee('Gift wrap', 2, true, 'reduced-rate');
    await cart.addFee('Handling', 1);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: 'Gift wrap', amount: '2', taxable: true, tax_class: 'reduced-rate' });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ name: 'Handling', amount: '1', taxable: false });
  });

  it('products().shippingRates() sends quantity and variation, without the cart key the route refuses', async () => {
    const fetchMock = mockFetch(200, { packages: {} });
    globalThis.fetch = fetchMock;
    const client = new CoCart('https://store.com', { cartKey: 't_guest' });

    await client.products().shippingRates(134, { quantity: 2, variation: { attribute_pa_color: 'blue' } });

    const [url, opts] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/wp-json/cocart/v2/products/134/shipping-rates');
    expect(parsed.searchParams.get('quantity')).toBe('2');
    expect(parsed.searchParams.get('variation[attribute_pa_color]')).toBe('blue');
    expect(parsed.searchParams.has('cart_key')).toBe(false);
    expect(opts.headers['Cart-Key']).toBeUndefined();
    // Other requests still carry the key.
    await client.cart().get();
    expect(fetchMock.mock.calls[1][1].headers['Cart-Key']).toBe('t_guest');
  });

  it('products().createReview() posts to products/reviews', async () => {
    const fetchMock = mockFetch(201, {});
    globalThis.fetch = fetchMock;

    await new CoCart('https://store.com').products().createReview({ product_id: 154, review: 'Warm.', rating: 5, reviewer: 'Jane', reviewer_email: 'jane@example.com' });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(`${opts.method} ${new URL(url).pathname}`).toBe('POST /wp-json/cocart/v2/products/reviews');
    expect(JSON.parse(opts.body)).toEqual({ product_id: 154, review: 'Warm.', rating: 5, reviewer: 'Jane', reviewer_email: 'jane@example.com' });
  });

  it('Response.getRateLimit() reads the RateLimit-* headers', async () => {
    globalThis.fetch = mockFetch(200, {}, { 'RateLimit-Limit': '25', 'RateLimit-Remaining': '24', 'RateLimit-Reset': '1791108883' });

    const res = await new CoCart('https://store.com').cart().get();

    expect(res.getRateLimit()).toEqual({ limit: 25, remaining: 24, reset: 1791108883, retryAfter: null });
  });
});
