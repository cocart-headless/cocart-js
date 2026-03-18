# SvelteKit Framework Adapter

[SvelteKit](https://kit.svelte.dev/) is a full-stack Svelte framework with server-side rendering (SSR). `load` functions, hooks, and server routes run on the server, while Svelte components run in the browser. This split means the server can't access the browser's `localStorage` where the cart key lives.

The SvelteKit adapter solves this by passing the cart key from browser to server via a custom HTTP header (`X-Cart-Key`). Cart state is persisted in encrypted `localStorage` on the client — no cookies needed.

## Installation

```bash
npm install @cocart/sdk
```

## How It Works

1. **Browser**: The client stores the cart key in encrypted `localStorage` using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
2. **Navigation**: `attachCartKeyHeader()` wraps `globalThis.fetch` to automatically include an `X-Cart-Key` header on every same-origin request.
3. **Server**: Server `load` functions and hooks receive the `RequestEvent` — the adapter reads `event.request.headers.get('X-Cart-Key')` to identify the cart.

No cookies are used at any point. This avoids GDPR consent banners, CORS restrictions, and cookie size limits.

---

## Browser Client

Initialise the browser client in a shared module that runs on the client. A good place is a `+layout.ts` or a dedicated `lib/cocart.ts` file:

```ts
// src/lib/cocart.ts
import { createBrowserClient, attachCartKeyHeader } from '@cocart/sdk/svelte';
import { SessionManager } from '@cocart/sdk';
import { PUBLIC_COCART_STORE_URL, PUBLIC_COCART_ENCRYPTION_KEY } from '$env/static/public';

const client = createBrowserClient(PUBLIC_COCART_STORE_URL, {
  encryptionKey: PUBLIC_COCART_ENCRYPTION_KEY,
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

## Server Client

Use `createServerClient()` in server `load` functions and server routes. The `event` parameter from SvelteKit's `load` function already carries the `X-Cart-Key` header:

```ts
// src/routes/cart/+page.server.ts
import type { PageServerLoadEvent } from './$types';
import { createServerClient } from '@cocart/sdk/svelte';
import { COCART_STORE_URL } from '$env/static/private';

export async function load(event: PageServerLoadEvent) {
  const client = createServerClient(COCART_STORE_URL, event);
  const cart = await client.cart().get();
  return { cart: cart.toObject() };
}
```

In the page component:

```svelte
<!-- src/routes/cart/+page.svelte -->
<script lang="ts">
  export let data;
  const { cart } = data;
</script>

<h1>Shopping Cart ({cart.item_count} items)</h1>

{#if !cart.items?.length}
  <p>Your cart is empty.</p>
{:else}
  <ul>
    {#each cart.items as item (item.item_key)}
      <li>{item.name} — Qty: {item.quantity} — {item.totals?.total}</li>
    {/each}
  </ul>
{/if}
```

### Basic Auth

For registered customers, pass their `username` and `password`:

```ts
import type { PageServerLoadEvent } from './$types';
import { createServerClient } from '@cocart/sdk/svelte';
import { COCART_STORE_URL } from '$env/static/private';

export async function load(event: PageServerLoadEvent) {
  const client = createServerClient(COCART_STORE_URL, event, {
    username: 'customer@example.com',
    password: 'their-password',
  });

  const cart = await client.cart().get();
  return { cart: cart.toObject() };
}
```

### Admin Operations (Consumer Keys)

Consumer keys are WooCommerce admin credentials. Use them only for admin-level APIs such as the Sessions API:

```ts
import type { PageServerLoadEvent } from './$types';
import { createServerClient } from '@cocart/sdk/svelte';
import { COCART_STORE_URL, COCART_CONSUMER_KEY, COCART_CONSUMER_SECRET } from '$env/static/private';

export async function load(event: PageServerLoadEvent) {
  const client = createServerClient(COCART_STORE_URL, event, {
    consumerKey: COCART_CONSUMER_KEY,
    consumerSecret: COCART_CONSUMER_SECRET,
  });

  const sessions = await client.sessions().all();
  return { sessions: sessions.toObject() };
}
```

---

## Server Routes (Endpoints)

```ts
// src/routes/api/cart/+server.ts
import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { createServerClient } from '@cocart/sdk/svelte';
import { COCART_STORE_URL } from '$env/static/private';

export async function GET(event: RequestEvent) {
  const client = createServerClient(COCART_STORE_URL, event);
  const cart = await client.cart().get();
  return json(cart.toObject());
}
```

```ts
// src/routes/api/cart/add/+server.ts
import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { createServerClient } from '@cocart/sdk/svelte';
import { COCART_STORE_URL } from '$env/static/private';

export async function POST(event: RequestEvent) {
  const client = createServerClient(COCART_STORE_URL, event);
  const body = await event.request.json();

  try {
    const response = await client.cart().addItem(body.productId, body.quantity);
    return json(response.toObject());
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 400 });
  }
}
```

---

## Full Example: Add to Cart Button

```svelte
<!-- src/lib/components/AddToCartButton.svelte -->
<script lang="ts">
  import { client } from '$lib/cocart';

  export let productId: number;

  let loading = false;

  async function handleAdd() {
    loading = true;
    try {
      await client.cart().addItem(productId, 1);
      window.location.reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      loading = false;
    }
  }
</script>

<button on:click={handleAdd} disabled={loading}>
  {loading ? 'Adding...' : 'Add to Cart'}
</button>
```

### Guest-to-Customer Login

```svelte
<!-- src/lib/components/LoginForm.svelte -->
<script lang="ts">
  import { session } from '$lib/cocart';

  let email = '';
  let password = '';

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    await session.loginWithJwt(email, password, true);
    window.location.href = '/cart';
  }
</script>

<form on:submit={handleLogin}>
  <input type="email" bind:value={email} />
  <input type="password" bind:value={password} />
  <button type="submit">Login</button>
</form>
```

---

## Environment Variables

SvelteKit has two types of environment variables:

```env
# .env
# Public (accessible in browser via $env/static/public)
PUBLIC_COCART_STORE_URL=https://your-store.com
PUBLIC_COCART_ENCRYPTION_KEY=your-secret-encryption-key

# Private / server-only (accessible via $env/static/private)
COCART_STORE_URL=https://your-store.com
COCART_CONSUMER_KEY=ck_xxxxx
COCART_CONSUMER_SECRET=cs_xxxxx
```

> **Important:** In SvelteKit, only variables prefixed with `PUBLIC_` can be imported in browser code via `$env/static/public`. Private variables (via `$env/static/private`) are only available in server-side code. Always keep consumer keys private.

---

## How `attachCartKeyHeader` Works

`attachCartKeyHeader()` wraps `globalThis.fetch` so that every same-origin request automatically includes an `X-Cart-Key` header with the current cart key. This means:

- Server `load` functions receive the cart key without cookies
- API endpoints receive the cart key without cookies
- Cross-origin requests are never modified
- If no cart key is set, no header is added

Call it once after creating the browser client and restoring the session.

---

## API Reference

| Export | Description |
|--------|-------------|
| `createBrowserClient(storeUrl, options?)` | Browser client — defaults to `localStorage`; pass `encryptionKey` for AES-256-GCM encryption |
| `createServerClient(storeUrl, event, options?)` | Server client — reads cart key from `X-Cart-Key` header in `RequestEvent`, uses `MemoryStorage` |
| `attachCartKeyHeader(client)` | Patches `globalThis.fetch` to inject `X-Cart-Key` on same-origin requests |
