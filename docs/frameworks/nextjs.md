# Next.js Framework Adapter

[Next.js](https://nextjs.org/) is a React framework for building full-stack web applications. It supports both **Server Components** (code that runs on the server) and **Client Components** (code that runs in the browser). This split creates a challenge: Server Components can't access the browser's `localStorage` where the cart key is stored.

The Next.js adapter solves this the same way as the Astro adapter — by passing the cart key from browser to server via a custom HTTP header (`X-Cart-Key`). Cart state is persisted in encrypted `localStorage` on the client — no cookies needed.

## Installation

```bash
npm install @cocart/sdk
```

## How It Works

Here's the flow of data between the browser and server:

1. **Browser**: The client stores the cart key in encrypted `localStorage` using the [Web Crypto API](../sessions.md#encryptedstorage) — a browser-native encryption API that secures the data without any extra libraries.
2. **Navigation**: When the user navigates or makes a request, `attachCartKeyHeader()` automatically adds an `X-Cart-Key` header. This is done by wrapping the browser's built-in `fetch()` function — your code doesn't need to change.
3. **Server**: Server Components and Route Handlers read the `X-Cart-Key` header from the incoming request to identify which cart belongs to this visitor.

No cookies are used at any point. This avoids common cookie issues like GDPR consent banners, CORS restrictions, and cookie size limits.

---

## Browser Client

**Client Components** (marked with `'use client'` at the top) run in the browser. This is where you create the browser CoCart client and handle interactive actions like "Add to Cart" buttons:

```ts
// lib/cocart.ts
'use client';

import { createBrowserClient, attachCartKeyHeader } from '@cocart/sdk/nextjs';
import { SessionManager } from '@cocart/sdk';

let client: ReturnType<typeof createBrowserClient> | null = null;
let session: SessionManager | null = null;

export async function getClient() {
  if (client) return client;

  client = createBrowserClient(process.env.NEXT_PUBLIC_COCART_STORE_URL!, {
    encryptionKey: process.env.NEXT_PUBLIC_COCART_ENCRYPTION_KEY!,
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

## Server Client (App Router)

**Server Components** run on the server (no `'use client'` directive). They can't access `localStorage` or browser APIs, but they can read incoming request headers. The server client reads the `X-Cart-Key` header to identify the cart:

> **What is the App Router?** It's Next.js's modern routing system (introduced in Next.js 13). Pages live in the `app/` directory. If your project uses the older `pages/` directory, you're on the Pages Router — the adapter still works but you'll pass `req.headers` instead of `headers()`.

### Server Component

```tsx
// app/cart/page.tsx
import { headers } from 'next/headers';
import { createServerClient } from '@cocart/sdk/nextjs';

export default async function CartPage() {
  const headersList = await headers();
  const client = createServerClient(process.env.COCART_STORE_URL!, headersList);
  const cart = await client.cart().get();

  return (
    <div>
      <h1>Shopping Cart ({cart.getItemCount()} items)</h1>

      {cart.isEmpty() ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul>
          {cart.getItems().map((item: any) => (
            <li key={item.item_key}>
              {item.name} — Qty: {item.quantity} — {item.totals.total}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### With Authentication

```ts
import { headers } from 'next/headers';
import { createServerClient } from '@cocart/sdk/nextjs';

const headersList = await headers();
const client = createServerClient(process.env.COCART_STORE_URL!, headersList, {
  consumerKey: process.env.COCART_CONSUMER_KEY!,
  consumerSecret: process.env.COCART_CONSUMER_SECRET!,
});

const sessions = await client.sessions().all();
```

---

## Route Handlers

Use the server client in Next.js Route Handlers:

```ts
// app/api/cart/add/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@cocart/sdk/nextjs';

export async function POST(request: NextRequest) {
  const client = createServerClient(
    process.env.COCART_STORE_URL!,
    request.headers,
  );

  const body = await request.json();

  try {
    const response = await client.cart().addItem(body.productId, body.quantity);
    return NextResponse.json(response.toObject());
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}
```

### Get Cart

```ts
// app/api/cart/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@cocart/sdk/nextjs';

export async function GET(request: NextRequest) {
  const client = createServerClient(
    process.env.COCART_STORE_URL!,
    request.headers,
  );

  const cart = await client.cart().get();
  return NextResponse.json(cart.toObject());
}
```

---

## Middleware

**Middleware** is code that runs _before_ a request reaches your page or API route. In Next.js, it lives in a `middleware.ts` file at the root of your project. Here, we use it to forward the `X-Cart-Key` header so that Server Components can read it. Without this, Next.js may strip custom headers before they reach your page:

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Forward X-Cart-Key header so Server Components can read it
  const cartKey = request.headers.get('X-Cart-Key');
  if (cartKey) {
    response.headers.set('X-Cart-Key', cartKey);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Full Example: E-commerce Cart

### Client Component — Add to Cart

```tsx
// components/AddToCartButton.tsx
'use client';

import { useState } from 'react';
import { getClient } from '@/lib/cocart';

export function AddToCartButton({ productId }: { productId: number }) {
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const client = await getClient();
      await client.cart().addItem(productId, 1);
      // Refresh server data
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

### Client Component — Cart Actions

```tsx
// components/CartActions.tsx
'use client';

import { getClient } from '@/lib/cocart';

export function RemoveItemButton({ itemKey }: { itemKey: string }) {
  const handleRemove = async () => {
    const client = await getClient();
    await client.cart().removeItem(itemKey);
    window.location.reload();
  };

  return <button onClick={handleRemove}>Remove</button>;
}

export function UpdateQuantityButton({
  itemKey,
  quantity,
}: {
  itemKey: string;
  quantity: number;
}) {
  const handleUpdate = async () => {
    const client = await getClient();
    await client.cart().updateItem(itemKey, quantity);
    window.location.reload();
  };

  return <button onClick={handleUpdate}>Update</button>;
}
```

### Server Component — Product Listing

```tsx
// app/products/page.tsx
import { CoCart } from '@cocart/sdk';
import { AddToCartButton } from '@/components/AddToCartButton';

export default async function ProductsPage() {
  // Products are public — no auth needed
  const client = new CoCart(process.env.COCART_STORE_URL!);
  const response = await client.products().all({ per_page: '12' });
  const products = response.toObject() as any[];

  return (
    <div>
      <h1>Products</h1>
      <div className="grid">
        {products.map((product) => (
          <div key={product.id}>
            <h2>{product.name}</h2>
            <p>{product.price}</p>
            <AddToCartButton productId={product.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Guest-to-Customer Login

```tsx
// components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { getSession } from '@/lib/cocart';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = await getSession();

    // Login with JWT and merge guest cart into customer cart
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

**Environment variables** are configuration values stored outside your code (usually in a `.env.local` file). This keeps secrets like API keys out of your source code and version control. Next.js loads them automatically.

```env
# .env.local
COCART_STORE_URL=https://your-store.com
NEXT_PUBLIC_COCART_STORE_URL=https://your-store.com
NEXT_PUBLIC_COCART_ENCRYPTION_KEY=your-secret-encryption-key

# Only needed for admin/server-side operations
COCART_CONSUMER_KEY=ck_xxxxx
COCART_CONSUMER_SECRET=cs_xxxxx
```

> **Important:** In Next.js, only variables prefixed with `NEXT_PUBLIC_` are available in Client Components (browser code). Variables without the prefix are only accessible on the server. Always keep sensitive credentials like consumer keys server-side only.

---

## How `attachCartKeyHeader` Works

`attachCartKeyHeader()` wraps `globalThis.fetch` so that every same-origin request automatically includes an `X-Cart-Key` header with the current cart key. This means:

- Server Components receive the cart key without cookies
- Route Handlers receive the cart key without cookies
- Cross-origin requests are never modified
- If no cart key is set, no header is added

Call it once after creating the browser client and restoring the session.
