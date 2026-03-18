import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createBrowserClient, createServerClient, attachCartKeyHeader } from './index.js';

describe('Remix adapter', () => {
  describe('createBrowserClient', () => {
    it('returns a CoCart instance', () => {
      const client = createBrowserClient('https://store.example.com');
      expect(typeof client.getCartKey).toBe('function');
    });
  });

  describe('createServerClient', () => {
    it('reads X-Cart-Key from request headers', () => {
      const request = new Request('https://app.example.com/', {
        headers: { 'X-Cart-Key': 'abc123' },
      });
      const client = createServerClient('https://store.example.com', request);
      expect(client.getCartKey()).toBe('abc123');
    });

    it('returns null cart key when header is absent', () => {
      const request = new Request('https://app.example.com/');
      const client = createServerClient('https://store.example.com', request);
      expect(client.getCartKey()).toBeNull();
    });

    it('returns a CoCart instance', () => {
      const request = new Request('https://app.example.com/');
      const client = createServerClient('https://store.example.com', request);
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

      const request = new Request('https://app.example.com/', {
        headers: { 'X-Cart-Key': 'key-from-server' },
      });
      const client = createServerClient('https://store.example.com', request);
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
