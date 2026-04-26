# Hono Adapter

[Hono](https://hono.dev/) is a lightweight, multi-runtime web framework that runs on Node.js, Bun, Cloudflare Workers, Deno, and more. Route handlers receive a Hono `Context` object (`c`) which exposes a typed `c.req.header()` method for reading request headers.

## Installation

```bash
npm install @cocartheadless/sdk   # Node.js
bun add @cocartheadless/sdk       # Bun
```

## How It Works

1. **Browser**: The client stores the cart key in encrypted `localStorage` using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
2. **Navigation**: `attachCartKeyHeader()` wraps `globalThis.fetch` to automatically include an `X-Cart-Key` header on every same-origin request.
3. **Server**: Hono route handlers receive a `Context` object (`c`) — `createServerClient()` calls `c.req.header('X-Cart-Key')` to identify the cart.

No cookies are used at any point.

---

## Server Client

Pass the Hono context `c` to `createServerClient()`:

```ts
import { Hono } from 'hono';
import { createServerClient } from '@cocartheadless/sdk/hono';

const app = new Hono();

app.get('/cart', async (c) => {
  const client = createServerClient('https://your-store.com', c);
  const cart = await client.cart().get();
  return c.json(cart.toObject());
});

export default app;
```

### Basic Auth

For registered customers, pass their `username` and `password`:

```ts
app.get('/cart', async (c) => {
  const client = createServerClient('https://your-store.com', c, {
    username: 'customer@example.com',
    password: 'their-password',
  });

  const cart = await client.cart().get();
  return c.json(cart.toObject());
});
```

### Admin Operations (Consumer Keys)

Consumer keys are WooCommerce admin credentials. Use them only for admin-level APIs such as the Sessions API:

```ts
app.get('/admin/sessions', async (c) => {
  const client = createServerClient('https://your-store.com', c, {
    consumerKey: c.env?.COCART_CONSUMER_KEY,
    consumerSecret: c.env?.COCART_CONSUMER_SECRET,
  });

  const sessions = await client.sessions().all();
  return c.json(sessions.toObject());
});
```

---

## Browser Client

For browser-side code served by Hono, use `createBrowserClient()`:

```ts
import { createBrowserClient, attachCartKeyHeader } from '@cocartheadless/sdk/hono';
import { SessionManager } from '@cocartheadless/sdk';

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
import { Hono } from 'hono';
import { createServerClient } from '@cocartheadless/sdk/hono';

type Bindings = {
  COCART_STORE_URL: string;
  COCART_CONSUMER_KEY: string;
  COCART_CONSUMER_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Get cart
app.get('/api/cart', async (c) => {
  const client = createServerClient(c.env.COCART_STORE_URL, c);
  const cart = await client.cart().get();
  return c.json(cart.toObject());
});

// Add item
app.post('/api/cart/add', async (c) => {
  const client = createServerClient(c.env.COCART_STORE_URL, c);
  const body = await c.req.json();

  try {
    const response = await client.cart().addItem(body.productId, body.quantity);
    return c.json(response.toObject());
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// Remove item
app.delete('/api/cart/:itemKey', async (c) => {
  const client = createServerClient(c.env.COCART_STORE_URL, c);
  const response = await client.cart().removeItem(c.req.param('itemKey'));
  return c.json(response.toObject());
});

export default app;
```

---

## Cloudflare Workers

Hono is a popular choice for Cloudflare Workers. Environment variables are passed via `c.env`:

```ts
// worker.ts
import { Hono } from 'hono';
import { createServerClient } from '@cocartheadless/sdk/hono';

type Env = {
  COCART_STORE_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/cart', async (c) => {
  const client = createServerClient(c.env.COCART_STORE_URL, c);
  const cart = await client.cart().get();
  return c.json(cart.toObject());
});

export default app;
```

```toml
# wrangler.toml
[vars]
COCART_STORE_URL = "https://your-store.com"
```

---

## Environment Variables

```env
# .env (Node.js / Bun)
COCART_STORE_URL=https://your-store.com

# Only needed for admin/server-side operations
COCART_CONSUMER_KEY=ck_xxxxx
COCART_CONSUMER_SECRET=cs_xxxxx
```

For Cloudflare Workers, set variables in `wrangler.toml` or the Cloudflare dashboard.

---

## How `attachCartKeyHeader` Works

`attachCartKeyHeader()` wraps `globalThis.fetch` so that every same-origin request automatically includes an `X-Cart-Key` header with the current cart key. This means:

- Hono route handlers receive the cart key without cookies
- Cross-origin requests are never modified
- If no cart key is set, no header is added

Call it once after creating the browser client and restoring the session.

---

## API Reference

| Export | Description |
|--------|-------------|
| `createBrowserClient(storeUrl, options?)` | Browser client — defaults to `localStorage`; pass `encryptionKey` for AES-256-GCM encryption |
| `createServerClient(storeUrl, c, options?)` | Server client — reads cart key via `c.req.header('X-Cart-Key')`, uses `MemoryStorage` |
| `attachCartKeyHeader(client)` | Patches `globalThis.fetch` to inject `X-Cart-Key` on same-origin requests |
