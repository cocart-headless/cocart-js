import { CoCart, MemoryStorage } from '@cocartheadless/sdk';
import type { CoCartOptions } from '@cocartheadless/sdk';

/** Minimal duck-type for a SvelteKit RequestEvent — avoids a hard dependency on `@sveltejs/kit`. */
interface RequestEvent {
  request: Request;
}

/**
 * Create a browser-side CoCart client for SvelteKit.
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
 * Create a server-side CoCart client for SvelteKit (load functions, hooks, server routes).
 *
 * Uses MemoryStorage (per-request). Reads the cart key from the
 * incoming RequestEvent's `X-Cart-Key` header — no cookies needed.
 *
 * Usage in a SvelteKit server load function:
 * ```ts
 * import { createServerClient } from '@cocartheadless/sdk/svelte';
 *
 * export async function load(event) {
 *   const client = createServerClient('https://store.example.com', event);
 *   const cart = await client.cart().get();
 *   return { cart: cart.toObject() };
 * }
 * ```
 */
export function createServerClient(
  storeUrl: string,
  event: RequestEvent,
  options: CoCartOptions = {},
): CoCart {
  const cartKey = event.request.headers.get('X-Cart-Key') ?? undefined;

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
 * Call this once on the client (e.g. in a layout component or client-side module):
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
