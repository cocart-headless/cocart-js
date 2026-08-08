# Checkout SDK

Checkout now lives in a separate npm package: `@cocartheadless/checkout`.

It plugs into `@cocartheadless/sdk` through the extension system and is designed around the CoCart Checkout API:

- `GET`/`PUT`/`POST /wp-json/cocart/v2/checkout` — fetch, update, and process checkout (note: `PUT` updates, `POST` creates the order)
- `GET /wp-json/cocart/v2/checkout/config` — form fields, locale, country, and store settings
- `GET /wp-json/cocart/v2/checkout/payment-methods`
- `GET /wp-json/cocart/v2/address/search` and `GET /wp-json/cocart/v2/address/details` — address autocomplete
- `GET /wp-json/cocart/v2/order-received/{order_id}` and `POST /wp-json/cocart/v2/order-received/{order_id}/pay` — order confirmation and payment retry

The package focuses on:

- Stripe, WooPayments, PayPal, PayPal Payments, Authorize.Net
- Headless checkout form definitions
- Tailwind CSS 4 and shadcn-friendly theme presets

> [!NOTE]
> Not every gateway plugin reports an honest success/failure result to a REST client out of the box — see [Gateway Compatibility](checkout-gateway-compatibility.md) for which ones CoCart Plus covers and which SDK helper to use for each.

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
- [Gateway Compatibility](checkout-gateway-compatibility.md)
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
    // Pass `stripe`/`elements` for the pre-wired path — no tokenize needed; if the
    // gateway later returns requires_action (3D Secure/SCA), the adapter's built-in
    // confirmAction handles it and submit() retries automatically.
    createStripeGateway({ stripe, elements }),
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
