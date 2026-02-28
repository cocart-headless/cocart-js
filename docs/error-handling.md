# Error Handling

When something goes wrong — a product doesn't exist, the customer isn't logged in, or the server has a problem — the SDK throws an **error**. Errors are JavaScript objects that describe what went wrong. You catch them using `try/catch` blocks (shown below).

## Error Hierarchy

The SDK uses three error classes organized in a hierarchy. A **hierarchy** means that `AuthenticationError` and `ValidationError` are special types of `CoCartError` — so if you catch `CoCartError`, you catch all of them.

```text
CoCartError (base)           — any API error
├── AuthenticationError      — login/permission problems (401, 403)
└── ValidationError          — bad input (400)
```

All errors extend `CoCartError`, which extends JavaScript's built-in `Error`. This means you can use `instanceof` to check what kind of error you caught.

## Catching Errors

In JavaScript, `try/catch` lets you attempt an operation and handle any errors gracefully instead of crashing. The `instanceof` keyword checks what type of error was thrown, so you can respond differently to different problems:

```ts
import { CoCartError, AuthenticationError, ValidationError } from '@cocart/sdk';

try {
  const response = await client.cart().addItem(999, 1);
} catch (e) {
  if (e instanceof ValidationError) {
    // 400 — product not found, out of stock, invalid quantity, etc.
    console.log('Validation Error:', e.message);
    console.log('Error Code:', e.errorCode);   // e.g. 'cocart_product_not_found'
    console.log('HTTP Code:', e.httpCode);      // 400
  } else if (e instanceof AuthenticationError) {
    // 401 or 403 — invalid credentials, expired token, forbidden
    console.log('Auth Error:', e.message);
    console.log('Error Code:', e.errorCode);    // e.g. 'cocart_authentication_error'
    console.log('HTTP Code:', e.httpCode);       // 401 or 403
  } else if (e instanceof CoCartError) {
    // Any other API error (404, 500, etc.)
    console.log('API Error:', e.message);
    console.log('HTTP Code:', e.httpCode);
  }
}
```

## Error Properties

All errors provide these properties:

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Human-readable error message from the API |
| `errorCode` | `string \| null` | API error code (e.g. `cocart_product_not_found`) |
| `httpCode` | `number` | HTTP status code (400, 401, 403, 500, etc.) |
| `responseData` | `Record<string, unknown>` | Full API response body for debugging |

## Inspecting the Full API Response

Every error carries the full API response data for debugging:

```ts
try {
  await client.cart().addItem(999, 1);
} catch (e) {
  if (e instanceof CoCartError) {
    // Full response from the API
    console.log(e.responseData);
    // e.g. { code: 'cocart_product_not_found', message: '...', data: { ... } }
  }
}
```

## JWT Token Expiry

Check if a token is expired before making requests, or handle the error after:

```ts
const jwt = client.jwt();

// Proactive check
if (jwt.isTokenExpired()) {
  await jwt.refresh();
}

// Or handle the error
try {
  await client.cart().get();
} catch (e) {
  if (e instanceof AuthenticationError && jwt.hasTokens()) {
    await jwt.refresh();
    const cart = await client.cart().get(); // Retry
  } else {
    throw e;
  }
}
```

Or let the SDK handle it automatically:

```ts
const result = await client.jwt().withAutoRefresh(async (c) => {
  return await c.cart().get();
});
```

See [Authentication](authentication.md#auto-refresh) for details.

## HTTP Status Code Mapping

Every HTTP response includes a **status code** — a number that tells you whether the request succeeded or failed, and why. You've probably seen "404 Not Found" when visiting a broken link — that's a status code. Here's how the SDK maps them to error classes:

| HTTP Status | Error Thrown | Typical Causes |
|-------------|-------------|----------------|
| 400 | `ValidationError` | Invalid product ID, out of stock, invalid quantity, missing required fields |
| 401 | `AuthenticationError` | Missing or invalid credentials |
| 403 | `AuthenticationError` | Expired JWT token, insufficient permissions |
| 404 | `CoCartError` | Endpoint not found, item key not found |
| 500 | `CoCartError` | Server error |

## Response Error Helpers

When you have a `Response` object, you can check for errors directly:

```ts
const response = await client.cart().get();

if (response.isError()) {
  console.log(response.getErrorCode());    // API error code
  console.log(response.getErrorMessage()); // Human-readable message
  console.log(response.statusCode);        // HTTP status code
}

if (response.isSuccessful()) {
  const data = response.toObject();
}
```

## Response Data Access

The `Response` object supports **dot-notation access** — a way to reach nested values inside the response using a string path with dots. For example, instead of writing `response.data.items`, you write `response.get('items')`. For deeply nested data, use dots to drill down: `response.get('totals.subtotal')`.

```ts
const response = await client.cart().get();

// Dot-notation access
response.get('items');
response.get('totals');
response.get('currency');
response.has('items');

// Cart state helpers
response.hasItems();    // true if cart has items
response.isEmpty();     // true if cart is empty
response.hasCoupons();  // true if coupons are applied

// Pagination helpers (for product listings)
response.getTotalResults(); // total items across all pages
response.getTotalPages();   // total number of pages
```

## Client-Side Validation Errors

The SDK validates certain inputs before making a network request. These throw `ValidationError` immediately with no HTTP call:

```ts
try {
  await client.cart().addItem(-1, 0);
} catch (e) {
  if (e instanceof ValidationError) {
    // e.message  => "Product ID must be a positive integer"
    // e.httpCode => 0 (no HTTP request was made)
  }
}
```

Client-side validation checks:

| Method | Validation | Error Message |
|--------|-----------|---------------|
| `addItem(id, qty)` | `id` must be a positive integer | "Product ID must be a positive integer" |
| `addItem(id, qty)` | `qty` must be a positive number | "Quantity must be a positive number" |
| `updateItem(key, qty)` | `qty` must be a positive number | "Quantity must be a positive number" |

Standalone validation functions are also exported for use in your own code:

```ts
import { validateProductId, validateQuantity, validateEmail } from '@cocart/sdk';

validateProductId('abc');          // throws ValidationError
validateQuantity(-1);              // throws ValidationError
validateEmail('not-an-email');     // throws ValidationError
```

## Common Error Scenarios

### Product Not Found

```ts
try {
  await client.cart().addItem(999999, 1);
} catch (e) {
  if (e instanceof ValidationError) {
    // e.message   => 'Product not found'
    // e.errorCode => 'cocart_product_not_found'
  }
}
```

### Out of Stock

```ts
try {
  await client.cart().addItem(123, 100);
} catch (e) {
  if (e instanceof ValidationError) {
    // e.errorCode => 'cocart_not_enough_in_stock'
  }
}
```

### CoCart Plugin Required

When calling methods that require a CoCart extension that isn't installed:

```ts
try {
  await client.cart().applyCoupon('SAVE10');
} catch (e) {
  if (e instanceof CoCartError) {
    // e.message   => 'This method is only available with another CoCart plugin...'
    // e.errorCode => 'cocart_plugin_required'
  }
}
```

### Network / Timeout Errors

A **timeout** occurs when the server takes too long to respond. The SDK cancels the request after the configured number of milliseconds (1000 milliseconds = 1 second). This prevents your app from hanging indefinitely if the server is down or overloaded.

```ts
const client = new CoCart('https://your-store.com', {
  timeout: 10000, // 10 seconds (10,000 milliseconds)
});

try {
  await client.cart().get();
} catch (e) {
  if (e instanceof Error && e.name === 'AbortError') {
    console.log('Request timed out');
  }
}
```
