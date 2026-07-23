import { CoCart } from '@cocartheadless/sdk';
import type { CoCartOptions } from '@cocartheadless/sdk';

/**
 * Create a browser-side CoCart client for Vite applications.
 *
 * Pass `encryptionKey` to persist the cart key in encrypted localStorage
 * (AES-256-GCM). Without it, the SDK defaults to plain localStorage in
 * browsers. Call `client.restoreSession()` after creation when using
 * an async storage (e.g. EncryptedStorage).
 *
 * Usage:
 * ```ts
 * import { createBrowserClient, attachCartKeyHeader } from '@cocartheadless/sdk/vite';
 * import { SessionManager } from '@cocartheadless/sdk';
 *
 * const client = createBrowserClient('https://store.example.com', {
 *   encryptionKey: import.meta.env.VITE_COCART_ENCRYPTION_KEY,
 * });
 *
 * await client.restoreSession();
 * attachCartKeyHeader(client);
 * ```
 */
export function createBrowserClient(
  storeUrl: string,
  options: CoCartOptions = {},
): CoCart {
  return new CoCart(storeUrl, options);
}

export { attachCartKeyHeader } from '../shared/attach-cart-key-header.js';
