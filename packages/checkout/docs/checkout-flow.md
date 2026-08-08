# Checkout Flow

The package is built around the standard Checkout flow:

1. Fetch checkout state
2. Fetch payment methods
3. Update billing and shipping details
4. Process checkout (place the order, attempt payment)
5. If the gateway responds `requires_action` (e.g. 3D Secure/SCA), resolve it client-side and process again

## Get checkout state

```ts
const state = await client.checkout.getCheckout();
const data = state.toObject();
```

Useful fields commonly returned by the API include:

- `cart_key`
- `currency`
- `customer.billing_address` / `customer.shipping_address`
- `items`
- `coupons`
- `shipping_methods`
- `payment_method`
- `cart_totals`
- `needs_payment`
- `needs_shipping`

> [!NOTE]
> `payment_result` is not part of this response — it only appears on the result of `processCheckout()`/`submit()` (`CheckoutProcessResponse`), once an order has actually been created.

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
  payment_data: [
    { key: 'payment_intent_id', value: 'pi_123' },
  ],
});
```

> [!NOTE]
> `payment_data` is an array of `{ key, value }` pairs on the wire, not a plain object. `submit()` (below) handles this conversion for you — gateway adapters' `tokenize()` still returns a plain object like `{ payment_intent_id: 'pi_123' }`, which `submit()` converts before sending. Only convert it yourself if you call `processCheckout()` directly.

## Handling `payment_result`

`processCheckout()`'s response is `{ order_id, order_key, order_number, payment_result, ... }` (`CheckoutProcessResponse`). `payment_result.payment_status`:

| `payment_status` | Meaning | Fields present |
|---|---|---|
| `success` | Payment completed. | `redirect_url` |
| `no_payment_required` | Order total is `0` — no gateway was called. | `redirect_url` |
| `on_hold` | Payment was authorized/captured but needs manual or fraud/risk review — not an error, and not something the *customer* needs to act on. | `redirect_url` (same as `success`); occasionally also `action_type`/`action_data` with extra info to show the customer (e.g. a Multibanco voucher), even though nothing needs to be retried. |
| `requires_action` | The gateway needs the customer to do something else before the payment can complete (3D Secure/SCA, an off-site approval redirect). The order is left `pending`; the draft order/cart session are **not** cleared. | `action_type`, `action_data` instead of `redirect_url`/`message`. |
| `failed` | Payment was declined, errored, or had nothing a client could act on. | `message` |

### Resolving requires_action

```ts
const response = await client.checkout.processCheckout({ /* ... */ });
const { order_id, order_key, payment_result } = response.toObject();

if (payment_result?.payment_status === 'requires_action') {
  console.log(payment_result.action_type, payment_result.action_data);

  // Resolve the action client-side, then process the SAME cart/session again —
  // it lands on the same order rather than creating a duplicate.
  const retryResponse = await client.checkout.processCheckout({ /* same payload */ });
}
```

The order and cart session are deliberately left intact when `requires_action` comes back — there is no separate "confirm" endpoint, just calling `processCheckout()` again once the action is resolved. Known `action_type` values (not exhaustive — see `CheckoutActionType`):

| `action_type` | Gateway | `action_data` | What to do |
|---|---|---|---|
| `stripe_confirm_payment` | WooCommerce Stripe Gateway | `client_secret`, `intent_type` | `stripe.confirmPayment({ clientSecret, elements, redirect: 'if_required' })`, then retry. Handled automatically by `createStripeGateway`'s `confirmAction`. |
| `wcpay_confirm_payment` | WooPayments | `client_secret`, `intent_type` | Same as above — WooPayments is Stripe-based too. Handled automatically by `createWooPaymentsGateway`'s `confirmAction`. |
| `paypal_approve` | PayPal Payments (`ppcp-gateway`) | `redirect` — a URL | Open the PayPal-hosted approval URL. Completion is async (webhook-driven) — retry once the order is actually paid, not immediately after the redirect returns. No pre-wired factory; see [Gateways → PayPal Payments](gateways.md#paypal-payments). |
| `paypal_confirm_3ds` | PayPal Payments (`ppcp-credit-card-gateway`) | `redirect` — a URL | Open PayPal's 3D Secure step-up URL. The return URL must carry the same `ppcp_resume_nonce` PayPal generated — send it back in `payment_data` on retry. |
| `gateway_redirect_required` | Any gateway without a dedicated compat integration | `redirect` — a URL | Generic fallback: a gateway reported success while the order still needed payment and gave a real redirect. Open it; completion may be async. |

If a gateway reports success with genuinely nothing to act on, the API reports a plain `failed` instead of an unresolvable `requires_action` — you'll never be stuck polling for an action that isn't coming.

If you're using a pre-wired gateway from `gateways.ts` (Stripe, WooPayments, Stripe Express) with `submit()`, the `stripe_confirm_payment`/`wcpay_confirm_payment` retry loop is handled for you automatically via the gateway adapter's `confirmAction` — see [Gateways → Confirming requires_action](gateways.md#confirming-requires_action). PayPal Payments' redirect-based actions (`paypal_approve`/`paypal_confirm_3ds`) have no pre-wired factory — see [Gateways → PayPal Payments](gateways.md#paypal-payments) for the pattern.

## One-call orchestration

Use `submit()` when you want the SDK to run the common update + process (+ `requires_action` retry, if the gateway supports it) sequence for you.

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

---

## Checkout Config

`getCheckoutConfig()` is public — it works before a cart session exists — and returns the store's field definitions, locale overrides, country/state lists, and shipping/account/store/validation settings. Use it to build a checkout form dynamically instead of hardcoding field lists.

```ts
const configResponse = await client.checkout.getCheckoutConfig();
const config = configResponse.toObject();

console.log(config.fields?.billing);            // Record<string, CheckoutFieldDefinition>
console.log(config.countries?.allowed_countries); // { US: 'United States (US)', ... }
console.log(config.shipping?.enabled);           // boolean
console.log(config.account?.allow_registration); // boolean — whether to show a "create account" field
console.log(config.store?.currency);             // 'USD'
console.log(config.validation?.postcode?.patterns?.['US']); // regex string, informational only
```

`config.account` is also the source of truth for whether the [Registration](../../../docs/account.md#registration) flow should be exposed: check `allow_registration` before showing a "create an account" option, and `registration_generate_username`/`registration_generate_password` to decide whether to collect those fields at all.

---

## Address Autocomplete

`searchAddresses()` and `getAddressDetails()` wrap the store's configured address-autocomplete provider (e.g. Google Places). Both are public and don't require a cart session.

```ts
const results = await client.checkout.searchAddresses({
  query: '123 Main',   // minimum 3 characters
  country: 'US',       // optional — defaults to session/store country
  type: 'billing',      // 'billing' | 'shipping'
});
const { suggestions, provider } = results.toObject();

// suggestions: [{ id: 'addr_12345', label: '123 Main Street, Beverly Hills, CA 90210', matched_substrings: [...] }]

const detailsResponse = await client.checkout.getAddressDetails({
  address_id: suggestions[0].id,
  provider: provider.id,
});
const { address } = detailsResponse.toObject();
// address: { address_1, address_2, city, state, postcode, country }
```

If no provider is configured, `searchAddresses()`/`getAddressDetails()` throw a `CoCartError` with code `cocart_address_search_no_provider` / `cocart_address_details_no_provider` — treat address autocomplete as progressive enhancement and fall back to manual entry.

---

## Order Received / Pay for Order

After `submit()` creates an order, use `getOrderReceived()` to render a thank-you/confirmation page — it works for both guests (with the order key) and logged-in customers (who must own the order).

```ts
const { order_id, order_key } = result.processResponse.toObject();

const orderResponse = await client.checkout.getOrderReceived(order_id!, order_key!);
const order = orderResponse.toObject();

console.log(order.status_name);   // 'Processing'
console.log(order.items);         // OrderLineItem[]
console.log(order.totals);        // OrderTotalLine[] — display-ready { key, label, value }
console.log(order.needs_payment); // false once paid
```

If `needs_payment` is `true` (e.g. the customer abandoned checkout on a `pending` order and came back), use `payForOrder()` to retry payment:

```ts
const payResponse = await client.checkout.payForOrder(order.order_id, order.order_key, {
  payment_method: 'stripe',
  payment_data: [{ key: 'payment_intent_id', value: 'pi_123' }],
});
const { success, redirect_url } = payResponse.toObject();
```

> [!NOTE]
> Unlike `processCheckout()`, a payment failure on `payForOrder()` raises a `CoCartError` with code `cocart_payment_failed` instead of returning an inline failed status — wrap the call in `try`/`catch`.
