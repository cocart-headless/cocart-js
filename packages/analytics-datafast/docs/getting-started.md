# Getting Started

## Installation

```bash
npm install @cocartheadless/sdk @cocartheadless/analytics-datafast
```

## Environment variables

Store your Datafast website ID in an environment variable — never hardcode it.

```ini
# .env
NEXT_PUBLIC_DATAFAST_WEBSITE_ID=dfid_...
```

| Framework | Syntax |
|---|---|
| Next.js | `process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID` |
| Astro | `import.meta.env.PUBLIC_DATAFAST_WEBSITE_ID` |
| Vite / SvelteKit | `import.meta.env.VITE_DATAFAST_WEBSITE_ID` |
| Nuxt | `useRuntimeConfig().public.datafastWebsiteId` |

## Setup

Pass `createDatafast()` to `.use()` when creating your CoCart client:

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createDatafast } from '@cocartheadless/analytics-datafast';

const client = new CoCart('https://your-store.com', {
  extensions: [
    createDatafast({
      websiteId: process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID!,
    }),
  ],
});
```

That's it. The extension initializes Datafast in the background and begins tracking automatically. No further configuration is required for basic use.

---

## Auto-tracked events

The extension subscribes to CoCart API responses and maps them to Datafast events automatically.

| Event | Triggered when | Payload |
|---|---|---|
| `add_to_cart` | Item added to cart | `{ url }` |
| `remove_from_cart` | Item removed from cart | `{ url }` |
| `cart_cleared` | Cart cleared | `{ url }` |
| `checkout_started` | Checkout updated (billing/shipping) | `{ url }` |
| `purchase` | Order placed successfully | `{ url }` |
| `api_error` | Any API request fails | `{ method, url, message }` |

---

## Manual tracking

Access `client.datafast` to call the Datafast SDK directly for custom events, user identification, and page tracking.

### Custom events

```ts
client.datafast.track('viewed_product', {
  product_id: 123,
  product_name: 'Classic T-Shirt',
  price: '29.99',
});
```

### Identify a customer

Call `identify()` after the customer logs in or completes checkout — Datafast will associate all subsequent events with this user:

```ts
client.datafast.identify('customer_456', {
  email: 'jane@example.com',
  name: 'Jane Doe',
});
```

### Track page views

If `autoCapturePageviews` is disabled or you need manual control:

```ts
client.datafast.trackPageview('/products/classic-t-shirt');
```

### Flush events

Force immediate transmission — useful before a page navigation or redirect:

```ts
await client.datafast.flush();
window.location.href = result.payment_result.redirect_url;
```

### Reset visitor session

Clears the visitor ID and session data — call this on logout:

```ts
client.datafast.reset();
```

---

## Configuration options

```ts
createDatafast({
  websiteId: 'dfid_...',        // required
  domain: 'your-store.com',     // optional — override tracked domain
  debug: true,                  // optional — log events to console
  cookieless: true,             // optional — no persistent cookies, uses sessionStorage
  autoCapturePageviews: true,   // optional — auto-track page views (default: false)
  allowLocalhost: true,         // optional — enable tracking on localhost (default: false)
  onReady(df) {                 // optional — called after Datafast initializes
    df.identify(currentUser.id, { email: currentUser.email });
  },
});
```

---

## Cleanup

If you need to stop tracking (e.g. on logout or unmount), call `destroy()` to unsubscribe the extension's event listeners:

```ts
client.datafast.destroy();
```

---

## GDPR and cookieless tracking

Pass `cookieless: true` to enable privacy-first tracking with no persistent cookies — no consent banner required for analytics:

```ts
createDatafast({
  websiteId: process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID!,
  cookieless: true,
})
```

In cookieless mode the SDK:

- Uses `sessionStorage` instead of cookies for visitor IDs — storage clears when the session ends
- Sends a fresh visitor ID per event rather than a stable long-lived identifier
- Parses ad click IDs (`gclid`, `fbclid`, etc.) from the tracked URL automatically
- Disables cross-domain tracking — `getTrackingParams()` returns empty strings and `buildCrossDomainUrl()` leaves URLs unchanged

Caveats to be aware of:

- Visitor continuity across sessions is limited by design — the same person may be counted as a new visitor on a return visit
- Cross-session attribution and multi-touch attribution are not supported in this mode
- Cookieless mode reduces cookie tracking but does not constitute full legal GDPR compliance on its own — you remain responsible for privacy notices, data access requests, and your Data Processing Agreement with Datafast

---

## TypeScript

The extension augments `CoCartExtensionRegistry` automatically — `client.datafast` is fully typed with no extra setup:

```ts
client.datafast.track('my_event', { foo: 'bar' }); // ✓ typed
client.extension('datafast').identify('user_123');  // ✓ typed via registry
```
