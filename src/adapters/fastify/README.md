# Fastify Adapter

[Fastify](https://fastify.dev/) is a fast and low-overhead Node.js web framework. It runs server-side only — there is no browser client for this adapter. Each incoming request includes a `FastifyRequest` object whose headers contain the `X-Cart-Key` sent by the browser.

## Installation

```bash
npm install @cocartheadless/sdk
```

## How It Works

1. **Browser**: The client stores the cart key in encrypted `localStorage` using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API). Use the [core SDK](../../../docs/installation.md) directly in the browser — no framework adapter needed.
2. **Navigation**: `attachCartKeyHeader()` (from any browser adapter, or the core SDK) wraps `globalThis.fetch` to automatically include an `X-Cart-Key` header on every same-origin request.
3. **Server**: Fastify route handlers receive a `FastifyRequest` whose `headers` object contains the `x-cart-key` header (Node.js normalises header names to lowercase).

No cookies are used at any point.

---

## Server Client

Pass the Fastify `request` object to `createServerClient()`. Fastify header names are always lowercase:

```ts
import Fastify from 'fastify';
import { createServerClient } from '@cocartheadless/sdk/fastify';

const app = Fastify();

app.get('/cart', async (request, reply) => {
  const client = createServerClient('https://your-store.com', request);
  const cart = await client.cart().get();
  return cart.toObject();
});

app.listen({ port: 3000 });
```

### Basic Auth

For registered customers, pass their `username` and `password`:

```ts
app.get('/cart', async (request, reply) => {
  const client = createServerClient('https://your-store.com', request, {
    username: 'customer@example.com',
    password: 'their-password',
  });

  const cart = await client.cart().get();
  return cart.toObject();
});
```

### Admin Operations (Consumer Keys)

Consumer keys are WooCommerce admin credentials. Use them only for admin-level APIs such as the Sessions API:

```ts
app.get('/admin/sessions', async (request, reply) => {
  const client = createServerClient('https://your-store.com', request, {
    consumerKey: process.env.COCART_CONSUMER_KEY!,
    consumerSecret: process.env.COCART_CONSUMER_SECRET!,
  });

  const sessions = await client.sessions().all();
  return sessions.toObject();
});
```

---

## Full Example: Cart API

```ts
import Fastify from 'fastify';
import { createServerClient } from '@cocartheadless/sdk/fastify';

const app = Fastify({ logger: true });
const STORE_URL = process.env.COCART_STORE_URL!;

// Get cart
app.get('/api/cart', async (request, reply) => {
  const client = createServerClient(STORE_URL, request);
  const cart = await client.cart().get();
  return cart.toObject();
});

// Add item
app.post<{
  Body: { productId: number; quantity: number };
}>('/api/cart/add', async (request, reply) => {
  const client = createServerClient(STORE_URL, request);
  const { productId, quantity } = request.body;

  try {
    const response = await client.cart().addItem(productId, quantity);
    return response.toObject();
  } catch (e) {
    reply.status(400);
    return { error: (e as Error).message };
  }
});

// Remove item
app.delete<{
  Params: { itemKey: string };
}>('/api/cart/:itemKey', async (request, reply) => {
  const client = createServerClient(STORE_URL, request);
  const response = await client.cart().removeItem(request.params.itemKey);
  return response.toObject();
});

// Update item quantity
app.patch<{
  Params: { itemKey: string };
  Body: { quantity: number };
}>('/api/cart/:itemKey', async (request, reply) => {
  const client = createServerClient(STORE_URL, request);
  const response = await client.cart().updateItem(request.params.itemKey, request.body.quantity);
  return response.toObject();
});

app.listen({ port: 3000 }, () => {
  console.log('Server running on http://localhost:3000');
});
```

---

## TypeScript Plugin Pattern

For larger applications, register CoCart as a Fastify plugin to share configuration:

```ts
// plugins/cocart.ts
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { createServerClient } from '@cocartheadless/sdk/fastify';

const cocartPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateRequest('cocart', null);

  fastify.addHook('onRequest', async (request) => {
    (request as any).cocart = createServerClient(
      process.env.COCART_STORE_URL!,
      request,
    );
  });
});

export default cocartPlugin;
```

Then in your routes:

```ts
app.get('/cart', async (request: any) => {
  const cart = await request.cocart.cart().get();
  return cart.toObject();
});
```

---

## Environment Variables

```env
# .env (or set in your deployment environment)
COCART_STORE_URL=https://your-store.com

# Only needed for admin/server-side operations
COCART_CONSUMER_KEY=ck_xxxxx
COCART_CONSUMER_SECRET=cs_xxxxx
```

---

## Note on Header Case

Node.js (and therefore Fastify) normalises all incoming HTTP header names to **lowercase**. The adapter reads `request.headers['x-cart-key']` (lowercase). The browser sends `X-Cart-Key` (mixed case) — HTTP headers are case-insensitive, so this works correctly.

---

## API Reference

| Export | Description |
|--------|-------------|
| `createServerClient(storeUrl, request, options?)` | Server client — reads cart key from `x-cart-key` header in `FastifyRequest`, uses `MemoryStorage` |

> This adapter is server-only. There is no `createBrowserClient` or `attachCartKeyHeader` — use the core `@cocartheadless/sdk` directly in browser code.
