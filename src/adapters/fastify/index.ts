import { CoCart, MemoryStorage } from '@cocartheadless/sdk';
import type { CoCartOptions } from '@cocartheadless/sdk';
import { applyAuthHeader } from '../shared/apply-auth-header.js';

/** Minimal duck-type for a Fastify FastifyRequest — avoids a hard dependency on `fastify`. */
interface FastifyRequest {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Create a server-side CoCart client for Fastify route handlers.
 *
 * Uses MemoryStorage (per-request). Reads the cart key from the
 * incoming request's `x-cart-key` header — no cookies needed.
 *
 * Usage in a Fastify route handler:
 * ```ts
 * import Fastify from 'fastify';
 * import { createServerClient } from '@cocartheadless/sdk/fastify';
 *
 * const app = Fastify();
 *
 * app.get('/cart', async (request, reply) => {
 *   const client = createServerClient('https://store.example.com', request);
 *   const cart = await client.cart().get();
 *   return cart.toObject();
 * });
 * ```
 */
export function createServerClient(
  storeUrl: string,
  request: FastifyRequest,
  options: CoCartOptions = {},
): CoCart {
  const raw = request.headers['x-cart-key'];
  const cartKey = Array.isArray(raw) ? raw[0] : (raw ?? undefined);

  const client = new CoCart(storeUrl, {
    storage: new MemoryStorage(),
    cartKey,
    ...options,
  });

  const rawAuth = request.headers[client.getAuthHeaderName().toLowerCase()];
  applyAuthHeader(client, Array.isArray(rawAuth) ? rawAuth[0] : rawAuth);

  return client;
}
