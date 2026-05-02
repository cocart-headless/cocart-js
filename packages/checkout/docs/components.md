# React Components

The `@cocartheadless/checkout/react` entrypoint ships pre-built React components for rendering a checkout form. They are styled entirely through CSS custom properties set by the [Appearance API](themes.md) — no Tailwind config required in your project, though the components are written with Tailwind v4 utilities if you want to override them.

React is an optional peer dependency. The core `@cocartheadless/checkout` package has no React dependency.

## Installation

```bash
npm install @cocartheadless/checkout react react-dom
```

## Import

```ts
import {
  CheckoutContainer,
  Address,
  ExpressBar,
  ShippingMethods,
  PaymentMethods,
  OrderSummary,
  PayButton,
} from '@cocartheadless/checkout/react';
```

---

## `<CheckoutContainer>`

The root wrapper. Applies the theme's `containerClassName` and switches between a two-column grid (desktop) and a single stacked column (mobile / express-only).

```tsx
<CheckoutContainer form={formDef} layout="two-column">
  {/* left column: address + payment */}
  {/* right column: order summary */}
</CheckoutContainer>
```

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `form` | `CheckoutFormDefinition` | required | Form definition from `client.checkout.createForm()` |
| `layout` | `'stacked' \| 'two-column'` | `'two-column'` | Column layout |
| `children` | `React.ReactNode` | required | Section components |

---

## `<Address>`

Renders a form section (contact, billing, or shipping) as a responsive field grid. Country fields use a custom searchable dropdown with emoji flags. Two-column layout is applied automatically for billing/shipping sections; contact and notes sections render single-column.

```tsx
import { Address } from '@cocartheadless/checkout/react';

<Address type="contact" section={contactSection} theme={theme} />
<Address type="shipping" section={shippingSection} theme={theme} />
<Address type="billing" section={billingSection} theme={theme} />
```

**Props**

| Prop | Type | Description |
|---|---|---|
| `type` | `'contact' \| 'billing' \| 'shipping'` | Controls grid layout (`billing`/`shipping` → 2-column) |
| `section` | `CheckoutFormSection` | Section definition from `form.sections` |
| `theme` | `CheckoutTheme` | Controls `inputClassName`, `helperTextClassName`, `sectionClassName` |

`section` comes from the form definition returned by `client.checkout.createForm()`. Fields with `hidden: true` are automatically skipped.

---

## `<ExpressBar>`

Renders express checkout buttons (Apple Pay, Google Pay, etc.) as placeholder boxes. In a two-column layout it appears above the main form with an "or" divider. In `expressOnly` mode it centres on screen with a description line and no divider.

```tsx
<ExpressBar gateways={expressGateways} theme={theme} />
<ExpressBar gateways={expressGateways} theme={theme} expressOnly />
```

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `gateways` | `CheckoutGatewayPresentation[]` | required | Express gateway list |
| `theme` | `CheckoutTheme` | required | Controls `sectionClassName`, `expressCheckoutBarClassName` |
| `expressOnly` | `boolean` | `false` | Centred layout with no "or" divider — use when no regular gateways are enabled |

`CheckoutGatewayPresentation` is returned by `client.checkout.listExpressGateways()`.

---

## `<ShippingMethods>`

Renders a radio group of shipping rate options. Currently uses mock data — wire up to `client.checkout.getShippingMethods()` and replace `MOCK_RATES` with live data when integrating.

```tsx
<ShippingMethods theme={theme} />
```

**Props**

| Prop | Type | Description |
|---|---|---|
| `theme` | `CheckoutTheme` | Controls `sectionClassName` |

---

## `<PaymentMethods>`

Renders a list of regular payment gateways (not express). Each row is a radio label. Offline gateways (e.g. COD, BACS) show an "Offline" badge. If only one non-offline gateway is enabled and a `paymentSection` is supplied, the gateway element is rendered inline below the selection row.

The billing address toggle ("Use shipping address as billing address") renders below the gateway list when `showBillingUnderPayment` is true and `billingSection` is provided.

```tsx
<PaymentMethods
  gateways={regularGateways}
  activeGatewayId={activeGatewayId}
  theme={theme}
  paymentSection={paymentSection}
  billingSection={billingSection}
  showBillingUnderPayment={collectShippingAddress}
/>
```

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `gateways` | `CheckoutGatewayPresentation[]` | required | Regular (non-express) gateways |
| `activeGatewayId` | `string` | first gateway | Pre-selected gateway id |
| `theme` | `CheckoutTheme` | required | Controls `sectionClassName`, `paymentContainerClassName`, `helperTextClassName` |
| `paymentSection` | `CheckoutFormSection` | — | Gateway element fields (from `form.sections`) |
| `billingSection` | `CheckoutFormSection` | — | Billing address section for the toggle |
| `showBillingUnderPayment` | `boolean` | `true` | Show the billing address toggle and form |

Returns `null` when `gateways` is empty and no `paymentSection` is supplied.

---

## `<OrderSummary>`

Renders a static order summary panel with line items, subtotal, shipping, taxes, and total. Currently uses mock data — wire this up to `client.checkout.getCheckout()` response data when integrating.

```tsx
<OrderSummary theme={theme} />
```

**Props**

| Prop | Type | Description |
|---|---|---|
| `theme` | `CheckoutTheme` | Controls `orderSummaryClassName` |

---

## `<PayButton>`

Renders a full-width `<button type="submit">` styled with the theme's button variables.

```tsx
<PayButton theme={theme} />
<PayButton theme={theme} label="Complete order" />
```

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Pay now'` | Button text |
| `theme` | `CheckoutTheme` | required | Controls `submitButtonClassName` |

---

## Putting it together

```tsx
import {
  CheckoutContainer,
  Address,
  ExpressBar,
  ShippingMethods,
  PaymentMethods,
  OrderSummary,
  PayButton,
} from '@cocartheadless/checkout/react';
import { createModernCheckoutTheme } from '@cocartheadless/checkout';

const theme = createModernCheckoutTheme();
const form = client.checkout.createForm({ gatewayId: 'stripe' });

const contactSection  = form.sections.find(s => s.id === 'contact');
const shippingSection = form.sections.find(s => s.id === 'shipping');
const billingSection  = form.sections.find(s => s.id === 'billing');
const paymentSection  = form.sections.find(s => s.id === 'payment');

const expressGateways = client.checkout.listExpressGateways();
const regularGateways = client.checkout.listGateways();

export function CheckoutPage() {
  return (
    <CheckoutContainer form={form} layout="two-column">
      <div>
        {expressGateways.length > 0 && (
          <ExpressBar gateways={expressGateways} theme={theme} />
        )}
        {contactSection && (
          <Address type="contact" section={contactSection} theme={theme} />
        )}
        {shippingSection && (
          <Address type="shipping" section={shippingSection} theme={theme} />
        )}
        <ShippingMethods theme={theme} />
        <PaymentMethods
          gateways={regularGateways}
          theme={theme}
          paymentSection={paymentSection}
          billingSection={billingSection}
        />
        <PayButton theme={theme} />
      </div>
      <div>
        <OrderSummary theme={theme} />
      </div>
    </CheckoutContainer>
  );
}
```

---

## Framework notes

### TypeScript path aliases

If your bundler doesn't resolve `@cocartheadless/checkout/react` automatically, add the subpath to your tsconfig:

```json
{
  "compilerOptions": {
    "paths": {
      "@cocartheadless/checkout": ["node_modules/@cocartheadless/checkout/dist/index.d.ts"],
      "@cocartheadless/checkout/react": ["node_modules/@cocartheadless/checkout/dist/react.d.ts"]
    }
  }
}
```

### Vite

For a monorepo dev setup pointing at source:

```ts
// vite.config.ts
resolve: {
  alias: {
    '@cocartheadless/checkout/react': resolve(__dirname, '../../packages/checkout/src/react/index.ts'),
    '@cocartheadless/checkout': resolve(__dirname, '../../packages/checkout/src/index.ts'),
  },
},
```

The more-specific alias must come first.
