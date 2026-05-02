# Themes & Appearance API

The checkout package uses a Stripe-inspired Appearance API. You control brand colours, typography, shape, and spacing through **variables**, and use **rules** for per-element CSS overrides. CSS class name overrides are still supported for Tailwind / shadcn power users.

Zero config gives you the **modern** preset — a clean, Shopify-style layout.

---

## Quick start

```ts
import { createCheckoutTheme } from '@cocartheadless/checkout';

// No args → modern preset with defaults
const theme = createCheckoutTheme();

// Override a brand colour
const theme = createCheckoutTheme({
  variables: { colorPrimary: '#6366f1' },
});

// Switch preset, then override
const theme = createCheckoutTheme({
  preset: 'tailwind',
  variables: { colorPrimary: '#6366f1', borderRadius: '16px' },
});
```

Pass the theme when setting up the checkout client:

```ts
const client = new CoCart('https://your-store.com').use(createCheckout({
  defaultTheme: theme,
}));
```

---

## Preset factories

Each factory sets a preset base and sensible layout class names. Pass `Partial<CheckoutTheme>` overrides to any of them.

### `createModernCheckoutTheme(overrides?)`

A minimal, Shopify-style layout. Sections flow edge-to-edge with thin dividers on a white/cream background. This is the default when no theme is supplied.

```ts
import { createModernCheckoutTheme } from '@cocartheadless/checkout';

const theme = createModernCheckoutTheme();
// or override specific parts:
const theme = createModernCheckoutTheme({
  variables: { colorPrimary: '#7c3aed', borderRadius: '12px' },
});
```

### `createTailwindCheckoutTheme(overrides?)`

Slate-palette card layout. Each section is a rounded card with a border. Matches Tailwind's default design system aesthetic.

```ts
import { createTailwindCheckoutTheme } from '@cocartheadless/checkout';

const theme = createTailwindCheckoutTheme();
```

### `createShadcnCheckoutTheme(overrides?)`

Maps to shadcn/ui's HSL CSS variable palette. Border radius, spacing, and colours match shadcn component conventions. Use this when your app already has shadcn set up.

```ts
import { createShadcnCheckoutTheme } from '@cocartheadless/checkout';

const theme = createShadcnCheckoutTheme();
```

### `createCheckoutTheme(options?)` — generic factory

Lower-level factory. Accepts any `CheckoutTheme` shape and defaults to the `modern` preset. Use this if you want to specify a `preset` without the extra layout class names the named factories add.

```ts
import { createCheckoutTheme } from '@cocartheadless/checkout';

const theme = createCheckoutTheme({
  preset: 'shadcn',
  variables: { colorPrimary: 'hsl(263 70% 50%)' },
  rules: {
    '.Input:focus': { boxShadow: '0 0 0 3px rgba(99,102,241,0.2)' },
  },
});
```

---

## Variables reference

Variables are CSS custom properties scoped to your checkout container. They control the entire palette, typography, shape, and spacing.

```ts
interface CheckoutThemeVariables {
  // Colours
  colorPrimary:         string; // interactive accent — focus rings, radio/checkbox
  colorBackground:      string; // page / canvas background
  colorBackgroundAlt:   string; // order summary panel background
  colorBackgroundHover: string; // row hover and selected state
  colorSurface:         string; // input and card fill
  colorText:            string; // primary body text
  colorTextMuted:       string; // helper text, placeholders, labels
  colorBorder:          string; // input and card borders
  colorError:           string; // validation error text and borders
  colorButton:          string; // submit button background
  colorButtonText:      string; // submit button label

  // Typography
  fontFamily:       string; // applied as font-family on the checkout root
  fontSizeBase:     string; // base font size (rem or px)
  fontWeightNormal: string; // body weight
  fontWeightMedium: string; // semi-emphasis weight
  fontWeightBold:   string; // headings and labels weight

  // Shape
  borderRadius:     string; // base radius for inputs, cards
  borderRadiusFull: string; // pill radius — submit button
  inputHeight:      string; // height of text inputs

  // Spacing
  spacingUnit:  string; // base unit — not used directly but available as --cocart-spacing-unit
  fieldGap:     string; // vertical gap between fields in a section
  sectionGap:   string; // vertical gap between sections (used by tailwind / shadcn presets)
}
```

### Preset defaults

| Variable | modern | tailwind | shadcn |
|---|---|---|---|
| `colorPrimary` | `#1a1a1a` | `#0f172a` | `hsl(222.2 47.4% 11.2%)` |
| `colorBackground` | `#ffffff` | `#f8fafc` | `hsl(0 0% 100%)` |
| `colorBackgroundAlt` | `#f6f6f1` | `#f1f5f9` | `hsl(210 40% 96.1%)` |
| `colorBackgroundHover` | `#f5f5f5` | `#f1f5f9` | `hsl(210 40% 96.1%)` |
| `colorSurface` | `#ffffff` | `#ffffff` | `hsl(0 0% 100%)` |
| `colorText` | `#1a1a1a` | `#0f172a` | `hsl(222.2 84% 4.9%)` |
| `colorTextMuted` | `#6b6b6b` | `#64748b` | `hsl(215.4 16.3% 46.9%)` |
| `colorBorder` | `#d9d9d9` | `#cbd5e1` | `hsl(214.3 31.8% 91.4%)` |
| `colorError` | `#dc2626` | `#ef4444` | `hsl(0 84.2% 60.2%)` |
| `colorButton` | `#1a1a1a` | `#0f172a` | `hsl(222.2 47.4% 11.2%)` |
| `colorButtonText` | `#ffffff` | `#ffffff` | `hsl(0 0% 100%)` |
| `borderRadius` | `8px` | `12px` | `6px` |
| `borderRadiusFull` | `9999px` | `16px` | `6px` |
| `inputHeight` | `48px` | `44px` | `40px` |
| `sectionGap` | `0px` | `24px` | `16px` |

---

## Rules reference

Rules map CSS selectors to property objects (camelCase property names). They are scoped to your checkout container automatically.

Supported selectors follow the same conventions as Stripe's Appearance API:

| Selector | What it targets |
|---|---|
| `.Input` | All text inputs, textareas, and selects |
| `.Input:focus` | Focused input state |
| `.Input::placeholder` | Input placeholder text |
| `.Input--invalid` | Input in error state |
| `.Label` | Field labels |
| `.SubmitButton` | The pay/submit button |
| `.SubmitButton:hover` | Submit button hover state |
| `.Section` | Each form section wrapper |
| `.SectionHeading` | Section `<h2>` headings |

Rules are freeform — any valid CSS selector scoped under your container will work.

```ts
const theme = createCheckoutTheme({
  variables: { colorPrimary: '#6366f1' },
  rules: {
    '.Input': {
      borderColor: 'var(--cocart-color-border)',
      borderRadius: 'var(--cocart-border-radius)',
    },
    '.Input:focus': {
      borderColor: 'var(--cocart-color-primary)',
      boxShadow: '0 0 0 3px color-mix(in srgb, var(--cocart-color-primary) 15%, transparent)',
    },
    '.SubmitButton': {
      borderRadius: 'var(--cocart-border-radius-full)',
      letterSpacing: '0.025em',
    },
  },
});
```

---

## CSS custom properties

Variables are injected as CSS custom properties on your checkout container element. You can reference them directly in your own CSS or Tailwind utilities:

| Custom property | Variable |
|---|---|
| `--cocart-color-primary` | `colorPrimary` |
| `--cocart-color-background` | `colorBackground` |
| `--cocart-color-background-alt` | `colorBackgroundAlt` |
| `--cocart-color-background-hover` | `colorBackgroundHover` |
| `--cocart-color-surface` | `colorSurface` |
| `--cocart-color-text` | `colorText` |
| `--cocart-color-text-muted` | `colorTextMuted` |
| `--cocart-color-border` | `colorBorder` |
| `--cocart-color-error` | `colorError` |
| `--cocart-color-button` | `colorButton` |
| `--cocart-color-button-text` | `colorButtonText` |
| `--cocart-font-family` | `fontFamily` |
| `--cocart-font-size-base` | `fontSizeBase` |
| `--cocart-font-weight-normal` | `fontWeightNormal` |
| `--cocart-font-weight-medium` | `fontWeightMedium` |
| `--cocart-font-weight-bold` | `fontWeightBold` |
| `--cocart-border-radius` | `borderRadius` |
| `--cocart-border-radius-full` | `borderRadiusFull` |
| `--cocart-input-height` | `inputHeight` |
| `--cocart-spacing-unit` | `spacingUnit` |
| `--cocart-field-gap` | `fieldGap` |
| `--cocart-section-gap` | `sectionGap` |

---

## Class name overrides

All class name properties from the original API are still supported. They take precedence over variable-driven styles via normal CSS specificity.

```ts
interface CheckoutTheme {
  // ... variables, rules, preset above ...

  containerClassName?: string;         // checkout root wrapper
  sectionClassName?: string;           // each form section
  fieldClassName?: string;             // label + input pair wrapper
  inputClassName?: string;             // every input / textarea / select
  labelClassName?: string;             // every label
  helperTextClassName?: string;        // description / helper text
  submitButtonClassName?: string;      // the pay button
  paymentContainerClassName?: string;  // payment gateway element wrapper
  orderSummaryClassName?: string;      // order summary block
  expressCheckoutBarClassName?: string; // express checkout button row
}
```

Use class names for Tailwind utilities, shadcn component classes, or any design system that doesn't map cleanly to the variable model:

```ts
const theme = createShadcnCheckoutTheme({
  submitButtonClassName: 'inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90',
});
```

---

## `resolveTheme()` — low-level CSS generation

`resolveTheme(theme, scopeSelector)` returns the raw CSS string that the checkout runtime injects. You can call it yourself if you need to pre-render styles server-side or inject them into a shadow DOM.

```ts
import { resolveTheme } from '@cocartheadless/checkout';

const css = resolveTheme(theme, '#my-checkout-root');
// Returns a <style> block content string with scoped custom properties + rules
```

---

## Advanced: reading preset variable sets

```ts
import { MODERN_VARIABLES, TAILWIND_VARIABLES, SHADCN_VARIABLES } from '@cocartheadless/checkout';

// Spread to build a custom baseline
const theme = createCheckoutTheme({
  variables: { ...MODERN_VARIABLES, colorPrimary: '#7c3aed' },
});
```
