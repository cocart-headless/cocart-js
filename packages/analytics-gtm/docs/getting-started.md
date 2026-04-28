# Getting Started

## Installation

```bash
npm install @cocartheadless/sdk @cocartheadless/analytics-gtm
```

## Environment variables

Store your GTM container ID in an environment variable:

```ini
# .env
NEXT_PUBLIC_GTM_CONTAINER_ID=GTM-XXXXXXX
```

| Framework | Syntax |
|---|---|
| Next.js | `process.env.NEXT_PUBLIC_GTM_CONTAINER_ID` |
| Astro | `import.meta.env.PUBLIC_GTM_CONTAINER_ID` |
| Vite / SvelteKit | `import.meta.env.VITE_GTM_CONTAINER_ID` |
| Nuxt | `useRuntimeConfig().public.gtmContainerId` |

## Add the GTM snippet to your page

> [!IMPORTANT]
> This extension does **not** inject the GTM script. You must add the GTM snippet to your HTML yourself. The extension only pushes to `window.dataLayer`, which GTM reads.

Place this in the `<head>` of your page, replacing `GTM-XXXXXXX` with your container ID:

```html
<!-- Google Tag Manager -->
<script>
  window.dataLayer = window.dataLayer || [];
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXXXXX');
</script>
<!-- End Google Tag Manager -->
```

And this immediately after the opening `<body>` tag:

```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

## Setup

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createGtm } from '@cocartheadless/analytics-gtm';

const client = new CoCart('https://your-store.com', {
  extensions: [
    createGtm({
      containerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID!,
      currency: 'USD',
    }),
  ],
});
```

Auto-tracking is now active. Every cart and checkout event is pushed to `window.dataLayer` automatically.

---

## Auto-tracked events

The extension listens to CoCart API responses and pushes GA4 ecommerce events to `window.dataLayer`. Each ecommerce event clears the previous `ecommerce` object first — this is required by GA4 to prevent data from previous events bleeding into subsequent ones.

| GA4 event | Triggered when | Type |
|---|---|---|
| `add_to_cart` | Item added to cart | GA4 standard |
| `remove_from_cart` | Item removed from cart | GA4 standard |
| `cart_cleared` | Cart cleared | Custom |
| `begin_checkout` | Checkout details updated | GA4 standard |
| `purchase` | Order placed successfully | GA4 standard |
| `api_error` | Any API request fails | Custom |

Example dataLayer push for `add_to_cart`:

```js
// First — clear previous ecommerce data
{ event: 'clear_ecommerce', ecommerce: null }

// Then — push the event
{
  event: 'add_to_cart',
  ecommerce: {
    currency: 'USD',
  }
}
```

---

## Manual tracking

Access `client.gtm` to push any custom event to `window.dataLayer` directly:

```ts
client.gtm.push('viewed_product', {
  ecommerce: {
    currency: 'USD',
    items: [
      {
        item_id: 'SKU_12345',
        item_name: 'Classic T-Shirt',
        price: 29.99,
        quantity: 1,
      },
    ],
  },
});
```

The `push()` method follows the same GA4 ecommerce clearing convention — if your data object includes an `ecommerce` key, a `{ ecommerce: null }` clear is pushed automatically before your event.

---

## Configuration options

```ts
createGtm({
  containerId: 'GTM-XXXXXXX', // required — your GTM container ID (stored for reference only)
  currency: 'USD',            // optional — default currency for ecommerce events (default: 'USD')
})
```

---

## Cleanup

Call `destroy()` to unsubscribe the extension's event listeners:

```ts
client.gtm.destroy();
```

---

## TypeScript

`client.gtm` is fully typed via `CoCartExtensionRegistry` augmentation — no extra setup required:

```ts
client.gtm.push('my_event', { value: 99 }); // ✓ typed
client.extension('gtm').destroy();           // ✓ typed via registry
```

To type your own `dataLayer` pushes, import `GA4Item` and `DataLayerEvent`:

```ts
import type { GA4Item } from '@cocartheadless/analytics-gtm';

const item: GA4Item = {
  item_id: 'SKU_123',
  item_name: 'Classic T-Shirt',
  price: 29.99,
  quantity: 1,
  currency: 'USD',
};

client.gtm.push('add_to_cart', { ecommerce: { currency: 'USD', items: [item] } });
```
