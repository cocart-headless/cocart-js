# @cocartheadless/analytics-datafast

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&labelColor=000000)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/@cocartheadless/analytics-datafast?style=for-the-badge&labelColor=000000)](https://www.npmjs.com/package/@cocartheadless/analytics-datafast)
[![Tests](https://img.shields.io/github/actions/workflow/status/cocart-headless/cocart-js/tests.yml?label=tests&style=for-the-badge&labelColor=000000)](https://github.com/cocart-headless/cocart-js/actions/workflows/tests.yml)
[![License](https://img.shields.io/github/license/jayanratna/resend-php?color=9cf&style=for-the-badge&labelColor=000000)](https://github.com/cocart-headless/cocart-js/blob/main/LICENSE)

[Datafast](https://datafa.st) analytics extension for the CoCart SDK. Automatically tracks customer interactions — cart events, checkout steps, and API errors — and exposes the full Datafast API for custom tracking.

## Installation

```bash
npm install @cocartheadless/sdk @cocartheadless/analytics-datafast
```

## Quick start

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createDatafast } from '@cocartheadless/analytics-datafast';

const client = new CoCart('https://your-store.com', {
  extensions: [
    createDatafast({ websiteId: process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID! }),
  ],
});

// Automatic tracking is now active — no further setup needed.
// Cart and checkout events are sent to Datafast as customers interact with the store.
```

## Auto-tracked events

| Event | Triggered when |
|---|---|
| `add_to_cart` | Item added to cart |
| `remove_from_cart` | Item removed from cart |
| `cart_cleared` | Cart is cleared |
| `checkout_started` | Checkout details updated (billing, shipping) |
| `purchase` | Order placed successfully |
| `api_error` | Any CoCart API request fails |

## Documentation

- [Getting Started](docs/getting-started.md)

## Workspace development

From the monorepo root:

```bash
npm run typecheck:datafast
npm run build:datafast
npm run test:datafast
```
