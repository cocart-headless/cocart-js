# `@cocartheadless/checkout` — React Components

Headless, themeable React components for building a CoCart checkout UI.

- Ready to use out of the box — import and render with no additional configuration
- Fully customizable with Tailwind classes and CSS variables to match your brand; adjust component props for full control over style, colors, and layout
- WCAG 2.1 AA accessible — ARIA labels, keyboard navigation, and focus management built-in

---

## Installation

```bash
npm install @cocartheadless/checkout react react-dom
```

Import from the `/react` sub-path:

```tsx
import {
  CheckoutContainer,
  Address,
  ExpressBar,
  ShippingMethods,
  PaymentMethods,
  OrderSummary,
  OrderLineItems,
  OrderTotals,
  DiscountCode,
  PayButton,
  TermsAndConditions,
} from '@cocartheadless/checkout/react';
```

---

## Font

The default `modern` theme uses **Inter**. To avoid a Google Fonts network call, self-host it:

```bash
npm install @fontsource-variable/inter
```

```tsx
// app entry point
import '@fontsource-variable/inter';
```

To use the system font instead, override `fontFamily` in your theme:

```ts
createCheckoutTheme({
  variables: {
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
});
```

See [`fonts.css`](./fonts.css) for all self-hosting options including local WOFF2 files.

---

## Components

### `<CheckoutContainer>`

Wraps the checkout in a scoped div that CSS theme variables are applied to.

| Prop | Type | Default |
|------|------|---------|
| `theme` | `CheckoutTheme` | required |
| `layout` | `'two-column' \| 'stacked'` | `'two-column'` |
| `children` | `ReactNode` | required |

---

### `<Address>`

Renders a contact, billing, or shipping address section.

| Prop | Type | Default |
|------|------|---------|
| `type` | `'contact' \| 'billing' \| 'shipping'` | required |
| `section` | `CheckoutFormSection` | — |
| `theme` | `CheckoutTheme` | required |
| `loading` | `boolean` | `false` |
| `isAuthorized` | `boolean` | `false` |

When `type="contact"` and `isAuthorized=false`, a **Sign in** toggle is shown. Clicking it replaces the contact fields with a compact login form (email + password). After sign-in, a **Sign out** link appears.

The phone field (`type="tel"`) auto-detects the country from the dial code prefix (e.g. `+44` → 🇬🇧) and shows the flag inline.

The email field validates in real-time with a 1-second debounce and shows a red border + message for invalid addresses.

---

### `<PaymentMethods>`

Renders gateway selector rows with card brand icons, and optionally inline billing address.

| Prop | Type | Default |
|------|------|---------|
| `gateways` | `CheckoutGatewayPresentation[]` | required |
| `activeGatewayId` | `string` | first gateway |
| `theme` | `CheckoutTheme` | required |
| `paymentSection` | `CheckoutFormSection` | — |
| `billingSection` | `CheckoutFormSection` | — |
| `showBillingUnderPayment` | `boolean` | `true` |
| `loading` | `boolean` | `false` |

Gateway icons are resolved automatically from `gw.id` / `gw.provider`:
- **Stripe / Square** → Visa, Mastercard, Amex
- **Braintree** → Visa, Mastercard, Amex, PayPal
- **PayPal** → PayPal
- **Offline** → no icon
- **Other** → generic card icon

---

### `<ShippingMethods>`

Renders selectable shipping rate rows. The selected row is highlighted with the theme's `colorBackgroundHover`.

| Prop | Type | Default |
|------|------|---------|
| `theme` | `CheckoutTheme` | required |
| `rates` | `ShippingRate[]` | required |
| `loading` | `boolean` | `false` |
| `freeShipping` | `boolean` | `false` |
| `placeholder` | `boolean` | `false` |
| `onRateChange` | `(rate: ShippingRate) => void` | — |

When `freeShipping=true`, paid rates show a strikethrough price with a green "Free" label. When `placeholder=true`, a prompt to enter a shipping address is shown instead of the rate list.

---

### `<OrderSummary>`

Renders cart items, discount code input, and totals.

| Prop | Type | Default |
|------|------|---------|
| `theme` | `CheckoutTheme` | required |
| `mobileDrawer` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `total` | `string` | `'USD $95.70'` |
| `onCouponsChange` | `(coupons: AppliedCoupon[]) => void` | — |

When `mobileDrawer=true`, a sticky bottom bar with a pull-up drawer is rendered instead of the inline summary.

#### `<DiscountCode>`

Can be used standalone outside `<OrderSummary>`:

```tsx
import { DiscountCode } from '@cocartheadless/checkout/react';

<DiscountCode
  theme={theme}
  applied={coupons}
  onApply={async (code) => {
    const result = await api.validateCoupon(code);
    if (!result) return null;
    return { code, discount: result.label, discountCents: result.cents };
  }}
  onRemove={(code) => removeCoupon(code)}
/>
```

The `onApply` callback should return an `AppliedCoupon` on success, or `null` to show an error. When `freeShipping: true` is set on the coupon, pass it to `<ShippingMethods freeShipping>` to show crossed-out shipping prices.

---

### `<ExpressBar>`

Renders express checkout buttons (Apple Pay, Google Pay, etc.) above the main form.

| Prop | Type | Default |
|------|------|---------|
| `gateways` | `CheckoutGatewayPresentation[]` | required |
| `theme` | `CheckoutTheme` | required |
| `loading` | `boolean` | `false` |

---

### `<PayButton>`

Submit button for the checkout form.

| Prop | Type | Default |
|------|------|---------|
| `theme` | `CheckoutTheme` | required |
| `label` | `string` | `'Pay now'` |
| `loading` | `boolean` | `false` |

---

### `<TermsAndConditions>`

Checkbox that gates the `<PayButton>`. The wrapped children are shown at reduced opacity with pointer events disabled until the user checks the box.

| Prop | Type | Default |
|------|------|---------|
| `theme` | `CheckoutTheme` | required |
| `termsUrl` | `string` | — |
| `privacyUrl` | `string` | — |
| `label` | `string` | built-in |
| `children` | `ReactNode` | — |

```tsx
<TermsAndConditions theme={theme} termsUrl="/terms" privacyUrl="/privacy">
  <PayButton theme={theme} />
</TermsAndConditions>
```

---

## Theming

See the main [themes documentation](../../docs/themes.md) for the full Appearance API including `variables`, `rules`, and CSS class overrides.
