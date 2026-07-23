import { CoCart, MemoryStorage } from '@cocartheadless/sdk';
import type { CoCartOptions } from '@cocartheadless/sdk';

/**
 * Create a server-side CoCart client for Deno.
 *
 * Uses MemoryStorage (per-request). Reads the cart key from the
 * incoming request's `X-Cart-Key` header — no cookies needed.
 *
 * Usage with Deno.serve():
 * ```ts
 * import { createServerClient } from '@cocartheadless/sdk/deno';
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
 * import { createClient } from '@cocartheadless/sdk/deno';
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

export { attachCartKeyHeader } from '../shared/attach-cart-key-header.js';
