import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoCart } from '../src/cocart.js';
import { CoCartError } from '../src/exceptions/cocart-error.js';
import { MemoryStorage } from '../src/storage/memory-storage.js';

function reply(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return {
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

const invalidCart = reply(404, { code: 'cocart_invalid_cart', message: 'The cart requested is invalid.', data: { status: 404 } });

describe('recovering from a cart key CoCart no longer has', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('forgets the stored key and retries once as a new guest', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(invalidCart)
      .mockResolvedValueOnce(reply(200, { items: [] }, { 'Cart-Key': 't_new' }));
    globalThis.fetch = fetchMock;

    const storage = new MemoryStorage();
    storage.set('cocart_cart_key', 't_expired');
    const client = new CoCart('https://store.com', { storage });

    await client.cart().addItem(154, 1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('cart_key=t_expired');
    expect(fetchMock.mock.calls[1][0]).not.toContain('cart_key=');
    expect(fetchMock.mock.calls[1][1].headers['Cart-Key']).toBeUndefined();
    expect(client.getCartKey()).toBe('t_new');
    expect(storage.get('cocart_cart_key')).toBe('t_new');
  });

  it('retries only once', async () => {
    const fetchMock = vi.fn().mockResolvedValue(invalidCart);
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com', { cartKey: 't_expired' });

    await expect(client.cart().get()).rejects.toBeInstanceOf(CoCartError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('leaves other errors alone', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(404, { code: 'cocart_item_not_in_cart', message: 'Item specified does not exist in cart.' }));
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com', { cartKey: 't_live' });

    await expect(client.cart().removeItem('abc')).rejects.toBeInstanceOf(CoCartError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(client.getCartKey()).toBe('t_live');
  });
});
