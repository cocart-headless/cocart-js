# Checkout Builder — Preview App

An interactive visual builder for the `@cocartheadless/checkout` SDK. Developers use it to configure their checkout form, tweak the appearance, set up payment gateways, and copy the generated implementation code directly into their project.

---

## Running locally

From the monorepo root:

```bash
npm install
npm run dev:checkout-preview
```

Or from this directory:

```bash
npm install
npm run dev
```

Opens at `http://localhost:5174`.

The preview app resolves `@cocartheadless/checkout` and `@cocartheadless/sdk` directly from monorepo source via Vite aliases — no build step needed when working on the SDK packages alongside the preview.

---

## Architecture

The app is a plain TypeScript + React hybrid. The builder panel (tabs, inputs, toggles) is rendered with vanilla DOM. The live checkout preview is rendered with React via `PreviewPane`. There is no framework router, no global state library — just a single `StateStore` with a subscribe/update pattern.

```
src/
  main.tsx              # entry — wires layout, tabs, preview, code panel
  state.ts              # BuilderState interface, StateStore class, GATEWAY_CATALOG
  state-types.ts        # StateStore type exported separately to avoid circular imports
  mock-client.ts        # stub CoCart client used by CheckoutClient in the preview

  ui/
    layout.ts           # builds the full page chrome (header, panels, viewport toggle)
    copy-button.ts      # reusable copy-to-clipboard button

  tabs/
    tab-data.ts         # Data tab — form section toggles, field visibility, redirect URLs
    tab-appearance.ts   # Appearance tab — preset cards, colour pickers, sliders, custom CSS
    tab-payments.ts     # Payments tab — gateway enable/disable, label/description, set default

  preview/
    PreviewPane.tsx      # React root — maps BuilderState → checkout components, mobile frame

  codegen/
    codegen.ts          # Generates the implementation code shown in the code panel

  components/
    checkout/
      index.ts          # Re-exports components from @cocartheadless/checkout/react
      themes.ts         # createModernCheckoutTheme and preset helpers (preview-specific)

  styles/
    app.css             # Tailwind v4 entry + @source inline() for dynamic class allowlist
```

---

## State

`BuilderState` (defined in `state.ts`) is the single source of truth. Every tab reads from it and writes to it via `store.update(partial)`. Every update triggers all subscribers synchronously.

Key fields:

| Field | Type | Description |
|---|---|---|
| `collectShippingAddress` | `boolean` | Shows/hides the shipping address section |
| `shippingSameAsBilling` | `boolean` | Hides shipping form, uses billing address for both |
| `includeNotes` | `boolean` | Shows the order notes textarea |
| `includeOrderSummary` | `boolean` | Shows the order summary panel |
| `mobileOrderSummaryDrawer` | `boolean` | Uses bottom sheet drawer for order summary on mobile |
| `themePreset` | `'modern' \| 'tailwind' \| 'shadcn'` | Active preset |
| `theme` | `CheckoutTheme` | Full theme object including variables and rules |
| `gateways` | `GatewayConfig[]` | Gateway list with enabled/label/description state |
| `defaultGateway` | `string` | ID of the pre-selected gateway |
| `previewViewport` | `'desktop' \| 'mobile'` | Drives the phone frame vs full-width layout |

---

## Preview rendering

`PreviewPane` is a React class component that calls `this.root.render(...)` on every state update. It:

1. Applies CSS custom properties to `#checkout-preview-root` via `resolveTheme()`
2. Maps `GatewayConfig[]` → `CheckoutGatewayPresentation[]` (the SDK type)
3. Sorts gateways so the default appears first
4. Builds a `CheckoutFormDefinition` from the mock `CheckoutClient`
5. Renders either a desktop two-column layout or a phone frame with a mobile scroll container

The mobile phone frame lives entirely in `PreviewPane` — it is not part of the SDK components. The `<OrderSummary mobileDrawer>` prop is a real SDK feature; the phone frame chrome is preview-only.

---

## Tabs

### Data tab (`tab-data.ts`)

Toggles for form sections, field visibility controls, and redirect URL inputs. Field visibility here only affects the preview — real field configuration comes from WooCommerce store settings.

### Appearance tab (`tab-appearance.ts`)

- **Preset cards** — switch between Modern, Tailwind, shadcn
- **Colour pickers** — map to `CheckoutThemeVariables` (colorPrimary, colorBackground, etc.)
- **Sliders** — border radius, input height, field gap, section gap
- **Font family** dropdown
- **Custom CSS** textarea — injected after theme variables, full override power
- **Advanced** collapsible — raw CSS class name overrides for power users

When a colour picker changes, `syncVariableControls()` merges preset base variables with any overrides already in state, then calls `store.update({ theme })`.

### Payments tab (`tab-payments.ts`)

Each gateway row is rebuilt from scratch on state changes — except when only `label` or `description` changes, in which case the rebuild is skipped to preserve input focus. `defaultGateway` changes always trigger a full rebuild so the Default badge updates immediately.

---

## Code generation (`codegen.ts`)

`generateCode(state)` produces two blocks:

1. **Setup** — `createCheckout({...})` with theme, gateway adapters, and options. Only emits properties that differ from SDK defaults (e.g. `shippingSameAsBilling` only emits when `true`, `defaultGateway` only emits when it isn't the first enabled regular gateway).
2. **JSX** — a `<CheckoutForm>` component using `@cocartheadless/checkout/react` components.

Gateway label/description overrides are injected into the factory call when changed from catalog defaults:
```ts
// default:
createStripeGateway({ stripe, elements })

// with override:
createStripeGateway({ label: 'Pay by card', stripe, elements })
```

`generateLLMPrompt(state)` prepends a configuration summary comment block — useful for pasting into an AI assistant for further customization.

---

## Adding a new gateway

1. Add an entry to `GATEWAY_CATALOG` in `state.ts`
2. Add its factory function name to `GATEWAY_IMPORT_MAP` in `codegen.ts`
3. Add its snippet to `GATEWAY_SNIPPET` in `codegen.ts`

---

## Adding a new theme preset

1. Add the preset variables to `theme-engine.ts` in `packages/checkout/src/`
2. Add a factory function to `packages/checkout/src/presets.ts`
3. Add a preset card in `tab-appearance.ts`
4. Add the `themePreset` value to the union type in `state.ts`
5. Update `syncVariableControls()` in `tab-appearance.ts` to handle the new preset

---

## Tech stack

| | |
|---|---|
| Build | Vite 6 |
| Styles | Tailwind CSS v4 |
| Preview rendering | React 19 |
| Builder UI | Vanilla TypeScript DOM |
| Type checking | `tsc --noEmit` (strict) |
| SDK resolution | Vite aliases pointing to monorepo source |
