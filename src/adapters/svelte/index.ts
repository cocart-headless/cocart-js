import { CoCart, MemoryStorage } from '@cocartheadless/sdk';
import type { CoCartOptions } from '@cocartheadless/sdk';
import { applyAuthHeader } from '../shared/apply-auth-header.js';

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

  const client = new CoCart(storeUrl, {
    storage: new MemoryStorage(),
    cartKey,
    ...options,
  });

  applyAuthHeader(client, event.request.headers.get(client.getAuthHeaderName()));

  return client;
}

export { attachCartKeyHeader } from '../shared/attach-cart-key-header.js';
export { attachAuthHeader } from '../shared/attach-auth-header.js';
