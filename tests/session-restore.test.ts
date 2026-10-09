import { describe, expect, it } from 'vitest';
import { CoCart } from '../src/cocart.js';
import { MemoryStorage } from '../src/storage/memory-storage.js';
import type { StorageInterface } from '../src/storage/storage.interface.js';

class AsyncStorage implements StorageInterface {
  constructor(private readonly values: Record<string, string> = {}) {}
  get(key: string): Promise<string | null> {
    return Promise.resolve(this.values[key] ?? null);
  }
  set(): Promise<void> {
    return Promise.resolve();
  }
  delete(): Promise<void> {
    return Promise.resolve();
  }
}

describe('cart key restore on construction', () => {
  it('restores the cart key from sync storage without restoreSession()', () => {
    const storage = new MemoryStorage();
    storage.set('cocart_cart_key', 't_from_last_visit');

    expect(new CoCart('https://store.example.com', { storage }).getCartKey()).toBe('t_from_last_visit');
  });

  it('reads the key named after storageKey', () => {
    const storage = new MemoryStorage();
    storage.set('my_cart', 't_custom');

    expect(new CoCart('https://store.example.com', { storage, storageKey: 'my_cart' }).getCartKey()).toBe('t_custom');
  });

  it('prefers an explicit cartKey option over storage', () => {
    const storage = new MemoryStorage();
    storage.set('cocart_cart_key', 't_stored');

    expect(new CoCart('https://store.example.com', { storage, cartKey: 't_explicit' }).getCartKey()).toBe('t_explicit');
  });

  it('leaves async storage to restoreSession()', async () => {
    const client = new CoCart('https://store.example.com', { storage: new AsyncStorage({ cocart_cart_key: 't_async' }) });

    expect(client.getCartKey()).toBeNull();
    await client.restoreSession();
    expect(client.getCartKey()).toBe('t_async');
  });

  it('starts without a cart key when storage throws (e.g. blocked cookies)', () => {
    const storage: StorageInterface = {
      get: () => {
        throw new Error('SecurityError');
      },
      set: () => {},
      delete: () => {},
    };

    expect(new CoCart('https://store.example.com', { storage }).getCartKey()).toBeNull();
  });
});
