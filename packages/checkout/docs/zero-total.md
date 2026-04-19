# Zero-Total Checkout

When an order total is zero — fully discounted by a coupon, free product, or promotional offer — WooCommerce sets `needs_payment: false` in the checkout state. No payment processing is required.

---

## Detecting a zero-total order

Fetch the checkout state after the cart is loaded and check `needs_payment`:

```ts
const state = (await client.checkout.getCheckout()).toObject();
const needsPayment = state.needs_payment !== false; // true unless explicitly false
```

---

## Skipping the payment form section

Pass `needsPayment: false` to `createForm()`. The returned form will have no `payment` section:

```ts
const form = client.checkout.createForm({ needsPayment: false });
// form.sections → ['contact', 'billing', 'notes'] — no 'payment'
```

When `needsPayment` is `undefined` or `true`, the payment section is included as normal.

---

## Submitting a zero-total order

Pass `zeroTotal: true` to `submit()`. This skips the payment-context API call and skips tokenization entirely. The order is processed with `payment_method` set but no `payment_data`:

```ts
const { processResponse } = await client.checkout.submit({
  gatewayId: 'bacs',
  zeroTotal: true,
});
```

> [!NOTE]
> You still need a registered gateway for `submit()` because WooCommerce requires a `payment_method` value even for zero-total orders. An offline gateway such as `createBankTransferGateway()` works well as a neutral fallback.

---

## Recommended pattern

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createBankTransferGateway, createStripeGateway } from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout({
  successUrl: 'https://your-store.com/order-complete?id={CHECKOUT_ID}',
  returnUrl: 'https://your-store.com/checkout',
  gatewayAdapters: [
    createStripeGateway({ stripe, elements }),
    createBankTransferGateway(), // fallback for zero-total orders
  ],
}));

// On page load — fetch state and decide which gateway/form to use
const state = (await client.checkout.getCheckout()).toObject();
const needsPayment = state.needs_payment !== false;
const gatewayId = needsPayment ? 'stripe' : 'bacs';

const form = client.checkout.createForm({ gatewayId, needsPayment });

// On form submit
const { processResponse } = await client.checkout.submit({
  gatewayId,
  zeroTotal: !needsPayment,
  update: {
    billing_address: { /* collected form values */ },
  },
});

const result = processResponse.toObject();
if (result.payment_result?.redirect_url) {
  window.location.href = result.payment_result.redirect_url;
}
```
