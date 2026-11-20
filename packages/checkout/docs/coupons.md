# Coupons

Coupons are applied to the checkout before the order is placed. `applyCoupon()` and `removeCoupon()` return the checkout with its new totals and `payment.needs_payment` flag, so there's nothing to re-fetch.

---

## Applying a coupon

```ts
const checkout = (await client.checkout.applyCoupon('SAVE10')).toObject();

checkout.coupons;        // [{ coupon: 'save10', label: 'Coupon: save10', saving: '200' }]
checkout.totals.total;   // the new total
```

This goes through the checkout endpoint (`PUT /checkout` with `coupon_code` and `coupon_action: 'apply'`), and returns the checkout as `updateCheckout()` does. The returned checkout is the one the customer now sees, so its total is the one CoCart Plus expects when the order is placed.

A coupon the store rejects (expired, a minimum spend not reached…) is a `400 cocart_coupon_not_applied` error, with the store's reason as its message, and nothing changes:

```ts
try {
  await client.checkout.applyCoupon(code);
} catch (error) {
  if (error instanceof CoCartError && error.errorCode === 'cocart_coupon_not_applied') {
    showCouponError(error.message); // 'The minimum spend for coupon "bigspend" is $100,000.00.'
  }
}
```

To apply a coupon along with other changes, send it in `updateCheckout()`. If the coupon can't be applied, the rest still is: `result.code` is `checkout_partly_updated` and the coupon is listed in `result.not_applied`:

```ts
const checkout = (await client.checkout.updateCheckout({
  billing_address: { /* ... */ },
  coupon_code: code,
})).toObject();

const rejected = checkout.result?.not_applied?.find((entry) => entry.field === 'coupon_code');
if (rejected) showCouponError(rejected.message);
```

> [!NOTE]
> A coupon may reduce the order total to zero. Always check `payment.needs_payment` after applying — see [Zero-Total Checkout](./zero-total.md).

---

## Removing a coupon

```ts
await client.checkout.removeCoupon('SAVE10');
```

This sends `coupon_action: 'remove'`, and returns the checkout with its new totals.

---

## Re-checking needs_payment after a coupon

```ts
const checkout = (await client.checkout.applyCoupon('FREESHIP')).toObject();

const needsPayment = checkout.payment.needs_payment;
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

// summary.lines — the receipt's lines, in order, ready to print
for (const line of summary.lines) {
  console.log(line.label, line.amount, line.detail ?? '');
}
```

Amounts are in minor units (`'2480'` for $24.80), as the checkout gives them.

To include a structural placeholder in the form definition, pass `includeSummary: true` to `createForm()`. The section has no form fields — populate it by calling `getOrderSummary()` separately:

```ts
const form = client.checkout.createForm({ includeSummary: true });
// form.sections includes { id: 'order-summary', fields: [], className: theme.orderSummaryClassName }

const summary = await client.checkout.getOrderSummary();
// render summary.items / summary.coupons / summary.lines into the section
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

// Apply a coupon code entered by the customer: the checkout comes back with the new totals
const checkout = (await client.checkout.applyCoupon(couponCode)).toObject();

// The coupon may have zeroed the total
const needsPayment = checkout.payment.needs_payment;
const gatewayId = needsPayment ? 'stripe' : 'bacs';

// Fetch a typed summary to render to the customer
const summary = await client.checkout.getOrderSummary();

// Build the form (payment section included only if needed)
const form = client.checkout.createForm({ gatewayId, needsPayment, includeSummary: true });

// On submit
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
  window.location.href = result.redirectUrl;
}
```

If the total changed between the review and the submit (a coupon expired, a price changed), `submit()` throws `409 cocart_checkout_total_mismatch` before taking payment: show the new total and let the customer submit again. See [Checkout Flow → When the total changed](checkout-flow.md#when-the-total-changed).
