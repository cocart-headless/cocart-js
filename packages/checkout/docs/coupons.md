# Coupons

Coupons are applied at the cart level before checkout is processed. After applying or removing a coupon, re-fetch the checkout state to get the updated total and `needs_payment` flag.

---

## Applying a coupon

```ts
await client.checkout.applyCoupon('SAVE10');
```

This delegates to the core CoCart cart endpoint (`POST cart/apply-coupon`). The cart total is updated immediately.

> [!NOTE]
> A coupon may reduce the order total to zero. Always re-check `needs_payment` after applying — see [Zero-Total Checkout](./zero-total.md).

---

## Removing a coupon

```ts
await client.checkout.removeCoupon('SAVE10');
```

---

## Re-checking needs_payment after a coupon

```ts
await client.checkout.applyCoupon('FREESHIP');

const state = (await client.checkout.getCheckout()).toObject();
const needsPayment = state.needs_payment !== false;
const gatewayId = needsPayment ? 'stripe' : 'bacs';
```

---

## Displaying an order summary

`getOrderSummary()` fetches the current checkout state and returns a typed `CheckoutOrderSummary`:

```ts
const summary = await client.checkout.getOrderSummary();

// summary.items — line items in the cart
for (const item of summary.items) {
  console.log(`${item.name} × ${item.quantity}  ${item.subtotal}`);
}

// summary.coupons — applied coupons with savings
for (const coupon of summary.coupons) {
  console.log(`${coupon.label} (${coupon.code})  -${coupon.saving}`);
}

// summary.totals — order totals
console.log('Total:', summary.totals.total);
console.log('Discount:', summary.totals.discount_total);
```

To include a structural placeholder in the form definition, pass `includeSummary: true` to `createForm()`. The section has no form fields — populate it by calling `getOrderSummary()` separately:

```ts
const form = client.checkout.createForm({ includeSummary: true });
// form.sections includes { id: 'order-summary', fields: [], className: theme.orderSummaryClassName }

const summary = await client.checkout.getOrderSummary();
// render summary.items / summary.coupons / summary.totals into the section
```

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
    createBankTransferGateway(),
  ],
}));

// Apply a coupon code entered by the customer
await client.checkout.applyCoupon(couponCode);

// Re-check state — coupon may have zeroed the total
const state = (await client.checkout.getCheckout()).toObject();
const needsPayment = state.needs_payment !== false;
const gatewayId = needsPayment ? 'stripe' : 'bacs';

// Fetch a typed summary to render to the customer
const summary = await client.checkout.getOrderSummary();

// Build the form (payment section included only if needed)
const form = client.checkout.createForm({ gatewayId, needsPayment, includeSummary: true });

// On submit
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
