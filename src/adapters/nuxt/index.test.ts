import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createBrowserClient, createServerClient, attachCartKeyHeader } from './index.js';

function makeH3Event(cartKey?: string) {
  return {
    node: {
      req: {
        headers: cartKey ? { 'x-cart-key': cartKey } : {},
      },
    },
  };
}

describe('Nuxt adapter', () => {
  describe('createBrowserClient', () => {
    it('returns a CoCart instance', () => {
      const client = createBrowserClient('https://store.example.com');
      expect(typeof client.getCartKey).toBe('function');
    });
  });

  describe('createServerClient', () => {
    it('reads x-cart-key from H3Event headers', () => {
      const client = createServerClient('https://store.example.com', makeH3Event('abc123'));
      expect(client.getCartKey()).toBe('abc123');
    });

    it('normalises array header values to a single string', () => {
      const event = { node: { req: { headers: { 'x-cart-key': ['first', 'second'] } } } };
      const client = createServerClient('https://store.example.com', event);
      expect(client.getCartKey()).toBe('first');
    });

    it('returns null cart key when header is absent', () => {
      const client = createServerClient('https://store.example.com', makeH3Event());
      expect(client.getCartKey()).toBeNull();
    });

    it('returns a CoCart instance', () => {
      const client = createServerClient('https://store.example.com', makeH3Event());
      expect(typeof client.getCartKey).toBe('function');
    });
  });

  describe('attachCartKeyHeader', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      Object.defineProperty(globalThis, 'location', {
        value: { origin: 'https://app.example.com' },
        configurable: true,
      });
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('injects X-Cart-Key on same-origin requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response());
      globalThis.fetch = mockFetch;

      const client = createServerClient('https://store.example.com', makeH3Event('key-from-server'));
      attachCartKeyHeader(client);

      await globalThis.fetch('https://app.example.com/api/cart');

      const calledHeaders = new Headers((mockFetch.mock.calls[0] as [string, RequestInit])[1]?.headers);
      expect(calledHeaders.get('X-Cart-Key')).toBe('key-from-server');
    });

    it('does not inject header when cart key is absent', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response());
      globalThis.fetch = mockFetch;

      const client = createBrowserClient('https://store.example.com');
      attachCartKeyHeader(client);

      await globalThis.fetch('https://app.example.com/api/cart');

      const init = (mockFetch.mock.calls[0] as [string, RequestInit | undefined])[1];
      expect(init).toBeUndefined();
    });
  });
});
