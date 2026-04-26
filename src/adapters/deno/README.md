# Deno Adapter

[Deno](https://deno.com/) is a secure JavaScript/TypeScript runtime. Unlike browsers, Deno does not provide `localStorage`, so the cart key must be managed differently. This adapter uses `MemoryStorage` (per-request, in-memory) and reads the cart key from the incoming request's `X-Cart-Key` header.

## Installation

```bash
deno add npm:@cocartheadless/sdk
```

Or import directly:

```ts
import { createServerClient } from 'npm:@cocartheadless/sdk/deno';
```

## How It Works

1. **Server**: Each incoming request carries an `X-Cart-Key` header — sent automatically by the browser via `attachCartKeyHeader()`.
2. **Handler**: `createServerClient()` reads the header and initialises a per-request `MemoryStorage` client.
3. **Browser islands** (e.g. Deno Fresh): use `createClient()` with `attachCartKeyHeader()` to inject the key into outbound fetch calls.

No cookies are used at any point.

---

## Server Client

Use `createServerClient()` inside a `Deno.serve()` handler or a Deno Fresh API route:

```ts
import { createServerClient } from '@cocartheadless/sdk/deno';

Deno.serve(async (req) => {
  const client = createServerClient('https://your-store.com', req);
  const cart = await client.cart().get();

  return Response.json(cart.toObject());
});
```

### Basic Auth

For registered customers, pass their `username` and `password`:

```ts
import { createServerClient } from '@cocartheadless/sdk/deno';

Deno.serve(async (req) => {
  const client = createServerClient('https://your-store.com', req, {
    username: 'customer@example.com',
    password: 'their-password',
  });

  const cart = await client.cart().get();
  return Response.json(cart.toObject());
});
```

### Admin Operations (Consumer Keys)

Consumer keys are WooCommerce admin credentials. Use them only for admin-level APIs such as the Sessions API:

```ts
import { createServerClient } from '@cocartheadless/sdk/deno';

Deno.serve(async (req) => {
  const client = createServerClient('https://your-store.com', req, {
    consumerKey: Deno.env.get('COCART_CONSUMER_KEY')!,
    consumerSecret: Deno.env.get('COCART_CONSUMER_SECRET')!,
  });

  const sessions = await client.sessions().all();
  return Response.json(sessions.toObject());
});
```

---

## Client (Browser Islands)

Deno Fresh browser islands run in the browser where `localStorage` is available. Use `createClient()` to create a browser-side CoCart instance, then call `attachCartKeyHeader()` to inject the cart key into same-origin fetch requests:

```ts
import { createClient, attachCartKeyHeader } from '@cocartheadless/sdk/deno';
import { SessionManager } from '@cocartheadless/sdk';

const client = createClient('https://your-store.com');

// Restore any existing session from localStorage
await client.restoreSession();

// Patch fetch() to send X-Cart-Key header to your Deno server
attachCartKeyHeader(client);

const session = new SessionManager(client, client.getStorage());

if (!session.getCartKey()) {
  await session.initializeCart();
}

export { client, session };
```

> **Note:** `createClient()` uses `MemoryStorage` by default. In Deno server contexts this is intentional (per-request isolation). In browser islands, if you want the cart key to survive page navigations, pass an `encryptionKey` so the SDK uses encrypted `localStorage`:
>
> ```ts
> const client = createClient('https://your-store.com', {
>   encryptionKey: 'your-secret-encryption-key',
> });
> ```

---

## Deno Fresh Example

### API Route — Get Cart

```ts
// routes/api/cart.ts
import { Handlers } from '$fresh/server.ts';
import { createServerClient } from '@cocartheadless/sdk/deno';

export const handler: Handlers = {
  async GET(req) {
    const client = createServerClient('https://your-store.com', req);
    const cart = await client.cart().get();
    return Response.json(cart.toObject());
  },
};
```

### API Route — Add Item

```ts
// routes/api/cart/add.ts
import { Handlers } from '$fresh/server.ts';
import { createServerClient } from '@cocartheadless/sdk/deno';

export const handler: Handlers = {
  async POST(req) {
    const client = createServerClient('https://your-store.com', req);
    const body = await req.json();

    try {
      const response = await client.cart().addItem(body.productId, body.quantity);
      return Response.json(response.toObject());
    } catch (e) {
      return Response.json(
        { error: (e as Error).message },
        { status: 400 },
      );
    }
  },
};
```

### Island — Add to Cart Button

```tsx
// islands/AddToCartButton.tsx
import { useState } from 'preact/hooks';
import { client } from '../lib/cocart.ts';

export default function AddToCartButton({ productId }: { productId: number }) {
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
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

---

## Environment Variables

```env
# .env
COCART_STORE_URL=https://your-store.com

# Only needed for admin/server-side operations
COCART_CONSUMER_KEY=ck_xxxxx
COCART_CONSUMER_SECRET=cs_xxxxx
```

Access them in Deno with `Deno.env.get('COCART_STORE_URL')`.

---

## How `attachCartKeyHeader` Works

`attachCartKeyHeader()` wraps `globalThis.fetch` so that every same-origin request automatically includes an `X-Cart-Key` header with the current cart key. This means:

- Deno server handlers receive the cart key without cookies
- Cross-origin requests are never modified
- If no cart key is set, no header is added

Call it once after creating the client and restoring the session.

---

## API Reference

| Export | Description |
|--------|-------------|
| `createServerClient(storeUrl, request, options?)` | Server client — reads cart key from `X-Cart-Key` header, uses `MemoryStorage` |
| `createClient(storeUrl, options?)` | General-purpose client — uses `MemoryStorage` by default; pass `encryptionKey` for browser `localStorage` |
| `attachCartKeyHeader(client)` | Patches `globalThis.fetch` to inject `X-Cart-Key` on same-origin requests |
