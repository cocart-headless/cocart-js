# Account API

The account endpoint gives authenticated customers access to their profile, order history, downloads, and reviews. All methods require the customer to be logged in via Basic Auth or JWT — guest access is not supported.

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

## Profile

### Get Profile

Returns the customer's account details including billing and shipping addresses, order count, and total spend.

```ts
const response = await client.account().getProfile();
const profile = response.toObject();

console.log(profile.user.first_name);              // 'Jane'
console.log(profile.user.email);                   // 'jane@example.com'
console.log(profile.user.orders_count);            // 14
console.log(profile.user.total_spent);             // '320.00'
console.log(profile.user.is_paying_customer);      // true
console.log(profile.user.avatar_url);              // 'https://...'
console.log(profile.user.addresses.billing);       // AccountAddress
console.log(profile.user.addresses.shipping);      // AccountAddress

// Most recent order (null if no orders yet)
console.log(profile.recent_order.order_id);        // 1042
console.log(profile.recent_order.order_date);      // '2025-11-03T10:22:00'

// Store-side meta
console.log(profile.meta.is_vat_exempt);           // false
```

**Response type:** `AccountProfile`

| Field | Type | Description |
|---|---|---|
| `user.id` | `number` | WordPress user ID |
| `user.date_registered` | `string` | ISO 8601 registration timestamp |
| `user.email` | `string` | Email address |
| `user.first_name` | `string` | First name |
| `user.last_name` | `string` | Last name |
| `user.display_name` | `string` | Display name |
| `user.addresses.billing` | `AccountAddress` | Billing address |
| `user.addresses.shipping` | `AccountAddress` | Shipping address |
| `user.orders_count` | `number` | Total number of orders |
| `user.total_spent` | `string` | Formatted lifetime spend |
| `user.is_paying_customer` | `boolean` | Has at least one completed order |
| `user.avatar_url` | `string` | Gravatar or custom avatar URL |
| `recent_order.order_id` | `number \| null` | Most recent order ID |
| `recent_order.order_date` | `string \| null` | Most recent order date |
| `recent_order.order_data` | `string \| null` | Link to order detail |
| `meta.is_customer_outside_base` | `boolean` | Customer is outside store's base country |
| `meta.is_vat_exempt` | `boolean` | VAT exempt status |

---

### Update Profile

Updates the customer's name, display name, and email address.

```ts
const response = await client.account().updateProfile({
  account_first_name: 'Jane',
  account_last_name: 'Doe',
  account_display_name: 'Jane Doe',
  account_email: 'jane@example.com',
});

const result = response.toObject();
console.log(result.success); // true
console.log(result.message); // 'Account details updated.'
```

**Input type:** `AccountUpdateInput`

| Field | Required | Description |
|---|---|---|
| `account_first_name` | Yes | First name |
| `account_last_name` | Yes | Last name |
| `account_display_name` | Yes | Display name |
| `account_email` | Yes | Email address |

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

---

## Orders

### List Orders

Returns a paginated list of the customer's orders.

```ts
const response = await client.account().getOrders();
const data = response.toObject();

for (const order of data.orders) {
  console.log(order.order_id);     // 1042
  console.log(order.order_status); // 'completed'
  console.log(order.order_date);   // '2025-11-03'
  console.log(order.item_count);   // 3
  console.log(order.order_total);  // '64.50'
}

// Pagination links
console.log(data.pagination.next);     // URL or null
console.log(data.pagination.previous); // URL or null
```

**Parameters:** `AccountOrdersParams`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | `1` | Page number (1–100) |
| `per_page` | `number` | `10` | Results per page (1–50) |
| `order` | `'ASC' \| 'DESC'` | `'DESC'` | Sort direction |

```ts
// Page 2, 20 per page, oldest first
const response = await client.account().getOrders({ page: 2, per_page: 20, order: 'ASC' });
```

---

### Get a Single Order

Returns full detail for one order.

```ts
const response = await client.account().getOrder(1042);
const order = response.toObject();

console.log(order.order_number);   // '1042'
console.log(order.order_status);   // 'completed'
console.log(order.order_currency); // 'USD'
console.log(order.items);          // line items array
console.log(order.totals);         // totals object
console.log(order.downloads);      // AccountDownload[]
```

### Get a Guest Order

For guest order look-up pages — no auth required, but the order ID and billing email must match:

```ts
const response = await client.account().getGuestOrder(1042, 'jane@example.com');
```

**Response type:** `AccountOrderDetail`

| Field | Type | Description |
|---|---|---|
| `order_id` | `number` | Order ID |
| `order_number` | `string` | Order number (may differ from ID) |
| `order_date` | `string` | Order date |
| `order_status` | `string` | WooCommerce order status |
| `order_currency` | `string` | Currency code |
| `billing_address` | `string` | Formatted billing address |
| `shipping_address` | `string` | Formatted shipping address |
| `phone` | `string` | Billing phone |
| `email` | `string` | Billing email |
| `ship_to_billing` | `boolean` | Whether shipping matches billing |
| `items` | `Record<string, unknown>[]` | Line items |
| `totals` | `Record<string, unknown>` | Order totals |
| `order_note` | `string` | Customer-provided note |
| `order_notes` | `Record<string, unknown>[]` | Store notes |
| `downloads` | `AccountDownload[]` | Downloadable files on this order |
| `order_actions` | `Record<string, { url, name }>` | Available actions (e.g. reorder, cancel) |

---

## Downloads

### All Downloads

Returns every downloadable file available to the customer across all orders.

```ts
const response = await client.account().getDownloads();
const downloads = response.toObject();

for (const file of downloads) {
  console.log(file.product_name);          // 'My eBook'
  console.log(file.download_name);         // 'my-ebook-v2.pdf'
  console.log(file.file);                  // 'https://store.com/wp-content/...'
  console.log(file.downloads_remaining);   // '3' or 'Unlimited'
  console.log(file.download_expires);      // '2026-12-31' or 'Never'
}
```

**Response type:** `AccountDownload[]`

| Field | Type | Description |
|---|---|---|
| `product_name` | `string` | Product the file belongs to |
| `download_name` | `string` | File name |
| `file` | `string` | Download URL |
| `downloads_remaining` | `string` | Remaining download count, or `'Unlimited'` |
| `download_expires` | `string` | Expiry date, or `'Never'` |

---

### Downloads for a Single Order

Returns only the downloadable files attached to a specific order.

```ts
const response = await client.account().getOrderDownloads(1042);
const files = response.toObject();
```

### Guest Order Downloads

For guest order look-up pages — no auth required, but the order ID and billing email must match:

```ts
const response = await client.account().getGuestOrderDownloads(1042, 'jane@example.com');
```

---

## Reviews

Returns the reviews the customer has submitted.

```ts
const response = await client.account().getReviews();
const reviews = response.toObject();
```

> [!NOTE]
> The reviews endpoint is currently in development and the response shape is not yet finalized. The response is typed as `unknown` — cast to your own interface once the API stabilizes.

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
