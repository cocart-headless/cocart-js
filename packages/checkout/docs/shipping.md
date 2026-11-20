# Shipping Methods

Shipping methods are read from the checkout before the checkout form is rendered. The customer selects a rate, and the rate's `id` is passed to `submit()`.

---

## Fetching available methods

`getShippingMethods()` reads the checkout's `delivery.packages` (from `getCheckout()`) and returns a typed array of `CheckoutShippingPackage`. Each package has an `id`, a `name`, a `rates` list of available `CheckoutShippingRate` objects, and a `chosen_rate`: the `id` of the rate currently selected. It's empty when the cart needs no shipping (`delivery.needs_shipping: false`).

```ts
const packages = await client.checkout.getShippingMethods();

// Flatten all rates across packages into a single list for a single-package store
const rates = packages.flatMap((pkg) => pkg.rates);
```

Each `CheckoutShippingRate` has:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique rate ID (e.g. `flat_rate:1`) — send this as `shipping_method` |
| `method_id` | `string` | Method identifier (e.g. `flat_rate`, `free_shipping`) |
| `instance_id` | `number` | The shipping method's instance in its zone |
| `label` | `string` | Human-readable name shown to the customer |
| `cost` | `string` | Shipping cost, in minor units unless the checkout was fetched with `formatted: true` |
| `tax` | `string` | Tax on shipping, the same way |

`getShippingMethods()` calls `getCheckout()`, which records the total the customer is shown: call it for the review page, not right before the order is placed.

---

## Rendering a shipping method selector

Pass the flattened rates to `createForm()` via `shippingMethods`. This adds a `shipping-methods` section with a `radio` field whose options map directly to the available rates:

```ts
const packages = await client.checkout.getShippingMethods();
const rates = packages.flatMap((pkg) => pkg.rates);

const form = client.checkout.createForm({ shippingMethods: rates });
// form.sections includes { id: 'shipping-methods', fields: [{ type: 'radio', options: [...] }] }
```

Each radio option has:
- `label` — `"Flat rate — 500"` (rate label + cost)
- `value` — the rate ID (`flat_rate:1`)
- `description` — the method ID (`flat_rate`)

If `shippingMethods` is omitted or empty, the `shipping-methods` section is not included.

---

## Submitting with a selected method

The selected rate ID goes in `update.shipping_method`:

```ts
const { result } = await client.checkout.submit({
  gatewayId: 'stripe',
  update: {
    billing_address: { /* ... */ },
    shipping_method: 'flat_rate:1',
  },
});
```

To save the choice as soon as the customer picks it (and show the new total), send it with `updateCheckout({ shipping_method })`. A rate that isn't available is listed in `result.not_applied`, with the rest of the update applied.

---

## Recommended pattern

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createStripeGateway } from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout({
  successUrl: 'https://your-store.com/order-complete?id={CHECKOUT_ID}',
  returnUrl: 'https://your-store.com/checkout',
  gatewayAdapters: [createStripeGateway({ stripe, elements })],
}));

// Fetch available shipping methods before rendering the form
const packages = await client.checkout.getShippingMethods();
const rates = packages.flatMap((pkg) => pkg.rates);

// Pre-select the chosen rate from the first package (if any)
const chosenRate = packages[0]?.chosen_rate;

const form = client.checkout.createForm({ shippingMethods: rates });

// On submit — use the rate ID the customer selected
const selectedRate = 'flat_rate:1'; // from form field value

const { result } = await client.checkout.submit({
  gatewayId: 'stripe',
  update: {
    billing_address: { /* collected form values */ },
    shipping_method: selectedRate,
  },
});

if (result.isFailed) {
  showError(result.message);
} else if (result.redirectUrl) {
  window.location.href = result.redirectUrl;
}
```

---

## Multiple shipping packages

Some WooCommerce setups split the cart into multiple packages (e.g. different warehouses or vendors). Each package has its own `rates` and `chosen_rate`. When multiple packages are present, render a selector per package:

```ts
for (const pkg of packages) {
  // render a selector for pkg.name using pkg.rates, pre-selecting pkg.chosen_rate
  // the selected value is the rate ID to pass for that package
}
```

> [!NOTE]
> Most single-vendor stores have only one package. Check `packages.length` before building multi-package UI.
