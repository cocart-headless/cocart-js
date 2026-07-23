import { CoCart, MemoryStorage } from '@cocartheadless/sdk';
import type { CoCartOptions } from '@cocartheadless/sdk';

/**
 * Create a browser-side CoCart client for Elysia.js.
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
 * Create a server-side CoCart client for Elysia.js route handlers.
 *
 * Uses MemoryStorage (per-request). Reads the cart key from the
 * incoming request's `X-Cart-Key` header — no cookies needed.
 *
 * Usage in an Elysia route handler:
 * ```ts
 * import Elysia from 'elysia';
 * import { createServerClient } from '@cocartheadless/sdk/elysiajs';
 *
 * new Elysia()
 *   .get('/cart', async ({ request }) => {
 *     const client = createServerClient('https://store.example.com', request);
 *     const cart = await client.cart().get();
 *     return cart.toObject();
 *   })
 *   .listen(3000);
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

export { attachCartKeyHeader } from '../shared/attach-cart-key-header.js';
