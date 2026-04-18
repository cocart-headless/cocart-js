# Checkout SDK

Checkout now lives in a separate npm package: `@cocartheadless/checkout`.

It plugs into `@cocartheadless/sdk` through the extension system and is designed around the CoCart Checkout API documented at `GET/POST/PUT /wp-json/cocart/v2/checkout`, plus:

- `GET /wp-json/cocart/v2/checkout/payment-methods`
- `POST /wp-json/cocart/v2/checkout/payment-context`

The package focuses on:

- Stripe
- PayPal
- Authorize.Net
- Headless checkout form definitions
- Tailwind CSS 4 and shadcn-friendly theme presets

## Install

```bash
npm install @cocartheadless/sdk @cocartheadless/checkout
```

## Package docs

The checkout package now has its own docs set inside the package:

- [Package README](../packages/checkout/README.md)
- [Installation](../packages/checkout/docs/installation.md)
- [Checkout Flow](../packages/checkout/docs/checkout-flow.md)
- [Gateways](../packages/checkout/docs/gateways.md)
- [Frameworks](../packages/checkout/docs/frameworks.md)
- [Themes](../packages/checkout/docs/themes.md)

## Minimal example

```ts
import { CoCart } from '@cocartheadless/sdk';
import {
  createCheckout,
  createStripeGateway,
  shadcnCheckoutTheme,
} from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout({
  defaultTheme: shadcnCheckoutTheme,
  gatewayAdapters: [
    createStripeGateway({
      tokenize: async ({ paymentContext }) => ({
        payment_intent_id: String(paymentContext?.client_secret ?? ''),
      }),
    }),
  ],
}));

const checkout = await client.checkout.getCheckout();
const paymentMethods = await client.checkout.getPaymentMethods();
```

## What to read next

- [Authentication](docs/authentication.md)
- [Cart API](docs/cart.md)
- [Checkout package README](../packages/checkout/README.md)
- [Framework docs](../packages/checkout/docs/frameworks.md)
- [Theme docs](../packages/checkout/docs/themes.md)
