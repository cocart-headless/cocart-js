# Sessions API

A **session** represents a single shopping cart — either a guest visitor's cart or a logged-in customer's cart. The server keeps track of all active sessions so that each visitor gets their own cart. This page covers two things:

1. **Admin Sessions Endpoint** — For store administrators to view and manage all active cart sessions.
2. **SessionManager** — A helper class for your frontend app to handle the guest-to-customer login flow.

## Admin Sessions Endpoint

The Sessions endpoint is for administrators to manage cart sessions server-side. It requires WooCommerce REST API credentials (see [Consumer Keys](authentication.md#consumer-keys-admin)).

```ts
import { CoCart } from '@cocart/sdk';

const client = new CoCart('https://your-store.com', {
  consumerKey: 'ck_xxxxx',
  consumerSecret: 'cs_xxxxx',
});
```

### List All Sessions

```ts
const response = await client.sessions().all();

// With parameters
const response = await client.sessions().all({ per_page: '50' });
```

### Find a Session

```ts
// By cart key
const response = await client.sessions().find('guest_abc123');

// By customer ID
const response = await client.sessions().bySession(123);
```

### Get Session Items

```ts
const response = await client.sessions().getItems('guest_abc123');
```

### Delete a Session

```ts
// By cart key
const response = await client.sessions().destroy('guest_abc123');

// By customer ID
const response = await client.sessions().destroySession(123);
```

---

## SessionManager

The `SessionManager` is a helper class for frontend applications. It handles a common e-commerce flow: a visitor browses as a guest, adds items to a cart, then logs in — and their guest cart should transfer to their customer account. The `SessionManager` handles all of this automatically, including saving and restoring cart keys between page loads.

### Basic Setup

```ts
import { CoCart, SessionManager, EncryptedStorage } from '@cocart/sdk';

const storage = new EncryptedStorage('my-secret-key');
const client = new CoCart('https://your-store.com', { storage });
const session = new SessionManager(client, storage);
```

### Initialize a Cart

Creates a guest cart and persists the cart key:

```ts
const cartKey = await session.initializeCart();
console.log(cartKey); // 'guest_abc123...'

// The cart key is now stored in encrypted localStorage
// On the next page load, restoreSession() restores it automatically
```

### Login with Basic Auth

```ts
// Guest adds items first
await client.cart().addItem(123, 2);

// Login and merge guest cart into customer cart
const response = await session.login('customer@email.com', 'password', true);

// Or login without merging (starts fresh customer cart)
const response = await session.login('customer@email.com', 'password', false);
```

### Login with JWT

```ts
// Guest adds items
await client.cart().addItem(123, 2);

// Login via JWT and merge cart
const response = await session.loginWithJwt('customer@email.com', 'password', true);

// Access JWT manager for token operations
await session.jwt().validate();
await session.jwt().refresh();
```

### Login with Existing JWT Token

```ts
const response = await session.loginWithToken('eyJ...');
```

### Logout

```ts
await session.logout();

// Start a new guest session
await session.initializeCart();
```

### Session Status

```ts
session.isAuthenticated(); // true if Basic Auth or JWT is set
session.isGuest();         // true if no auth credentials
session.getCartKey();      // current cart key or null
```

### Custom Storage Key

```ts
session.setStorageKey('my_app_cart_key');
```

---

## Storage Adapters

A **storage adapter** is a small class that knows how to save and retrieve data. The SDK needs storage to persist things like cart keys and JWT tokens so they survive page refreshes. Different environments need different storage strategies:

- **Browser** — Can use `localStorage` (built into every browser) to save data that persists across page loads.
- **Server / Node.js** — Has no `localStorage`, so data is kept in memory (lost when the process restarts).

All storage adapters implement the same `StorageInterface`, so you can swap them freely.

### MemoryStorage

Stores data in the application's memory (a JavaScript `Map`). This is the default. Data is lost when the page is refreshed (in a browser) or when the process restarts (on a server). Best for short-lived operations or testing.

```ts
import { MemoryStorage } from '@cocart/sdk';

const storage = new MemoryStorage();
```

### LocalStorage

A thin wrapper around the browser's built-in `window.localStorage`. Data is stored as plain text and persists across page refreshes and browser restarts. Since the data is not encrypted, anyone with access to the browser's developer tools can read it. Use `EncryptedStorage` if you're storing sensitive data like tokens.

```ts
import { LocalStorage } from '@cocart/sdk';

const storage = new LocalStorage('cocart_'); // optional prefix
```

### EncryptedStorage

Like `LocalStorage`, but all data is encrypted before saving. This uses the **Web Crypto API** — a set of cryptographic functions built into every modern browser (and Node.js 18+). No extra libraries are needed.

**What is the Web Crypto API?** It's a browser-native API (available via `window.crypto.subtle`) that provides secure encryption, hashing, and key generation. The SDK uses it to encrypt your cart keys and tokens with **AES-256-GCM** — a widely trusted encryption standard used by banks and governments. You don't need to understand the cryptography; just provide a secret key and the SDK handles the rest.

```ts
import { EncryptedStorage } from '@cocart/sdk';

const storage = new EncryptedStorage('your-secret-encryption-key', {
  prefix: 'cocart_enc_', // optional, default: 'cocart_enc_'
});
```

**Encryption details** (for the security-curious):

- **Key derivation:** Your secret key string is converted into a cryptographic key using PBKDF2 (a slow, secure algorithm) with 100,000 iterations. This makes brute-force attacks impractical.
- **Cipher:** AES-256-GCM — the same encryption standard used for HTTPS and banking. A random 12-byte IV (initialization vector) is generated for each write, so identical data produces different encrypted outputs.
- **Salt:** A unique random value per storage instance, stored alongside the encrypted data. This ensures the same password produces different keys on different devices.
- **Key change:** If you change the encryption key, old data can't be decrypted and is silently discarded — the user will simply get a new cart session.

### Custom Storage

If the built-in adapters don't fit your needs, you can create your own. Just implement the `StorageInterface` — a TypeScript **interface** that defines three methods: `get`, `set`, and `delete`. For example, you could store data in IndexedDB, a database, or a cookie:

```ts
import type { StorageInterface } from '@cocart/sdk';

class IndexedDbStorage implements StorageInterface {
  async get(key: string): Promise<string | null> {
    // Read from IndexedDB
  }

  async set(key: string, value: string): Promise<void> {
    // Write to IndexedDB
  }

  async delete(key: string): Promise<void> {
    // Delete from IndexedDB
  }
}
```

The interface supports both **synchronous** (returns immediately) and **asynchronous** (returns a `Promise`) return types. Use `Promise` for backends that involve I/O like databases or network storage.

---

## Cart Transfer on Login

This is one of the most important flows in headless e-commerce. A visitor shops as a guest (no account needed), fills up their cart, then decides to log in or create an account. You want their guest cart items to carry over to their customer cart — otherwise they'd lose everything and have to start over. Here's how the full flow works:

```ts
import { CoCart, SessionManager, EncryptedStorage } from '@cocart/sdk';

const storage = new EncryptedStorage('my-secret-key');
const client = new CoCart('https://your-store.com', { storage });
const session = new SessionManager(client, storage);

// 1. Initialize guest session
await session.initializeCart();

// 2. Guest browses and adds items
await client.cart().addItem(123, 2);
await client.cart().addItem(456, 1);

// 3. Guest decides to log in
await session.loginWithJwt('customer@email.com', 'password', true);

// 4. Guest cart items are now in the customer's cart
const cart = await client.cart().get();
const items = cart.getItems(); // Contains items 123 and 456

// 5. Later, customer logs out
await session.logout();
await session.initializeCart(); // Fresh guest session
```

See [Authentication](authentication.md) for more on JWT and Basic Auth setup.
