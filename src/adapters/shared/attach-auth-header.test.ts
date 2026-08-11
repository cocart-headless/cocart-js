import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CoCart } from '@cocartheadless/sdk';
import { attachAuthHeader } from './attach-auth-header.js';

describe('attachAuthHeader (shared)', () => {
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

  it('injects a Bearer Authorization header on same-origin requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response());
    globalThis.fetch = mockFetch;

    const client = new CoCart('https://store.example.com');
    client.setJwtToken('jwt-123');
    attachAuthHeader(client);

    await globalThis.fetch('https://app.example.com/api/account');

    const calledHeaders = new Headers((mockFetch.mock.calls[0] as [string, RequestInit])[1]?.headers);
    expect(calledHeaders.get('Authorization')).toBe('Bearer jwt-123');
  });

  it('respects a custom auth header name', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response());
    globalThis.fetch = mockFetch;

    const client = new CoCart('https://store.example.com', { authHeaderName: 'X-Auth-Token' });
    client.setJwtToken('jwt-123');
    attachAuthHeader(client);

    await globalThis.fetch('https://app.example.com/api/account');

    const calledHeaders = new Headers((mockFetch.mock.calls[0] as [string, RequestInit])[1]?.headers);
    expect(calledHeaders.get('X-Auth-Token')).toBe('Bearer jwt-123');
    expect(calledHeaders.has('Authorization')).toBe(false);
  });

  it('does not inject header on cross-origin requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response());
    globalThis.fetch = mockFetch;

    const client = new CoCart('https://store.example.com');
    client.setJwtToken('jwt-123');
    attachAuthHeader(client);

    await globalThis.fetch('https://other-origin.com/api/account');

    const init = (mockFetch.mock.calls[0] as [string, RequestInit | undefined])[1];
    expect(init?.headers).toBeUndefined();
  });

  it('does not inject a header when the client is unauthenticated', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response());
    globalThis.fetch = mockFetch;

    const client = new CoCart('https://store.example.com');
    attachAuthHeader(client);

    await globalThis.fetch('https://app.example.com/api/account');

    const init = (mockFetch.mock.calls[0] as [string, RequestInit | undefined])[1];
    expect(init).toBeUndefined();
  });

  it('is idempotent across repeated calls, even with different clients', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response());
    globalThis.fetch = mockFetch;

    const clientA = new CoCart('https://store.example.com');
    clientA.setJwtToken('jwt-a');

    attachAuthHeader(clientA);
    const wrappedOnce = globalThis.fetch;

    const clientB = new CoCart('https://store.example.com');
    clientB.setJwtToken('jwt-b');
    attachAuthHeader(clientB);

    expect(globalThis.fetch).toBe(wrappedOnce);

    await globalThis.fetch('https://app.example.com/api/account');

    const calledHeaders = new Headers((mockFetch.mock.calls[0] as [string, RequestInit])[1]?.headers);
    expect(calledHeaders.get('Authorization')).toBe('Bearer jwt-a');
  });

  it('does not overwrite an existing Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response());
    globalThis.fetch = mockFetch;

    const client = new CoCart('https://store.example.com');
    client.setJwtToken('jwt-123');
    attachAuthHeader(client);

    await globalThis.fetch('https://app.example.com/api/account', {
      headers: { Authorization: 'Bearer explicit-token' },
    });

    const calledHeaders = new Headers((mockFetch.mock.calls[0] as [string, RequestInit])[1]?.headers);
    expect(calledHeaders.get('Authorization')).toBe('Bearer explicit-token');
  });
});
