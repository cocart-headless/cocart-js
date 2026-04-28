# @cocartheadless/analytics-gtm

Google Tag Manager extension for the CoCart Headless SDK. Pushes GA4 ecommerce events to `window.dataLayer` automatically.

- **Package**: `@cocartheadless/analytics-gtm` v1.0.0
- **Peer dependency**: `@cocartheadless/sdk` >=1.1.0

## Commands

```bash
npm run build       # tsup
npm run test        # vitest run tests
npm run typecheck   # tsc --noEmit
```

## Stack

- TypeScript + tsup + vitest
- ESM + CJS dual output
- `dist/` is gitignored build output — don't read it
