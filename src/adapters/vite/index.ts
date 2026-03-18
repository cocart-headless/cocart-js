import { CoCart } from '@cocart/sdk';
import type { CoCartOptions } from '@cocart/sdk';

/**
 * Create a browser-side CoCart client for Vite applications.
 *
 * Pass `encryptionKey` to persist the cart key in encrypted localStorage
 * (AES-256-GCM). Without it, the SDK defaults to plain localStorage in
 * browsers. Call `client.restoreSession()` after creation when using
 * an async storage (e.g. EncryptedStorage).
 *
 * Usage:
 * ```ts
 * import { createBrowserClient, attachCartKeyHeader } from '@cocart/sdk/vite';
 * import { SessionManager } from '@cocart/sdk';
 *
 * const client = createBrowserClient('https://store.example.com', {
 *   encryptionKey: import.meta.env.VITE_COCART_ENCRYPTION_KEY,
 * });
 *
 * await client.restoreSession();
 * attachCartKeyHeader(client);
 * ```
 */
export function createBrowserClient(
  storeUrl: string,
  options: CoCartOptions = {},
): CoCart {
  return new CoCart(storeUrl, options);
}

/**
 * Client-side helper: wraps the global fetch to attach the `X-Cart-Key`
 * header on same-origin requests.
 *
 * Call this once after creating the CoCart instance and restoring the session.
 * Every subsequent `fetch()` to the same origin will include the header so
 * your backend can identify the cart without cookies.
 *
 * ```ts
 * const client = createBrowserClient('https://store.example.com', {
 *   encryptionKey: import.meta.env.VITE_COCART_ENCRYPTION_KEY,
 * });
 * await client.restoreSession();
 * attachCartKeyHeader(client);
 * ```
 */
export function attachCartKeyHeader(client: CoCart): void {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<globalThis.Response> {
    const cartKey = client.getCartKey();

    if (cartKey) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      try {
        const requestUrl = new URL(url, globalThis.location?.origin);
        if (requestUrl.origin === globalThis.location?.origin) {
          const headers = new Headers(init?.headers);
          if (!headers.has('X-Cart-Key')) {
            headers.set('X-Cart-Key', cartKey);
          }
          init = { ...init, headers };
        }
      } catch {
        // Invalid URL — skip header injection
      }
    }

    return originalFetch.call(globalThis, input, init);
  };
}
