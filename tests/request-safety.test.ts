import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoCart } from '../src/cocart.js';
import { CoCartError } from '../src/exceptions/cocart-error.js';

function mockFetch(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('request safety and coupon parameters', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('applyCoupon() sends the coupon as `code`, the parameter CoCart Plus requires', async () => {
    const fetchMock = mockFetch(200, { coupons: [] });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.cart().applyCoupon('save10');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/cart/apply-coupon');
    expect(JSON.parse(opts.body)).toEqual({ code: 'save10' });
  });

  it('removeCoupon() encodes the code in the path', async () => {
    const fetchMock = mockFetch(200, { coupons: [] });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    for (const code of ['summer sale', '10%off', 'a#b?c', 'café']) {
      await client.cart().removeCoupon(code);
    }

    const paths = fetchMock.mock.calls.map(([url]) => new URL(url as string).pathname);
    expect(paths).toEqual([
      '/wp-json/cocart/v2/cart/coupons/summer%20sale',
      '/wp-json/cocart/v2/cart/coupons/10%25off',
      '/wp-json/cocart/v2/cart/coupons/a%23b%3Fc',
      '/wp-json/cocart/v2/cart/coupons/caf%C3%A9',
    ]);
    expect(fetchMock.mock.calls.every(([, opts]) => opts.method === 'DELETE')).toBe(true);
  });

  it('error messages name the route but never include the query string (cart key, API credentials)', async () => {
    globalThis.fetch = mockFetch(400, {
      code: 'cocart_coupon_invalid',
      message: 'Coupon is not valid.',
      data: { status: 400 },
    });

    const client = new CoCart('https://store.com', {
      cartKey: 't_secret_cart_key',
      consumerKey: 'ck_live_secret',
      consumerSecret: 'cs_live_secret',
    });

    const err = await client.cart().applyCoupon('nope').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(CoCartError);
    const message = (err as CoCartError).message;
    expect(message).toBe('POST /cocart/v2/cart/apply-coupon: Coupon is not valid. [cocart_coupon_invalid]');
    expect(message).not.toContain('t_secret_cart_key');
    expect(message).not.toContain('cs_live_secret');
    expect(message).not.toContain('store.com');
  });
});
