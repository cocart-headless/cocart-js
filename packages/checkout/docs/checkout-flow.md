# Checkout Flow

The package is built around the standard Checkout flow:

1. Fetch checkout state
2. Fetch payment methods
3. Update billing and shipping details
4. Create payment context for client-side gateways
5. Process checkout

## Get checkout state

```ts
const state = await client.checkout.getCheckout();
const data = state.toObject();
```

Useful fields commonly returned by the API include:

- `billing_address`
- `shipping_address`
- `shipping_methods`
- `payment_methods`
- `customer_data`
- `needs_payment`
- `needs_shipping`
- `payment_result`

## Get payment methods

```ts
const methodsResponse = await client.checkout.getPaymentMethods();
const methods = methodsResponse.toObject();
```

## Update checkout data

```ts
await client.checkout.updateCheckout({
  billing_address: {
    first_name: 'Jane',
    last_name: 'Doe',
    address_1: '1 Main Street',
    city: 'Paris',
    postcode: '75001',
    country: 'FR',
    email: 'jane@example.com',
  },
  shipping_method: 'flat_rate:1',
  payment_method: 'stripe',
});
```

## Create payment context

```ts
const paymentContext = await client.checkout.createPaymentContext({
  payment_method: 'stripe',
});
```

This step is especially important for Stripe and PayPal style integrations that need provider-side client initialization.

## Process checkout

```ts
await client.checkout.processCheckout({
  billing_address: {
    first_name: 'Jane',
    address_1: '1 Main Street',
    city: 'Paris',
    postcode: '75001',
    country: 'FR',
  },
  payment_method: 'stripe',
  shipping_method: 'flat_rate:1',
  payment_data: {
    payment_intent_id: 'pi_123',
  },
});
```

## One-call orchestration

Use `submit()` when you want the SDK to run the common update + payment-context + process sequence for you.

```ts
const result = await client.checkout.submit({
  gatewayId: 'stripe',
  update: {
    billing_address: {
      first_name: 'Jane',
      last_name: 'Doe',
      address_1: '1 Main Street',
      city: 'Paris',
      postcode: '75001',
      country: 'FR',
      email: 'jane@example.com',
    },
  },
  process: {
    shipping_method: 'flat_rate:1',
  },
});

const checkoutResult = result.processResponse.toObject();
if (checkoutResult.payment_result?.redirect_url) {
  window.location.href = checkoutResult.payment_result.redirect_url;
}
```

`successUrl` and `returnUrl` are set once at the extension level in `createCheckout()` and passed automatically into every gateway's `tokenize` context — you do not need to repeat them in `submit()`. The `{CHECKOUT_ID}` placeholder in `successUrl` is substituted with the checkout state ID at submission time.

---

## Shipping Methods

Fetch available shipping methods before rendering the form. Pass the flattened rates to `createForm()` to get a `shipping-methods` section with a `radio` field. The selected key goes into `update.shipping_method` on submit.

```ts
const packages = await client.checkout.getShippingMethods();
const rates = packages.flatMap((pkg) => Object.values(pkg.rates));

const form = client.checkout.createForm({ shippingMethods: rates });

// On submit
const { processResponse } = await client.checkout.submit({
  gatewayId: 'stripe',
  update: {
    billing_address: { /* ... */ },
    shipping_method: 'flat_rate:1', // selected rate key
  },
});
```

See [Shipping Methods](shipping.md) for the full pattern including multi-package support.

---

## Coupons

Apply or remove a coupon before submitting. After applying, re-check `needs_payment` because a coupon may reduce the total to zero.

```ts
await client.checkout.applyCoupon('SAVE10');

const state = (await client.checkout.getCheckout()).toObject();
const needsPayment = state.needs_payment !== false;
```

To remove a coupon:

```ts
await client.checkout.removeCoupon('SAVE10');
```

See [Coupons](coupons.md) for the full recommended pattern including order summary and zero-total handling.

---

## Order Summary

`getOrderSummary()` fetches the current checkout state and returns a typed `CheckoutOrderSummary` with items, applied coupons, and totals:

```ts
const summary = await client.checkout.getOrderSummary();

// summary.items    — CheckoutSummaryItem[]
// summary.coupons  — CheckoutSummaryCoupon[]
// summary.totals   — CheckoutSummaryTotals

console.log(summary.totals.total);           // e.g. '24.80'
console.log(summary.totals.discount_total);  // e.g. '2.00'
```

To include a structural placeholder section in your form definition, pass `includeSummary: true` to `createForm()`:

```ts
const form = client.checkout.createForm({ includeSummary: true });
// Adds { id: 'order-summary', fields: [], className: theme.orderSummaryClassName }
// Populate it by calling getOrderSummary() and rendering the returned data.
```
