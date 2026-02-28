# @cocart/sdk

Official TypeScript SDK for the [CoCart](https://cocartapi.com) REST API. Build **headless WooCommerce storefronts** — meaning your frontend (React, Astro, Next.js, or any framework) talks to WooCommerce through its API instead of using PHP templates.

- Zero runtime dependencies — uses native `fetch` (Node 18+, all modern browsers), no extra packages to install
- ESM + CJS dual output — works with both modern `import` syntax and older `require()` syntax
- Typed responses and parameters with generics
- Client-side input validation (catches errors before network requests)
- Currency formatting and timezone utilities
- Event system for request/response lifecycle hooks
- Response transformer for custom processing
- Configurable auth header name (for proxies that strip `Authorization`)
- Encrypted localStorage for session persistence (AES-256-GCM, Web Crypto API)
- JWT authentication with auto-refresh
- Framework adapters for Astro and Next.js

## Requirements

- **Node.js 18+** — Node.js is the JavaScript runtime that lets you run JavaScript outside a browser (e.g., on a server). Version 18 or higher is required because it includes a built-in `fetch` function for making HTTP requests. You can check your version by running `node -v` in your terminal.
- **CoCart plugin** installed on your WooCommerce store — This is the WordPress plugin that provides the REST API endpoints the SDK communicates with.
- [CoCart JWT Authentication](https://wordpress.org/plugins/cocart-jwt-authentication/) plugin for JWT features (optional) — Only needed if you want to use JSON Web Token authentication (explained in the [Authentication](docs/authentication.md) guide).
- **TypeScript 5.0+** (recommended) — Not strictly required, but you get the best experience (autocompletion, type checking) with TypeScript.

## Installation

### Via npm

[npm](https://www.npmjs.com/) is the default package manager that comes with Node.js. Run this in your project's root folder:

```bash
npm install @cocart/sdk
```

### Via yarn

[Yarn](https://yarnpkg.com/) is an alternative package manager. If you use Yarn in your project:

```bash
yarn add @cocart/sdk
```

### Via pnpm

[pnpm](https://pnpm.io/) is a fast, disk-efficient package manager. If you use pnpm:

```bash
pnpm add @cocart/sdk
```

### Via Bun

[Bun](https://bun.sh/) is a fast JavaScript runtime with a built-in package manager. If you use Bun:

```bash
bun add @cocart/sdk
```

**Zero runtime dependencies** — the SDK does not install any additional packages, keeping your project lightweight.

## Quick Start

An **SDK** (Software Development Kit) is a library that provides ready-made functions for talking to a specific service — in this case, the CoCart REST API on your WooCommerce store. Instead of writing raw HTTP requests yourself, you call simple methods like `client.cart().addItem(123, 2)` and the SDK handles the details for you.

The `import` statement loads the SDK into your code. The `await` keyword is used before operations that talk to the server, because network requests take time and JavaScript needs to wait for the response before continuing.

```ts
import { CoCart } from '@cocart/sdk';

// Create a client pointing to your WooCommerce store
const client = new CoCart('https://your-store.com');

// Browse products (no auth required)
const products = await client.products().all({ per_page: '12' });

// Add to cart (guest session created automatically)
const response = await client.cart().addItem(123, 2);

// Get cart
const cart = await client.cart().get();
console.log(cart.getItems());      // Array of items in the cart
console.log(cart.get('totals.total')); // Reach into nested data with dot notation
```

> **Note:** Code using `await` must be inside an `async` function. If you're using a modern framework like Next.js, Astro, or Nuxt, your component or page functions are already async. In a plain script, wrap your code in an async function:
>
> ```ts
> async function main() {
>   const client = new CoCart('https://your-store.com');
>   const cart = await client.cart().get();
>   console.log(cart.getItems());
> }
> main();
> ```

## Documentation

| Guide | Description |
|-------|-------------|
| [Configuration & Setup](docs/installation.md) | Options, fluent config, framework adapters, white-labelling |
| [Authentication](docs/authentication.md) | Guest, Basic Auth, JWT, consumer keys |
| [Cart API](docs/cart.md) | Add, update, remove items, coupons, shipping, fees |
| [Products API](docs/products.md) | List, filter, search, categories, tags, brands |
| [Sessions API](docs/sessions.md) | Admin sessions, SessionManager, storage adapters |
| [Error Handling](docs/error-handling.md) | Error hierarchy, catching errors, common scenarios |
| [Utilities](docs/utilities.md) | Currency formatter, timezone helper, response transformer |

### Framework Adapters

| Guide | Description |
|-------|-------------|
| [Astro](docs/frameworks/astro.md) | Browser + SSR setup, API routes, examples |
| [Next.js](docs/frameworks/nextjs.md) | Client + Server Components, Route Handlers, middleware |

## Features

### Fluent API

A **fluent API** lets you chain multiple calls in a single expression instead of writing separate statements. Each method returns the client itself, so you can keep adding dots:

```ts
const client = new CoCart('https://your-store.com')
  .setTimeout(15000)
  .setMaxRetries(2)
  .addHeader('X-Custom', 'value');
```

### Dot-Notation Response Access

Access nested data in API responses using a simple string path with dots — no need to chain object properties or worry about `undefined` errors:

```ts
const cart = await client.cart().get();
cart.get('totals.total');         // Reach into nested objects
cart.get('currency.currency_code'); // No manual null checks needed
cart.get('items.0.name');          // Access array items by index
```

### Type-Safe Field Filtering

Request only the fields you need — the return type narrows automatically:

```ts
const response = await client.cart().getFiltered(['items', 'totals']);
const data = response.toObject();
data.items;    // CartItem[]  ✓
data.totals;   // CartTotals  ✓
data.currency; // compile error — not requested  ✓
```

### Currency Formatting

```ts
import { CurrencyFormatter } from '@cocart/sdk';

const fmt = new CurrencyFormatter();
const currency = response.getCurrency();

fmt.format(4599, currency);        // "$45.99"
fmt.formatDecimal(4599, currency); // "45.99"
```

### Client-Side Validation

Invalid inputs are caught before making a network request:

```ts
await client.cart().addItem(-1, 0);
// throws ValidationError: "Product ID must be a positive integer"
```

### Event System

```ts
client.on('request', (e) => console.log(`${e.method} ${e.url}`));
client.on('response', (e) => console.log(`${e.status} in ${e.duration}ms`));
client.on('error', (e) => console.error(e.error));
```

### Encrypted Session Storage

Cart keys and tokens are stored in the browser's `localStorage` encrypted with AES-256-GCM via the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) — a browser-native encryption API that requires no extra libraries:

```ts
import { CoCart, EncryptedStorage } from '@cocart/sdk';

const storage = new EncryptedStorage('your-secret-key');
const client = new CoCart('https://your-store.com', { storage });
```

### JWT with Auto-Refresh

**JWT (JSON Web Token)** is a secure authentication method where you log in once and receive a token. The SDK can automatically refresh expired tokens behind the scenes, so customers never get unexpectedly logged out:

```ts
const result = await client.jwt().withAutoRefresh(async (c) => {
  return await c.cart().get();
});
```

### Framework Adapters (No Cookies)

Pre-built adapters for Astro and Next.js handle the browser/server split automatically. Cart state is passed via HTTP headers instead of cookies — avoiding GDPR consent issues and CORS restrictions:

```ts
// Astro / Next.js — browser
import { createBrowserClient, attachCartKeyHeader } from '@cocart/sdk/astro';

const client = createBrowserClient('https://your-store.com', {
  encryptionKey: 'your-key',
});
await client.restoreSession();
attachCartKeyHeader(client);

// Astro / Next.js — server
import { createServerClient } from '@cocart/sdk/astro';

const client = createServerClient('https://your-store.com', Astro.request);
```

## License

MIT
