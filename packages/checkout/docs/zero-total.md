# Zero-Total Checkout

When an order total is zero — fully discounted by a coupon, free product, or promotional offer — the checkout says `payment.needs_payment: false`. No payment processing is required.

---

## Detecting a zero-total order

Fetch the checkout state after the cart is loaded and check `payment.needs_payment`:

```ts
const state = (await client.checkout.getCheckout()).toObject();
const needsPayment = state.payment.needs_payment;
```

`applyCoupon()` and `updateCheckout()` return the checkout too, so check it there after a change.

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

Pass `zeroTotal: true` to `submit()`. This skips tokenization entirely. The order is processed with `payment_method` set but no `payment_data`:

```ts
const { result } = await client.checkout.submit({
  gatewayId: 'bacs',
  zeroTotal: true,
});

result.code;       // 'order_placed'
result.isComplete; // true: nothing to pay
```

> [!NOTE]
> `submit()` always sends the registered gateway as `payment_method`, so it needs one even for zero-total orders. An offline gateway such as `createBankTransferGateway()` works well as a neutral fallback. `placeOrder()` needs neither `payment_method` nor `payment_data` for a free order.

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
const needsPayment = state.payment.needs_payment;
const gatewayId = needsPayment ? 'stripe' : 'bacs';

const form = client.checkout.createForm({ gatewayId, needsPayment });

// On form submit
const { result } = await client.checkout.submit({
  gatewayId,
  zeroTotal: !needsPayment,
  update: {
    billing_address: { /* collected form values */ },
  },
});

if (result.isFailed) {
  showError(result.message);
} else if (result.redirectUrl) {
  window.location.href = result.redirectUrl; // the order-received page
}
```
