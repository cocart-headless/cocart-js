# Gateways

The package ships focused helper factories for:

- [Stripe](#stripe)
- [WooPayments](#woopayments)
- [PayPal](#paypal)
- [PayPal Payments](#paypal-payments)
- [Authorize.Net](#authorizenet)
- [Direct Bank Transfer (BACS)](#direct-bank-transfer-bacs)
- [Check Payment](#check-payment)
- [Cash on Delivery](#cash-on-delivery)
- [Express Checkout](#express-checkout)

**Online gateways** (Stripe, WooPayments, PayPal, Authorize.Net) handle card/wallet tokenization and require provider SDKs. Each supports two modes:

- **Pre-wired** — pass provider-specific options and `tokenize` is handled for you
- **Manual** — supply your own `tokenize` callback for full control

**Offline gateways** (Direct Bank Transfer, Check Payment, Cash on Delivery) require no card input, no tokenization, and no provider SDK. The customer commits to pay outside the platform.

These helpers do not replace the provider SDK. They give you the correct CoCart-facing adapter shape so your app can keep provider logic and CoCart logic cleanly separated.

> [!TIP]
> Not sure which of your installed WooCommerce gateways are actually supported? CoCart Plus tracks this in its own [gateway compatibility register](../../../docs/checkout-gateway-compatibility.md) — a per-plugin audit of which gateways report an honest `success`/`failed` result to a REST client versus needing a compat integration like the ones behind `createStripeGateway`/`createWooPaymentsGateway` below.

---

## Environment variables

Store all gateway credentials in environment variables — never hardcode them. Use your framework's `.env` file and prefix public keys so they are safe to expose in the browser.

```ini
# .env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...

# Authorize.Net (server-side only — never expose these in the browser)
AUTHORIZENET_API_LOGIN_ID=...
AUTHORIZENET_CLIENT_KEY=...
```

> [!NOTE]
> Use `pk_test_` / sandbox credentials during development and switch to live keys in your production environment. Stripe and PayPal route to their respective sandboxes automatically based on the key you provide.

**Accessing env vars by framework:**

| Framework | Syntax |
|---|---|
| Next.js | `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Astro | `import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Vite / SvelteKit | `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY` |
| Nuxt | `useRuntimeConfig().public.stripePublishableKey` |

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

const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Initialize elements in "deferred" mode — no clientSecret needed yet.
// Stripe will confirm the PaymentIntent when submit() is called.
const elements = stripe.elements({ mode: 'payment', currency: 'usd', amount: 0 });
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

const client = new CoCart('https://your-store.com').use(createCheckout({
  successUrl: 'https://your-store.com/order-complete?id={CHECKOUT_ID}',
  returnUrl: 'https://your-store.com/checkout',
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

// submit() calls stripe.createPaymentMethod({ elements }) and sends the result as
// payment_data: [{ key: 'wc-stripe-payment-method', value: paymentMethod.id }] — the literal
// $_POST key WC_Gateway_Stripe::process_payment() reads. Without it the charge fails outright
// on the first attempt; there's no bootstrap-free path for the default (non-"Optimized
// Checkout") flow. If it comes back requires_action (3D Secure/SCA), the pre-wired adapter's
// confirmAction calls stripe.confirmCardPayment() (or confirmCardSetup() for a setup_intent)
// with the returned client_secret automatically — no elements needed for this step, the
// PaymentMethod is already attached to the intent server-side — and submit() retries
// processCheckout() for you, with no payment_data needed on retry — see "3D Secure / SCA with
// requires_action" below.

const result = processResponse.toObject();
if (result.payment_result?.redirect_url) {
  window.location.href = result.payment_result.redirect_url;
}
```

### Stripe: Manual

Use this for non-standard flows (saved payment tokens, custom confirmation params, or a
different tokenization call than the pre-wired path's `stripe.createPaymentMethod({ elements })`).

```ts
import { loadStripe } from '@stripe/stripe-js';
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createStripeGateway } from '@cocartheadless/checkout';

const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const elements = stripe.elements({ mode: 'payment', currency: 'usd', amount: 0 });
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

const client = new CoCart('https://your-store.com').use(createCheckout({
  gatewayAdapters: [
    createStripeGateway({
      // stripe is still passed so confirmAction can handle requires_action —
      // only the initial payment_data gathering is customized here.
      stripe,
      elements,
      tokenize: async () => {
        const { error, paymentMethod } = await stripe.createPaymentMethod({ elements });
        if (error) throw new Error(error.message);
        // 'wc-stripe-payment-method' is the literal $_POST key
        // WC_Gateway_Stripe::process_payment() reads — any other key name is silently ignored
        // and the charge fails.
        return { 'wc-stripe-payment-method': paymentMethod.id };
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

### Confirming requires_action

`submit()` handles this automatically for the pre-wired path (pass `stripe`/`elements`, nothing else to do). If `POST /checkout` returns `payment_result.payment_status: 'requires_action'`:

1. `confirmAction` calls `stripe.confirmCardPayment(action_data.client_secret)` — or `stripe.confirmCardSetup(action_data.client_secret)` when `action_data.intent_type === 'setup_intent'` (order total is 0 — free trial/100%-off coupon). No `elements` needed for this step: the PaymentMethod is already attached to the intent server-side by the initial charge attempt.
2. `submit()` calls `processCheckout()` again with the same cart/session — it lands on the same order rather than creating a duplicate.
3. The final `result.processResponse` reflects the retry's outcome (`success` or `failed`), not the intermediate `requires_action`.

If you're calling `processCheckout()` directly instead of `submit()`, you're responsible for this loop yourself — see [Checkout Flow → Resolving requires_action](checkout-flow.md#resolving-requires_action).

---

## WooPayments

> [!IMPORTANT]
> **What you still need to do yourself:**
>
> - Install and load `@stripe/stripe-js` (WooPayments is Stripe-based under the hood)
> - Create a `stripe.elements()` instance and mount a `PaymentElement` to the DOM
> - Handle any redirect from `payment_result.redirect_url` after submission

WooPayments (WooCommerce Payments) is a separate plugin from the standalone WooCommerce Stripe Gateway above, but uses the same Stripe.js client-side API — `createWooPaymentsGateway()` is structurally identical to `createStripeGateway()`, just targeting the `woocommerce_payments` gateway ID.

```ts
import { loadStripe } from '@stripe/stripe-js';
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createWooPaymentsGateway } from '@cocartheadless/checkout';

const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const elements = stripe.elements({ mode: 'payment', currency: 'usd', amount: 0 });
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

const client = new CoCart('https://your-store.com').use(createCheckout({
  successUrl: 'https://your-store.com/order-complete?id={CHECKOUT_ID}',
  returnUrl: 'https://your-store.com/checkout',
  gatewayAdapters: [
    createWooPaymentsGateway({ stripe, elements }),
  ],
}));

const { processResponse } = await client.checkout.submit({ gatewayId: 'woocommerce_payments' });
const result = processResponse.toObject();

if (result.payment_result?.payment_status === 'on_hold' && result.payment_result.action_type === 'wcpay_multibanco_voucher') {
  // Multibanco: order is placed (on_hold), nothing to retry — show the voucher details.
  const { entity, reference, voucher_url, expires_at } = result.payment_result.action_data as never;
  // ...render entity/reference (or link to voucher_url) with an expires_at deadline
} else if (result.payment_result?.redirect_url) {
  window.location.href = result.payment_result.redirect_url;
}
```

3D Secure/SCA (`action_type: 'wcpay_confirm_payment'`) is handled automatically by `submit()`, the same as Stripe above. The manual path (custom `tokenize`) works the same way too — pass `stripe`/`elements` alongside your `tokenize` callback so `confirmAction` still has what it needs.

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
const paypal = await loadScript({ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID! });
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

## PayPal Payments

> [!NOTE]
> **Not the same plugin as [PayPal](#paypal) above.** "PayPal Payments" (gateway IDs `ppcp-gateway` and `ppcp-credit-card-gateway`) is a separate WooCommerce plugin from the classic Smart Buttons integration `createPayPalGateway()` targets. There is no pre-wired factory for it — its `requires_action` cases are real `paypal.com` redirect URLs your app opens directly, not something a client SDK call confirms.

`payment_result.action_type` for this gateway is `paypal_approve` (initial approval — `ppcp-gateway`) or `paypal_confirm_3ds` (Advanced Card Processing 3D Secure step-up — `ppcp-credit-card-gateway`), both with `action_data.redirect` as a URL. Register a manual adapter:

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createGatewayAdapter } from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout({
  gatewayAdapters: [
    createGatewayAdapter({
      id: 'ppcp-gateway', // or 'ppcp-credit-card-gateway'
      provider: 'paypal',
      label: 'PayPal',
      confirmAction: async ({ actionType, actionData }) => {
        const redirect = String(actionData.redirect ?? '');

        if (actionType === 'paypal_confirm_3ds') {
          // 3D Secure step-up: PayPal Payments matches the resumed request via a one-time
          // nonce it generated — parse it out of the redirect URL's query string and send
          // it back as payment_data on the retry, or this won't resolve to the same charge.
          const nonce = new URL(redirect).searchParams.get('ppcp_resume_nonce');
          window.location.href = redirect; // customer authenticates, then returns to your return_url
          return nonce ? { ppcp_resume_nonce: nonce } : undefined;
        }

        // paypal_approve: async/webhook-driven completion. Open the approval URL; only
        // retry POST /checkout once you know the order is actually paid (e.g. after the
        // customer returns to your return_url, or via your own webhook-driven signal) —
        // not immediately after the redirect returns.
        window.location.href = redirect;
      },
    }),
  ],
}));
```

`submit()` calls `confirmAction` and retries `processCheckout()` automatically, same as any other gateway — but since both of these actions involve leaving the page (a real redirect, not an in-page confirmation like Stripe's), the "retry" in practice happens on page load after the customer returns, not synchronously within the same `submit()` call. Structure your `confirmAction` to read the returned `payment_data`/query string on that follow-up page and call `client.checkout.processCheckout()` yourself at that point, rather than relying on `submit()`'s single round trip.

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
    clientKey: process.env.AUTHORIZENET_CLIENT_KEY!,
    apiLoginID: process.env.AUTHORIZENET_API_LOGIN_ID!,
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
              authData: { clientKey: process.env.AUTHORIZENET_CLIENT_KEY!, apiLoginID: process.env.AUTHORIZENET_API_LOGIN_ID! },
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

## Offline Payments

Offline gateways require no card input and no tokenization. The customer selects a payment method and WooCommerce marks the order accordingly. Payment happens outside the platform — via bank transfer, check, or cash on delivery.

These factories return adapters with `supports: ['offline']` and no `tokenize` function, so `submit()` sends no `payment_data` on the first `processCheckout()` call.

---

### Direct Bank Transfer (BACS)

The customer places an order committing to pay via bank transfer. Your bank details are shown on the Thank You page.

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createBankTransferGateway } from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout({
  gatewayAdapters: [
    createBankTransferGateway({
      description: 'Make your payment directly into our bank account. Please use your order number as the payment reference.',
    }),
  ],
}));

const { processResponse } = await client.checkout.submit({ gatewayId: 'bacs' });
const result = processResponse.toObject();
if (result.payment_result?.redirect_url) {
  window.location.href = result.payment_result.redirect_url; // → Thank You page with bank details
}
```

---

### Check Payment

The customer places an order and mails a physical check. Your mailing address is shown on the Thank You page.

```ts
import { createCheckPaymentGateway } from '@cocartheadless/checkout';

createCheckPaymentGateway({
  description: 'Please make checks payable to "Your Store Name" and mail to: 123 Main Street, Anytown, USA.',
})
```

---

### Cash on Delivery

The customer pays in cash when the order is delivered. Suitable for local delivery within the same region.

```ts
import { createCashOnDeliveryGateway } from '@cocartheadless/checkout';

createCashOnDeliveryGateway({
  description: 'Pay with cash when your order is delivered.',
})
```

---

### Payment section for offline gateways

When an offline gateway is registered, `createForm()` includes a `payment` section with `fields: []` — no input elements. The section's `description` carries the gateway's instructions. Use it to display payment information to the customer:

```ts
const form = client.checkout.createForm({ gatewayId: 'bacs' });
const paymentSection = form.sections.find(s => s.id === 'payment');
// paymentSection.fields       → []
// paymentSection.description  → your gateway description (e.g. bank account details)
```

To skip the payment section entirely (e.g. for zero-total orders), pass `needsPayment: false`. See [Zero-Total Checkout](./zero-total.md).

---

## Express Checkout

Express checkout buttons (Apple Pay, Google Pay, Link) bypass the standard form — the customer taps a button and the browser or device wallet handles authentication. These buttons are rendered above the main form via `createExpressCheckoutBar()`.

See [Express Checkout](./express-checkout.md) for the full pattern including `createStripeExpressGateway()`, priority ordering, and custom adapter examples.

```ts
import { createCheckout, createStripeExpressGateway } from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout({
  successUrl: 'https://your-store.com/order-complete?id={CHECKOUT_ID}',
  returnUrl: 'https://your-store.com/checkout',
  gatewayAdapters: [
    createStripeExpressGateway({ stripe, elements }),
  ],
}));

const bar = client.checkout.createExpressCheckoutBar({ layout: 'scroll' });
// bar.gateways[0].fields → StripeExpressCheckoutElement field
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
