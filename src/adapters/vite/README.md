# Vite Adapter

[Vite](https://vite.dev/) is a frontend build tool for building fast, modern web applications with React, Vue, Svelte, Vanilla JS, and more. Unlike full-stack frameworks, Vite is browser-only — there is no server-side request handling built in.

The Vite adapter provides `createBrowserClient` and `attachCartKeyHeader` for client-side Vite apps. For the backend API layer, pair it with a server adapter that matches your backend framework (Fastify, Hono, Express, etc.).

## Installation

```bash
npm install @cocartheadless/sdk
```

## How It Works

1. **Browser**: The client stores the cart key in encrypted `localStorage` using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
2. **Navigation**: `attachCartKeyHeader()` wraps `globalThis.fetch` to automatically include an `X-Cart-Key` header on every same-origin request to your backend.
3. **Backend**: Your API server (Fastify, Hono, Express, etc.) reads the `X-Cart-Key` header using its own CoCart adapter.

No cookies are used at any point.

---

## Browser Client

Initialise the client once in a shared module. Call `attachCartKeyHeader()` to patch `fetch()` so the cart key is automatically sent with every same-origin request:

```ts
// src/lib/cocart.ts
import { createBrowserClient, attachCartKeyHeader } from '@cocartheadless/sdk/vite';
import { SessionManager } from '@cocartheadless/sdk';

const client = createBrowserClient(import.meta.env.VITE_COCART_STORE_URL, {
  encryptionKey: import.meta.env.VITE_COCART_ENCRYPTION_KEY,
});

await client.restoreSession();
attachCartKeyHeader(client);

const session = new SessionManager(client, client.getStorage());

if (!session.getCartKey()) {
  await session.initializeCart();
}

export { client, session };
```

Import this module once in your app entry (e.g. `src/main.ts`):

```ts
// src/main.ts
import './lib/cocart';
import { createApp } from 'vue'; // or React, Svelte, etc.
import App from './App.vue';

createApp(App).mount('#app');
```

---

## Adding Items to the Cart

```ts
// src/components/AddToCartButton.ts
import { client } from '../lib/cocart';

async function addToCart(productId: number, quantity = 1) {
  try {
    const response = await client.cart().addItem(productId, quantity);
    console.log('Added:', response.toObject());
  } catch (e) {
    console.error((e as Error).message);
  }
}
```

---

## Fetching the Cart

The cart is fetched from your backend API (which uses a server-side CoCart adapter). Here's how to call it from the browser:

```ts
// src/lib/api.ts

export async function getCart() {
  // fetch() automatically includes X-Cart-Key (set by attachCartKeyHeader)
  const res = await fetch('/api/cart');
  return res.json();
}

export async function addItem(productId: number, quantity: number) {
  const res = await fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  });
  return res.json();
}
```

---

## Pairing with a Backend

The Vite adapter handles only the browser side. Your backend needs its own CoCart adapter to read the `X-Cart-Key` header and create a server-side client:

| Backend | Import |
|---------|--------|
| Fastify | `@cocartheadless/sdk/fastify` |
| Hono | `@cocartheadless/sdk/hono` |
| Elysia.js (Bun) | `@cocartheadless/sdk/elysiajs` |
| Deno | `@cocartheadless/sdk/deno` |

### Example: Vite Frontend + Fastify Backend

```ts
// server/index.ts (Fastify)
import Fastify from 'fastify';
import { createServerClient } from '@cocartheadless/sdk/fastify';

const app = Fastify();
const STORE_URL = process.env.COCART_STORE_URL!;

app.get('/api/cart', async (request) => {
  const client = createServerClient(STORE_URL, request);
  const cart = await client.cart().get();
  return cart.toObject();
});

app.post('/api/cart/add', async (request) => {
  const client = createServerClient(STORE_URL, request);
  const { productId, quantity } = request.body as any;
  const response = await client.cart().addItem(productId, quantity);
  return response.toObject();
});

app.listen({ port: 3001 });
```

### Example: Vite Frontend + Hono Backend

```ts
// server/index.ts (Hono)
import { Hono } from 'hono';
import { createServerClient } from '@cocartheadless/sdk/hono';

const app = new Hono();
const STORE_URL = process.env.COCART_STORE_URL!;

app.get('/api/cart', async (c) => {
  const client = createServerClient(STORE_URL, c);
  const cart = await client.cart().get();
  return c.json(cart.toObject());
});

export default app;
```

Configure Vite to proxy `/api` requests to your backend during development:

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```

---

## Customer Authentication (Basic Auth)

For registered customers, pass `username` and `password` when creating the client. The credentials are sent with every API request:

```ts
import { createBrowserClient, attachCartKeyHeader } from '@cocartheadless/sdk/vite';

const client = createBrowserClient(import.meta.env.VITE_COCART_STORE_URL, {
  username: 'customer@example.com',
  password: 'their-password',
});

await client.restoreSession();
attachCartKeyHeader(client);
```

In practice, credentials come from a login form rather than being hardcoded. Use `SessionManager.loginWithJwt()` for a full login flow with cart merging.

---

## Environment Variables

Vite exposes variables prefixed with `VITE_` to browser code via `import.meta.env`. Variables without the prefix are server-only and **not** sent to the browser.

```env
# .env
# Browser-accessible (VITE_ prefix required)
VITE_COCART_STORE_URL=https://your-store.com
VITE_COCART_ENCRYPTION_KEY=your-secret-encryption-key
```

> **Important:** Never put consumer keys or other secrets in `VITE_`-prefixed variables — they will be visible in the browser bundle. Keep them in server-only environment variables.

---

## How `attachCartKeyHeader` Works

`attachCartKeyHeader()` wraps `globalThis.fetch` so that every same-origin request automatically includes an `X-Cart-Key` header with the current cart key. This means:

- Your backend API receives the cart key without cookies
- Cross-origin requests (e.g. direct calls to your WooCommerce store) are never modified
- If no cart key is set, no header is added

Call it once after creating the browser client and restoring the session.

---

## API Reference

| Export | Description |
|--------|-------------|
| `createBrowserClient(storeUrl, options?)` | Browser client — defaults to `localStorage`; pass `encryptionKey` for AES-256-GCM encryption |
| `attachCartKeyHeader(client)` | Patches `globalThis.fetch` to inject `X-Cart-Key` on same-origin requests |

> This adapter is browser-only. There is no `createServerClient` — use a backend adapter ([Fastify](../fastify/README.md), [Hono](../hono/README.md), [Elysia.js](../elysiajs/README.md), [Deno](../deno/README.md)) for your API layer.
