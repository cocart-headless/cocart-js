# CoCart TypeScript SDK — Comparison Report

## Context

This document compares two TypeScript SDKs for the CoCart REST API:

- **Current SDK** — `@cocart/sdk` v1.0.0 (production-ready)
- **Previous SDK** — `cocart-headless/cocart-sdk-js` v0.1.0 (beta/WIP)

The goal is to identify feature parity, gaps, and DX differences between the two.

---

## At a Glance

| Aspect | Previous SDK (v0.1.0) | Current SDK (v1.0.0) |
|--------|----------------------|---------------------|
| **Status** | Beta / WIP | Production-ready |
| **Runtime deps** | 0 | 0 |
| **Dev deps** | 7+ (Jest, ESLint, Prettier, ts-jest, tsup, TS) | 3 (Vitest, tsup, TS) |
| **Build output** | ESM + CJS + .d.ts | ESM + CJS + .d.ts |
| **Node requirement** | >=18 | >=18 |
| **TS strict mode** | Yes | Yes |
| **Test framework** | Jest 29 | Vitest 3 |
| **Test coverage threshold** | 5% (effectively none) | Not configured (88 tests passing) |

---

## 1. Core Architecture

| Feature | Previous SDK | Current SDK |
|---------|-------------|-------------|
| Main client class | `CoCart` (~250 lines) | `CoCart` (~658 lines) |
| Endpoint pattern | 2 different base classes (`base-endpoint.ts` + `base.ts`) | 1 unified abstract `Endpoint` base |
| Endpoint access | Direct properties (`cocart.cart`, `cocart.customer`) | Lazy-loaded methods (`client.cart()`, `client.products()`) |
| HTTP client | Separate `DefaultHttpClient` class, injectable | Built into `CoCart` class, uses native `fetch` directly |
| Custom HTTP client | Yes — `httpClient` option in config | No — uses native `fetch` only |
| URL building | `createUrl()` on HTTP client | `buildUrl()` on CoCart class |
| API versioning | Configurable `apiVersion` (default `v2`) | Hardcoded `v2` constant |
| White-labeling | `apiPrefix` + `apiNamespace` | `restPrefix` + `namespace` |

**Key differences:**
- The previous SDK has an injectable HTTP client interface, allowing custom fetch implementations. The current SDK uses native `fetch` directly — simpler but less flexible.
- The previous SDK has two different base endpoint classes with different APIs, creating inconsistency. The current SDK has one unified pattern.
- The current SDK lazy-loads endpoints (instantiated on first call), while the previous SDK instantiates all endpoints in the constructor.

---

## 2. Endpoints & API Coverage

| Endpoint | Previous SDK | Current SDK |
|----------|-------------|-------------|
| **Cart — get** | `cart.getCart()` | `cart.get()` |
| **Cart — add item** | `cart.addItem(id, opts)` | `cart.addItem(id, qty, opts)` |
| **Cart — add multiple items** | Not supported | `cart.addItems([...])` |
| **Cart — update item** | `cart.updateItem(key, data)` | `cart.updateItem(key, qty, opts)` |
| **Cart — update multiple** | Not supported | `cart.updateItems({...})` |
| **Cart — remove item** | `cart.removeItem(key)` | `cart.removeItem(key)` |
| **Cart — remove multiple** | Not supported | `cart.removeItems([keys])` |
| **Cart — restore item** | Not supported | `cart.restoreItem(key)` |
| **Cart — get removed items** | Not supported | `cart.getRemovedItems()` |
| **Cart — clear** | `cart.clear()` | `cart.clear()` / `cart.empty()` |
| **Cart — calculate** | `cart.calculate()` | `cart.calculate()` |
| **Cart — totals** | `cart.getFiltered(['totals'])` | `cart.getTotals(html?)` |
| **Cart — item count** | `cart.count()` | `cart.getItemCount()` |
| **Cart — coupons** | `cart.getCoupons()` / `applyCoupon()` / `removeCoupon()` | `cart.getCoupons()` / `applyCoupon()` / `removeCoupon()` / `checkCoupons()` |
| **Cart — customer** | `cart.updateCustomer(data)` | `cart.updateCustomer(billing, shipping)` / `cart.getCustomer()` |
| **Cart — shipping** | Not supported | `cart.getShippingMethods()` / `setShippingMethod()` / `calculateShipping()` |
| **Cart — fees** | Not supported | `cart.getFees()` / `addFee()` / `removeFees()` |
| **Cart — cross-sells** | Not supported | `cart.getCrossSells()` |
| **Cart — field filtering** | `cart.getFiltered<K>(fields)` (type-safe Pick) | `cart.get({ _fields: '...' })` |
| **Cart — shorthand aliases** | None | `cart.add()`, `cart.addVariation()`, `cart.empty()` |
| **Products — list** | `products.getAll(params)` | `products.all(params)` |
| **Products — single** | `products.get(id)` | `products.find(id)` |
| **Products — search** | Via params | `products.search(term)` |
| **Products — by category** | Via params | `products.byCategory(slug)` |
| **Products — by tag** | Via params | `products.byTag(slug)` |
| **Products — by brand** | Not supported | `products.byBrand(slug)` |
| **Products — featured** | Via params | `products.featured()` |
| **Products — on sale** | Via params | `products.onSale()` |
| **Products — price range** | Via params | `products.byPriceRange(min, max)` |
| **Products — sort** | Via params | `products.sortBy(field, order)` |
| **Products — stock status** | Via params | `products.byStockStatus(status)` |
| **Products — variations** | Not supported | `products.variations(id)` / `products.variation(id, varId)` |
| **Products — categories** | Not supported | `products.categories()` / `products.category(id)` |
| **Products — tags** | Not supported | `products.tags()` / `products.tag(id)` |
| **Products — attributes** | Not supported | `products.attributes()` / `products.attributeTerms(id)` |
| **Products — brands** | Not supported | `products.brands()` / `products.brand(id)` |
| **Products — reviews** | Not supported | `products.reviews()` / `products.productReviews(id)` |
| **Store info** | `store.getInfo()` | `store.info()` |
| **Customer — login** | `customer.login(creds)` | `client.login(user, pass)` |
| **Customer — JWT validate** | `customer.validateToken()` | `client.jwt().validate()` |
| **Customer — JWT refresh** | `customer.refreshToken(token)` | `client.jwt().refresh(token)` |
| **Items (separate endpoint)** | `items.add()` / `items.update()` / `items.remove()` | Not needed — covered by Cart endpoint |
| **Admin sessions** | Not supported | `sessions.all()` / `find()` / `destroy()` / `getItems()` / `byCustomer()` |

**Summary:** The current SDK has significantly broader API coverage — batch operations, shipping, fees, cross-sells, product sub-resources (variations, categories, tags, attributes, brands, reviews), admin sessions, and item restoration. The previous SDK has overlapping `CartEndpoint` + `ItemsEndpoint` with different APIs for the same operations.

---

## 3. Type System

| Feature | Previous SDK | Current SDK |
|---------|-------------|-------------|
| Typed response interfaces | Yes — `Cart`, `CartItem`, `Product` (60+ fields), `CartTotals`, `ErrorResponse` | Yes — `CartResponse`, `CartItem`, `Product`, `CartTotals`, `CurrencyInfo`, + 25 more |
| Typed parameters | Partial — `PaginationParams`, but most methods use `Record<string, any>` | Yes — `ProductListParams`, `CartGetParams` with string literal unions |
| String literal unions | No | Yes — `ProductOrderBy`, `SortOrder`, `StockStatus` |
| Generic Response | `request<T>()` returns `Promise<T>` directly | `Response<T>` wrapper class with helpers |
| Type-safe field filtering | Yes — `getFiltered<K extends keyof Cart>(fields: K[])` returns `Pick<Cart, K>` | No — field filtering via `_fields` string param |
| Extensible types | `Extensible<T>` utility, `[key: string]: any` on types | `[key: string]: unknown` on types |
| Event types | `EventMap` utility type, typed event names | `CoCartEventMap` with typed payloads per event |
| Utility types | `Extensible<T>`, `Extend<T,E>`, `FilteredType<T,K>`, `ResponseTransformer<T,R>` | `CoCartEventListener<K>` |

**Key differences:**
- The previous SDK's `getFiltered()` with generic `Pick<Cart, K>` is a clever DX touch — you get back a type with only the fields you asked for. The current SDK doesn't have this.
- The current SDK has much stronger parameter typing with string literal unions — IDE autocomplete tells you valid `orderby` values, stock statuses, etc.
- Both have extensible types with index signatures. The current SDK uses `unknown` (safer) vs. `any` in the previous SDK.

---

## 4. Authentication

| Feature | Previous SDK | Current SDK |
|---------|-------------|-------------|
| Guest sessions (cart key) | Yes — auto-extracted from headers | Yes — auto-extracted from headers |
| Basic Auth | Yes — `{ type: 'basic', username, password }` | Yes — `setAuth(user, pass)` |
| JWT Bearer | Yes — `{ type: 'jwt', token }` | Yes — `setJwtToken(token)` |
| Consumer Keys (WooCommerce) | No | Yes — `setWooCommerceCredentials(key, secret)` |
| Login method | `customer.login({ username, password })` | `client.login(user, pass)` |
| JWT auto-refresh on 401 | No — manual only | Yes — built into request pipeline |
| JWT periodic validation | Yes — `setInterval` every 5 min | No — on-demand only |
| Token expiry check | Yes — `isTokenExpired()` with 30s buffer | Yes — `jwt().isTokenExpired(leeway)` |
| Token payload decoding | Yes — `getTokenExpiration()` | Yes — `decodeTokenPayload()` |
| Token persistence | No — in-memory only | Yes — via storage adapters |
| `withAutoRefresh()` wrapper | No | Yes — retry callback on auth failure |
| Session transfer (guest to auth) | Yes — emits `cartTransferred` event | Yes — `transferCartToCustomer()` + `SessionManager` |
| Auth priority | Basic > JWT > None | JWT > Basic > Consumer Keys |
| Custom auth header name | Yes — `authHeaderName` option | No |

**Key differences:**
- The current SDK has automatic JWT refresh built into the request pipeline — if a request fails with 401 and a refresh token is available, it refreshes and retries transparently. The previous SDK requires manual refresh.
- The previous SDK has periodic token validation via `setInterval`, which proactively checks token validity. The current SDK checks on-demand.
- The current SDK supports WooCommerce consumer keys (admin API). The previous SDK does not.
- The current SDK persists tokens to storage adapters. The previous SDK is in-memory only.

---

## 5. Error Handling

| Feature | Previous SDK | Current SDK |
|---------|-------------|-------------|
| Base error class | `CoCartError` | `CoCartError` |
| Auth error | `AuthenticationError` (401/403) | `AuthenticationError` (401) |
| Validation error | `ValidationError` (with `errors` record) + `CartValidationError` | `ValidationError` (400) |
| Network error | `NetworkError` (wraps original) | `CoCartError` with `network_error` code |
| Timeout error | `TimeoutError` (extends `NetworkError`, has `timeoutMs`) | `CoCartError` with `request_timeout` code |
| API error | `APIError` (status, code, data) | `CoCartError` (httpCode, errorCode, responseData) |
| Error factory | `createErrorFromResponse()` | `handleErrorResponse()` |
| Error context in message | No — raw API message only | Yes — `"METHOD URL: message [code]"` |
| `toString()` on errors | Yes — custom formatting | No — uses native Error |
| Proper `instanceof` | Yes — `Object.setPrototypeOf` fix | Yes — standard class inheritance |
| `rest_no_route` handling | No | Yes — friendly "plugin required" message |
| Input validation | Yes — client-side before request | No — validation delegated to API |

**Key differences:**
- The previous SDK has a richer error hierarchy — dedicated `NetworkError`, `TimeoutError`, `CartValidationError` subclasses. The current SDK uses error codes on `CoCartError` to distinguish these.
- The previous SDK has client-side input validation (product ID, quantity, email, phone) that throws before making a request. The current SDK delegates all validation to the API server.
- The current SDK includes request context (method + URL + error code) in error messages, making debugging easier.

---

## 6. Features

| Feature | Previous SDK | Current SDK |
|---------|-------------|-------------|
| **Retry logic** | Not implemented | Yes — exponential backoff, Retry-After header, configurable `maxRetries` |
| **Timeout** | Yes — AbortController | Yes — AbortController |
| **Pagination** | Described in README but not implemented | Yes — `Paginator` class, `allPaginated()`, async iterator, `.toArray()` |
| **Event system** | Yes — `beforeRequest`, `afterRequest`, `requestError`, `cartKeyUpdated`, `cartTransferred`, `authChanged` | Yes — `request`, `response`, `error`, `retry`, `auth:refresh` |
| **Debug mode** | Not implemented (listed as future) | Yes — `setDebug(true)`, console logging |
| **In-memory cache** | Yes — `Cache` class with TTL, `cartCache` singleton | No |
| **Currency formatting** | Yes — `Intl.NumberFormat`, auto-processing, preserves originals | No |
| **Timezone conversion** | Yes — auto-detect, convert date strings, preserve originals | No |
| **Storage adapters** | None — in-memory only | 3 adapters: `MemoryStorage`, `LocalStorage`, `EncryptedStorage` (AES-256-GCM) |
| **Framework adapters** | 3 stubs (astro, next, remix) — just re-export the SDK | 2 real adapters (Astro, Next.js) — browser/server clients, fetch wrapper, cart key header injection |
| **Fluent/chainable API** | Partial — `on()`/`off()` return `this` | Yes — all config methods return `this`, static `create()` factory |
| **Dot-notation response access** | No | Yes — `response.get('totals.subtotal')` |
| **Response helpers** | No — raw data returned | Yes — `getItems()`, `getTotals()`, `getItemCount()`, `hasItems()`, `getCoupons()`, etc. |
| **Cart key persistence** | In-memory only | Yes — persisted to storage adapter |
| **JWT persistence** | In-memory only | Yes — via `JwtManager` + storage adapter |
| **Encrypted storage** | No | Yes — AES-256-GCM, PBKDF2 key derivation, Web Crypto API |
| **Session manager** | No | Yes — `SessionManager` class for cart/auth lifecycle |
| **Custom HTTP client** | Yes — injectable `httpClient` | No |
| **Response transformer** | Yes — `responseTransformer` callback | No |
| **Input validation** | Yes — client-side before request | No — server-side only |
| **`rest_no_route` friendly errors** | No | Yes — friendly "plugin required" message |
| **Batch operations** | No | Yes — `addItems()`, `updateItems()`, `removeItems()` |
| **Custom auth header name** | Yes — `authHeaderName` option | No |

---

## 7. Documentation

| Aspect | Previous SDK | Current SDK |
|--------|-------------|-------------|
| README | Comprehensive but includes aspirational features (interceptors, pagination) not yet implemented | Accurate — all documented features are implemented |
| Docs folder | 15+ files — architecture, quick-start, error handling, cart key, auth, currency, timezone, FAQ, future features, extending SDK | 8 files — installation, auth, cart, products, sessions, errors, Astro guide, Next.js guide |
| Examples | 3 example files (`basic-usage.ts`, `customer-auth.ts`, `extended-types.ts`) | Inline code examples in docs |
| JSDoc | Partial — present on errors, base endpoints, utilities; minimal on some endpoints | Comprehensive — all public methods documented |
| Architecture docs | Yes — ASCII diagram + component flow | No — code is self-documenting |
| Future roadmap | Yes — `future-features.md` | No |
| Contributing guide | Yes — `CONTRIBUTING.md` | No |
| Security policy | Yes — `SECURITY.md` | No |
| FAQ | Yes — `faq.md` | No |

**Key differences:**
- The previous SDK has more docs by volume (15+ files vs 8), but some document features that aren't actually implemented (interceptors, async pagination).
- The current SDK's documentation is accurate — every feature documented actually works.
- The previous SDK has better project governance docs (contributing, security, FAQ).

---

## 8. Testing

| Aspect | Previous SDK | Current SDK |
|--------|-------------|-------------|
| Framework | Jest 29 + ts-jest | Vitest 3 |
| Coverage threshold | 5% (effectively none) | Not configured |
| Test count | ~70 tests across 7 files | 88 tests across 5 files |
| Unit tests | Auth utilities (13), currency (35+), timezone (10+) | Response (36), errors (8), storage (5), paginator (5) |
| Integration tests | Cart mock (6), HTTP client (4, has bugs) | CoCart client (34) — mocked fetch |
| Docker tests | Yes — WordPress integration tests (skipped by default) | No |
| Test quality issues | Duplicate test files, bug in HTTP client test (`cocart.request` vs `client.request`) | Clean — all tests pass |
| Mock strategy | Custom mock HTTP client class | `vi.fn()` mocking of global `fetch` |
| What's NOT tested | CoCart class, CustomerEndpoint, events, ProductsEndpoint, StoreEndpoint | EncryptedStorage, JwtManager, SessionManager, framework adapters |

---

## 9. DX Ergonomics

| Pattern | Previous SDK | Current SDK |
|---------|-------------|-------------|
| **Lines to add item** | `await cocart.cart.addItem(123, { quantity: 2 })` (1 line) | `await client.cart().addItem(123, 2)` (1 line) |
| **Lines to get cart** | `const cart = await cocart.cart.getCart()` | `const cart = await client.cart().get()` |
| **Lines to initialize** | `const cocart = new CoCart({ siteUrl: '...' })` | `const client = new CoCart('https://...')` |
| **Config complexity** | Object with `siteUrl` key | URL string + optional object |
| **Access nested data** | `cart.totals.total` (direct typed access) | `response.get('totals.total')` or `response.getTotals().total` |
| **Field filtering** | `cart.getFiltered(['items', 'totals'])` with `Pick<Cart, K>` | `cart.get({ _fields: 'items,totals' })` (untyped) |
| **Error catching** | 5 specific error classes | 3 error classes + error codes |
| **Chain config** | Limited — only events | Full — all setters return `this` |
| **Shorthand methods** | None | `cart.add()`, `cart.addVariation()`, `cart.empty()` |
| **Currency formatting** | Built-in — `$45.99` from `4599` | Not available |
| **Response wrapper** | None — raw data | `Response` class with 25+ helpers |

---

## 10. Unique Strengths

### Previous SDK has, Current SDK doesn't:

1. **Currency formatting** — auto-converts smallest-unit integers to formatted strings with `Intl.NumberFormat`
2. **Timezone conversion** — auto-detects browser timezone and converts API date strings
3. **In-memory cart cache** — TTL-based caching with hash invalidation
4. **Type-safe field filtering** — `getFiltered<K>()` returns `Pick<Cart, K>`
5. **Injectable HTTP client** — swap out the fetch implementation
6. **Response transformer** — custom callback to transform all responses
7. **Client-side validation** — validates product IDs, quantities, email, phone before API calls
8. **Docker integration tests** — real WordPress test environment
9. **Remix adapter** (stub only, but package exists)
10. **Periodic JWT validation** — `setInterval` auto-checks token validity
11. **Custom auth header name** — configurable `authHeaderName` option

### Current SDK has, Previous SDK doesn't:

1. **Retry logic** — exponential backoff, Retry-After, configurable retries
2. **Pagination iterator** — async `for await` with `Paginator` class
3. **Debug mode** — `setDebug(true)` for console logging
4. **Storage adapters** — Memory, LocalStorage, EncryptedStorage (AES-256-GCM)
5. **Real framework adapters** — Astro + Next.js with browser/server separation, fetch wrapping
6. **JWT auto-refresh** — transparent retry on 401 with token refresh
7. **JWT/cart key persistence** — stored encrypted in browser
8. **Dot-notation response access** — `response.get('items.0.name')`
9. **Response helper methods** — 25+ typed helpers (getItems, getTotals, etc.)
10. **Fluent API** — all config methods chainable
11. **Batch operations** — addItems, updateItems, removeItems
12. **Admin sessions API** — full session management for administrators
13. **Product sub-resources** — variations, categories, tags, attributes, brands, reviews
14. **Shipping/fees/cross-sells** — cart sub-resource APIs
15. **Item restoration** — restore removed items
16. **Event system with typed payloads** — request timing, retry details
17. **Session manager** — guest-to-auth lifecycle management
18. **Consumer key auth** — WooCommerce admin API credentials
19. **`rest_no_route` handling** — friendly "plugin required" messages
20. **Shorthand aliases** — `add()`, `addVariation()`, `empty()`

---

## 11. Issues Found in Previous SDK

1. **Two base endpoint classes** — `base-endpoint.ts` and `base.ts` with different APIs, creating inconsistency
2. **Overlapping endpoints** — `CartEndpoint` and `ItemsEndpoint` both handle item operations differently
3. **README documents unimplemented features** — Axios-style `interceptors.request.use()` / `interceptors.response.use()`, async pagination iterators with `hasNextPage()`
4. **HTTP client test bug** — `client.test.ts` references `cocart.request()` which doesn't exist
5. **Framework adapters are empty stubs** — all three just `export { CoCart } from '@cocart/sdk'`
6. **Duplicate test files** — currency tests exist in two locations
7. **Duplicate error class** — `ValidationError` defined in both `src/errors.ts` and `src/http/errors.ts`
8. **Import error** — `validation.ts` imports `CartValidationError` from `../errors` which doesn't export it
9. **`CustomerEndpoint` calls `httpClient.post()`** — but `HttpClient` interface only defines `request()`
10. **Coverage threshold at 5%** — no meaningful quality gate

---

## Verdict

The **current SDK (v1.0.0)** is substantially more complete, reliable, and production-ready:

- **3x broader API coverage** (batch ops, shipping, fees, variations, categories, reviews, admin sessions)
- **Real framework adapters** vs. empty stubs
- **Persistent encrypted storage** vs. in-memory only
- **Automatic JWT refresh + retry logic** vs. manual-only
- **All documented features actually work** vs. aspirational docs
- **Clean architecture** (1 base class) vs. inconsistent dual-base pattern
- **88 passing tests** vs. tests with bugs and 5% coverage threshold

The previous SDK's **unique strengths worth considering** for the current SDK are:

1. Currency formatting (auto `Intl.NumberFormat`)
2. Timezone conversion
3. Type-safe field filtering (`getFiltered<K>()` with `Pick<Cart, K>`)
4. Client-side input validation
5. Injectable HTTP client for testing flexibility
6. Custom auth header name
