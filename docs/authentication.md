# Authentication

**Authentication** is how your application proves to the server who is making the request. Think of it like showing your ID at a store — the server needs to know whether you're a guest shopper, a registered customer, or a store admin, so it can show you the right cart and allow the right actions.

CoCart supports multiple authentication methods depending on the use case.

## Guest Customers

No authentication is needed for guest cart operations. A "guest" is someone shopping without logging in — just like browsing a physical store without a membership card. The SDK automatically manages the guest session for you:

1. **First request** — No cart key exists yet. The CoCart server creates a new guest session and returns a `Cart-Key` in the response. This is a unique string (like `guest_abc123`) that identifies this particular guest's cart.
2. **SDK extracts it** — The SDK reads the `Cart-Key` from the response and stores it automatically.
3. **Subsequent requests** — The stored cart key is sent with every request so the server knows which cart to look up.

```ts
import { CoCart } from '@cocartheadless/sdk';

const client = new CoCart('https://your-store.com');

// Add item — cart key is captured from the response automatically
await client.cart().addItem(123, 2);

console.log(client.getCartKey()); // 'guest_abc123...'

// Subsequent requests use the same cart
const cart = await client.cart().get();
```

### Restoring a Session

In a browser, the cart key is automatically persisted to `localStorage` — it's restored synchronously on the next page load with no extra steps needed.

If using `EncryptedStorage` (async), call `restoreSession()` once after construction to load the cart key:

```ts
const client = new CoCart('https://your-store.com', {
  encryptionKey: 'my-secret-key',
});

// Restore cart key from encrypted localStorage
await client.restoreSession();

// Now the client has the persisted cart key
const cart = await client.cart().get();
```

### Resuming with a Known Cart Key

If you already have a cart key, pass it directly:

```ts
const client = new CoCart('https://your-store.com', {
  cartKey: 'existing_cart_key',
});
```

## Basic Auth

**Basic Authentication** is the simplest way to authenticate. It sends the username and password encoded in a header with every request. It's straightforward but should only be used over HTTPS (which encrypts the connection) to keep credentials safe.

For authenticated customers using WordPress username/password:

```ts
const client = new CoCart('https://your-store.com', {
  username: 'customer@email.com',
  password: 'customer_password',
});

// Or set at runtime
const client2 = new CoCart('https://your-store.com');
client2.setAuth('customer@email.com', 'password');

// Check auth status
client2.isAuthenticated(); // true
client2.isGuest();         // false
```

## JWT Authentication

**JWT (JSON Web Token)** is a more secure authentication method. Instead of sending your password with every request, you log in once and receive a short-lived **token** — a long encoded string like `eyJhbGciOi...`. This token is sent with subsequent requests to prove your identity. When it expires, the SDK can automatically **refresh** it (get a new one) without asking the customer to log in again.

If the [CoCart JWT Authentication](https://wordpress.org/plugins/cocart-jwt-authentication/) plugin (v3.0+) is installed, `login()` acquires JWT tokens automatically. If the plugin is not installed, `login()` throws an `AuthenticationError`. For stores without JWT, use Basic Auth directly via `setAuth()`.

### Login

```ts
import { CoCart } from '@cocartheadless/sdk';

const client = new CoCart('https://your-store.com');

// Login via JWT (requires CoCart JWT Authentication plugin)
const response = await client.login('customer@email.com', 'password');

console.log(response.get('display_name')); // 'john'
console.log(response.get('user_id'));      // '123'

// Subsequent requests automatically use the acquired credentials
const cart = await client.cart().get();
```

### Logout

```ts
await client.logout(); // Calls server logout endpoint, then clears local JWT and refresh tokens
```

### Refresh an Expired Token

```ts
await client.jwt().refresh();
```

### Validate a Token

```ts
if (await client.jwt().validate()) {
  console.log('Token is valid');
} else {
  console.log('Token is expired or invalid');
}
```

### Check Token Expiry

JWT tokens have a built-in expiration time. You can check locally (without contacting the server) whether the token has expired:

```ts
// Check if expired (with 30-second leeway by default)
if (client.jwt().isTokenExpired()) {
  await client.jwt().refresh();
}

// Custom leeway (e.g., refresh 5 minutes before expiry)
if (client.jwt().isTokenExpired(300)) {
  await client.jwt().refresh();
}

// Get the expiry timestamp
const expiry = client.jwt().getTokenExpiry();
if (expiry !== null) {
  console.log('Token expires at:', new Date(expiry * 1000).toISOString());
}
```

### Auto-Refresh

When auto-refresh is enabled, the SDK detects expired tokens behind the scenes, requests a new one using the refresh token, and retries the original request — all transparently. The customer never sees an error or gets logged out unexpectedly.

This is enabled by default when using `client.login()`. If you set a JWT token manually, enable it explicitly:

```ts
client.setJwtToken('eyJ...');
client.setRefreshToken('refresh_hash_...');
client.jwt().setAutoRefresh(true);

// Expired tokens are refreshed and retried automatically
const cart = await client.cart().get();
```

### Persisting Tokens Across Page Loads

Pass a storage adapter to the JWT Manager for automatic persistence:

```ts
import { CoCart, JwtManager } from '@cocartheadless/sdk';

const client = new CoCart('https://your-store.com', { encryptionKey: 'my-secret-key' });
const jwt = new JwtManager(client, client.getStorage(), { autoRefresh: true });

// Restore tokens from storage
await jwt.restoreTokensFromStorage();

// Tokens are saved to storage after login/refresh
await jwt.login('user@example.com', 'password');

// On next page load, tokens are restored from encrypted localStorage
```

### JWT Utility Methods

```ts
client.jwt().hasTokens();            // true if a JWT token is set
client.jwt().isTokenExpired();       // true if token is expired (local check)
client.jwt().getTokenExpiry();       // unix timestamp of token expiry
client.jwt().isAutoRefreshEnabled(); // check auto-refresh status
client.jwt().setAutoRefresh(true);   // enable/disable at runtime
```

## Two Factor Authentication

**Two Factor Authentication (2FA)** adds an extra layer of security to customer logins. After entering their username and password, the customer must also provide a time-based code from an authenticator app, a code sent via email, or a backup code.

This requires the [WordPress Two Factor](https://wordpress.org/plugins/two-factor/) plugin to be installed and active, alongside CoCart Plus v1.6.0+.

### The Two-Step Login Flow

When a customer with 2FA enabled logs in, the server doesn't immediately issue a JWT token. Instead, it responds with a challenge — a notification that a verification code is required. The SDK translates this into a `TwoFactorAuthRequiredError`, which you catch and handle by prompting the customer for their code.

```ts
import { CoCart, JwtManager, TwoFactorAuthRequiredError } from '@cocart/sdk';

const client = new CoCart('https://your-store.com');
const jwt = new JwtManager(client);

try {
  await jwt.login('customer@email.com', 'password');
  // Login succeeded — no 2FA configured for this user
} catch (e) {
  if (e instanceof TwoFactorAuthRequiredError) {
    // Server requires a 2FA code
    console.log('Available providers:', e.availableProviders); // ['totp', 'email']
    console.log('Default provider:', e.defaultProvider);       // 'totp'
    console.log('Email already sent:', e.emailSent);           // false

    // Prompt the customer for their verification code
    const code = await promptUserForCode();

    // Complete the login with the code
    await jwt.verifyTwoFactor('customer@email.com', 'password', code);
  } else {
    throw e;
  }
}
```

### Specifying a Provider

If the store supports multiple 2FA providers (e.g. TOTP and email), you can specify which one to use:

```ts
// Use email provider (server will send a code via email)
await jwt.verifyTwoFactor('customer@email.com', 'password', code, 'email');

// Use TOTP provider (code from authenticator app)
await jwt.verifyTwoFactor('customer@email.com', 'password', code, 'totp');

// Use a backup code
await jwt.verifyTwoFactor('customer@email.com', 'password', backupCode, 'backup');
```

If no provider is specified, the server uses its configured default for the user.

### TwoFactorAuthRequiredError Properties

| Property | Type | Description |
|----------|------|-------------|
| `availableProviders` | `string[]` | Providers the user can choose from (e.g. `['totp', 'email']`) |
| `defaultProvider` | `string \| null` | The provider the server will use by default |
| `emailSent` | `boolean` | Whether the server has already sent a code via email |

### Handling Invalid Codes

If the customer enters a wrong code, `verifyTwoFactor()` throws an `AuthenticationError` with `errorCode === 'cocart_2fa_invalid_code'`:

```ts
import { AuthenticationError } from '@cocart/sdk';

try {
  await jwt.verifyTwoFactor('customer@email.com', 'password', '000000');
} catch (e) {
  if (e instanceof AuthenticationError && e.errorCode === 'cocart_2fa_invalid_code') {
    console.log('Invalid code — please try again');
  }
}
```

## Consumer Keys (Admin)

**Consumer keys** are API credentials generated in the WooCommerce admin panel (WooCommerce > Settings > Advanced > REST API). They are different from a customer's username/password — they're meant for server-to-server access and administrative operations like managing cart sessions.

For admin-only endpoints like the Sessions API, use WooCommerce REST API credentials:

```ts
const client = new CoCart('https://your-store.com', {
  consumerKey: 'ck_xxxxx',
  consumerSecret: 'cs_xxxxx',
});

const sessions = await client.sessions().all();
```

## Custom Auth Header Name

HTTP requests include **headers** — metadata sent alongside your request. The `Authorization` header is the standard way to send credentials. However, some hosting providers or **reverse proxies** (servers that sit between your app and WordPress, like Cloudflare, Nginx, or Apache) strip or block this header for security reasons. If your authentication isn't working, this is a common cause.

You can configure the SDK to send credentials under a different header name:

```ts
const client = new CoCart('https://your-store.com', {
  authHeaderName: 'X-Auth-Token',
  username: 'customer@email.com',
  password: 'password',
});
// Sends: X-Auth-Token: Basic <base64>
```

This works with all auth methods (Basic Auth, JWT, Consumer Keys):

```ts
// JWT with custom header
const client = new CoCart('https://your-store.com', {
  authHeaderName: 'X-Auth-Token',
  jwtToken: 'eyJ...',
});
// Sends: X-Auth-Token: Bearer eyJ...
```

You can also set it at runtime with the fluent setter:

```ts
const client = new CoCart('https://your-store.com')
  .setAuthHeaderName('X-Auth-Token')
  .setAuth('user', 'pass');
```

## Authentication Priority

If you accidentally configure multiple authentication methods at the same time (for example, both a JWT token and a username/password), the SDK uses this priority order to decide which one to send:

1. **JWT Token** (`jwtToken`) — Bearer token
2. **Basic Auth** (`username` / `password`) — Basic auth header
3. **Consumer Keys** (`consumerKey` / `consumerSecret`) — Basic auth header

### Switching Auth at Runtime

```ts
// Start with JWT
const client = new CoCart('https://your-store.com', {
  jwtToken: 'eyJ...',
});

// Switch to Basic Auth (clears JWT)
client.setAuth('user', 'pass');

// Switch to JWT (clears Basic Auth)
client.setJwtToken('new.jwt.token');

// Clear everything
await client.clearSession();
```
