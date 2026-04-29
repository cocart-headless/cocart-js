# CoCart TypeScript SDK

Official TypeScript/JavaScript SDK for the CoCart REST API.

- **Package:** `@cocartheadless/sdk`
- **Version:** 1.1.2
- **Distribution:** npm, JSR, jsDelivr CDN, unpkg CDN
- **License:** MIT
- **Zero runtime dependencies** — uses native `fetch`

---

## Commands

```bash
npm install            # install dependencies
npm run build          # compile SDK + adapters + CDN bundle (3 tsup configs)
npm test               # run all tests
npm run test:watch     # run tests in watch mode
npm run typecheck      # tsc --noEmit (type-check without emitting)
npm run dev            # watch mode build
```

Run a single test file:
```bash
npx vitest tests/cocart.test.ts
```

Run tests matching a name:
```bash
npx vitest -t "should add item to cart"
```

---

## Tech Stack

| | |
|---|---|
| Language | TypeScript 5.5 — strict mode |
| Runtime | Node.js 20+ / browser / Deno / edge runtimes |
| Build | tsup 8 (`tsup.config.ts`, `tsup.adapters.ts`, `tsup.cdn.ts`) |
| Tests | vitest 3 |
| Output | ESM + CJS + IIFE (ES2022 target) |
| Runtime deps | none |
| Dev deps | tsup, typescript, vitest |

---

## Project Structure

```
src/
  cocart.ts            # main client class and entry point
  response.ts          # Response wrapper with dot-notation access
  jwt-manager.ts       # JWT authentication manager
  session-manager.ts   # session lifecycle (guest → auth)
  endpoints/           # cart, products, sessions, store endpoints
  adapters/            # framework adapters (Next.js, Astro, Nuxt, Remix, Svelte, Deno, Elysia, Fastify, Hono, Vite)
  storage/             # MemoryStorage, LocalStorage, EncryptedStorage
  exceptions/          # CoCartError and subclasses
  index.ts             # public barrel export
tests/                 # *.test.ts test files
dist/                  # compiled output (gitignored)
```

---

## Code Style

- **File names:** `kebab-case.ts`
- **Classes / Types / Interfaces:** `PascalCase`
- **Functions, methods, variables:** `camelCase`
- **No ESLint or Prettier config** — tsc strict mode is the quality gate
- Compiler flags: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Named exports throughout; all public API re-exported from `src/index.ts`
- Framework adapters in `src/adapters/` each export a `createClient()` or equivalent

---

## Git

- **Commit style:** Imperative, capital first letter — `Added X`, `Fix X`, `Bumped version`
- **Version bumps:** prefix with `Bumped version`
- **Co-author footer:** `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

---

## Testing

| | |
|---|---|
| Framework | vitest 3 |
| Location | `tests/` |
| File pattern | `*.test.ts` |
| Mocking | `vi.fn()`, `vi.restoreAllMocks()` |
| Coverage | not configured |

Tests mock the global `fetch` via `vi.fn()`. No real HTTP calls are made in tests.
