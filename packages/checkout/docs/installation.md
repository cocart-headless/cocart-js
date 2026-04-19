# Installation

## Packages

Install the core SDK and the checkout package together:

```bash
npm install @cocartheadless/sdk @cocartheadless/checkout
```

## Requirements

- CoCart Plus `v2.0+`
- A valid CoCart cart session with a `Cart-Key`
- At least one WooCommerce payment gateway configured

## Basic setup

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout } from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout({
  successUrl: 'https://your-store.com/order-complete?id={CHECKOUT_ID}',
  returnUrl: 'https://your-store.com/checkout',
}));
```

`successUrl` is where the customer lands after a successful payment. Include `{CHECKOUT_ID}` as a placeholder — it is replaced with the order ID at submission time. `returnUrl` is where the customer is sent if payment fails or is cancelled.

> [!TIP]
> If you already configure credentials on the core CoCart client, the checkout package reuses them automatically for the Checkout API.

## API coverage

This package is designed around the CoCart Checkout API:

- `GET /wp-json/cocart/v2/checkout`
- `POST /wp-json/cocart/v2/checkout`
- `PUT /wp-json/cocart/v2/checkout`
- `GET /wp-json/cocart/v2/checkout/payment-methods`
- `POST /wp-json/cocart/v2/checkout/payment-context`
