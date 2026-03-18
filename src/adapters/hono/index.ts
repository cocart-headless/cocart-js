import { CoCart, MemoryStorage } from '@cocart/sdk';
import type { CoCartOptions } from '@cocart/sdk';

/** Minimal duck-type for a Hono Context — avoids a hard dependency on `hono`. */
interface HonoContext {
  req: {
    header(name: string): string | undefined;
  };
}

/**
 * Create a browser-side CoCart client for Hono.
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
 * Create a server-side CoCart client for Hono route handlers.
 *
 * Uses MemoryStorage (per-request). Reads the cart key from the
 * incoming context's `X-Cart-Key` header — no cookies needed.
 *
 * Usage in a Hono route handler:
 * ```ts
 * import { Hono } from 'hono';
 * import { createServerClient } from '@cocart/sdk/hono';
 *
 * const app = new Hono();
 *
 * app.get('/cart', async (c) => {
 *   const client = createServerClient('https://store.example.com', c);
 *   const cart = await client.cart().get();
 *   return c.json(cart.toObject());
 * });
 * ```
 */
export function createServerClient(
  storeUrl: string,
  c: HonoContext,
  options: CoCartOptions = {},
): CoCart {
  const cartKey = c.req.header('X-Cart-Key') ?? undefined;

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
