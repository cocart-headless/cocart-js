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

Card layout powered by **daisyUI v5** tokens. Each section is a rounded card (`card` class). The active `data-theme` on an ancestor element controls colours — drop in any daisyUI theme and the checkout adapts automatically.

```ts
import { createTailwindCheckoutTheme } from '@cocartheadless/checkout';

const theme = createTailwindCheckoutTheme();
```

### `createShadcnCheckoutTheme(overrides?)`

Bordered card layout that reads colours directly from **shadcn/ui CSS variables** (`--primary`, `--background`, `--border`, etc.). If your app already has shadcn set up, the checkout inherits your brand with zero configuration. Dark mode is handled by your own `.dark` class toggling shadcn's tokens.

Input fields use shadcn's `--input` border token and `--ring` for focus rings, matching shadcn component conventions exactly.

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
| `colorPrimary` | `#1a1a1a` | `var(--color-primary)` ¹ | `hsl(var(--primary))` ² |
| `colorBackground` | `#ffffff` | `var(--color-base-100)` ¹ | `hsl(var(--background))` ² |
| `colorBackgroundAlt` | `#f6f6f1` | `var(--color-base-200)` ¹ | `hsl(var(--muted))` ² |
| `colorBackgroundHover` | `#f5f5f5` | `var(--color-base-200)` ¹ | `hsl(var(--muted))` ² |
| `colorSurface` | `#ffffff` | `var(--color-base-100)` ¹ | `hsl(var(--card))` ² |
| `colorText` | `#1a1a1a` | `var(--color-base-content)` ¹ | `hsl(var(--foreground))` ² |
| `colorTextMuted` | `#6b6b6b` | `color-mix(…base-content 50%)` ¹ | `hsl(var(--muted-foreground))` ² |
| `colorBorder` | `#d9d9d9` | `var(--color-base-300)` ¹ | `hsl(var(--border))` ² |
| `colorError` | `#dc2626` | `var(--color-error)` ¹ | `hsl(var(--destructive))` ² |
| `colorButton` | `#1a1a1a` | `var(--color-primary)` ¹ | `hsl(var(--primary))` ² |
| `colorButtonText` | `#ffffff` | `var(--color-primary-content)` ¹ | `hsl(var(--primary-foreground))` ² |
| `borderRadius` | `8px` | `12px` | `var(--radius)` ² |
| `borderRadiusFull` | `9999px` | `16px` | `calc(var(--radius) * 2)` ² |
| `inputHeight` | `48px` | `44px` | `36px` |
| `sectionGap` | `0px` | `24px` | `16px` |

¹ The `tailwind` preset defers colours to **daisyUI v5 CSS tokens** — the active `data-theme` on an ancestor element determines the resolved colour. To supply explicit hex values (e.g. for non-daisyUI projects), override `variables` with real hex values:

```ts
const theme = createTailwindCheckoutTheme({
  variables: {
    colorPrimary:    '#7c3aed',
    colorBackground: '#ffffff',
    colorButton:     '#7c3aed',
    colorButtonText: '#ffffff',
  },
});
```

² The `shadcn` preset defers colours to **shadcn/ui CSS variables** — the standard `--primary`, `--background`, `--border` etc. from your `globals.css` are used automatically, so the checkout inherits your app's brand with zero configuration. Dark mode is handled by your own `.dark` class toggling shadcn's tokens. To supply explicit values, override `variables`:

```ts
const theme = createShadcnCheckoutTheme({
  variables: {
    colorPrimary:    'hsl(263 70% 50%)',
    colorButton:     'hsl(263 70% 50%)',
    colorButtonText: '#ffffff',
  },
});
```

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
// shadcn preset — the factory already sets these; override only what you need
const theme = createShadcnCheckoutTheme({
  submitButtonClassName: 'inline-flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90',
});

// daisyUI preset — the factory already sets daisyUI component classes
const theme = createTailwindCheckoutTheme({
  submitButtonClassName: 'btn btn-secondary btn-block mt-2',
});
```

### Default class names by preset

| Property | modern | tailwind | shadcn |
|---|---|---|---|
| `containerClassName` | `mx-auto max-w-5xl grid lg:grid-cols-[1fr_380px]` | `mx-auto max-w-5xl grid gap-6 lg:grid-cols-[1.2fr_0.8fr]` | `mx-auto max-w-5xl grid gap-6 lg:grid-cols-[1.2fr_0.8fr]` |
| `sectionClassName` | `px-4 lg:px-10` | `card bg-base-100 shadow-sm p-6` | `rounded-lg border border-(--cocart-color-border) bg-(--cocart-color-surface) p-6 shadow-xs` |
| `orderSummaryClassName` | `px-4 py-4 lg:px-10 lg:py-8` | `card p-6` | `rounded-lg border border-(--cocart-color-border) bg-(--cocart-color-surface) p-6 shadow-xs` |
| `inputClassName` | _(default styles)_ | `input input-bordered w-full h-(--cocart-input-height) text-sm` | `flex h-(--cocart-input-height) w-full rounded-md border border-[hsl(var(--input))] bg-(--cocart-color-background) px-3 py-1 text-sm shadow-xs outline-none placeholder:text-(--cocart-color-text-muted) focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 transition-colors` |
| `labelClassName` | _(default styles)_ | _(default styles)_ | `text-sm font-medium leading-none text-(--cocart-color-text)` |
| `helperTextClassName` | _(default styles)_ | `text-xs text-base-content/50 mt-0.5` | `text-xs text-(--cocart-color-text-muted) mt-1` |
| `submitButtonClassName` | _(default styles)_ | `btn btn-primary btn-block mt-2` | `inline-flex h-10 w-full items-center justify-center rounded-[--cocart-border-radius-full] bg-(--cocart-color-button) px-4 text-sm font-medium text-(--cocart-color-button-text) shadow-xs transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2` |

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
