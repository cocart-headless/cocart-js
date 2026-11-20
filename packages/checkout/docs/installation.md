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

`successUrl` is where the customer lands after a successful payment. Include `{CHECKOUT_ID}` as a placeholder: `submit()` replaces it with the checkout's cart key (`cart_key`), since the order doesn't exist yet when the URL is built. `returnUrl` is where the customer is sent if payment fails or is cancelled.

> [!TIP]
> If you already configure credentials on the core CoCart client, the checkout package reuses them automatically for the Checkout API.

## API coverage

This package is designed around the CoCart Checkout API:

- `GET /wp-json/cocart/v2/checkout` — fetch checkout state for the review page (`getCheckout()`, `getOrderSummary()`, `getShippingMethods()`)
- `PUT /wp-json/cocart/v2/checkout` — update address/shipping/payment/coupon/currency without creating an order (`updateCheckout()`, `applyCoupon()`, `removeCoupon()`)
- `POST /wp-json/cocart/v2/checkout` — create the order and attempt payment (`placeOrder()`, `submit()`, or `processCheckout()` for the raw response)
- `GET /wp-json/cocart/v2/checkout/status` — how a checkout ended when its answer was lost (`getCheckoutStatus()`)
- `GET /wp-json/cocart/v2/checkout/config` — form field, locale, country, shipping, account, and store config (`getCheckoutConfig()`)
- `GET /wp-json/cocart/v2/checkout/payment-methods` — available payment gateways (`getPaymentMethods()`), and a logged-in customer's saved cards (`getSavedPaymentMethods()`)
- `GET /wp-json/cocart/v2/address/search` — address autocomplete suggestions (`searchAddresses()`)
- `GET /wp-json/cocart/v2/address/details` — resolve a suggestion into a full address (`getAddressDetails()`)
- `GET /wp-json/cocart/v2/order-received/{order_id}` — order confirmation for the thank-you page (`getOrderReceived()`)
- `POST /wp-json/cocart/v2/order-received/{order_id}/pay` — retry payment on a `pending`/`failed` order (`payForOrder()`)
- `POST /wp-json/cocart/v2/order-received/{order_id}/confirm` — finish a payment after an off-site step (`confirmReturn()`, `confirmOrderPayment()`)

> [!NOTE]
> `PUT` and `POST /checkout` are easy to mix up — `PUT` only ever updates checkout data, `POST` is the one that creates a WooCommerce order. `updateCheckout()`/`processCheckout()` map to the correct verb for you; if you're calling `client.requestRaw()` directly, double-check the method.
>
> There is no `payment-context` endpoint — it was removed as dead API surface (nothing consumed it, and its data duplicated `GET /checkout`/`GET /checkout/payment-methods`). Client-side gateway initialization (Stripe Elements, PayPal Buttons, etc.) is entirely your app's own responsibility using whatever publishable/client key you're configured with; `POST /checkout` handles payment attempts directly, including an `action_required` result for 3D Secure/SCA — see [Checkout Flow → Resolving action_required](checkout-flow.md#resolving-action_required).
