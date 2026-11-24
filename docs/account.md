# Account API

The account endpoint gives authenticated customers access to their profile, order history, downloads, and reviews, plus an unauthenticated method for registering new customers. All methods except `register()` require the customer to be logged in via Basic Auth or JWT — guest access is not supported.

Access the account endpoint via `client.account()`. The instance is lazy-loaded on first call and reused thereafter.

> [!NOTE]
> The account API is provided by CoCart Plus plugin. If the plugin is not installed, any account method throws a `CoCartError` with code `cocart_plugin_required` instead of a network error.

---

## Authentication

Every account call must be made as an authenticated user. Set credentials when creating the client:

```ts
import { CoCart } from '@cocartheadless/sdk';

// Basic Auth
const client = new CoCart('https://your-store.com', {
  username: 'customer@example.com',
  password: 'their-password',
});

// JWT (recommended for browser-side code)
const client = new CoCart('https://your-store.com');
await client.login('customer@example.com', 'their-password');
```

See [Authentication](./authentication.md) for the full guide including JWT auto-refresh.

---

## How responses look

Every account response is a document that says what it is in `object` (`customer`, `order`, `subscription`…). A request that changes something puts what it did first, in `result`: a `code` to branch on and a `message` for the customer. An order or subscription has `allowed_actions`: what the customer may do with it now, as a list of names (e.g. `pay`, `cancel`, `suspend`).

Amounts are minor-unit strings (`"4999"`), as in the cart. Pass `formatted: true` for amounts ready to display (`"$49.99"`), and `meta_keys` to narrow the order or customer `meta` to the keys you need. The documents are typed from the CoCart Plus spec: `AccountProfile` (the customer), `Order`, `OrderList`, `Subscription`, `SubscriptionList` and `Downloads`, with every schema in `CoCartPlusSchemas`.

---

## Registration

Registers a new customer account. Unlike every other account method, `register()` does not require the customer to be logged in — it's the entry point before authentication, not after.

```ts
const client = new CoCart('https://your-store.com');

const response = await client.account().register({
  email: 'jane@example.com',
  requestedUsername: 'jane',      // optional if the store generates usernames from email
  requestedPassword: 'a-strong-password', // optional if the store generates passwords
});

const customer = response.toObject();
console.log(customer.result?.code); // 'account_created'
console.log(customer.id);           // 42
console.log(customer.username);     // 'jane'

// Log in next.
await client.login('jane', 'a-strong-password');
```

**Input type:** `RegisterCustomerInput`

| Field | Required | Description |
|---|---|---|
| `email` | Yes | Must not already be registered. |
| `requestedUsername` | No | Only required if the store's "generate username from email" setting is disabled. |
| `requestedPassword` | No | Only required if the store's "generate password" setting is disabled — otherwise a password is generated and emailed to the customer. |

> [!NOTE]
> On the wire these are sent as `requested_username`/`requested_password`, not `username`/`password`. This is deliberate: CoCart Starter's auth layer treats a request containing non-empty `username`/`password` fields as a Basic Auth attempt, which would collide with — and reject — this endpoint's own registration fields.

**Response type:** `RegisteredCustomer`: the new customer, as `getProfile()` gives it, with `account_created` in `result`. The response is a `201`.

### Errors

| Status | Code | Meaning |
|---|---|---|
| `400` | `cocart_invalid_email` | Email missing or invalid |
| `400` | `cocart_registration_invalid_username` | The username isn't valid |
| `400` | `cocart_registration_reserved_username` | The username is on the store's reserved list (e.g. `admin`) |
| `400` | `cocart_registration_missing_password` | The store needs a password and none was given |
| `400` | `cocart_registration_weak_password` | The password is too weak |
| `400` | `cocart_account_creation_failed` | WooCommerce couldn't create the account |
| `409` | `cocart_account_exists` | The email is already registered |
| `409` | `cocart_registration_username_exists` | The username is already taken |

```ts
try {
  await client.account().register({ email: 'jane@example.com' });
} catch (error) {
  if (error instanceof CoCartError && error.errorCode === 'cocart_account_exists') {
    // Prompt the customer to log in instead
  }
}
```

You can check whether registration is enabled, and whether username/password fields are required, via the checkout package's `getCheckoutConfig()` — see [Checkout Config](../packages/checkout/docs/checkout-flow.md#checkout-config) (`allow_registration`, `registration_generate_username`, `registration_generate_password`, `guest_checkout_enabled`).

---

## Profile

### Get Profile

Returns the signed-in customer: name, email, addresses, what they've bought and their most recent orders.

```ts
const response = await client.account().getProfile();
const customer = response.toObject();

console.log(customer.first_name);               // 'Jane'
console.log(customer.email);                    // 'jane@example.com'
console.log(customer.pending_email);            // a new email waiting to be confirmed, or null
console.log(customer.stats.orders_count);       // 14
console.log(customer.stats.total_spent);        // '32000' (minor units; formatted: true for '$320.00')
console.log(customer.billing?.formatted);       // the billing address on one line
console.log(customer.shipping);                 // null when the store doesn't ship to a separate address
console.log(customer.recent_orders);           // the most recent orders, newest first ([] when none)
console.log(customer.tax.is_vat_exempt);        // false
```

**Response type:** `AccountProfile`

| Field | Type | Description |
|---|---|---|
| `id` | `number` | WordPress user ID |
| `username` | `string` | The username the account logs in with |
| `email` | `string` | The email the account logs in with (may not be the billing email) |
| `pending_email` | `string \| null` | A new email waiting to be confirmed through the link sent to it |
| `first_name`, `last_name`, `display_name` | `string` | Names |
| `avatar_url` | `string` | Avatar URL |
| `date_registered` | `{ iso, label } \| null` | When the customer registered |
| `currency` | `object` | The store currency, which `total_spent` is in |
| `stats` | `{ orders_count, total_spent, is_paying_customer }` | What the customer has bought |
| `billing`, `shipping` | `object \| null` | Addresses, each with `formatted` for display |
| `tax` | `{ is_vat_exempt, is_outside_base }` | How tax applies |
| `recent_orders` | `object[]` | The most recent orders, newest first (5 by default), each `{ id, number, status, date_created, total, href }` |
| `meta`, `extensions` | `object` | Allowed meta, other plugins' data |

---

### Update Profile

Saves the account details. Send only what changes. Every field at fault is reported at once:

```ts
try {
  const customer = (await client.account().updateProfile({
    account_first_name: 'Jane',
    account_email: 'jane.doe@example.com',
  })).toObject();
  console.log(customer.result?.code); // 'account_updated'
  console.log(customer.pending_email); // set when the store confirms a new email first
} catch (error) {
  if (error instanceof CoCartError) {
    for (const [field, message] of Object.entries(error.getFields())) showFieldError(field, message);
  }
}
```

**Input type:** `AccountUpdateInput`

| Field | Description |
|---|---|
| `account_first_name` | First name |
| `account_last_name` | Last name |
| `account_display_name` | Display name |
| `account_email` | Email address. When the store asks for it, the change is confirmed by email first (`pending_email`), then with `verifyEmail()` |

---

### Change Password

```ts
await client.account().changePassword({
  current: 'old-password',
  password: 'new-password',
  confirm: 'new-password',
});
```

**Input type:** `AccountChangePasswordInput`

| Field | Required | Description |
|---|---|---|
| `current` | Yes | Current password |
| `password` | Yes | New password |
| `confirm` | Yes | New password confirmation — must match `password` |

It's one `POST /my-account` with only the password fields; the rest of the account is left as it is. A wrong current password is a `ValidationError` with code `cocart_account_incorrect_current_password`; passwords that don't match are `cocart_account_new_passwords_do_not_match`.

---

### Update Address

Saves the customer's billing and/or shipping address, and returns the customer. Fields are unprefixed:

```ts
await client.account().updateAddress({
  billing_address: { first_name: 'Jane', address_1: '1 Main St', city: 'Paris', postcode: '75001', country: 'FR' },
  shipping_address: { first_name: 'Jane', address_1: '1 Main St', city: 'Paris', postcode: '75001', country: 'FR' },
});
```

Both addresses are checked before either is saved; every field at fault is in `error.getFields()` (`cocart_invalid_address_fields`).

---

## Orders

### List Orders

Returns a page of the customer's orders, newest first, each as a summary.

```ts
const response = await client.account().getOrders();
const { orders, pagination } = response.toObject();

for (const order of orders) {
  console.log(order.id);            // 1042
  console.log(order.number);        // '1042'
  console.log(order.status.code);   // 'completed' (use this in code)
  console.log(order.status.label);  // 'Completed' (translated, for display)
  console.log(order.date_created?.label);
  console.log(order.total);         // '6450'
  console.log(order.allowed_actions); // e.g. ['pay', 'cancel']
}

console.log(pagination.total_items, pagination.total_pages); // also in X-WP-Total / X-WP-TotalPages
```

**Parameters:** `AccountOrdersParams`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | `1` | Page number |
| `per_page` | `number` | `10` | Results per page |
| `order` | `'ASC' \| 'DESC'` | `'DESC'` | Sort direction |
| `status` | `string \| string[]` | every status | Only these statuses, e.g. `['processing', 'on-hold']` |
| `after` / `before` | `string` | — | Only orders placed after/before this date (ISO 8601; without an offset it's UTC) |
| `subscription_order_type` | `'parent' \| 'renewal' \| 'switch' \| 'resubscribe'` | — | Only orders with this relationship to a subscription |
| `formatted` | `boolean` | `false` | Amounts formatted for display |
| `meta_keys` | `string[]` | every allowed key | Only these keys in each `meta` |

```ts
// Processing orders from this year, 20 per page
const response = await client.account().getOrders({ status: 'processing', after: '2026-01-01T00:00:00', per_page: 20 });
```

---

### Get a Single Order

Returns the whole order: what was bought, the totals as lines to display, the payment, the customer, the delivery (shipping lines), the downloads, notes and what can be done next (`allowed_actions`).

```ts
const order = (await client.account().getOrder(1042)).toObject();

console.log(order.status.code);          // 'completed'
console.log(order.items);                // each line with its product, quantity, price and totals
console.log(order.total_lines);          // [{ key, label, amount, detail }] in display order
console.log(order.payment.title);        // 'Credit card'
console.log(order.payment.needs_payment); // true while it can still be paid
console.log(order.delivery.shipping_lines); // [{ title, total, tax }]
console.log(order.downloads);            // the files this order can download
console.log(order.allowed_actions);      // e.g. ['pay', 'cancel']
```

Someone else's order, or one that doesn't exist, is `404 cocart_order_not_found`.

### Get a Guest Order

For guest order look-up pages — no login, but the order ID and billing email must match. The order comes without its `key` (which would let the holder pay for it), and look-ups are rate limited (`429 cocart_guest_lookup_rate_limited`):

```ts
const response = await client.account().getGuestOrder(1042, 'jane@example.com');
```

**Response type:** `AccountOrderDetail` (the `Order` document)

---

## Downloads

### All Downloads

Returns every file the customer can download, across all orders.

```ts
const downloads = (await client.account().getDownloads()).toObject();

for (const file of downloads) {
  console.log(file.name);                 // 'my-ebook-v2.pdf'
  console.log(file.product.name);         // 'My eBook'
  console.log(file.downloads_remaining);  // 3, or null when unlimited
  console.log(file.expires?.label);       // or null when it never expires
  console.log(file.href);                 // the link that downloads the file
}
```

**Response type:** `Downloads` (`AccountDownload[]`)

---

### Downloads for a Single Order

Returns the files one order can download (`GET /my-account/orders/{id}/downloads`), in the same shape:

```ts
const downloads = (await client.account().getOrderDownloads(1042)).toObject();
```

### Guest Order Downloads

For guest order look-up pages — no login, but the order ID and billing email must match:

```ts
const downloads = (await client.account().getGuestOrderDownloads(1042, 'jane@example.com')).toObject();
```

---

## Cancel an Order

Cancels one of the customer's orders where WooCommerce allows it (for example a pending or failed order), and returns the order with what happened in `result`:

```ts
const order = (await client.account().cancelOrder(1042)).toObject();
console.log(order.status.code); // 'cancelled'
```

An order that can't be cancelled is `409 cocart_order_cannot_be_cancelled`.

---

## Reviews

Returns the reviews the customer has submitted (`GET /products/reviews/mine`, the same as `products().myReviews()`):

```ts
const response = await client.account().getReviews();
const reviews = response.toObject();
```

---

## Email Verification

```ts
// Confirm a pending email change, with the key and user ID from the emailed link.
const change = (await client.account().verifyEmail(key, userId)).toObject();
console.log(change.email); // the address the account now has

// Prove ownership of the account email so WooCommerce links past guest orders to it (WooCommerce 11+).
const sent = (await client.account().sendOrderEmailVerification()).toObject();
console.log(sent.retry_after); // seconds before another email can be asked for
await client.account().verifyOrderEmail(key, userId); // returns the customer
```

An expired or wrong key is `400 cocart_invalid_or_expired_key`; an email already verified is `409 cocart_email_already_verified`.

---

## Subscriptions

Needs WooCommerce Subscriptions.

```ts
const { subscriptions, pagination } = (await client.account().getSubscriptions({ status: 'active' })).toObject();
const one = await client.account().getSubscription(512);

await client.account().suspendSubscription(512);
await client.account().reactivateSubscription(512);
await client.account().cancelSubscription(512);
await client.account().setSubscriptionAutoRenew(512, false);

// Resubscribe puts the ended subscription's items in the cart; check out as usual, or undo it.
await client.account().resubscribe(512);
await client.account().cancelResubscribe(512);
```

Each change returns the subscription with what happened in `result`. A change the subscription's state refuses is a `409` (e.g. `cocart_subscription_cannot_suspend`).

### Changing a Subscription's Payment Method

A subscription can switch to a payment method the customer has saved, or to a new card. Use a gateway that can charge renewals. The saved methods come from the checkout package's `getSavedPaymentMethods()`, whose `supportsSubscriptions` says so.

```ts
// A saved payment method
const result = await client.account().updateSubscriptionPaymentMethod(512, { payment_method: 'stripe', token_id: 7 });

// A new card, from stripe.createPaymentMethod() (Elements in `mode: 'setup'`: nothing is charged now)
const result = await client.account().updateSubscriptionPaymentMethod(512, {
  payment_method: 'stripe',
  payment_data: { 'wc-stripe-payment-method': paymentMethod.id },
});
```

A new card may need 3D Secure, so this returns a `CheckoutResult`, read as at checkout:

```ts
if (result.isComplete) {
  // code 'payment_method_changed'; result.message says which method it now renews with.
  const subscription = result.response.toObject() as SubscriptionPaymentMethodChange;
  console.log(result.subscriptionId, subscription.payment.title); // 512, 'Visa ending in 4242'
} else if (result.needsConfirmation) {
  // Usually a SetupIntent (result.intentType === 'setup_intent'): confirm it, then call again with the same input.
  const { error } = await stripe.handleNextAction({ clientSecret: result.clientSecret! });
} else if (result.needsRedirect) {
  // A bank that authorises a mandate off-site. When the customer comes back, confirmReturn() gives
  // the subscription (result.object === 'subscription').
  window.location.href = result.redirectUrl!;
} else if (result.isPending) {
  // Not confirmed yet: getSubscription(512) shows the new method once it is.
} else {
  showError(result.message); // a declined card is a failed result, not an exception
}
```

| Code (thrown) | Meaning |
|---|---|
| `cocart_subscription_not_found` | No such subscription for this customer (`404`) |
| `cocart_subscription_payment_method_change_unsupported` | The subscription's payment method can't be changed (`400`) |
| `cocart_subscription_cannot_change_payment_method` | The subscription's state doesn't allow it now (`409`) |
| `cocart_subscription_payment_token_required` | Pass a saved method's `token_id`, or a new card in `payment_data` (`400`) |
| `cocart_invalid_payment_method` | The payment method isn't usable for this (`400`) |
| `cocart_subscription_payment_token_needs_confirmation` | The saved method must be confirmed before it can pay renewals (`400`) |
| `cocart_payment_in_progress` | Another change is still taking payment for this subscription: check it before trying again (`409`) |

---

## Order Withdrawal

Submits a right-of-withdrawal request (WooCommerce's order withdrawal feature, WooCommerce 11.1+). No login needed; the response is the same whether or not the order matched, with `withdrawal_requested` in `result` and the email the acknowledgement went to:

```ts
await client.account().requestOrderWithdrawal({
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  email_confirmation: 'jane@example.com',
  order_number: '1042',
  withdrawal_type: 'full_order', // or 'specific_items_only' with additional_details
});
```

---

## Error Handling

Account methods inherit the standard SDK error hierarchy. Authentication failures throw `AuthenticationError`, missing routes (plugin not installed) throw a `CoCartError` with code `cocart_plugin_required`:

```ts
import { CoCartError, AuthenticationError } from '@cocartheadless/sdk';

try {
  const profile = await client.account().getProfile();
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Redirect to login
  } else if (error instanceof CoCartError && error.errorCode === 'cocart_plugin_required') {
    // Account API plugin is not installed on this store
  } else {
    throw error;
  }
}
```

See [Error Handling](./error-handling.md) for the full error hierarchy.
