import { CoCart, MemoryStorage } from '@cocartheadless/sdk';
import type { CoCartOptions } from '@cocartheadless/sdk';

/**
 * Create a browser-side CoCart client for TanStack Start.
 *
 * Pass `encryptionKey` to persist the cart key in encrypted localStorage
 * (AES-256-GCM). Without it, the SDK defaults to plain localStorage in
 * browsers. Call `client.restoreSession()` after creation when using
 * an async storage (e.g. EncryptedStorage).
 */
export function createBrowserClient(
  storeUrl: string,
  options: CoCartOptions = {},
): CoCart {
  return new CoCart(storeUrl, options);
}

/**
 * Create a server-side CoCart client for TanStack Start (server functions, server routes).
 *
 * Uses MemoryStorage (per-request). Reads the cart key from the
 * incoming request's `X-Cart-Key` header — no cookies needed.
 *
 * Usage in a server function:
 * ```ts
 * import { createServerFn } from '@tanstack/react-start';
 * import { getRequest } from '@tanstack/react-start/server';
 * import { createServerClient } from '@cocartheadless/sdk/tanstack-start';
 *
 * export const getCart = createServerFn({ method: 'GET' }).handler(async () => {
 *   const request = getRequest();
 *   const client = createServerClient(process.env.COCART_STORE_URL!, request);
 *   const cart = await client.cart().get();
 *   return cart.toObject();
 * });
 * ```
 *
 * Usage in a server route:
 * ```ts
 * import { createServerClient } from '@cocartheadless/sdk/tanstack-start';
 *
 * export const GET = ({ request }: { request: Request }) => {
 *   const client = createServerClient(process.env.COCART_STORE_URL!, request);
 *   return client.cart().get().then(cart => Response.json(cart.toObject()));
 * };
 * ```
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
 * Call this once on the client (e.g. in your root route or a shared module):
 * ```ts
 * const client = createBrowserClient(import.meta.env.VITE_COCART_STORE_URL!, {
 *   encryptionKey: import.meta.env.VITE_COCART_ENCRYPTION_KEY!,
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
