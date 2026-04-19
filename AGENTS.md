# CoCart Headless SDK

TypeScript SDK for the CoCart REST API. npm workspace monorepo with two packages:

- **Root** (`@cocartheadless/sdk` v1.1.2) — core SDK, adapters for Astro/Next.js/Nuxt/Remix/Svelte/Hono/Fastify/Elysia/Vite/Deno

## Commands

```bash
npm run build          # build core SDK (tsup, 3 configs)
npm run test           # vitest run (core)
npm run typecheck      # tsc --noEmit
```

## Stack

- TypeScript + tsup + vitest
- Node >=20, ESM + CJS dual output
- `dist/` is gitignored build output — don't read it
