import { CoCart, MemoryStorage, EncryptedStorage } from '@cocart/sdk';
import type { CoCartOptions } from '@cocart/sdk';

/**
 * Create a browser-side CoCart client for Astro.
 *
 * Uses EncryptedStorage with localStorage for persisting cart key and tokens.
 */
export function createBrowserClient(
  storeUrl: string,
  options: CoCartOptions & { encryptionKey: string } = {} as CoCartOptions & { encryptionKey: string },
): CoCart {
  const client = new CoCart(storeUrl, {
    storage: new EncryptedStorage(options.encryptionKey, { prefix: 'cocart_enc_' }),
    ...options,
  });
  return client;
}

/**
 * Create a server-side CoCart client for Astro SSR.
 *
 * Uses MemoryStorage (per-request). Reads the cart key from the
 * incoming request's `X-Cart-Key` header — no cookies needed.
 */
export function createServerClient(
  storeUrl: string,
  request: Request,
  options: CoCartOptions = {},
): CoCart {
  const cartKey = request.headers.get('X-Cart-Key') ?? undefined;

  return new CoCart(storeUrl, {
    storage: new MemoryStorage(),
    cartKey,
    ...options,
  });
}

/**
 * Client-side helper: wraps the global fetch to attach the `X-Cart-Key`
 * header on same-origin requests.
 *
 * Call this once on the client after creating the CoCart instance:
 *
 * ```ts
 * const client = createBrowserClient('https://store.example.com', { encryptionKey: '...' });
 * await client.restoreSession();
 * attachCartKeyHeader(client);
 * ```
 *
 * Every subsequent `fetch()` to the same origin will include the header
 * so Astro SSR can read it.
 */
export function attachCartKeyHeader(client: CoCart): void {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<globalThis.Response> {
    const cartKey = client.getCartKey();

    if (cartKey) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      // Only attach to same-origin requests
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
