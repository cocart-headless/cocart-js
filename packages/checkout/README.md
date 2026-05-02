# @cocartheadless/checkout

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&labelColor=000000)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/@cocartheadless/checkout?style=for-the-badge&labelColor=000000)](https://www.npmjs.com/package/@cocartheadless/checkout)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=for-the-badge&labelColor=000000)](https://www.npmjs.com/package/@cocartheadless/checkout)
[![Tests](https://img.shields.io/github/actions/workflow/status/cocart-headless/cocart-js/tests.yml?label=tests&style=for-the-badge&labelColor=000000)](https://github.com/cocart-headless/cocart-js/actions/workflows/tests.yml)
[![Socket](https://img.shields.io/badge/Socket-secured-brightgreen?style=for-the-badge&labelColor=000000)](https://socket.dev/npm/package/@cocartheadless/checkout)
[![License](https://img.shields.io/github/license/jayanratna/resend-php?color=9cf&style=for-the-badge&labelColor=000000)](https://github.com/cocart-headless/cocart-js/blob/main/LICENSE)

A checkout orchestration layer that bridges CoCart's Checkout API with your headless WooCommerce frontend — form definitions, gateway tokenization, and payment context.

This package is separate from `@cocartheadless/sdk` and installs as an extension on the core CoCart client. It is designed for a more seamless checkout experience with:

**Gateways Supported**
- Stripe
- PayPal
- Authorize.Net
- Direct Bank Transfer (BACS)
- Check Payment
- Cash on Delivery

**Express Checkout**
- Apple Pay, Google Pay, Link (via Stripe Express)
- Priority-ordered express button bar
- Scroll or stack layout

**React Components** (`@cocartheadless/checkout/react`)

- `<CheckoutContainer>`, `<Address>`, `<ExpressBar>`, `<ShippingMethods>`
- `<PaymentMethods>`, `<OrderSummary>`, `<PayButton>`
- Stripe-inspired Appearance API — variables, rules, and three presets

**Extras**
- Headless UI Rendering
- Tailwind CSS 4
- shadcn-style component systems
- Coupon apply/remove
- Typed order summary

> [!IMPORTANT]
> This SDK is still an MVP and is looking for feedback, if you experience a bug or feel something can be better, please report it.

## Installation

### Via npm

[npm](https://www.npmjs.com/) is the default package manager that comes with Node.js. Run this in your project's root folder:

```bash
npm install @cocartheadless/sdk @cocartheadless/checkout
```

### Via yarn

[Yarn](https://yarnpkg.com/) is an alternative package manager. If you use Yarn in your project:

```bash
yarn add @cocartheadless/sdk @cocartheadless/checkout
```

### Via pnpm

[pnpm](https://pnpm.io/) is a fast, disk-efficient package manager. If you use pnpm:

```bash
pnpm add @cocartheadless/sdk @cocartheadless/checkout
```

### Via Bun

[Bun](https://bun.sh/) is a fast JavaScript runtime with a built-in package manager. If you use Bun:

```bash
bun add @cocartheadless/sdk @cocartheadless/checkout
```

**Zero runtime dependencies** — the SDK does not install any additional packages such as the gateway SDKs, keeping your project lightweight.

## Quick start

```ts
import { CoCart } from '@cocartheadless/sdk';
import {
  createCheckout,
  createModernCheckoutTheme,
  createStripeGateway,
} from '@cocartheadless/checkout';

const theme = createModernCheckoutTheme({
  variables: { colorPrimary: '#6366f1' },
});

const client = new CoCart('https://your-store.com').use(createCheckout({
  defaultTheme: theme,
  gatewayAdapters: [
    createStripeGateway({
      tokenize: async ({ paymentContext }) => ({
        payment_intent_id: String(paymentContext?.client_secret ?? ''),
      }),
    }),
  ],
}));

const checkout = await client.checkout.getCheckout();
const paymentMethods = await client.checkout.getPaymentMethods();
```

### React components

```tsx
import { CheckoutContainer, Address, PaymentMethods, PayButton } from '@cocartheadless/checkout/react';

const form = client.checkout.createForm({ gatewayId: 'stripe' });

export function CheckoutPage() {
  const contactSection = form.sections.find(s => s.id === 'contact');
  const paymentSection = form.sections.find(s => s.id === 'payment');

  return (
    <CheckoutContainer form={form}>
      {contactSection && <Address type="contact" section={contactSection} theme={theme} />}
      <PaymentMethods gateways={client.checkout.listGateways()} theme={theme} paymentSection={paymentSection} />
      <PayButton theme={theme} />
    </CheckoutContainer>
  );
}
```

## Documentation

| Guide | Description |
|-------|-------------|
| [Installation](docs/installation.md) | Package install, requirements, setup, and API coverage |
| [Checkout Flow](docs/checkout-flow.md) | `getCheckout()`, `updateCheckout()`, `createPaymentContext()`, `processCheckout()`, and `submit()` |
| [Gateways](docs/gateways.md) | Stripe, PayPal, Authorize.Net, offline gateways, and multi-gateway setup |
| [Express Checkout](docs/express-checkout.md) | Apple Pay, Google Pay, priority bar, `createExpressCheckoutBar()`, and `createStripeExpressGateway()` |
| [Zero-Total Checkout](docs/zero-total.md) | Free orders, coupon-discounted totals, and skipping tokenization |
| [Coupons](docs/coupons.md) | Applying coupons, removing coupons, order summary, and re-checking `needs_payment` |
| [Shipping Methods](docs/shipping.md) | Fetching rates, rendering a selector, multi-package support |
| [Frameworks](docs/frameworks.md) | Next.js, Astro, and framework integration patterns |
| [Themes](docs/themes.md) | Appearance API — variables, rules, presets, and CSS custom properties |
| [React Components](docs/components.md) | `<Address>`, `<PaymentMethods>`, `<PayButton>`, and the full component API |

## Package purpose

The checkout package keeps responsibilities clean:

- `@cocartheadless/sdk` handles CoCart client behavior, cart/session state, and shared API concerns.
- `@cocartheadless/checkout` handles Checkout API flows, payment gateway orchestration, and checkout form definitions.
- Your storefront code handles framework rendering and provider SDK mounting.

## Workspace development

From the monorepo root:

```bash
npm run typecheck:checkout
npm run build:checkout
npm run test:checkout
```

For both packages together:

```bash
npm run build:all
npm run test:all
```
