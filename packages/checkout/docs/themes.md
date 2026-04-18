# Themes

The checkout package includes three theme presets. A theme is a plain object that maps each part of the checkout form to a CSS class string. You pass it to `createCheckout()` or directly to `createForm()`.

## What a theme controls

```ts
interface CheckoutTheme {
  name: string;                   // identifier, not rendered
  containerClassName: string;     // wraps the entire form
  sectionClassName: string;       // wraps each section (contact, billing, etc.)
  fieldClassName: string;         // wraps a label + input pair
  inputClassName: string;         // applied to every input/textarea/select
  labelClassName: string;         // applied to every label
  helperTextClassName: string;    // applied to description/helper text
  submitButtonClassName: string;  // applied to the submit button
  paymentContainerClassName: string; // wraps the payment gateway element
  orderSummaryClassName: string;  // wraps the order summary block
}
```

`createForm()` applies the theme to every field it generates. You read those class names back from `form.sections[n].fields[n].className` and `inputClassName` when rendering.

---

## Presets

### `bareCheckoutTheme`

Outputs semantic BEM-style class names with no visual styles attached. Use this when you have your own CSS or design system and just need stable, predictable class hooks.

```ts
import { bareCheckoutTheme } from '@cocartheadless/checkout';
```

Class names it produces:

| Property | Class |
|---|---|
| `containerClassName` | `cocart-checkout` |
| `sectionClassName` | `cocart-checkout__section` |
| `fieldClassName` | `cocart-checkout__field` |
| `inputClassName` | `cocart-checkout__input` |
| `labelClassName` | `cocart-checkout__label` |
| `helperTextClassName` | `cocart-checkout__helper` |
| `submitButtonClassName` | `cocart-checkout__submit` |
| `paymentContainerClassName` | `cocart-checkout__payment` |
| `orderSummaryClassName` | `cocart-checkout__summary` |

Best for: internal design systems, component libraries, enterprise storefronts with strict UI rules.

---

### `createTailwindCheckoutTheme(overrides?)`

Returns a theme with Tailwind CSS 4 utility classes already set. Pass an `overrides` object to replace individual properties without rebuilding the full theme.

```ts
import { createTailwindCheckoutTheme } from '@cocartheadless/checkout';

// Use as-is
const theme = createTailwindCheckoutTheme();

// Or override specific parts
const theme = createTailwindCheckoutTheme({
  submitButtonClassName: 'inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500',
});
```

Default class names it produces:

| Property | Default classes |
|---|---|
| `containerClassName` | `mx-auto grid gap-6 lg:grid-cols-[1.2fr_0.8fr]` |
| `sectionClassName` | `rounded-3xl border border-slate-200 bg-white p-6 shadow-sm` |
| `fieldClassName` | `grid gap-2` |
| `inputClassName` | `h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10` |
| `labelClassName` | `text-sm font-medium text-slate-900` |
| `helperTextClassName` | `text-sm text-slate-500` |
| `submitButtonClassName` | `inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800` |
| `paymentContainerClassName` | `grid gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4` |
| `orderSummaryClassName` | `rounded-3xl border border-slate-200 bg-slate-950 p-6 text-slate-50` |

Best for: custom storefronts using Tailwind CSS 4, landing-page style checkout design.

---

### `shadcnCheckoutTheme`

Built on top of `createTailwindCheckoutTheme()` with shadcn-style CSS variable-based classes (`bg-card`, `border-input`, `text-primary-foreground`, etc.). Requires your project to have shadcn's CSS variables defined.

```ts
import { shadcnCheckoutTheme } from '@cocartheadless/checkout';
```

Class names it produces (shadcn-specific overrides shown):

| Property | Classes |
|---|---|
| `sectionClassName` | `rounded-xl border bg-card p-6 text-card-foreground shadow-sm` |
| `inputClassName` | `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| `labelClassName` | `text-sm font-medium leading-none` |
| `helperTextClassName` | `text-sm text-muted-foreground` |
| `submitButtonClassName` | `inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90` |
| `paymentContainerClassName` | `grid gap-4 rounded-lg border border-dashed border-border bg-muted/40 p-4` |
| `orderSummaryClassName` | `rounded-xl border bg-muted/50 p-6 text-foreground` |

All other properties inherit from `createTailwindCheckoutTheme()`.

Best for: existing Radix + Tailwind apps using shadcn components.

---

## Setting a default theme

Pass `defaultTheme` to `createCheckout()` so every `createForm()` call uses it automatically:

```ts
import { createCheckout, shadcnCheckoutTheme } from '@cocartheadless/checkout';

const client = new CoCart('https://your-store.com').use(createCheckout({
  defaultTheme: shadcnCheckoutTheme,
}));

// Uses shadcnCheckoutTheme automatically
const form = client.checkout.createForm({ gatewayId: 'stripe' });
```

You can still override per-form:

```ts
const form = client.checkout.createForm({
  gatewayId: 'stripe',
  theme: createTailwindCheckoutTheme({ submitButtonClassName: 'btn-custom' }),
});
```

---

## Rendering a form with theme classes

`createForm()` returns a `CheckoutFormDefinition` with `sections`, each containing `fields`. The theme class names are already applied to every field.

```ts
const form = client.checkout.createForm({ gatewayId: 'stripe' });

// form.sections:
// [
//   { id: 'contact', title: 'Contact', fields: [...] },
//   { id: 'billing', title: 'Billing address', fields: [...] },
//   { id: 'notes', title: 'Order notes', fields: [...] },
//   { id: 'payment', title: 'Payment', fields: [...] },
// ]
```

Minimal rendering loop (framework-agnostic):

```ts
for (const section of form.sections) {
  // section.className    → from theme.sectionClassName
  // section.id          → 'contact' | 'billing' | 'shipping' | 'notes' | 'payment'

  for (const field of section.fields) {
    // field.className      → from theme.fieldClassName
    // field.inputClassName → from theme.inputClassName
    // field.name           → e.g. 'billing_address.first_name'
    // field.label          → e.g. 'First name'
    // field.type           → 'text' | 'email' | 'tel' | 'textarea' | 'gateway-element' | ...
    // field.required       → boolean
    // field.autoComplete   → e.g. 'given-name'
    // field.component      → set for gateway fields, e.g. 'StripePaymentElement'
  }
}
```

Fields with `type: 'gateway-element'` are mount points for the provider SDK (Stripe Elements, PayPal Buttons, etc.) — render a `<div>` using `field.inputClassName` and mount the provider UI into it.

---

## Writing a custom theme

Pass any object that satisfies `CheckoutTheme`:

```ts
import type { CheckoutTheme } from '@cocartheadless/checkout';

const myTheme: CheckoutTheme = {
  name: 'my-theme',
  containerClassName: 'checkout-wrapper',
  sectionClassName: 'checkout-section',
  fieldClassName: 'checkout-field',
  inputClassName: 'checkout-input',
  labelClassName: 'checkout-label',
  helperTextClassName: 'checkout-hint',
  submitButtonClassName: 'checkout-submit',
  paymentContainerClassName: 'checkout-payment',
  orderSummaryClassName: 'checkout-summary',
};

const form = client.checkout.createForm({ theme: myTheme });
```

Or derive from an existing preset and override specific parts:

```ts
const myTheme: CheckoutTheme = {
  ...shadcnCheckoutTheme,
  submitButtonClassName: 'my-custom-button',
};
```
