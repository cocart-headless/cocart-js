// @vitest-environment jsdom
//
// The root `npm test` sweep runs under the default node environment and
// doesn't pick up this package's local vitest.config.ts (jsdom) — this
// per-file override keeps the test correct whether run from the repo root
// or via `npm run test:react`.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { CoCart } from '@cocartheadless/sdk';
import { CoCartProvider } from '../src/CoCartProvider.js';
import { useAuth } from '../src/useAuth.js';
import type { ReactNode } from 'react';

function mockFetch(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function wrapper(client: CoCart) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <CoCartProvider client={client}>{children}</CoCartProvider>;
  };
}

describe('useAuth', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('starts as unauthenticated when the client has no stored session', async () => {
    const client = new CoCart('https://store.example.com');
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('restores the profile on mount when the client already has a JWT', async () => {
    const client = new CoCart('https://store.example.com');
    client.setJwtToken('existing-token');
    globalThis.fetch = mockFetch(200, {
      user_id: '42',
      display_name: 'Jane',
      email: 'jane@example.com',
      role: 'Customer',
    });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({
      userId: '42',
      displayName: 'Jane',
      email: 'jane@example.com',
      role: 'Customer',
    });
  });

  it('login() acquires a JWT and populates the user', async () => {
    const client = new CoCart('https://store.example.com');
    globalThis.fetch = mockFetch(200, {
      user_id: '7',
      display_name: 'Sam',
      email: 'sam@example.com',
      role: 'Customer',
      extras: { jwt_token: 'new-token', jwt_refresh: 'refresh-token' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('sam@example.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.displayName).toBe('Sam');
    expect(client.getJwtToken()).toBe('new-token');
  });

  it('login() surfaces an error and leaves the user signed out on failure', async () => {
    const client = new CoCart('https://store.example.com');
    globalThis.fetch = mockFetch(401, {
      code: 'cocart_authentication_error',
      message: 'Incorrect username or password.',
      data: { status: 401 },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.login('sam@example.com', 'wrong')).rejects.toThrow();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.error).not.toBeNull();
  });

  it('logout() clears the user and tokens', async () => {
    const client = new CoCart('https://store.example.com');
    globalThis.fetch = mockFetch(200, {
      user_id: '7',
      display_name: 'Sam',
      email: 'sam@example.com',
      role: 'Customer',
      extras: { jwt_token: 'new-token', jwt_refresh: 'refresh-token' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('sam@example.com', 'password');
    });
    expect(result.current.isAuthenticated).toBe(true);

    globalThis.fetch = mockFetch(200, {});
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(client.getJwtToken()).toBeNull();
  });

  it('throws when used outside a CoCartProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useCoCart() must be used within a <CoCartProvider>.');
  });
});
