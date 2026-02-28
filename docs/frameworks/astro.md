# Astro Framework Adapter

[Astro](https://astro.build/) is a web framework for building content-driven websites. It supports **server-side rendering (SSR)** — meaning your pages can be rendered on the server before being sent to the browser. This is great for SEO and performance, but it creates a challenge: the server doesn't have access to the browser's `localStorage` where the cart key is stored.

The Astro adapter solves this by using a custom HTTP header (`X-Cart-Key`) to pass the cart key from the browser to the server on each navigation. Cart state is persisted in encrypted `localStorage` on the client — no cookies needed.

## Installation

```bash
npm install @cocart/sdk
```

## How It Works

Here's the flow of data between the browser and server:

1. **Browser**: The client stores the cart key in encrypted `localStorage` using the [Web Crypto API](../sessions.md#encryptedstorage) — a browser-native encryption API that secures the data without any extra libraries.
2. **Navigation**: When the user navigates to a new page, `attachCartKeyHeader()` automatically adds an `X-Cart-Key` header to the request. This is done by wrapping the browser's built-in `fetch()` function — your code doesn't need to change.
3. **Server**: Astro SSR reads the `X-Cart-Key` header from the incoming request to identify which cart belongs to this visitor.

No cookies are used at any point. This avoids common cookie issues like GDPR consent banners, CORS restrictions, and cookie size limits.

---

## Browser Client

Create a CoCart client for use in client-side components and scripts:

```ts
import { createBrowserClient, attachCartKeyHeader } from '@cocart/sdk/astro';

const client = createBrowserClient('https://your-store.com', {
  encryptionKey: 'your-secret-encryption-key',
});

// Restore any existing session from encrypted localStorage
await client.restoreSession();

// Patch fetch() to send X-Cart-Key header to your Astro server
attachCartKeyHeader(client);
```

### Options

`createBrowserClient()` accepts all standard [CoCart options](../installation.md) plus a required `encryptionKey`:

```ts
const client = createBrowserClient('https://your-store.com', {
  encryptionKey: 'your-secret-encryption-key',
  timeout: 15000,
  maxRetries: 2,
});
```

---

## Server Client (SSR)

Create a CoCart client in your Astro page or API route. The cart key is read from the incoming request's `X-Cart-Key` header:

```ts
---
// src/pages/cart.astro
import { createServerClient } from '@cocart/sdk/astro';

const client = createServerClient('https://your-store.com', Astro.request);
const cart = await client.cart().get();
const items = cart.getItems();
---

<h1>Your Cart ({cart.getItemCount()} items)</h1>
<ul>
  {items.map((item: any) => (
    <li>{item.name} — {item.quantity} × {item.price}</li>
  ))}
</ul>
```

### With Authentication

Pass consumer keys or other options for authenticated server-side requests:

```ts
---
import { createServerClient } from '@cocart/sdk/astro';

const client = createServerClient('https://your-store.com', Astro.request, {
  consumerKey: 'ck_xxxxx',
  consumerSecret: 'cs_xxxxx',
});

const sessions = await client.sessions().all();
---
```

---

## API Routes

Use the server client in Astro API routes:

```ts
// src/pages/api/cart/add.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '@cocart/sdk/astro';

export const POST: APIRoute = async ({ request }) => {
  const client = createServerClient('https://your-store.com', request);
  const body = await request.json();

  try {
    const response = await client.cart().addItem(body.productId, body.quantity);
    return new Response(response.toJson(), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

---

## Full Example: Cart Page

### Client-Side Setup

```ts
// src/lib/cocart.ts
import { createBrowserClient, attachCartKeyHeader } from '@cocart/sdk/astro';
import { SessionManager } from '@cocart/sdk';

const client = createBrowserClient('https://your-store.com', {
  encryptionKey: import.meta.env.PUBLIC_COCART_ENCRYPTION_KEY,
});

await client.restoreSession();
attachCartKeyHeader(client);

const session = new SessionManager(client, client.getStorage());

// Initialize a guest cart if none exists
if (!session.getCartKey()) {
  await session.initializeCart();
}

export { client, session };
```

### Server-Side Cart Page

```ts
---
// src/pages/cart.astro
import { createServerClient } from '@cocart/sdk/astro';

const client = createServerClient(
  import.meta.env.COCART_STORE_URL,
  Astro.request,
);

const cart = await client.cart().get();
---

<html>
  <body>
    <h1>Shopping Cart</h1>

    {cart.isEmpty() ? (
      <p>Your cart is empty.</p>
    ) : (
      <>
        <ul>
          {cart.getItems().map((item: any) => (
            <li>
              {item.name} — Qty: {item.quantity} — {item.totals.total}
            </li>
          ))}
        </ul>
        <p>Total: {cart.get('totals.total')}</p>
      </>
    )}

    <script>
      import { client } from '../lib/cocart';

      document.querySelectorAll('.remove-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const itemKey = (e.target as HTMLElement).dataset.itemKey!;
          await client.cart().removeItem(itemKey);
          location.reload();
        });
      });
    </script>
  </body>
</html>
```

### Guest-to-Customer Login

```ts
// src/pages/api/auth/login.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '@cocart/sdk/astro';
import { SessionManager } from '@cocart/sdk';

export const POST: APIRoute = async ({ request }) => {
  const client = createServerClient('https://your-store.com', request);
  const session = new SessionManager(client);

  const { email, password } = await request.json();

  const response = await session.loginWithJwt(email, password, true);

  return new Response(response.toJson(), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

---

## Environment Variables

**Environment variables** are configuration values stored outside your code (usually in a `.env` file). This keeps secrets like API keys out of your source code and version control. Astro loads them automatically from a `.env` file in your project root.

```env
# .env
COCART_STORE_URL=https://your-store.com
PUBLIC_COCART_ENCRYPTION_KEY=your-secret-encryption-key

# Only needed for admin/server-side operations
COCART_CONSUMER_KEY=ck_xxxxx
COCART_CONSUMER_SECRET=cs_xxxxx
```

> **Important:** In Astro, only variables prefixed with `PUBLIC_` are available in client-side (browser) code. Variables without the prefix are only accessible on the server. Always keep sensitive credentials like consumer keys server-side only.

---

## How `attachCartKeyHeader` Works

`attachCartKeyHeader()` wraps `globalThis.fetch` so that every same-origin request automatically includes an `X-Cart-Key` header with the current cart key. This means:

- Astro SSR pages receive the cart key without cookies
- API routes receive the cart key without cookies
- Cross-origin requests are never modified
- If no cart key is set, no header is added

Call it once after creating the browser client and restoring the session.
