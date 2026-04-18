# Frameworks

The checkout package is headless by design. It does not ship framework-specific components, but it is structured to fit nicely into server-first and component-driven apps.

## Next.js

Recommended use:

- Configure the CoCart client in a shared server-safe module
- Fetch checkout state in Route Handlers or Server Components
- Render the form structure in client components
- Mount provider SDK UI only in the browser

```ts
// lib/cocart.ts
import { CoCart } from '@cocartheadless/sdk';
import {
  createCheckout,
  createStripeGateway,
  shadcnCheckoutTheme,
} from '@cocartheadless/checkout';

export const cocart = new CoCart(process.env.NEXT_PUBLIC_STORE_URL!).use(createCheckout({
  defaultTheme: shadcnCheckoutTheme,
  gatewayAdapters: [
    createStripeGateway({
      tokenize: async ({ paymentContext }) => ({
        payment_intent_id: String(paymentContext?.client_secret ?? ''),
      }),
    }),
  ],
}));
```

```tsx
// app/checkout/page.tsx
import { cocart } from '@/lib/cocart';

export default async function CheckoutPage() {
  const checkout = await cocart.checkout.getCheckout();
  const methods = await cocart.checkout.getPaymentMethods();

  return (
    <pre>
      {JSON.stringify({
        checkout: checkout.toObject(),
        methods: methods.toObject(),
      }, null, 2)}
    </pre>
  );
}
```

## Astro

Recommended use:

- Fetch checkout state in Astro page frontmatter
- Render provider mounting points in islands or client components
- Keep provider SDK initialization client-only

```astro
---
import { CoCart } from '@cocartheadless/sdk';
import {
  createCheckout,
  createPayPalGateway,
  createTailwindCheckoutTheme,
} from '@cocartheadless/checkout';

const client = new CoCart(import.meta.env.PUBLIC_STORE_URL).use(createCheckout({
  defaultTheme: createTailwindCheckoutTheme(),
  gatewayAdapters: [
    createPayPalGateway({
      tokenize: async () => ({
        order_id: 'po_123',
      }),
    }),
  ],
}));

const checkout = await client.checkout.getCheckout();
const form = client.checkout.createForm({ gatewayId: 'paypal' });
---

<h1>Checkout</h1>
<pre>{JSON.stringify(checkout.toObject(), null, 2)}</pre>
<pre>{JSON.stringify(form, null, 2)}</pre>
```

## Theme usage in frameworks

No matter which framework you use, the intended pattern is:

1. Create a CoCart client
2. Install the checkout extension
3. Fetch checkout state and payment methods
4. Generate a form definition with `createForm()`
5. Render sections and fields using your own components
6. Mount Stripe, PayPal, or Authorize.Net SDK UI for the chosen gateway
