import { CoCart, MemoryStorage } from '@cocartheadless/sdk';
import type { CoCartOptions } from '@cocartheadless/sdk';
import { applyAuthHeader } from '../shared/apply-auth-header.js';

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
 * provided request headers — no cookies needed.
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
  const cartKey = headers.get('X-Cart-Key') ?? undefined;

  const client = new CoCart(storeUrl, {
    storage: new MemoryStorage(),
    cartKey,
    ...options,
  });

  applyAuthHeader(client, headers.get(client.getAuthHeaderName()));

  return client;
}

export { attachCartKeyHeader } from '../shared/attach-cart-key-header.js';
export { attachAuthHeader } from '../shared/attach-auth-header.js';
