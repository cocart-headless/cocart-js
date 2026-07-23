import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CoCart } from '@cocartheadless/sdk';
import { attachCartKeyHeader } from './attach-cart-key-header.js';

describe('attachCartKeyHeader (shared)', () => {
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

    const client = new CoCart('https://store.example.com');
    client.setCartKey('key-123');
    attachCartKeyHeader(client);

    await globalThis.fetch('https://app.example.com/api/cart');

    const calledHeaders = new Headers((mockFetch.mock.calls[0] as [string, RequestInit])[1]?.headers);
    expect(calledHeaders.get('X-Cart-Key')).toBe('key-123');
  });

  it('does not inject header on cross-origin requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response());
    globalThis.fetch = mockFetch;

    const client = new CoCart('https://store.example.com');
    client.setCartKey('key-123');
    attachCartKeyHeader(client);

    await globalThis.fetch('https://other-origin.com/api/cart');

    const init = (mockFetch.mock.calls[0] as [string, RequestInit | undefined])[1];
    expect(init?.headers).toBeUndefined();
  });

  it('is idempotent across repeated calls, even with different clients', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response());
    globalThis.fetch = mockFetch;

    const clientA = new CoCart('https://store.example.com');
    clientA.setCartKey('key-a');

    attachCartKeyHeader(clientA);
    const wrappedOnce = globalThis.fetch;

    // A second call (e.g. a different client instance, remount, HMR) must
    // not stack another wrapper — the first-installed wrapper wins.
    const clientB = new CoCart('https://store.example.com');
    clientB.setCartKey('key-b');
    attachCartKeyHeader(clientB);

    expect(globalThis.fetch).toBe(wrappedOnce);

    await globalThis.fetch('https://app.example.com/api/cart');

    const calledHeaders = new Headers((mockFetch.mock.calls[0] as [string, RequestInit])[1]?.headers);
    expect(calledHeaders.get('X-Cart-Key')).toBe('key-a');
  });

  it('does not overwrite an existing X-Cart-Key header', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response());
    globalThis.fetch = mockFetch;

    const client = new CoCart('https://store.example.com');
    client.setCartKey('key-123');
    attachCartKeyHeader(client);

    await globalThis.fetch('https://app.example.com/api/cart', {
      headers: { 'X-Cart-Key': 'explicit-key' },
    });

    const calledHeaders = new Headers((mockFetch.mock.calls[0] as [string, RequestInit])[1]?.headers);
    expect(calledHeaders.get('X-Cart-Key')).toBe('explicit-key');
  });
});
