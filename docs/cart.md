# Cart API

The Cart API handles all shopping cart operations — adding items, updating quantities, applying coupons, managing shipping, and more. This is the core of any headless WooCommerce storefront.

**How cart sessions work:**

- **Guest customers** — The first request creates a new guest session. The server returns a `Cart-Key` (a unique identifier like `guest_abc123`) which the SDK extracts and stores automatically. All subsequent requests use this key so the server knows which cart belongs to which visitor.
- **Authenticated customers** — The server identifies the cart by the WordPress user account. No cart key is needed because the server already knows who you are from your authentication credentials.

To access cart methods, call `client.cart()`:

```ts
const cart = client.cart();
```

## Create Cart

Create a new guest cart session without adding items. Only available for non-authenticated (guest) users.

```ts
const response = await client.cart().create();
console.log(response.get('cart_key')); // 'guest_abc123...'
```

## Get Cart

```ts
const response = await client.cart().get();

// With parameters
const response = await client.cart().get({
  _fields: 'items,totals', // Limit returned fields (also accepts 'fields')
  thumb: 'true',           // Include product thumbnails
  default: 'true',         // Return default cart data
});
```

### Type-Safe Field Filtering

A full cart response includes many fields (items, totals, coupons, shipping, customer, etc.). If you only need a few of them, `getFiltered()` tells the server to send back only the fields you list. This has two benefits:

1. **Less data transferred** — Faster responses, especially on slow connections.
2. **TypeScript safety** — The return type only includes the fields you asked for, so you get an error at compile time if you try to access a field you didn't request.

```ts
const response = await client.cart().getFiltered(['items', 'totals']);
const data = response.toObject();

data.items;    // CartItem[]  ✓
data.totals;   // CartTotals  ✓
data.currency; // TS compile error — not requested  ✓
```

This sends `?_fields=items,totals` to the server, so only those fields are returned over the wire.

## Client-Side Validation

**Client-side validation** means the SDK checks your inputs _before_ sending anything to the server. If you pass an invalid product ID (like `-1`) or a quantity of `0`, the SDK throws an error immediately. This saves time because you don't have to wait for a server round-trip just to find out the input was bad.

```ts
import { ValidationError } from '@cocart/sdk';

try {
  await client.cart().addItem(-1, 0);
} catch (e) {
  if (e instanceof ValidationError) {
    // e.message => "Product ID must be a positive integer"
    // No network request was made
  }
}
```

Validation rules:

- **Product ID** — Must be a positive integer (`addItem`, `addVariation`)
- **Quantity** — Must be a positive number (`addItem`, `addVariation`, `updateItem`)

You can also use the validation functions directly:

```ts
import { validateProductId, validateQuantity, validateEmail } from '@cocart/sdk';

validateProductId(123);           // OK
validateProductId(-1);            // throws ValidationError
validateQuantity(2);              // OK
validateQuantity(0);              // throws ValidationError
validateEmail('user@example.com'); // OK
validateEmail('not-an-email');     // throws ValidationError
```

## Adding Items

### Add a Simple Product

```ts
// Product ID 123, quantity 2
const response = await client.cart().addItem(123, 2);

// Shorthand
const response = await client.cart().add(123, 2);
```

### Add with Options

```ts
const response = await client.cart().addItem(123, 1, {
  item_data: {
    gift_message: 'Happy Birthday!',
    engraving: 'John',
  },
  email: 'customer@email.com',
  return_item: true,  // Return only the added item details
});
```

### Add a Variable Product

A **variable product** is a product with options like size or color. In WooCommerce, these are called "variations." When adding a variable product, you specify which variation the customer chose:

```ts
const response = await client.cart().addVariation(456, 1, {
  attribute_pa_color: 'blue',
  attribute_pa_size: 'large',
});

// Or using addItem with variation option
const response = await client.cart().addItem(456, 1, {
  variation: {
    attribute_pa_color: 'blue',
    attribute_pa_size: 'large',
  },
});
```

### Add Multiple Items at Once

```ts
const response = await client.cart().addItems([
  { id: '123', quantity: '2' },
  { id: '456', quantity: '1', variation: {
    attribute_pa_color: 'red',
  }},
  { id: '789', quantity: '3' },
]);
```

## Updating Items

Every item in the cart has a unique **item key** — a long string like `abc123def456...` that identifies that specific item. You receive item keys in cart responses (in the `item_key` field of each item). You use this key to tell the server which item you want to update or remove.

```ts
// Item keys are returned in cart responses
const response = await client.cart().updateItem('abc123def456...', 5);

// With additional options
const response = await client.cart().updateItem('abc123def456...', 3, {
  item_data: { gift_wrap: true },
});
```

### Update Multiple Items at Once

```ts
// Shorthand: item_key => quantity
const response = await client.cart().updateItems({
  'abc123def456...': 3,
  'def789ghi012...': 1,
});

// Full format with additional options
const response = await client.cart().updateItems([
  { item_key: 'abc123def456...', quantity: 3 },
  { item_key: 'def789ghi012...', quantity: 1 },
]);
```

## Removing & Restoring Items

### Remove an Item

```ts
const response = await client.cart().removeItem('abc123def456...');
```

### Remove Multiple Items at Once

```ts
const response = await client.cart().removeItems([
  'abc123def456...',
  'def789ghi012...',
]);
```

### Restore a Removed Item

```ts
const response = await client.cart().restoreItem('abc123def456...');
```

### Get Removed Items

```ts
const response = await client.cart().getRemovedItems();
```

## Cart Management

### Clear Cart

```ts
const response = await client.cart().clear();

// Alias
const response = await client.cart().empty();
```

### Calculate Totals

```ts
const response = await client.cart().calculate();
```

### Update Cart

```ts
const response = await client.cart().update({
  customer_note: 'Please gift wrap.',
});
```

## Totals & Counts

### Get Totals

```ts
// Raw values
const response = await client.cart().getTotals();

// Formatted with currency (HTML)
const response = await client.cart().getTotals(true);
```

### Get Item Count

```ts
const response = await client.cart().getItemCount();
```

### Get Cart Items

Get only the items in the cart (lighter than fetching the full cart):

```ts
const response = await client.cart().getItems();
```

### Get a Single Cart Item

```ts
const response = await client.cart().getItem('abc123def456...');
```

## Coupons

> Requires the CoCart Plus plugin.

### Apply a Coupon

```ts
const response = await client.cart().applyCoupon('SUMMER20');
```

### Remove a Coupon

```ts
const response = await client.cart().removeCoupon('SUMMER20');
```

### Get Applied Coupons

```ts
const response = await client.cart().getCoupons();
```

### Validate Applied Coupons

```ts
const response = await client.cart().checkCoupons();
```

## Customer Details

### Update Customer

```ts
// Update billing address
const response = await client.cart().updateCustomer(
  {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    address_1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postcode: '10001',
    country: 'US',
  },
);

// Update shipping address
const response = await client.cart().updateCustomer(
  {},  // empty billing
  {
    first_name: 'John',
    last_name: 'Doe',
    address_1: '456 Oak Ave',
    city: 'Los Angeles',
    state: 'CA',
    postcode: '90001',
    country: 'US',
  },
);

// Update both at once
const response = await client.cart().updateCustomer(
  { email: 'john@example.com' },
  { address_1: '456 Oak Ave' },
);
```

### Get Customer Details

```ts
const response = await client.cart().getCustomer();
```

## Shipping

### Get Available Shipping Methods

```ts
const response = await client.cart().getShippingMethods();
```

### Set Shipping Method

> Requires the CoCart Plus plugin.

```ts
const response = await client.cart().setShippingMethod('flat_rate:1');
```

### Calculate Shipping

```ts
const response = await client.cart().calculateShipping({
  country: 'US',
  state: 'CA',
  postcode: '90001',
  city: 'Los Angeles',
});
```

## Fees

> Requires the CoCart Plus plugin.

### Get Cart Fees

```ts
const response = await client.cart().getFees();
```

### Add a Fee

```ts
// Non-taxable fee
const response = await client.cart().addFee('Rush Processing', 9.99);

// Taxable fee
const response = await client.cart().addFee('Gift Wrapping', 4.99, true);
```

### Remove All Fees

```ts
const response = await client.cart().removeFees();
```

## Cross-Sells

**Cross-sells** are product recommendations based on what's currently in the cart. For example, if a customer has a laptop in their cart, cross-sells might suggest a laptop bag or mouse. These are configured in WooCommerce's product settings.

```ts
const response = await client.cart().getCrossSells();
```

## ETag / Conditional Requests

**ETag** (Entity Tag) is a caching mechanism. When the server responds, it includes an `ETag` header — a unique fingerprint of the data. On the next request, the SDK automatically sends this fingerprint back via `If-None-Match`. If the data hasn't changed, the server responds with `304 Not Modified` (no body), saving bandwidth and speeding up responses.

ETag support is **enabled by default**.

```ts
// First request: full response with ETag header
const response = await client.cart().get();

// Second request: sends If-None-Match automatically
const response2 = await client.cart().get();
if (response2.isNotModified()) {
  console.log('Cart has not changed');
}
```

### Disable ETag

```ts
// Via constructor
const client = new CoCart('https://your-store.com', { etag: false });

// At runtime
client.setETag(false);
```

### Clear ETag Cache

```ts
// Force fresh responses on next request
client.clearETagCache();
```

### Skip Cache for a Single Request

```ts
const response = await client.cart().get({ _skip_cache: 'true' });
```

### Cache Status

The `CoCart-Cache` response header indicates server-side cache status:

```ts
const response = await client.cart().get();
console.log(response.getCacheStatus()); // 'HIT', 'MISS', or 'SKIP'
```

## Working with Responses

Every cart method returns a `Response` object that wraps the server's reply. Instead of digging through raw JSON, you can use helper methods to access common data. The `get()` method supports **dot notation** — a way to reach nested values using dots (e.g., `'totals.subtotal'` instead of `response.data.totals.subtotal`):

```ts
const response = await client.cart().get();

// Cart items
const items = response.getItems();

// Cart totals
const totals = response.getTotals();

// Item count
const count = response.getItemCount();

// Cart key (from headers)
const cartKey = response.getCartKey();

// Cart hash
const hash = response.getCartHash();

// Notices
const notices = response.getNotices();

// Dot-notation access
const subtotal = response.get('totals.subtotal');
const firstItemName = response.get('items.0.name');

// Check if key exists
if (response.has('totals.discount_total')) {
  console.log('Discount applied!');
}

// Full data
const data = response.toObject();
const json = response.toJson();
```

See [Error Handling](error-handling.md) for handling API errors.
