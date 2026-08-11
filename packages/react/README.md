# @cocartheadless/react

React bindings for the [CoCart Headless SDK](https://github.com/cocart-headless/cocart-js) — `CoCartProvider` and `useAuth()` give every component in the tree a single, reactive view of "who's logged in", instead of each component calling `client.isAuthenticated()` independently and going stale.

## Install

```bash
npm install @cocartheadless/react @cocartheadless/sdk
```

## Usage

```tsx
import { createBrowserClient, attachAuthHeader } from '@cocartheadless/sdk/nextjs';
import { CoCartProvider, useAuth } from '@cocartheadless/react';

const client = createBrowserClient('https://your-store.com', {
  encryptionKey: process.env.NEXT_PUBLIC_COCART_ENCRYPTION_KEY,
});
await client.restoreSession();
attachAuthHeader(client); // relays the JWT to server components — see security note below

function App() {
  return (
    <CoCartProvider client={client}>
      <NavBar />
    </CoCartProvider>
  );
}

function NavBar() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) return null;

  return isAuthenticated ? (
    <button onClick={() => logout()}>Sign out, {user!.displayName}</button>
  ) : (
    <LoginForm onSubmit={(username, password) => login(username, password)} />
  );
}
```

Calling `login()` in one component (e.g. a modal) updates every component reading `useAuth()` — no manual prop plumbing or refetching needed.

## Security note

`attachAuthHeader` relays the JWT to server components via a request header rather than a cookie, mirroring how `attachCartKeyHeader` already relays the cart key. This means the JWT lives in browser-readable storage. Keep access-token TTLs short server-side and rely on the SDK's built-in `withAutoRefresh()` to bound exposure if XSS occurs. See `docs/authentication.md` in the main SDK repo for the full tradeoff discussion.

## API

- `<CoCartProvider client={client}>` — makes the client available to `useCoCart()`/`useAuth()`.
- `useCoCart()` — read the raw CoCart client.
- `useAuth()` — `{ user, isAuthenticated, isLoading, error, login, logout }`.
