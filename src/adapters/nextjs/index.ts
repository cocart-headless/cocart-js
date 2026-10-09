import { CoCart, MemoryStorage, readCookie } from '@cocartheadless/sdk';
import type { CoCartOptions } from '@cocartheadless/sdk';

/**
 * Create a browser-side CoCart client for Next.js.
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
 * Create a server-side CoCart client for Next.js (App Router, RSC, API routes).
 *
 * Uses MemoryStorage (per-request). Reads the cart key from the
 * `X-Cart-Key` request header (sent by `attachCartKeyHeader()` on the app's
 * own fetch calls), or else from the cart key cookie (named after
 * `storageKey`, default `cocart_cart_key`) when the browser client stores it
 * with `CookieStorage`. The cookie is what lets a plain page request — which
 * carries no custom headers — render the visitor's cart on the server.
 *
 * Usage in a Server Component or Route Handler:
 * ```ts
 * import { headers } from 'next/headers';
 * import { createServerClient } from '@cocartheadless/sdk/nextjs';
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
  const cartKey =
    headers.get('X-Cart-Key') ??
    readCookie(headers.get('cookie'), options.storageKey ?? 'cocart_cart_key') ??
    undefined;

  return new CoCart(storeUrl, {
    storage: new MemoryStorage(),
    cartKey,
    ...options,
  });
}

export { attachCartKeyHeader } from '../shared/attach-cart-key-header.js';
