# @cocartheadless/analytics-gtm

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&labelColor=000000)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/@cocartheadless/analytics-gtm?style=for-the-badge&labelColor=000000)](https://www.npmjs.com/package/@cocartheadless/analytics-gtm)
[![Tests](https://img.shields.io/github/actions/workflow/status/cocart-headless/cocart-js/tests.yml?label=tests&style=for-the-badge&labelColor=000000)](https://github.com/cocart-headless/cocart-js/actions/workflows/tests.yml)
[![License](https://img.shields.io/github/license/cocart-headless/cocart-js?color=9cf&style=for-the-badge&labelColor=000000)](https://github.com/cocart-headless/cocart-js/blob/main/LICENSE)

Google Tag Manager extension for the CoCart SDK. Automatically pushes GA4 ecommerce events to `window.dataLayer` as customers interact with the store — no extra configuration required beyond adding your GTM snippet to the page.

## Installation

```bash
npm install @cocartheadless/sdk @cocartheadless/analytics-gtm
```

## Quick start

Add the GTM snippet to your page (see [getting-started.md](docs/getting-started.md)), then install the extension:

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createGtm } from '@cocartheadless/analytics-gtm';

const client = new CoCart('https://your-store.com', {
  extensions: [
    createGtm({ containerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID! }),
  ],
});
```

## Auto-tracked events

| GA4 event | Triggered when |
|---|---|
| `add_to_cart` | Item added to cart |
| `remove_from_cart` | Item removed from cart |
| `cart_cleared` | Cart is cleared |
| `begin_checkout` | Checkout details updated |
| `purchase` | An order was placed: the response is an order with `result.code` `order_placed` (with `transaction_id`, `value` and `currency`) |
| `api_error` | Any CoCart API request fails |

Each ecommerce event clears the previous `ecommerce` object first — following GA4 best practice. Nothing is pushed for a response with a status of 400 or more, apart from `api_error`, which carries the REST route only (no host, no query string). A declined card or a 3D Secure step is not a purchase. See [Getting Started](docs/getting-started.md#auto-tracked-events).

## Documentation

- [Getting Started](docs/getting-started.md)

## Workspace development

From the monorepo root:

```bash
npm run typecheck:gtm
npm run build:gtm
npm run test:gtm
```
