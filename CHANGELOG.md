# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **`Products.find()` couldn't look up a product by SKU, even though the store has always supported it.** You could already look up a product by its numeric ID or by its SKU, but the SDK's TypeScript types only allowed a number, so `find('PCT-2024')` wouldn't even compile. Fixed — `find()` now accepts a SKU as well as a numeric ID.
- **Adding an item to the cart by SKU used to be rejected before the request was even sent.** The store has always accepted a SKU (like `'BLUE-SHIRT-L'`) as well as a numeric product ID when adding an item to the cart, but the SDK's own input checks were stricter than that and blocked anything that wasn't a plain number — so a valid SKU never got the chance to reach the server. This is now fixed for `addItem()`, `addVariation()`, and the main product in `addItems()`. Note: the individual products *inside* an `addItems()` group still need to be numeric IDs, not SKUs.

## [1.2.0] - 2026-07-23

### Added

- Extension system — install third-party SDK modules onto the CoCart client via `.use()` or the `extensions` constructor option
- `CoCartExtension<Name, Instance>` interface for authoring extensions
- `CoCartExtensionRegistry` interface for module augmentation and typed `client.extension('name')` lookup
- `client.on()` / `client.off()` event hooks — subscribe to `request`, `response`, `error`, `retry`, and `auth:refresh` lifecycle events
- `extensions` option in `CoCartOptions` — install extensions at construction time
- `@cocartheadless/analytics-datafast` — Datafast analytics extension with auto-tracking of cart and checkout events, GDPR cookieless mode support, and manual `track()` / `identify()` / `trackPageview()` API
- `@cocartheadless/analytics-gtm` — Google Tag Manager extension that pushes GA4 ecommerce events (`add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase`) to `window.dataLayer` automatically
- Extension authoring guide at `docs/extensions.md`
- `client.batch(requests)` — dispatches multiple sub-requests in a single call via the `cocart/batch` endpoint (requires CoCart Plus), returning one merged, up-to-date cart response with per-operation notices instead of one response per request.
- `Cart.batchUpdateItems()` / `Cart.batchRemoveItems()` — typed convenience wrappers over `client.batch()` for updating/removing multiple cart items in a true single round trip, as an alternative to the sequential `updateItems()`/`removeItems()` (see `Behavior Changes` below for why those remain sequential).

### Fixed

- **Fixed a bug in the SDK that silently broke every cart mutation in the browser once a cart key existed — not a plugin or server-side issue.** Once you'd started shopping, the SDK attached *both* `Cart-Key` and `CoCart-API-Cart-Key` headers to every request, to work with either CoCart Starter or the community plugin without needing to know which one a store runs. Browsers require a server's CORS config to explicitly allow every "unusual" header like these via a preflight check *before* the real request is sent, and each plugin's CORS setup only allowlists its own header name — Starter allows `Cart-Key`, the community plugin allows `CoCart-API-Cart-Key` (`CoCart_Authentication::add_cors_headers()`) — never both. So on a real install of either plugin, sending both names guaranteed the preflight would reject the one name that store didn't recognize, and the browser blocked the real request — `add-item`, `update`, `remove`, etc. — before it ever reached the server. It looked intermittent because the very first request (loading an empty cart, before any cart key exists) doesn't set either header and works fine; only requests after that were affected. **Fix:** the SDK now sends only the one header name matching the configured `mainPlugin` option (`'basic'`/default → `Cart-Key`, `'legacy'` → `CoCart-API-Cart-Key`), which real installs of either plugin do allowlist. The cart key is also still sent via the `cart_key` query parameter on every request (unaffected by CORS preflight either way), so this was never a total loss of functionality — just broken for header-dependent server setups.
- ETag cache now stores the response body alongside each ETag, so a `304 Not Modified` returns the previously-cached data instead of an empty object — the cache was on by default but silently discarded data on every cache hit.
- Retry backoff delay is now computed once per retry and reused for both the emitted `retry` event and the actual sleep, instead of being recalculated independently (a latent inconsistency that would have surfaced once jitter was added).
- `attachCartKeyHeader()` is now idempotent across every framework adapter (Astro, Deno, Elysia.js, Hono, Next.js, Nuxt, Remix, SvelteKit, TanStack Start, Vite) — calling it more than once (remount, HMR, multiple providers) no longer stacks another `fetch` wrapper on top of the previous one.
- **`Cart.updateCustomer()` never worked — it's fixed now.** It posted `billing_`/`shipping_`-prefixed fields to `POST /cart/update` without the required `namespace` field, which the endpoint needs to route to the `update-customer` callback; every call failed with `cocart_update_cart_no_namespace_error`, unconditionally. Verified against the actual `update-customer.php` callback and a live request/response: it now sends `namespace: "update-customer"`, unprefixed billing fields (`first_name`, `address_1`, ...), and `s_`-prefixed shipping fields (`s_first_name`, `s_address_1`, ...) mirrored from billing when a separate `shipping` argument isn't given (setting `ship_to_different_address` only when it is) — the server requires the `s_` fields even when shipping matches billing.
- **`Cart.setShippingMethod()` sent the wrong body field.** It posted `{ method_key }`, but the actual CoCart Plus controller requires `{ rate_id, package_id? }`; every call failed with `cocart_missing_rate_id`. Fixed, and added the previously-missing `packageId` parameter.
- **`Cart.calculateShipping()` posted to a route that doesn't exist** (`POST /cart/calculate/shipping`) and always 404'd. There is no address-taking shipping-calculation endpoint in the CoCart REST API — shipping is calculated as a side effect of `updateCustomer()` setting the destination address. The method is now `@deprecated` and delegates to the already-correct `calculate()` (`POST /cart/calculate`), ignoring the address argument it can no longer usefully accept.
- **`Cart.updateItems()` and `Cart.removeItems()` never worked — same root cause as `updateCustomer()`.** Both posted to `POST /cart/update` with an `items` array, but that endpoint is *exclusively* a namespace-dispatch mechanism (the same one `updateCustomer()` uses via `namespace: "update-customer"`) — its permission check unconditionally requires a `namespace` field naming a registered extension callback, and rejects everything else with `cocart_update_cart_no_namespace_error`. There is no built-in namespace for bulk quantity updates via that route (`POST /cart/add-items` is real and unaffected — it's a distinct, dedicated route, not `cart/update`). So every `updateItems()`/`removeItems()` call failed unconditionally, regardless of input. **Fix:** both now issue one `updateItem()`/`removeItem()` request per entry, sequentially (so each one sees the previous one's result), and return the response from the last request, which reflects the fully-updated cart. There is a real single-request bulk mechanism elsewhere in the CoCart REST API — the `cocart/batch` endpoint (CoCart Plus) — which `updateItems()`/`removeItems()` intentionally don't use; see `Cart.batchUpdateItems()` / `Cart.batchRemoveItems()` above for a true single-round-trip alternative, and `Behavior Changes` below for why the two are kept separate.
- **`CartItem.quantity` was typed with the wrong field names.** It claimed `{ value, min_purchase, max_purchase }`; the real response (verified against `CoCart_Utilities_Quantity_Limits::get_cart_item_quantity_limits()` and a live cart) is `{ value, minimum, maximum, multiple_of, editable }` — `min_purchase`/`max_purchase` don't exist on the wire at all, and `multiple_of`/`editable` were missing entirely, so nothing reading real per-item quantity limits (to clamp increment/decrement buttons, for example) could ever have been fully type-checked correctly. Corrected to match.
- **`Cart.updateItem()` rejected a quantity of `0` client-side with "Quantity must be a positive number", even though `0` is a legitimate value on this endpoint** — the actual controller treats it as "remove this item" (confirmed in `class-cocart-update-item-controller.php`: `if ( 0 === (int) $requested['quantity'] ) { ...remove_item... }`), not an error. `validateQuantity()`'s positive-only check is correct for `addItem()`, but `updateItem()` is now exempt from it specifically for `0` (still rejects negative values) so decrementing a quantity down to zero works instead of throwing before the request is even sent.
- **`Cart.addItems()` never worked — it sent a request shape the server has never read.** It posted `{ items: [{ id, quantity }, ...] }`, but `class-cocart-add-items-controller.php`'s `add_items_to_cart()` / `add_to_cart_handler_grouped()` reads a single `id` (the parent WooCommerce Grouped Product) plus `quantity` as a map of that group's *child* product IDs to quantities — there's no `items` field anywhere in the controller. This endpoint was never a generic "add several unrelated products in one request" call to begin with; it only ever handled adding multiple children of one grouped product. **Fix:** the signature is now `addItems(groupedProductId, items)`, sending `{ id: String(groupedProductId), quantity: { [childId]: String(qty), ... } }`, matching the real contract. This is a breaking signature change for anyone currently calling `addItems()` — see `Behavior Changes` below.

### Behavior Changes

- `Cart.updateItems()` / `Cart.removeItems()` remain sequential (one request per entry), not a single bulk round trip — see the `Fixed` entry above for why no such route exists for `cart/update`. For a true single-request bulk operation, use the new `Cart.batchUpdateItems()` / `Cart.batchRemoveItems()` (CoCart Plus, via `client.batch()`) instead.
- `Cart.calculateShipping()` is `@deprecated`. It now silently ignores its `address` argument and delegates to `calculate()` — see the `Fixed` entry above. Use `updateCustomer()` to set the destination address, then `calculate()`, instead.
- `client.login()` / `jwt().login()` throws `AuthenticationError` with `errorCode: 'cocart_jwt_missing'` when the store doesn't have the CoCart JWT Authentication plugin installed — even with fully correct credentials. This is distinct from a genuine wrong-password 401; check `error.errorCode === 'cocart_jwt_missing'` to tell them apart. See [Authentication](docs/authentication.md#jwt-authentication).
- **Breaking:** `Cart.addItems()` signature changed from `addItems(items)` to `addItems(groupedProductId, items)` — see the `Fixed` entry above. It was never functional under the old signature, so this isn't a behavior regression for any working caller, but the signature itself is a breaking change for anyone who had (necessarily broken) calls to update.

### Changed

- Concurrent identical GET requests are now de-duplicated — callers issuing the same GET while one is already in flight share the pending request instead of firing a duplicate network call.
- Retry backoff now applies ±20% jitter to the exponential delay to avoid synchronized retry storms across many clients hitting a rate limit at once (server-directed `Retry-After` delays are unaffected)
- Hoisted the duplicate `stringifyParams` helper out of `Products` and `Cart` into a shared `Endpoint` method.
- Hoisted the identical `attachCartKeyHeader()` implementation that was duplicated across all 10 framework adapters into a single shared module (`src/adapters/shared/attach-cart-key-header.ts`); each adapter now re-exports it under one consolidated doc comment, replacing the framework-specific comments that were previously duplicated per adapter.
- **Added `Response.getTaxes()` / `Response.hasTaxes()` accessors that normalize `taxes` to a flat `CartTax[]`** (`[{ key, name, price }, ...]`), mirroring the existing `getFees()`/`getCoupons()` pattern — one entry per tax rate when the store's tax display setting is itemized (`key` is WC's composite rate code, e.g. `US-US-1`), or a single synthetic entry keyed `"total"` when it isn't. Only CoCart Starter 5.0+ returns this shape natively on the wire; the community CoCart plugin (and older Starter versions) still return `taxes` as an object keyed by the tax rate code, e.g. `{ "US-US-1": { name, price } }`. `getTaxes()` detects which shape it received and normalizes both, so callers never need to branch on plugin/version themselves. The raw `CartResponse.taxes` field is typed as `CartTaxesResponse` (the union of both wire shapes) to reflect this — callers reading the raw field directly still need to handle both, but `getTaxes()` is the recommended access path.

## [1.1.2] - 2026-03-14

### Fixed

- Fallback support for older CoCart plugin versions to fetch cart key via response header

## [1.1.1] - 2026-02-20

### Fixed

- Resolved picomatch CVE-2026-33671 and CVE-2026-33672 vulnerabilities

## [1.1.0] - 2026-01-10

### Added

- Initial public release of `@cocartheadless/sdk`

[Unreleased]: https://github.com/cocart-headless/cocart-js/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/cocart-headless/cocart-js/compare/1.1.2...v1.2.0
[1.1.2]: https://github.com/cocart-headless/cocart-js/compare/1.1.1...1.1.2
[1.1.1]: https://github.com/cocart-headless/cocart-js/compare/1.1.0...1.1.1
[1.1.0]: https://github.com/cocart-headless/cocart-js/releases/tag/1.1.0
