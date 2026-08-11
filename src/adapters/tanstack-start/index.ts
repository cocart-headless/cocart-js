import { CoCart, MemoryStorage } from '@cocartheadless/sdk';
import type { CoCartOptions } from '@cocartheadless/sdk';
import { applyAuthHeader } from '../shared/apply-auth-header.js';

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

  const client = new CoCart(storeUrl, {
    storage: new MemoryStorage(),
    cartKey,
    ...options,
  });

  applyAuthHeader(client, request.headers.get(client.getAuthHeaderName()));

  return client;
}

export { attachCartKeyHeader } from '../shared/attach-cart-key-header.js';
export { attachAuthHeader } from '../shared/attach-auth-header.js';
