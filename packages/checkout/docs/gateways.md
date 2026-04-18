# Gateways

The package ships focused helper factories for:

- Stripe
- PayPal
- Authorize.Net

These helpers do not replace the provider SDK. They give you the correct CoCart-facing adapter shape so your app can keep provider logic and CoCart logic cleanly separated.

Each factory supports two modes:

- **Pre-wired** — pass provider-specific options and `tokenize` is handled for you
- **Manual** — supply your own `tokenize` callback for full control

---

## Stripe

> [!IMPORTANT]
> **What you still need to do yourself:**
>
> - Install and load `@stripe/stripe-js`
> - Create a `stripe.elements()` instance and mount a `PaymentElement` to the DOM
> - Handle any redirect from `payment_result.redirect_url` after submission

### Stripe: Pre-wired

Set up the client and gateway once on page load:

```ts
import { loadStripe } from '@stripe/stripe-js';
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createStripeGateway } from '@cocartheadless/checkout';

const stripe = await loadStripe('pk_live_...');

// Initialize elements in "deferred" mode — no clientSecret needed yet.
// Stripe will confirm the PaymentIntent when submit() is called.
const elements = stripe.elements({ mode: 'payment', currency: 'usd', amount: 0 });
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

const client = new CoCart('https://your-store.com').use(createCheckout({
  gatewayAdapters: [
    createStripeGateway({ stripe, elements }),
  ],
}));
```

Then on form submit:

```ts
const { processResponse } = await client.checkout.submit({
  gatewayId: 'stripe',
  update: {
    billing_address: { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' },
  },
});

// submit() fetches checkout state, requests a client_secret from WooCommerce via the
// payment-context endpoint, calls stripe.confirmPayment() for you, then processes the order.

const result = processResponse.toObject();
if (result.payment_result?.redirect_url) {
  window.location.href = result.payment_result.redirect_url;
}
```

### Stripe: Manual

Use this for non-standard flows (setup intents, saved cards, custom confirmation params).

Set up the client and gateway:

```ts
import { loadStripe } from '@stripe/stripe-js';
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createStripeGateway } from '@cocartheadless/checkout';

const stripe = await loadStripe('pk_live_...');
let elements: ReturnType<typeof stripe.elements> | undefined;

const client = new CoCart('https://your-store.com').use(createCheckout({
  gatewayAdapters: [
    createStripeGateway({
      tokenize: async ({ paymentContext }) => {
        // paymentContext.client_secret comes from WooCommerce via the payment-context endpoint.
        // submit() fetches this automatically before calling tokenize.
        const clientSecret = String(paymentContext?.client_secret ?? '');

        // Re-initialize elements with the real clientSecret before confirming.
        elements = stripe.elements({ clientSecret });
        const paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');

        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: 'https://your-store.com/order-complete' },
          redirect: 'if_required',
        });

        if (error) throw new Error(error.message);
        return { payment_intent_id: paymentIntent?.id ?? clientSecret };
      },
    }),
  ],
}));
```

Then on form submit:

```ts
const { processResponse } = await client.checkout.submit({ gatewayId: 'stripe' });

const result = processResponse.toObject();
if (result.payment_result?.redirect_url) {
  window.location.href = result.payment_result.redirect_url;
}
```

---

## PayPal

> [!IMPORTANT]
> **What you still need to do yourself:**
>
> - Install and load `@paypal/paypal-js`
> - Render the PayPal Buttons component in your UI
> - Set up a server-side endpoint to create and capture PayPal orders (raw card data must never pass through your server)

### PayPal: Pre-wired

The PayPal flow is UI-driven — the customer clicks the PayPal Button, which triggers `createOrder` then `onApprove`. You call `submit()` inside `onApprove`, after the order is captured server-side.

Pass `createOrder` and `onApprove` to the gateway, then use those same references in `paypal.Buttons()`:

```ts
import { loadScript } from '@paypal/paypal-js';
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createPayPalGateway } from '@cocartheadless/checkout';

async function createOrder() {
  // Create a PayPal order server-side and return the PayPal order ID.
  const res = await fetch('/api/paypal/create-order', { method: 'POST' });
  const { id } = await res.json();
  return id;
}

async function onApprove({ orderID }: { orderID: string }) {
  // Capture the order server-side once the customer approves.
  await fetch('/api/paypal/capture-order', {
    method: 'POST',
    body: JSON.stringify({ orderID }),
    headers: { 'Content-Type': 'application/json' },
  });

  // Order captured — finalize the WooCommerce checkout.
  const { processResponse } = await client.checkout.submit({ gatewayId: 'paypal' });
  const result = processResponse.toObject();
  if (result.payment_result?.redirect_url) {
    window.location.href = result.payment_result.redirect_url;
  }
}

const client = new CoCart('https://your-store.com').use(createCheckout({
  gatewayAdapters: [
    // Pass the same callbacks here so the gateway knows what to call during tokenize.
    createPayPalGateway({ createOrder, onApprove }),
  ],
}));

// Render the Buttons using the same callbacks — no duplication needed.
const paypal = await loadScript({ clientId: 'YOUR_CLIENT_ID' });
paypal.Buttons({ createOrder, onApprove }).render('#paypal-button-container');
```

### PayPal: Manual

```ts
import { createPayPalGateway } from '@cocartheadless/checkout';

createPayPalGateway({
  tokenize: async () => {
    // Your own PayPal order creation + approval logic.
    const orderId = await createPayPalOrder();
    const { payerID } = await approvePayPalOrder(orderId);
    return { order_id: orderId, payer_id: payerID };
  },
});
```

---

## Authorize.Net

> [!IMPORTANT]
> **What you still need to do yourself:**
>
> - Load `Accept.js` via a `<script>` tag from Authorize.Net's CDN
> - Build your own card input fields — never send raw card numbers to your server
> - Collect `cardNumber`, `month`, `year`, and `cardCode` from those fields at submit time, not at setup time

### Authorize.Net: Pre-wired

Accept.js is loaded globally via a `<script>` tag. Because card field values must be read at the moment the customer submits — not when the page loads — configure the gateway *inside your submit handler* so `cardData` is always current.

Load Accept.js in your HTML:

```html
<!-- Test -->
<script src="https://jstest.authorize.net/v1/Accept.js" charset="utf-8"></script>
<!-- Production -->
<script src="https://js.authorize.net/v1/Accept.js" charset="utf-8"></script>
```

Set up the CoCart client once on page load (no card data here yet):

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout } from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout());
```

Then on form submit, register the gateway with the live card values and call `submit()`:

```ts
import { createAuthorizeNetGateway } from '@cocartheadless/checkout';

declare const Accept: any; // Accept.js global

async function handleSubmit() {
  // Read card values now, at submit time.
  const gateway = createAuthorizeNetGateway({
    clientKey: 'YOUR_PUBLIC_CLIENT_KEY',
    apiLoginID: 'YOUR_API_LOGIN_ID',
    cardData: {
      cardNumber: (document.querySelector<HTMLInputElement>('#card-number')!).value,
      month: (document.querySelector<HTMLInputElement>('#exp-month')!).value,
      year: (document.querySelector<HTMLInputElement>('#exp-year')!).value,
      cardCode: (document.querySelector<HTMLInputElement>('#cvv')!).value,
    },
    dispatchData: (authData, cardData) =>
      new Promise((resolve, reject) => {
        Accept.dispatchData({ authData, cardData }, (response: any) => {
          if (response.messages.resultCode === 'Error') {
            reject(new Error(response.messages.message[0]?.text));
          } else {
            resolve({ opaqueData: response.opaqueData });
          }
        });
      }),
  });

  // Register the gateway (replaces any previous one with the same id).
  client.checkout.registerGateway(gateway);

  const { processResponse } = await client.checkout.submit({ gatewayId: 'authorizenet' });
  const result = processResponse.toObject();
  if (result.payment_result?.redirect_url) {
    window.location.href = result.payment_result.redirect_url;
  }
}
```

### Authorize.Net: Manual

The manual path gives you full control — configure the gateway once on page load, read card values at submit time inside `tokenize`.

Set up the client and gateway:

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createAuthorizeNetGateway } from '@cocartheadless/checkout';

declare const Accept: any;

const client = new CoCart('https://your-store.com').use(createCheckout({
  gatewayAdapters: [
    createAuthorizeNetGateway({
      tokenize: async () => {
        // Read card values at submit time.
        const cardData = {
          cardNumber: (document.querySelector<HTMLInputElement>('#card-number')!).value,
          month: (document.querySelector<HTMLInputElement>('#exp-month')!).value,
          year: (document.querySelector<HTMLInputElement>('#exp-year')!).value,
          cardCode: (document.querySelector<HTMLInputElement>('#cvv')!).value,
        };

        return new Promise((resolve, reject) => {
          Accept.dispatchData(
            {
              authData: { clientKey: 'YOUR_PUBLIC_CLIENT_KEY', apiLoginID: 'YOUR_API_LOGIN_ID' },
              cardData,
            },
            (response: any) => {
              if (response.messages.resultCode === 'Error') {
                reject(new Error(response.messages.message[0]?.text));
              } else {
                resolve({
                  data_descriptor: response.opaqueData.dataDescriptor,
                  data_value: response.opaqueData.dataValue,
                });
              }
            },
          );
        });
      },
    }),
  ],
}));
```

Then on form submit:

```ts
const { processResponse } = await client.checkout.submit({ gatewayId: 'authorizenet' });

const result = processResponse.toObject();
if (result.payment_result?.redirect_url) {
  window.location.href = result.payment_result.redirect_url;
}
```

---

## Multiple gateways

```ts
import {
  createAuthorizeNetGateway,
  createCheckout,
  createPayPalGateway,
  createStripeGateway,
} from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout({
  gatewayAdapters: [
    createStripeGateway({ stripe, elements }),
    createPayPalGateway({ createOrder, onApprove }),
    createAuthorizeNetGateway({ dispatchData, clientKey, apiLoginID }),
  ],
}));
```

## Discovering enabled WooCommerce gateways

```ts
const remoteMethods = (await client.checkout.getPaymentMethods()).toObject();
const gateways = client.checkout.listGateways(remoteMethods);
// gateways merges your registered adapters with what WooCommerce currently has enabled
```

This is useful when you want to show only gateways that are both registered locally and enabled in WooCommerce.
