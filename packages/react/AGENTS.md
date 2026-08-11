# @cocartheadless/react

React bindings for the CoCart Headless SDK — `CoCartProvider` and `useAuth()` for reactive authentication state.

- **Package**: `@cocartheadless/react` v1.0.0
- **Peer dependencies**: `@cocartheadless/sdk` >=1.2.0, `react` >=18.0.0

## Commands

```bash
npm run build       # tsup
npm run test        # vitest run tests
npm run typecheck   # tsc --noEmit
```

## Stack

- TypeScript + tsup + vitest (jsdom environment, `@testing-library/react`)
- ESM + CJS dual output
- `dist/` is gitignored build output — don't read it

## Design

This package is a thin binding layer only. All token lifecycle logic
(acquisition, refresh, guest-cart merge) lives in `SessionManager`/
`JwtManager` in `@cocartheadless/sdk` — `useAuth()` just makes that state
observable to React via `useState`/`useContext`, so it doesn't duplicate
logic that already exists and is already tested in the core SDK.
