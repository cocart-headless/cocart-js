import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createBrowserClient, attachCartKeyHeader } from './index.js';

describe('Vite adapter', () => {
  describe('createBrowserClient', () => {
    it('returns a CoCart instance', () => {
      const client = createBrowserClient('https://store.example.com');
      expect(typeof client.getCartKey).toBe('function');
    });

    it('forwards options to CoCart', () => {
      const client = createBrowserClient('https://store.example.com', { timeout: 5000 });
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

      const client = createBrowserClient('https://store.example.com', { cartKey: 'test-cart-key' });
      attachCartKeyHeader(client);

      await globalThis.fetch('https://app.example.com/api/cart');

      const calledHeaders = new Headers((mockFetch.mock.calls[0] as [string, RequestInit])[1]?.headers);
      expect(calledHeaders.get('X-Cart-Key')).toBe('test-cart-key');
    });

    it('does not inject header on cross-origin requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response());
      globalThis.fetch = mockFetch;

      const client = createBrowserClient('https://store.example.com', { cartKey: 'test-cart-key' });
      attachCartKeyHeader(client);

      await globalThis.fetch('https://store.example.com/wp-json/cocart/v2/cart');

      const init = (mockFetch.mock.calls[0] as [string, RequestInit | undefined])[1];
      expect(init).toBeUndefined();
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
