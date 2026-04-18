# CoCart Headless SDK

TypeScript SDK for the CoCart REST API. npm workspace monorepo with two packages:

- **Root** (`@cocartheadless/sdk` v1.1.2) — core SDK, adapters for Astro/Next.js/Nuxt/Remix/Svelte/Hono/Fastify/Elysia/Vite/Deno
- **`packages/checkout`** (`@cocartheadless/checkout` v0.1.0) — Checkout SDK using CoCart API, payment gateway helpers (Stripe, PayPal, Authorize.net)

## Commands

```bash
npm run build          # build core SDK (tsup, 3 configs)
npm run build:all      # build core + checkout
npm run test           # vitest run (core)
npm run test:all       # core + checkout tests
npm run typecheck      # tsc --noEmit
```

## Stack

- TypeScript + tsup + vitest
- Node >=20, ESM + CJS dual output
- `dist/` is gitignored build output — don't read it
