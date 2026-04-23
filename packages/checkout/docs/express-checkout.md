# Express Checkout

Express checkout buttons (Apple Pay, Google Pay, Link, Venmo) bypass the standard checkout form. The customer taps a button — the browser or device handles authentication and returns billing and shipping from the device wallet. These buttons appear above the main form as a fast-path alternative.

---

## How it works

Gateways that support express checkout set `express: true` on their adapter. The SDK collects all such adapters, sorts them by priority, and returns them via `listExpressGateways()` or as a complete bar definition via `createExpressCheckoutBar()`. Your UI renders this bar above the main form.

---

## Discovering express gateways

```ts
const expressGateways = client.checkout.listExpressGateways();
// Returns CheckoutGatewayPresentation[] sorted by expressCheckoutPriority ascending
```

Only adapters with `express: true` are returned. Standard gateways (Stripe card form, PayPal Buttons) are excluded.

---

## Building the express bar

```ts
const bar = client.checkout.createExpressCheckoutBar({ layout: 'scroll' });

// bar.layout   — 'scroll' | 'stack'
// bar.theme    — the resolved CheckoutTheme
// bar.gateways — Array<{ id, label, fields: CheckoutFormField[] }>
```

`layout` controls how your UI arranges the buttons:
- `'scroll'` — horizontal scrollable row (default)
- `'stack'` — vertical stacked column

The `bar.theme.expressCheckoutBarClassName` gives you the container class to apply to the bar wrapper.

---

## Apple Pay domain verification

Apple Pay requires that your domain serves a domain association file so Apple can verify you control it. **This must be in place before Apple Pay buttons will appear in the browser** — without it, Stripe silently hides the Apple Pay option.

### What you need to serve

Stripe provides the file. Retrieve it from your Stripe dashboard under **Settings → Payment methods → Apple Pay** or download it directly from:

```text
https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association
```

It must be served at this exact path on every domain (and subdomain) where you accept Apple Pay:

```text
https://your-store.com/.well-known/apple-developer-merchantid-domain-association
```

The file must be served as `Content-Type: text/plain` (or no content-type — Apple is lenient) with no redirect.

### Serving the file by framework

#### Next.js (App Router and Pages Router)

Place the file at `public/.well-known/apple-developer-merchantid-domain-association`. Next.js serves `public/` at the root automatically — no config needed.

#### Astro

Place the file at `public/.well-known/apple-developer-merchantid-domain-association`. Astro serves `public/` statically.

#### Vite / SvelteKit

Place the file at `static/.well-known/apple-developer-merchantid-domain-association` (SvelteKit) or `public/.well-known/apple-developer-merchantid-domain-association` (Vite).

#### Custom server (Node / Hono / Fastify / Express)

Serve the file as a static route:

```ts
// Hono
app.get('/.well-known/apple-developer-merchantid-domain-association', (c) =>
  c.body(applePayFileContents, 200, { 'Content-Type': 'text/plain' }),
);

// Express
app.get('/.well-known/apple-developer-merchantid-domain-association', (req, res) => {
  res.sendFile('/path/to/apple-developer-merchantid-domain-association');
});
```

### Register the domain in Stripe

After the file is live, register your domain in the Stripe Dashboard under **Settings → Payment methods → Apple Pay → Add domain**. Stripe will fetch the file and mark the domain as verified. You need to repeat this for every domain variant you use (e.g. `www.your-store.com` and `your-store.com` are separate).

> [!NOTE]
> Google Pay does not require a domain association file. PayPal express checkout has its own domain verification flow separate from Apple's.

---

## Stripe express checkout (pre-wired)

`createStripeExpressGateway()` wires up Stripe's `ExpressCheckoutElement` automatically.

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createStripeExpressGateway } from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout({
  successUrl: 'https://your-store.com/order-complete?id={CHECKOUT_ID}',
  returnUrl: 'https://your-store.com/checkout',
  gatewayAdapters: [
    createStripeExpressGateway({ stripe, elements }),
  ],
}));
```

| Option | Type | Default | Description |
|---|---|---|---|
| `stripe` | `StripeInstance` | required | The Stripe.js instance |
| `elements` | `StripeElementsInstance` | required | Elements configured for express checkout |
| `label` | `string` | `'Express Checkout'` | Button bar label |
| `description` | `string` | `'Pay with Apple Pay, Google Pay, or Link.'` | Description shown to the customer |
| `expressCheckoutPriority` | `number` | `10` | Lower = shown first in the bar |

The adapter id is `'stripe-express'`, distinct from the standard `'stripe'` card gateway.

---

## Priority ordering

When multiple gateways support express checkout, `expressCheckoutPriority` controls their order in the bar. Lower numbers appear first.

| Gateway | Default priority |
|---|---|
| `createStripeExpressGateway()` | `10` |
| Custom adapters | `100` |

Registration order breaks ties.

---

## Custom adapter example

Any gateway adapter can support express checkout by setting `express: true` and implementing `getExpressFields()`:

```ts
const paypalExpressAdapter = {
  id: 'paypal-express',
  provider: 'paypal',
  label: 'PayPal',
  express: true,
  expressCheckoutPriority: 20,
  supports: ['express_checkout'],
  getExpressFields: ({ theme }) => [
    {
      name: 'payment_data.paypal_express',
      label: 'PayPal Express',
      type: 'gateway-element',
      component: 'PayPalExpressButton',
      className: theme.paymentContainerClassName,
    },
  ],
  tokenize: async ({ paymentContext }) => ({
    order_id: String(paymentContext?.order_id ?? ''),
  }),
};
```

---

## Recommended pattern

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createStripeExpressGateway, createStripeGateway } from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout({
  successUrl: 'https://your-store.com/order-complete?id={CHECKOUT_ID}',
  returnUrl: 'https://your-store.com/checkout',
  gatewayAdapters: [
    // Standard card form gateway
    createStripeGateway({ stripe, elements }),
    // Express buttons gateway
    createStripeExpressGateway({ stripe, expressElements }),
  ],
}));

// Render the express bar above the main form
const bar = client.checkout.createExpressCheckoutBar({ layout: 'scroll' });

// bar.gateways[0].fields[0].component === 'StripeExpressCheckoutElement'
// Mount the element, listen for the express checkout confirmation event,
// then call submit() with the express gateway id.

const { processResponse } = await client.checkout.submit({
  gatewayId: 'stripe-express',
});

const result = processResponse.toObject();
if (result.payment_result?.redirect_url) {
  window.location.href = result.payment_result.redirect_url;
}
```

> [!NOTE]
> Express checkout events (wallet confirmation, address change) are handled entirely by the provider SDK. The `submit()` call fires after the provider confirms the payment — pass the express gateway id so the SDK uses the correct tokenize callback.

---

## Buy now — express checkout on a product page

Express buttons do not have to live on the checkout page. A common pattern is placing them directly on the product page so the customer can add an item and pay in a single tap, without visiting the cart or filling a checkout form.

The sequence is:

1. Customer lands on the product page
2. They tap the Apple Pay / Google Pay button
3. The SDK adds the item to the cart
4. The wallet sheet opens — the customer confirms billing, shipping, and payment
5. The SDK submits the checkout
6. The customer lands on the order confirmation page

### Setup

Create the CoCart client once (page load or module level). The express gateway is registered globally — it renders its button wherever you mount the element.

```ts
import { loadStripe } from '@stripe/stripe-js';
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createStripeExpressGateway } from '@cocartheadless/checkout';

const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Create an Elements instance in deferred mode — no amount needed yet.
// Stripe will resolve the final amount from the PaymentIntent at confirm time.
const elements = stripe.elements({ mode: 'payment', currency: 'usd', amount: 0 });

const client = new CoCart('https://your-store.com').use(createCheckout({
  successUrl: 'https://your-store.com/order-complete?id={CHECKOUT_ID}',
  returnUrl: window.location.href, // return to this product page on failure
  gatewayAdapters: [
    createStripeExpressGateway({ stripe, elements }),
  ],
}));
```

### Rendering the button

Mount the `ExpressCheckoutElement` inside a container on the product page. Stripe renders the Apple Pay / Google Pay button automatically based on what the browser and device support.

```ts
const expressElement = elements.create('expressCheckout');
expressElement.mount('#express-checkout-container');
```

```html
<!-- Product page template -->
<div id="express-checkout-container"></div>
<button id="add-to-cart">Add to cart</button>
```

### Handling the confirm event

Stripe fires a `confirm` event when the customer approves the payment in their wallet. At this point you add the item to the cart (if not already added) and call `submit()`.

```ts
expressElement.on('confirm', async () => {
  try {
    // 1. Add the product to the cart using the core CoCart client.
    await client.cart().addItem({
      id: productId,      // WooCommerce product ID
      quantity: quantity, // selected quantity
    });

    // 2. Submit checkout — SDK fetches checkout state, creates payment context,
    //    calls stripe.confirmPayment() internally, then processes the order.
    const { processResponse } = await client.checkout.submit({
      gatewayId: 'stripe-express',
    });

    const result = processResponse.toObject();
    if (result.payment_result?.redirect_url) {
      window.location.href = result.payment_result.redirect_url;
    }
  } catch (error) {
    // The wallet sheet is still open — report the error back to Stripe
    // so it can show a failure message to the customer.
    expressElement.update({ businessName: 'Your Store' });
    console.error('Express checkout failed:', error);
  }
});
```

### Clearing the cart first

If the customer may have existing cart items, clear the cart before adding the new product to avoid charging for unintended items:

```ts
expressElement.on('confirm', async () => {
  // Clear any existing cart items before the buy-now purchase.
  await client.cart().clearCart();

  await client.cart().addItem({ id: productId, quantity: 1 });

  const { processResponse } = await client.checkout.submit({
    gatewayId: 'stripe-express',
  });

  const result = processResponse.toObject();
  if (result.payment_result?.redirect_url) {
    window.location.href = result.payment_result.redirect_url;
  }
});
```

> [!IMPORTANT]
> The `confirm` event fires after the customer has authenticated with their device. Do not add the item or mutate the cart before this event — the customer may cancel the wallet sheet and you would be left with a dirty cart.

### Shipping address from the wallet

When the customer approves via Apple Pay or Google Pay, their wallet returns a shipping address. You can pass it directly into `submit()` so WooCommerce uses the wallet address rather than any previously stored address:

```ts
expressElement.on('confirm', async (event) => {
  await client.cart().addItem({ id: productId, quantity: 1 });

  const { processResponse } = await client.checkout.submit({
    gatewayId: 'stripe-express',
    update: {
      // event.shippingAddress is provided by the Stripe ExpressCheckoutElement
      shipping_address: {
        first_name: event.shippingAddress?.name?.split(' ')[0] ?? '',
        last_name: event.shippingAddress?.name?.split(' ').slice(1).join(' ') ?? '',
        address_1: event.shippingAddress?.address?.line1 ?? '',
        address_2: event.shippingAddress?.address?.line2 ?? '',
        city: event.shippingAddress?.address?.city ?? '',
        state: event.shippingAddress?.address?.state ?? '',
        postcode: event.shippingAddress?.address?.postal_code ?? '',
        country: event.shippingAddress?.address?.country ?? '',
      },
    },
  });

  const result = processResponse.toObject();
  if (result.payment_result?.redirect_url) {
    window.location.href = result.payment_result.redirect_url;
  }
});
```

> [!NOTE]
> The exact shape of `event.shippingAddress` depends on the Stripe.js version and the wallet used. Check the [Stripe ExpressCheckoutElement docs](https://stripe.com/docs/elements/express-checkout-element) for the current event payload shape.
