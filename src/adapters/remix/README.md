# Remix Framework Adapter

[Remix](https://remix.run/) is a full-stack web framework built on web standards. Loaders and actions run on the server, while route components run in the browser. This split means the server can't access the browser's `localStorage` where the cart key lives.

The Remix adapter solves this by passing the cart key from browser to server via a custom HTTP header (`X-Cart-Key`). Cart state is persisted in encrypted `localStorage` on the client — no cookies needed.

## Installation

```bash
npm install @cocartheadless/sdk
```

## How It Works

1. **Browser**: The client stores the cart key in encrypted `localStorage` using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
2. **Navigation**: `attachCartKeyHeader()` wraps `globalThis.fetch` to automatically include an `X-Cart-Key` header on every same-origin request.
3. **Server**: Loaders, actions, and resource routes read the `X-Cart-Key` header from the incoming `Request` to identify the cart.

No cookies are used at any point. This avoids GDPR consent banners, CORS restrictions, and cookie size limits.

---

## Browser Client

Initialise the browser client once in a shared module. Call `attachCartKeyHeader()` to patch `fetch()` so the cart key is automatically sent with every same-origin request:

```ts
// app/lib/cocart.ts
import { createBrowserClient, attachCartKeyHeader } from '@cocartheadless/sdk/remix';
import { SessionManager } from '@cocartheadless/sdk';

let client: ReturnType<typeof createBrowserClient> | null = null;
let session: SessionManager | null = null;

export async function getClient() {
  if (client) return client;

  client = createBrowserClient(import.meta.env.VITE_COCART_STORE_URL!, {
    encryptionKey: import.meta.env.VITE_COCART_ENCRYPTION_KEY!,
  });

  await client.restoreSession();
  attachCartKeyHeader(client);

  return client;
}

export async function getSession() {
  if (session) return session;

  const c = await getClient();
  session = new SessionManager(c, c.getStorage());

  if (!session.getCartKey()) {
    await session.initializeCart();
  }

  return session;
}
```

---

## Server Client

Use `createServerClient()` in loaders, actions, and resource routes. The `request` object from `LoaderFunctionArgs` / `ActionFunctionArgs` already carries the `X-Cart-Key` header:

```ts
// app/routes/cart.tsx
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { createServerClient } from '@cocartheadless/sdk/remix';

export async function loader({ request }: LoaderFunctionArgs) {
  const client = createServerClient(process.env.COCART_STORE_URL!, request);
  const cart = await client.cart().get();
  return json(cart.toObject());
}

export default function CartPage() {
  const cart = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Shopping Cart ({cart.item_count} items)</h1>
      {cart.items?.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul>
          {cart.items?.map((item: any) => (
            <li key={item.item_key}>
              {item.name} — Qty: {item.quantity} — {item.totals?.total}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Basic Auth

For registered customers, pass their `username` and `password`:

```ts
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { createServerClient } from '@cocartheadless/sdk/remix';

export async function loader({ request }: LoaderFunctionArgs) {
  const client = createServerClient(process.env.COCART_STORE_URL!, request, {
    username: 'customer@example.com',
    password: 'their-password',
  });

  const cart = await client.cart().get();
  return json(cart.toObject());
}
```

### Admin Operations (Consumer Keys)

Consumer keys are WooCommerce admin credentials. Use them only for admin-level APIs such as the Sessions API:

```ts
import type { LoaderFunctionArgs } from '@remix-run/node';
import { createServerClient } from '@cocartheadless/sdk/remix';

export async function loader({ request }: LoaderFunctionArgs) {
  const client = createServerClient(process.env.COCART_STORE_URL!, request, {
    consumerKey: process.env.COCART_CONSUMER_KEY!,
    consumerSecret: process.env.COCART_CONSUMER_SECRET!,
  });

  const sessions = await client.sessions().all();
  return sessions.toObject();
}
```

---

## Resource Routes

Use resource routes for API-style endpoints:

```ts
// app/routes/api.cart.add.tsx
import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { createServerClient } from '@cocartheadless/sdk/remix';

export async function action({ request }: ActionFunctionArgs) {
  const client = createServerClient(process.env.COCART_STORE_URL!, request);
  const body = await request.json();

  try {
    const response = await client.cart().addItem(body.productId, body.quantity);
    return json(response.toObject());
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 400 });
  }
}
```

```ts
// app/routes/api.cart.$itemKey.delete.tsx
import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { createServerClient } from '@cocartheadless/sdk/remix';

export async function action({ request, params }: ActionFunctionArgs) {
  const client = createServerClient(process.env.COCART_STORE_URL!, request);
  const response = await client.cart().removeItem(params.itemKey!);
  return json(response.toObject());
}
```

---

## Full Example: Add to Cart

```tsx
// app/components/AddToCartButton.tsx
import { useState } from 'react';
import { getClient } from '~/lib/cocart';

export function AddToCartButton({ productId }: { productId: number }) {
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const client = await getClient();
      await client.cart().addItem(productId, 1);
      window.location.reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleAdd} disabled={loading}>
      {loading ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

### Guest-to-Customer Login

```tsx
// app/components/LoginForm.tsx
import { useState } from 'react';
import { getSession } from '~/lib/cocart';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = await getSession();
    await session.loginWithJwt(email, password, true);
    window.location.href = '/cart';
  };

  return (
    <form onSubmit={handleLogin}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## Environment Variables

```env
# .env
COCART_STORE_URL=https://your-store.com

# Exposed to browser (Vite prefix)
VITE_COCART_STORE_URL=https://your-store.com
VITE_COCART_ENCRYPTION_KEY=your-secret-encryption-key

# Only needed for admin/server-side operations
COCART_CONSUMER_KEY=ck_xxxxx
COCART_CONSUMER_SECRET=cs_xxxxx
```

> **Important:** In Remix (with Vite), only variables prefixed with `VITE_` are available in browser code via `import.meta.env`. Server-only variables (no prefix) are never sent to the browser. Always keep consumer keys server-side only.

---

## How `attachCartKeyHeader` Works

`attachCartKeyHeader()` wraps `globalThis.fetch` so that every same-origin request automatically includes an `X-Cart-Key` header with the current cart key. This means:

- Loaders and actions receive the cart key without cookies
- Resource routes receive the cart key without cookies
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
