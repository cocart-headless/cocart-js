import { CoCart, MemoryStorage } from '@cocartheadless/sdk';
import type { CoCartOptions } from '@cocartheadless/sdk';
import { applyAuthHeader } from '../shared/apply-auth-header.js';

/** Minimal duck-type for an h3 H3Event — avoids a hard dependency on `h3`. */
interface H3Event {
  node: {
    req: {
      headers: Record<string, string | string[] | undefined>;
    };
  };
}

/**
 * Create a browser-side CoCart client for Nuxt.
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
 * Create a server-side CoCart client for Nuxt (server routes, API handlers, middleware).
 *
 * Uses MemoryStorage (per-request). Reads the cart key from the
 * incoming H3Event's request headers — no cookies needed.
 *
 * Usage in a Nuxt server route:
 * ```ts
 * import { createServerClient } from '@cocartheadless/sdk/nuxt';
 *
 * export default defineEventHandler(async (event) => {
 *   const client = createServerClient('https://store.example.com', event);
 *   const cart = await client.cart().get();
 *   return cart.toObject();
 * });
 * ```
 */
export function createServerClient(
  storeUrl: string,
  event: H3Event,
  options: CoCartOptions = {},
): CoCart {
  const raw = event.node.req.headers['x-cart-key'];
  const cartKey = Array.isArray(raw) ? raw[0] : (raw ?? undefined);

  const client = new CoCart(storeUrl, {
    storage: new MemoryStorage(),
    cartKey,
    ...options,
  });

  const rawAuth = event.node.req.headers[client.getAuthHeaderName().toLowerCase()];
  applyAuthHeader(client, Array.isArray(rawAuth) ? rawAuth[0] : rawAuth);

  return client;
}

export { attachCartKeyHeader } from '../shared/attach-cart-key-header.js';
export { attachAuthHeader } from '../shared/attach-auth-header.js';
