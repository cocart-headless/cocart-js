import { CoCart, MemoryStorage, EncryptedStorage } from '@cocart/sdk';
import type { CoCartOptions } from '@cocart/sdk';

/**
 * Create a browser-side CoCart client for Next.js.
 *
 * Uses EncryptedStorage with localStorage for persisting cart key and tokens.
 * Call `client.restoreSession()` after creation to load from storage.
 */
export function createBrowserClient(
  storeUrl: string,
  options: CoCartOptions & { encryptionKey: string } = {} as CoCartOptions & { encryptionKey: string },
): CoCart {
  return new CoCart(storeUrl, {
    storage: new EncryptedStorage(options.encryptionKey, { prefix: 'cocart_enc_' }),
    ...options,
  });
}

/**
 * Create a server-side CoCart client for Next.js (App Router, RSC, API routes).
 *
 * Uses MemoryStorage (per-request). Reads the cart key from the
 * provided request headers — no cookies needed.
 *
 * Usage in a Server Component or Route Handler:
 * ```ts
 * import { headers } from 'next/headers';
 * import { createServerClient } from '@cocart/sdk/nextjs';
 *
 * const headersList = await headers();
 * const client = createServerClient('https://store.example.com', headersList);
 * ```
 */
export function createServerClient(
  storeUrl: string,
  headers: Headers,
  options: CoCartOptions = {},
): CoCart {
  const cartKey = headers.get('X-Cart-Key') ?? undefined;

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
 * Call this once on the client:
 * ```ts
 * const client = createBrowserClient('https://store.example.com', { encryptionKey: '...' });
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
