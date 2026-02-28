# Configuration & Setup

For installation instructions and requirements, see the [README](../README.md#installation).

## Configuration Options

The second argument to `new CoCart()` is an optional object where you can set various options. You only need to include the ones relevant to your setup — everything has sensible defaults.

```ts
const client = new CoCart('https://your-store.com', {
  // Guest session
  cartKey: 'existing_cart_key',

  // Basic Auth
  username: 'customer@email.com',
  password: 'password',

  // JWT Auth
  jwtToken: 'your-jwt-token',
  jwtRefreshToken: 'your-refresh-token',

  // Admin (Sessions API)
  consumerKey: 'ck_xxxxx',
  consumerSecret: 'cs_xxxxx',

  // HTTP settings
  timeout: 30000,        // milliseconds (default: 30000)

  // REST API prefix (default: 'wp-json')
  restPrefix: 'wp-json',

  // API namespace (default: 'cocart')
  namespace: 'cocart',

  // Retry transient failures (429, 503, timeouts)
  maxRetries: 2,

  // Storage adapter (default: MemoryStorage)
  // See Sessions & Storage docs for options
  storage: new MemoryStorage(),
  storageKey: 'cocart_cart_key',

  // Encryption key for EncryptedStorage
  encryptionKey: 'your-secret-key',

  // Custom auth header name (default: 'Authorization')
  // Useful when hosting strips the Authorization header
  authHeaderName: 'X-Auth-Token',

  // Transform every API response before it's returned
  responseTransformer: (response) => response,

  // Enable ETag conditional requests for reduced bandwidth (default: true)
  etag: true,

  // Enable debug logging to console (default: false)
  debug: true,
});
```

### Fluent Configuration

A **fluent API** (also called method chaining) lets you call multiple configuration methods in a single expression. Each method returns the client itself, so you can chain them with dots instead of writing separate statements:

```ts
const client = CoCart.create('https://your-store.com')
  .setTimeout(60000)
  .setMaxRetries(2)
  .setRestPrefix('api')
  .setNamespace('mystore')
  .addHeader('X-Custom-Header', 'value')
  .setAuthHeaderName('X-Auth-Token')
  .setETag(true)
  .setDebug(true);
```

This is equivalent to writing each call on its own line:

```ts
const client = new CoCart('https://your-store.com');
client.setTimeout(60000);
client.setMaxRetries(2);
// ... and so on
```

## Framework Adapters

If you are building with a JavaScript framework, the SDK provides adapters that handle the differences between **server-side rendering (SSR)** and **client-side** code automatically. SSR means your page is rendered on the server before being sent to the browser — frameworks like Astro and Next.js support this.

- [Astro Setup Guide](frameworks/astro.md)
- [Next.js Setup Guide](frameworks/nextjs.md)

## White-Labelling / Custom REST Prefix

WordPress exposes its REST API at `/wp-json/` by default. The SDK builds URLs like `https://your-store.com/wp-json/cocart/v2/cart`. If your site or hosting changes this prefix, or if the CoCart plugin has been renamed (white-labelled), you can configure the SDK to match:

```ts
// Custom REST prefix (site uses /api/ instead of /wp-json/)
const client = new CoCart('https://your-store.com', {
  restPrefix: 'api',
});
// Requests go to: https://your-store.com/api/cocart/v2/cart

// White-labelled namespace
const client2 = new CoCart('https://your-store.com', {
  namespace: 'mystore',
});
// Requests go to: https://your-store.com/wp-json/mystore/v2/cart

// Both together
const client3 = new CoCart('https://your-store.com', {
  restPrefix: 'api',
  namespace: 'mystore',
});
// Requests go to: https://your-store.com/api/mystore/v2/cart
```
