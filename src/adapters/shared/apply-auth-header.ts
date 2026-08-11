import type { CoCart } from '@cocartheadless/sdk';

/**
 * Server-side helper: apply a raw authorization header value captured from
 * an incoming request (e.g. `Bearer eyJ...` or `Basic dXNlcjpwYXNz`) onto a
 * freshly-created server-side CoCart client, so `client.isAuthenticated()`
 * and subsequent requests reflect the calling user's identity — mirroring
 * how `createServerClient` already reads back the `X-Cart-Key` header for
 * carts.
 *
 * Silently no-ops on a missing or unrecognized value, leaving the client as
 * a guest, rather than throwing — a garbled auth header should not break
 * the request.
 */
export function applyAuthHeader(client: CoCart, rawValue: string | null | undefined): void {
  if (!rawValue) return;

  const spaceIndex = rawValue.indexOf(' ');
  if (spaceIndex === -1) return;

  const scheme = rawValue.slice(0, spaceIndex);
  const value = rawValue.slice(spaceIndex + 1);
  if (!value) return;

  if (scheme === 'Bearer') {
    client.setJwtToken(value);
    return;
  }

  if (scheme === 'Basic') {
    try {
      const decoded = atob(value);
      const separatorIndex = decoded.indexOf(':');
      if (separatorIndex === -1) return;

      const username = decoded.slice(0, separatorIndex);
      const password = decoded.slice(separatorIndex + 1);
      if (username && password) {
        client.setAuth(username, password);
      }
    } catch {
      // Malformed base64 — leave the client unauthenticated.
    }
  }
}
