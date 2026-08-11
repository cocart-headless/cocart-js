import type { CoCart } from '@cocartheadless/sdk';

/** Marks the currently-installed wrapped fetch, so repeat calls don't stack. */
const AUTH_HEADER_INSTALLED = Symbol.for('cocart.attachAuthHeader');

interface AuthHeaderWrappedFetch {
  (input: RequestInfo | URL, init?: RequestInit): Promise<globalThis.Response>;
  [AUTH_HEADER_INSTALLED]?: boolean;
}

/**
 * Client-side helper: wraps the global fetch to attach the current
 * authorization header (`Authorization` by default, or the client's
 * configured `authHeaderName`) on same-origin requests, so a server-side
 * client created from the incoming request headers (via each adapter's
 * `createServerClient`) can resolve the authenticated user without cookies.
 *
 * Idempotent — calling this more than once (e.g. on remount, HMR, or from
 * multiple providers) is a no-op after the first call, rather than stacking
 * another wrapper on top of `globalThis.fetch` each time.
 *
 * Call this once on the client after creating the CoCart instance:
 * ```ts
 * const client = createBrowserClient('https://store.example.com', { encryptionKey: '...' });
 * await client.restoreSession();
 * attachAuthHeader(client);
 * ```
 *
 * Security note: this puts the JWT (access and refresh tokens) in
 * browser-readable storage, echoed back to the server via a request header
 * set from JS — the same tradeoff `attachCartKeyHeader` makes for the cart
 * key, but with a materially more sensitive credential. Keep JWT access
 * token TTLs short server-side and rely on `client.jwt().withAutoRefresh()`
 * to bound exposure if XSS occurs. See `docs/authentication.md`.
 */
export function attachAuthHeader(client: CoCart): void {
  const currentFetch = globalThis.fetch as AuthHeaderWrappedFetch;

  if (currentFetch[AUTH_HEADER_INSTALLED]) {
    return;
  }

  const originalFetch = globalThis.fetch;

  const wrappedFetch: AuthHeaderWrappedFetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<globalThis.Response> {
    const authValue = client.getAuthHeaderValue();

    if (authValue) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      try {
        const requestUrl = new URL(url, globalThis.location?.origin);
        if (requestUrl.origin === globalThis.location?.origin) {
          const headers = new Headers(init?.headers);
          const headerName = client.getAuthHeaderName();
          if (!headers.has(headerName)) {
            headers.set(headerName, authValue);
          }
          init = { ...init, headers };
        }
      } catch {
        // Invalid URL — skip header injection
      }
    }

    return originalFetch.call(globalThis, input, init);
  };

  wrappedFetch[AUTH_HEADER_INSTALLED] = true;
  globalThis.fetch = wrappedFetch;
}
