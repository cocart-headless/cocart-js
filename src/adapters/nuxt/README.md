# Nuxt Framework Adapter

[Nuxt](https://nuxt.com/) is a full-stack Vue framework with server-side rendering (SSR). Pages and server routes run on the server, while interactive components run in the browser. This split means the server can't access the browser's `localStorage` where the cart key lives.

The Nuxt adapter solves this by passing the cart key from browser to server via a custom HTTP header (`X-Cart-Key`). Cart state is persisted in encrypted `localStorage` on the client — no cookies needed.

## Installation

```bash
npm install @cocartheadless/sdk
```

## How It Works

1. **Browser**: The client stores the cart key in encrypted `localStorage` using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
2. **Navigation**: `attachCartKeyHeader()` wraps `globalThis.fetch` to automatically include an `X-Cart-Key` header on every same-origin request.
3. **Server**: Nuxt server routes and event handlers read the `X-Cart-Key` header from the incoming H3 event to identify the cart.

No cookies are used at any point. This avoids GDPR consent banners, CORS restrictions, and cookie size limits.

---

## Browser Client

Use `createBrowserClient()` inside a Nuxt plugin or composable. Plugins registered on the client side are the right place to initialise CoCart and call `attachCartKeyHeader()`:

```ts
// plugins/cocart.client.ts
import { createBrowserClient, attachCartKeyHeader } from '@cocartheadless/sdk/nuxt';
import { SessionManager } from '@cocartheadless/sdk';

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig();

  const client = createBrowserClient(config.public.cocartStoreUrl, {
    encryptionKey: config.public.cocartEncryptionKey,
  });

  await client.restoreSession();
  attachCartKeyHeader(client);

  const session = new SessionManager(client, client.getStorage());

  if (!session.getCartKey()) {
    await session.initializeCart();
  }

  return {
    provide: { cocart: client, cocartSession: session },
  };
});
```

Access the client in components via `useNuxtApp().$cocart`.

---

## Server Client

Use `createServerClient()` in Nuxt server routes and API handlers. The cart key is read from the incoming H3 event's request headers:

```ts
// server/api/cart/index.get.ts
import { createServerClient } from '@cocartheadless/sdk/nuxt';

export default defineEventHandler(async (event) => {
  const client = createServerClient(
    process.env.COCART_STORE_URL!,
    event,
  );

  const cart = await client.cart().get();
  return cart.toObject();
});
```

### Basic Auth

For registered customers, pass their `username` and `password`:

```ts
// server/api/cart/index.get.ts
import { createServerClient } from '@cocartheadless/sdk/nuxt';

export default defineEventHandler(async (event) => {
  const client = createServerClient(
    process.env.COCART_STORE_URL!,
    event,
    {
      username: 'customer@example.com',
      password: 'their-password',
    },
  );

  const cart = await client.cart().get();
  return cart.toObject();
});
```

### Admin Operations (Consumer Keys)

Consumer keys are WooCommerce admin credentials. Use them only for admin-level APIs such as the Sessions API:

```ts
// server/api/sessions/index.get.ts
import { createServerClient } from '@cocartheadless/sdk/nuxt';

export default defineEventHandler(async (event) => {
  const client = createServerClient(
    process.env.COCART_STORE_URL!,
    event,
    {
      consumerKey: process.env.COCART_CONSUMER_KEY!,
      consumerSecret: process.env.COCART_CONSUMER_SECRET!,
    },
  );

  const sessions = await client.sessions().all();
  return sessions.toObject();
});
```

---

## Server Routes

```ts
// server/api/cart/add.post.ts
import { createServerClient } from '@cocartheadless/sdk/nuxt';

export default defineEventHandler(async (event) => {
  const client = createServerClient(process.env.COCART_STORE_URL!, event);
  const body = await readBody(event);

  try {
    const response = await client.cart().addItem(body.productId, body.quantity);
    return response.toObject();
  } catch (e) {
    throw createError({
      statusCode: 400,
      statusMessage: (e as Error).message,
    });
  }
});
```

```ts
// server/api/cart/[itemKey].delete.ts
import { createServerClient } from '@cocartheadless/sdk/nuxt';

export default defineEventHandler(async (event) => {
  const client = createServerClient(process.env.COCART_STORE_URL!, event);
  const itemKey = getRouterParam(event, 'itemKey')!;

  const response = await client.cart().removeItem(itemKey);
  return response.toObject();
});
```

---

## Full Example: E-commerce Cart

### Composable — Cart State

```ts
// composables/useCart.ts
export function useCart() {
  const { $cocart } = useNuxtApp();

  const addItem = async (productId: number, quantity = 1) => {
    await $cocart.cart().addItem(productId, quantity);
    await refreshNuxtData('cart');
  };

  const removeItem = async (itemKey: string) => {
    await $cocart.cart().removeItem(itemKey);
    await refreshNuxtData('cart');
  };

  return { addItem, removeItem };
}
```

### Page Component — Cart

```vue
<!-- pages/cart.vue -->
<script setup lang="ts">
const { data: cart } = await useFetch('/api/cart');
const { removeItem } = useCart();
</script>

<template>
  <div>
    <h1>Shopping Cart</h1>

    <p v-if="!cart?.items?.length">Your cart is empty.</p>

    <ul v-else>
      <li v-for="item in cart.items" :key="item.item_key">
        {{ item.name }} — Qty: {{ item.quantity }}
        <button @click="removeItem(item.item_key)">Remove</button>
      </li>
    </ul>
  </div>
</template>
```

### Guest-to-Customer Login

```ts
// server/api/auth/login.post.ts
import { createServerClient } from '@cocartheadless/sdk/nuxt';
import { SessionManager } from '@cocartheadless/sdk';

export default defineEventHandler(async (event) => {
  const client = createServerClient(process.env.COCART_STORE_URL!, event);
  const session = new SessionManager(client);
  const body = await readBody(event);

  const response = await session.loginWithJwt(body.email, body.password, true);
  return response.toObject();
});
```

---

## Environment Variables

Add to your `nuxt.config.ts` and `.env`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // Server-only (not exposed to browser)
    cocartConsumerKey: '',
    cocartConsumerSecret: '',
    // Public (accessible in browser via useRuntimeConfig().public)
    public: {
      cocartStoreUrl: '',
      cocartEncryptionKey: '',
    },
  },
});
```

```env
# .env
NUXT_PUBLIC_COCART_STORE_URL=https://your-store.com
NUXT_PUBLIC_COCART_ENCRYPTION_KEY=your-secret-encryption-key

# Only needed for admin/server-side operations
NUXT_COCART_CONSUMER_KEY=ck_xxxxx
NUXT_COCART_CONSUMER_SECRET=cs_xxxxx
```

> **Important:** Variables in `runtimeConfig.public` are exposed to the browser. Never put consumer keys there — keep them in `runtimeConfig` (server-only).

---

## How `attachCartKeyHeader` Works

`attachCartKeyHeader()` wraps `globalThis.fetch` so that every same-origin request automatically includes an `X-Cart-Key` header with the current cart key. This means:

- Nuxt server routes receive the cart key without cookies
- Cross-origin requests are never modified
- If no cart key is set, no header is added

Call it once in a client-side Nuxt plugin after creating the browser client and restoring the session.

---

## API Reference

| Export | Description |
|--------|-------------|
| `createBrowserClient(storeUrl, options?)` | Browser client — defaults to `localStorage`; pass `encryptionKey` for AES-256-GCM encryption |
| `createServerClient(storeUrl, event, options?)` | Server client — reads cart key from `x-cart-key` header in H3Event, uses `MemoryStorage` |
| `attachCartKeyHeader(client)` | Patches `globalThis.fetch` to inject `X-Cart-Key` on same-origin requests |
