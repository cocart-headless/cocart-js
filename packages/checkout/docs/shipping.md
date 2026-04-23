# Shipping Methods

Shipping methods are fetched from the cart before the checkout form is rendered. The customer selects a method, and the chosen key is passed to `submit()`.

---

## Fetching available methods

`getShippingMethods()` proxies to the core CoCart cart endpoint and returns a typed array of `CheckoutShippingPackage`. Each package has a `rates` map of available `CheckoutShippingRate` objects and a `chosen_method` indicating the currently selected rate key.

```ts
const packages = await client.checkout.getShippingMethods();

// Flatten all rates across packages into a single list for a single-package store
const rates = packages.flatMap((pkg) => Object.values(pkg.rates));
```

Each `CheckoutShippingRate` has:

| Field | Type | Description |
|---|---|---|
| `key` | `string` | Unique rate key (e.g. `flat_rate:1`) — pass this to `submit()` |
| `method_id` | `string` | Method identifier (e.g. `flat_rate`, `free_shipping`) |
| `label` | `string` | Human-readable name shown to the customer |
| `cost` | `string` | Formatted shipping cost |
| `tax` | `string` | Formatted tax on shipping |

---

## Rendering a shipping method selector

Pass the flattened rates to `createForm()` via `shippingMethods`. This adds a `shipping-methods` section with a `radio` field whose options map directly to the available rates:

```ts
const packages = await client.checkout.getShippingMethods();
const rates = packages.flatMap((pkg) => Object.values(pkg.rates));

const form = client.checkout.createForm({ shippingMethods: rates });
// form.sections includes { id: 'shipping-methods', fields: [{ type: 'radio', options: [...] }] }
```

Each radio option has:
- `label` — `"Flat rate — 5.00"` (rate label + cost)
- `value` — the rate key (`flat_rate:1`)
- `description` — the method ID (`flat_rate`)

If `shippingMethods` is omitted or empty, the `shipping-methods` section is not included.

---

## Submitting with a selected method

The selected rate key goes in `update.shipping_method`:

```ts
const { processResponse } = await client.checkout.submit({
  gatewayId: 'stripe',
  update: {
    billing_address: { /* ... */ },
    shipping_method: 'flat_rate:1',
  },
});
```

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
const rates = packages.flatMap((pkg) => Object.values(pkg.rates));

// Pre-select the chosen method from the first package (if any)
const chosenMethod = packages[0]?.chosen_method;

const form = client.checkout.createForm({ shippingMethods: rates });

// On submit — use the rate key the customer selected
const selectedMethod = 'flat_rate:1'; // from form field value

const { processResponse } = await client.checkout.submit({
  gatewayId: 'stripe',
  update: {
    billing_address: { /* collected form values */ },
    shipping_method: selectedMethod,
  },
});

const result = processResponse.toObject();
if (result.payment_result?.redirect_url) {
  window.location.href = result.payment_result.redirect_url;
}
```

---

## Multiple shipping packages

Some WooCommerce setups split the cart into multiple packages (e.g. different warehouses or vendors). Each package has its own set of rates and a `chosen_method`. When multiple packages are present, render a selector per package:

```ts
for (const pkg of packages) {
  const rates = Object.values(pkg.rates);
  // render a selector for pkg.package_name using rates
  // the selected value is the rate key to pass for that package
}
```

> [!NOTE]
> Most single-vendor stores have only one package. Check `packages.length` before building multi-package UI.
