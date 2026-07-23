import type { CoCart } from '@cocartheadless/sdk';

/** Marks the currently-installed wrapped fetch, so repeat calls don't stack. */
const CART_KEY_HEADER_INSTALLED = Symbol.for('cocart.attachCartKeyHeader');

interface CartKeyWrappedFetch {
  (input: RequestInfo | URL, init?: RequestInit): Promise<globalThis.Response>;
  [CART_KEY_HEADER_INSTALLED]?: boolean;
}

/**
 * Client-side helper: wraps the global fetch to attach the `X-Cart-Key`
 * header on same-origin requests, so a server-side client created from the
 * incoming request headers (via each adapter's `createServerClient`) can
 * read the cart key without cookies.
 *
 * Idempotent — calling this more than once (e.g. on remount, HMR, or from
 * multiple providers) is a no-op after the first call, rather than stacking
 * another wrapper on top of `globalThis.fetch` each time.
 *
 * Call this once on the client after creating the CoCart instance:
 * ```ts
 * const client = createBrowserClient('https://store.example.com', { encryptionKey: '...' });
 * await client.restoreSession();
 * attachCartKeyHeader(client);
 * ```
 */
export function attachCartKeyHeader(client: CoCart): void {
  const currentFetch = globalThis.fetch as CartKeyWrappedFetch;

  if (currentFetch[CART_KEY_HEADER_INSTALLED]) {
    return;
  }

  const originalFetch = globalThis.fetch;

  const wrappedFetch: CartKeyWrappedFetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<globalThis.Response> {
    const cartKey = client.getCartKey();

    if (cartKey) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      try {
        const requestUrl = new URL(url, globalThis.location?.origin);
        if (requestUrl.origin === globalThis.location?.origin) {
          const headers = new Headers(init?.headers);
          if (!headers.has('X-Cart-Key')) {
            headers.set('X-Cart-Key', cartKey);
          }
          init = { ...init, headers };
        }
      } catch {
        // Invalid URL — skip header injection
      }
    }

    return originalFetch.call(globalThis, input, init);
  };

  wrappedFetch[CART_KEY_HEADER_INSTALLED] = true;
  globalThis.fetch = wrappedFetch;
}
