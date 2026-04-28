# @cocartheadless/sdk

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&labelColor=000000)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/@cocartheadless/sdk?style=for-the-badge&labelColor=000000)](https://www.npmjs.com/package/@cocartheadless/sdk)
[![jsDelivr hits](https://img.shields.io/jsdelivr/npm/hm/@cocartheadless/sdk?style=for-the-badge&labelColor=000000)](https://www.jsdelivr.com/package/npm/@cocartheadless/sdk)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=for-the-badge&labelColor=000000)](https://www.npmjs.com/package/@cocartheadless/sdk)
[![Tests](https://img.shields.io/github/actions/workflow/status/cocart-headless/cocart-js/tests.yml?label=tests&style=for-the-badge&labelColor=000000)](https://github.com/cocart-headless/cocart-js/actions/workflows/tests.yml)
[![Socket](https://img.shields.io/badge/Socket-secured-brightgreen?style=for-the-badge&labelColor=000000)](https://socket.dev/npm/package/@cocartheadless/sdk)
[![License](https://img.shields.io/github/license/jayanratna/resend-php?color=9cf&style=for-the-badge&labelColor=000000)](https://github.com/cocart-headless/cocart-js/blob/main/LICENSE)

Official TypeScript SDK for the [CoCart](https://cocartapi.com) REST API. Build **headless WooCommerce storefronts** — meaning your frontend (React, Astro, Next.js, or any framework) talks to WooCommerce through its API instead of using PHP templates.

> [!IMPORTANT]
> This SDK is looking for feedback, if you experience a bug please report it.

## TODO to complete the SDK

* [ ] Add SDK docs to documentation site
* [ ] Add support for Cart API extras
* [ ] Add Checkout API support
* [x] Add Customers Account API support

---

## Requirements

- **Node.js 20+** — Node.js is the JavaScript runtime that lets you run JavaScript outside a browser (e.g., on a server). Version 20 or higher is required because it includes a built-in `fetch` function for making HTTP requests. You can check your version by running `node -v` in your terminal.
- **CoCart plugin** installed on your WooCommerce store — This is the WordPress plugin that provides the REST API endpoints the SDK communicates with.
- [CoCart JWT Authentication](https://wordpress.org/plugins/cocart-jwt-authentication/) plugin for JWT features (optional) — Only needed if you want to use JSON Web Token authentication (explained in the [Authentication](docs/authentication.md) guide).
- **TypeScript 5.0+** (recommended) — Not strictly required, but you get the best experience (autocompletion, type checking) with TypeScript.

## Support Policy

See [SUPPORT.md](SUPPORT.md) for our versioning policy, supported Node.js versions, and support lifecycle.

## Features

- Zero runtime dependencies — uses native `fetch` (Node 20+, all modern browsers), no extra packages to install
- ESM + CJS dual output — works with both modern `import` syntax and older `require()` syntax
- Typed responses and parameters with generics
- Client-side input validation (catches errors before network requests)
- Currency formatting and timezone utilities
- Event system for request/response lifecycle hooks
- Response transformer for custom processing
- Configurable auth header name (for proxies that strip `Authorization`)
- Encrypted localStorage for session persistence (AES-256-GCM, Web Crypto API)
- JWT authentication with auto-refresh
- Legacy CoCart plugin support with version-aware endpoint guards
- Framework adapters for Astro, Next.js, Nuxt, Remix, SvelteKit, Vite, Elysia.js, Fastify, Hono, and Deno

## Installation

### Via npm

[npm](https://www.npmjs.com/) is the default package manager that comes with Node.js. Run this in your project's root folder:

```bash
npm install @cocartheadless/sdk
```

### Via yarn

[Yarn](https://yarnpkg.com/) is an alternative package manager. If you use Yarn in your project:

```bash
yarn add @cocartheadless/sdk
```

### Via pnpm

[pnpm](https://pnpm.io/) is a fast, disk-efficient package manager. If you use pnpm:

```bash
pnpm add @cocartheadless/sdk
```

### Via Bun

[Bun](https://bun.sh/) is a fast JavaScript runtime with a built-in package manager. If you use Bun:

```bash
bun add @cocartheadless/sdk
```

**Zero runtime dependencies** — the SDK does not install any additional packages, keeping your project lightweight.

### Via CDN (Framer, Webflow, plain HTML)

For platforms like **Framer**, **Webflow**, or any environment where you just need a `<script>` tag — no npm required:

**jsDelivr:**

```html
<script src="https://cdn.jsdelivr.net/npm/@cocartheadless/sdk/dist/index.global.js"></script>
```

**unpkg:**

```html
<script src="https://unpkg.com/@cocartheadless/sdk/dist/index.global.js"></script>
```

Then use it:

```html
<script>
  const client = new CoCart('https://your-store.com');
</script>
```

This loads a single minified file that exposes all SDK exports under the `CoCart` global. See the dedicated guides for [Framer](docs/framer.md) and [Webflow](docs/webflow.md).

You can also pin a specific version:

```html
<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@cocartheadless/sdk@1.1.0/dist/index.global.js"></script>

<!-- unpkg -->
<script src="https://unpkg.com/@cocartheadless/sdk@1.1.0/dist/index.global.js"></script>
```

## Quick Start

An **SDK** (Software Development Kit) is a library that provides ready-made functions for talking to a specific service — in this case, the CoCart REST API on your WooCommerce store. Instead of writing raw HTTP requests yourself, you call simple methods like `client.cart().addItem(123, 2)` and the SDK handles the details for you.

The `import` statement loads the SDK into your code. The `await` keyword is used before operations that talk to the server, because network requests take time and JavaScript needs to wait for the response before continuing.

```ts
import { CoCart } from '@cocartheadless/sdk';

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
| [Account API](docs/account.md) | Customer profile, orders, downloads, and reviews |
| [Sessions API](docs/sessions.md) | Admin sessions, SessionManager, storage adapters |
| [Error Handling](docs/error-handling.md) | Error hierarchy, catching errors, common scenarios |
| [Utilities](docs/utilities.md) | Currency formatter, timezone helper, response transformer |
| [Writing Extensions](docs/extensions.md) | Create custom extensions, subscribe to client events, publish as npm |
| [Datafast Analytics](packages/analytics-datafast/README.md) | Auto-track cart and checkout events with Datafast |
| [Google Tag Manager](packages/analytics-gtm/README.md) | Push GA4 ecommerce events to window.dataLayer via GTM |

### Framework Adapters

| Guide | Description |
|-------|-------------|
| [Astro](src/adapters/astro/README.md) | Browser + SSR setup, API routes, examples |
| [Next.js](src/adapters/nextjs/README.md) | Client + Server Components, Route Handlers, middleware |
| [Nuxt](src/adapters/nuxt/README.md) | Browser plugin, server routes, `defineEventHandler` |
| [Remix](src/adapters/remix/README.md) | Loaders, actions, resource routes |
| [SvelteKit](src/adapters/svelte/README.md) | `load` functions, server routes, hooks |
| [Vite](src/adapters/vite/README.md) | Browser-only SPA; pair with a backend adapter for the API layer |
| [Elysia.js](src/adapters/elysiajs/README.md) | Bun-first route handlers |
| [Fastify](src/adapters/fastify/README.md) | Node.js route handlers (server-only) |
| [Hono](src/adapters/hono/README.md) | Multi-runtime (Node, Bun, Cloudflare Workers, Deno) |
| [Deno](src/adapters/deno/README.md) | `Deno.serve()`, Fresh islands |
| [Framer](docs/framer.md) | CDN script, Code Overrides, product display |
| [Webflow](docs/webflow.md) | CDN script, custom code, dynamic elements |

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
import { CurrencyFormatter } from '@cocartheadless/sdk';

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
import { CoCart, EncryptedStorage } from '@cocartheadless/sdk';

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

Pre-built adapters for Astro, Next.js, Nuxt, Remix, SvelteKit, Elysia.js, Fastify, Hono, and Deno handle the browser/server split automatically. Cart state is passed via HTTP headers instead of cookies — avoiding GDPR consent issues and CORS restrictions:

```ts
// Astro / Next.js — browser
import { createBrowserClient, attachCartKeyHeader } from '@cocartheadless/sdk/astro';

const client = createBrowserClient('https://your-store.com', {
  encryptionKey: 'your-key',
});
await client.restoreSession();
attachCartKeyHeader(client);

// Astro / Next.js — server
import { createServerClient } from '@cocartheadless/sdk/astro';

const client = createServerClient('https://your-store.com', Astro.request);
```

## CoCart Channels

We have different channels at your disposal where you can find information about the CoCart project, discuss it and get involved:

[![Twitter: cocartapi](https://img.shields.io/twitter/follow/cocartapi?style=social)](https://twitter.com/cocartapi) [![CoCart GitHub Stars](https://img.shields.io/github/stars/cocart-headless/cocart-js?style=social)](https://github.com/cocart-headless/cocart-js)

<ul>
  <li>📖 <strong>Documentation</strong>: this is the place to learn how to use CoCart API. <a href="https://cocartapi.com/docs/?utm_medium=gh&utm_source=github&utm_campaign=readme&utm_content=cocart">Get started!</a></li>
  <li>👪 <strong>Community</strong>: use our Discord chat room to share any doubts, feedback and meet great people. This is your place too to share <a href="https://cocartapi.com/community/?utm_medium=gh&utm_source=github&utm_campaign=readme&utm_content=cocart">how are you planning to use CoCart!</a></li>
  <li>🐞 <strong>GitHub</strong>: we use GitHub for bugs and pull requests, doubts are solved with the community.</li>
  <li>🐦 <strong>Social media</strong>: a more informal place to interact with CoCart users, reach out to us on <a href="https://twitter.com/cocartapi">X/Twitter.</a></li>
</ul>

## Credits

Website [cocartapi.com](https://cocartapi.com/?ref=github) &nbsp;&middot;&nbsp;
GitHub [@cocart-headless](https://github.com/cocart-headless) &nbsp;&middot;&nbsp;
X/Twitter [@cocartapi](https://twitter.com/cocartapi) &nbsp;&middot;&nbsp;
[Facebook](https://www.facebook.com/cocartforwc/) &nbsp;&middot;&nbsp;
[Instagram](https://www.instagram.com/cocartheadless/)

## License

MIT
