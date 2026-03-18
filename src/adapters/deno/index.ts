import { CoCart, MemoryStorage } from '@cocart/sdk';
import type { CoCartOptions } from '@cocart/sdk';

/**
 * Create a server-side CoCart client for Deno.
 *
 * Uses MemoryStorage (per-request). Reads the cart key from the
 * incoming request's `X-Cart-Key` header — no cookies needed.
 *
 * Usage with Deno.serve():
 * ```ts
 * import { createServerClient } from '@cocart/sdk/deno';
 *
 * Deno.serve(async (req) => {
 *   const client = createServerClient('https://store.example.com', req);
 *   const cart = await client.cart.get();
 *   return Response.json(cart);
 * });
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
 * Create a client-side CoCart client for Deno (e.g. Deno Fresh islands).
 *
 * Uses MemoryStorage since Deno does not provide localStorage in server
 * contexts. For Fresh browser islands, use MemoryStorage or implement a
 * custom StorageInterface backed by a Deno KV store.
 *
 * Usage:
 * ```ts
 * import { createClient } from '@cocart/sdk/deno';
 *
 * const client = createClient('https://store.example.com');
 * const cart = await client.cart.get();
 * ```
 */
export function createClient(
  storeUrl: string,
  options: CoCartOptions = {},
): CoCart {
  return new CoCart(storeUrl, {
    storage: new MemoryStorage(),
    ...options,
  });
}

/**
 * Helper: wraps the global fetch to attach the `X-Cart-Key` header on
 * same-origin requests (useful in Deno Fresh browser islands).
 *
 * Call this once after creating the CoCart instance:
 * ```ts
 * const client = createClient('https://store.example.com');
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
