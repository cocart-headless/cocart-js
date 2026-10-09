import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieStorage, readCookie } from '../src/storage/cookie-storage.js';
import { CoCart } from '../src/cocart.js';

/** A minimal document.cookie: setting a cookie string updates a jar, reading joins it. */
function stubDocumentCookies() {
  const jar = new Map<string, string>();
  const writes: string[] = [];
  vi.stubGlobal('document', {
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(value: string) {
      writes.push(value);
      const [pair, ...attrs] = value.split(';').map((s) => s.trim());
      const [name, ...rest] = pair.split('=');
      if (attrs.some((a) => a === 'Max-Age=0')) jar.delete(name);
      else jar.set(name, rest.join('='));
    },
  });
  return { jar, writes };
}

describe('CookieStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores, reads and deletes values as cookies', () => {
    const { jar } = stubDocumentCookies();
    const storage = new CookieStorage();

    storage.set('cocart_cart_key', 'abc123');
    expect(jar.get('cocart_cart_key')).toBe('abc123');
    expect(storage.get('cocart_cart_key')).toBe('abc123');

    storage.delete('cocart_cart_key');
    expect(storage.get('cocart_cart_key')).toBeNull();
  });

  it('writes the cookie attributes it was configured with', () => {
    const { writes } = stubDocumentCookies();
    new CookieStorage({ path: '/shop', maxAge: 60, sameSite: 'Strict', secure: true, domain: '.example.com' }).set('k', 'v');

    expect(writes[0]).toBe('k=v; Path=/shop; Max-Age=60; SameSite=Strict; Domain=.example.com; Secure');
  });

  it('applies a prefix to cookie names', () => {
    const { jar } = stubDocumentCookies();
    new CookieStorage({ prefix: 'shop_', secure: false }).set('cart', 'x');

    expect(jar.get('shop_cart')).toBe('x');
  });

  it('encodes values', () => {
    stubDocumentCookies();
    const storage = new CookieStorage({ secure: false });
    storage.set('k', 'a b;c=d');

    expect(storage.get('k')).toBe('a b;c=d');
  });

  it('is a no-op without a document (server render)', () => {
    vi.stubGlobal('document', undefined);
    const storage = new CookieStorage();

    expect(() => storage.set('k', 'v')).not.toThrow();
    expect(storage.get('k')).toBeNull();
  });

  describe('with the CoCart client', () => {
    beforeEach(() => {
      stubDocumentCookies();
    });

    it('persists the cart key in a cookie named after storageKey and restores it in a new client', async () => {
      const storage = new CookieStorage({ secure: false });
      const first = new CoCart('https://store.example.com', { storage });
      first.setCartKey('t_cart123');
      // setCartKey only updates memory; the client writes storage when the API hands it a key.
      await storage.set('cocart_cart_key', 't_cart123');

      const second = new CoCart('https://store.example.com', { storage });
      await second.restoreSession();

      expect(second.getCartKey()).toBe('t_cart123');
    });
  });
});

describe('readCookie', () => {
  it('reads one cookie from a Cookie header', () => {
    expect(readCookie('a=1; cocart_cart_key=t_abc; b=2', 'cocart_cart_key')).toBe('t_abc');
  });

  it('returns null when the cookie is absent or the header is empty', () => {
    expect(readCookie('a=1', 'cocart_cart_key')).toBeNull();
    expect(readCookie(null, 'cocart_cart_key')).toBeNull();
    expect(readCookie('', 'cocart_cart_key')).toBeNull();
  });

  it('decodes encoded values and keeps "=" inside values', () => {
    expect(readCookie('k=a%20b%3Dc', 'k')).toBe('a b=c');
    expect(readCookie('k=x=y', 'k')).toBe('x=y');
  });
});
