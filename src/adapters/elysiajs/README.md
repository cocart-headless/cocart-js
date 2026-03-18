# Elysia.js Adapter

[Elysia.js](https://elysiajs.com/) is a fast, Bun-first web framework with end-to-end type safety. Route handlers receive a context object with a standard Web `Request`, making the CoCart adapter straightforward to use.

## Installation

```bash
bun add @cocart/sdk
```

## How It Works

1. **Browser**: The client stores the cart key in encrypted `localStorage` using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
2. **Navigation**: `attachCartKeyHeader()` wraps `globalThis.fetch` to automatically include an `X-Cart-Key` header on every same-origin request.
3. **Server**: Elysia route handlers receive a standard Web `Request` in their context — `createServerClient()` reads the `X-Cart-Key` header from it.

No cookies are used at any point.

---

## Server Client

Destructure `request` from the Elysia handler context and pass it to `createServerClient()`:

```ts
import { Elysia } from 'elysia';
import { createServerClient } from '@cocart/sdk/elysiajs';

const app = new Elysia()
  .get('/cart', async ({ request }) => {
    const client = createServerClient('https://your-store.com', request);
    const cart = await client.cart().get();
    return cart.toObject();
  })
  .post('/cart/add', async ({ request }) => {
    const client = createServerClient('https://your-store.com', request);
    const body = await request.json();

    const response = await client.cart().addItem(body.productId, body.quantity);
    return response.toObject();
  })
  .listen(3000);
```

### Basic Auth

For registered customers, pass their `username` and `password`:

```ts
import { Elysia } from 'elysia';
import { createServerClient } from '@cocart/sdk/elysiajs';

new Elysia()
  .get('/cart', async ({ request }) => {
    const client = createServerClient('https://your-store.com', request, {
      username: 'customer@example.com',
      password: 'their-password',
    });

    const cart = await client.cart().get();
    return cart.toObject();
  })
  .listen(3000);
```

### Admin Operations (Consumer Keys)

Consumer keys are WooCommerce admin credentials. Use them only for admin-level APIs such as the Sessions API:

```ts
import { Elysia } from 'elysia';
import { createServerClient } from '@cocart/sdk/elysiajs';

new Elysia()
  .get('/admin/sessions', async ({ request }) => {
    const client = createServerClient('https://your-store.com', request, {
      consumerKey: process.env.COCART_CONSUMER_KEY!,
      consumerSecret: process.env.COCART_CONSUMER_SECRET!,
    });

    const sessions = await client.sessions().all();
    return sessions.toObject();
  })
  .listen(3000);
```

---

## Browser Client

For browser-side code (e.g. an Elysia app serving a frontend), use `createBrowserClient()`:

```ts
import { createBrowserClient, attachCartKeyHeader } from '@cocart/sdk/elysiajs';
import { SessionManager } from '@cocart/sdk';

const client = createBrowserClient('https://your-store.com', {
  encryptionKey: 'your-secret-encryption-key',
});

await client.restoreSession();
attachCartKeyHeader(client);

const session = new SessionManager(client, client.getStorage());

if (!session.getCartKey()) {
  await session.initializeCart();
}

export { client, session };
```

---

## Full Example: Cart API

```ts
import { Elysia, t } from 'elysia';
import { createServerClient } from '@cocart/sdk/elysiajs';

const STORE_URL = process.env.COCART_STORE_URL!;

const app = new Elysia()
  // Get cart
  .get('/api/cart', async ({ request }) => {
    const client = createServerClient(STORE_URL, request);
    const cart = await client.cart().get();
    return cart.toObject();
  })

  // Add item
  .post(
    '/api/cart/add',
    async ({ request, body }) => {
      const client = createServerClient(STORE_URL, request);

      try {
        const response = await client.cart().addItem(body.productId, body.quantity);
        return response.toObject();
      } catch (e) {
        throw new Error((e as Error).message);
      }
    },
    {
      body: t.Object({
        productId: t.Number(),
        quantity: t.Number({ default: 1 }),
      }),
    },
  )

  // Remove item
  .delete('/api/cart/:itemKey', async ({ request, params }) => {
    const client = createServerClient(STORE_URL, request);
    const response = await client.cart().removeItem(params.itemKey);
    return response.toObject();
  })

  .listen(3000);

console.log(`Server running at ${app.server?.hostname}:${app.server?.port}`);
```

---

## Environment Variables

```env
# .env
COCART_STORE_URL=https://your-store.com

# Only needed for admin/server-side operations
COCART_CONSUMER_KEY=ck_xxxxx
COCART_CONSUMER_SECRET=cs_xxxxx
```

Bun automatically loads `.env` files. Access them with `process.env.VARIABLE` or `Bun.env.VARIABLE`.

---

## How `attachCartKeyHeader` Works

`attachCartKeyHeader()` wraps `globalThis.fetch` so that every same-origin request automatically includes an `X-Cart-Key` header with the current cart key. This means:

- Elysia route handlers receive the cart key without cookies
- Cross-origin requests are never modified
- If no cart key is set, no header is added

Call it once after creating the browser client and restoring the session.

---

## API Reference

| Export | Description |
|--------|-------------|
| `createBrowserClient(storeUrl, options?)` | Browser client — defaults to `localStorage`; pass `encryptionKey` for AES-256-GCM encryption |
| `createServerClient(storeUrl, request, options?)` | Server client — reads cart key from `X-Cart-Key` header in Web `Request`, uses `MemoryStorage` |
| `attachCartKeyHeader(client)` | Patches `globalThis.fetch` to inject `X-Cart-Key` on same-origin requests |
