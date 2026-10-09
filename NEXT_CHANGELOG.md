# Next Changelog for CoCart SDK <!-- omit in toc -->

> [!WARNING]
> This changelog is **NOT** final. It lists the changes waiting for the next release of `@cocartheadless/sdk` and `@cocartheadless/checkout`, to be moved into `CHANGELOG.md` under the new version when it's released.

## Changed

- **Response types now match what CoCart actually returns.** The types for carts, products, variations, categories, the store and sessions (`CartResponse`, `CartItem`, `Product`, `ProductVariation`, `StoreInfo`, `SessionItem`…) were written by hand and didn't match the API. For example, they had unprefixed customer address fields, `shipping` as an array, image `src` as a string, and product attributes as an array. They're now generated from the CoCart OpenAPI spec, which is checked against live responses (`npm run generate:types`). The export names are the same, but the shapes have changed, so code that relied on the old (wrong) shapes may now show type errors. The types also reflect how CoCart sends data: amounts are minor-unit strings, and empty maps (`notices`, `price_range`, `attributes`…) are `{}` since CoCart Starter 5 (CoCart 4.x sent `[]`, which the `Response` helpers still accept). New exports: `CoCartSchemas`, `CartBillingAddress`, `CartShippingAddress`, `CartShipping`, `CartTotalsBreakdown` (the `GET /cart/totals` breakdown), `CartTax`, `ProductAttributeDetail`, `ProductVariationSummary`, `ProductCategoryDetail`. `CartItemImage` and `CustomerAddress` are deprecated.
- **`Response.getNotices()` returns notices keyed by type** (`{ success: [...], error: [...] }`), which is how CoCart sends them, instead of a list. When there are none it returns `{}`.
- **A browser client remembers the cart on its own.** The client now reads the cart key from `localStorage` or cookies (`LocalStorage`, `CookieStorage`, `MemoryStorage`) when it's created. Before, a page reload started a new cart unless you called `restoreSession()`. You still need `await restoreSession()` with `EncryptedStorage`.
- **A guest cart that no longer exists is replaced automatically.** CoCart Starter 5 refuses a cart key with no cart session on every cart route (`cocart_invalid_cart`), for example after the cart expired. The client then forgets the stored key and retries the request once as a new guest, so the shopper isn't stuck.

## Added

- `CookieStorage` keeps the cart key in a cookie, so a server render can show the same cart as the browser. The framework adapters' `createServerClient()` reads that cookie when there's no `X-Cart-Key` header.
- `Response.getShipping()` returns the cart's whole `shipping` field: the package count, whether shipping has been calculated, and the packages.
- Methods for the CoCart Plus 2.0 routes the SDK didn't cover: `cart().getMini()`, `cart().removeCoupons()`, `cart().removeAllItems()` (keeps coupons and fees), `products().shippingRates()`, `products().createReview()`, and on `account()`: `updateAddress()`, `cancelOrder()`, `verifyEmail()`, `sendOrderEmailVerification()`, `verifyOrderEmail()`, the subscription methods (`getSubscriptions()`, `getSubscription()`, `suspendSubscription()`, `reactivateSubscription()`, `cancelSubscription()`, `setSubscriptionAutoRenew()`, `updateSubscriptionPaymentMethod()`, `resubscribe()`, `cancelResubscribe()`) and `requestOrderWithdrawal()`.
- `applyCoupon()` and `checkCoupons()` take an optional email for coupons restricted to certain emails; `addFee()` takes an optional tax class.
- `Response.getRateLimit()` reads the `RateLimit-*` headers.
- **Typed extension data.** `extensions` on the cart, cart items and products is typed for the plugins CoCart Plus supports (subscriptions, bundles, bookings, add-ons, warranty and more), `Response.getExtensions()` reads the cart's, and `CartExtensions`, `CartItemExtensions` and `ProductExtensions` can be augmented with any other plugin's data. See `docs/extension-data.md`.
- `CoCartError.getCart()` returns the cart sent with an error: `cocart_item_not_in_cart` carries the current cart since CoCart Starter 5.
- **Choices for CoCart Plus's supported plugins.** `addItem()` takes typed options (`AddItemOptions`), including a subscription plan (`convert_to_sub`), a gift recipient (`recipient_email`) and a warranty (`item_data.warranty`). `cart().changePlan(itemKey, value)` switches a cart item to another plan, or to one-time. A product's plan options no longer have `selected`, since nothing is chosen before the cart; a cart item's options (`CartItemSubscriptionSchemeOption`) still mark the current one.
- Checkout: `confirmReturn()` and `confirmOrderPayment()` finish a payment when the customer comes back from an off-site step, such as a Stripe 3D Secure page (CoCart Plus 2.0). `submit()` now returns `redirectUrl` for those steps instead of retrying.
- Checkout: a failed payment's `payment_result.error` is typed (`PaymentError`, `PaymentErrorCode`): a stable `code` such as `card_declined` or `incorrect_cvc` to branch on, plus the gateway's own code and message (CoCart Plus 2.0).

## Fixed

- **`Response.getShippingMethods()` and `checkout.getShippingMethods()` always returned an empty list on a real store.** CoCart sends shipping packages keyed by package ID under `shipping.packages`, and the SDK expected a plain array. Both now return the packages.
- **`applyCoupon()` was rejected by CoCart Plus** because it sent the code as `coupon` instead of `code`.
- **`addFee()` was rejected by CoCart Plus** because it sent the amount as a number; the route takes a string.
- **`Response.getFees()` returned the fees object instead of a list.** CoCart keys cart fees by fee ID; `getFees()` now returns them as a list.
- **`account().changePassword()`, `getOrderDownloads()`, `getGuestOrderDownloads()` and `getReviews()` called routes CoCart Plus doesn't have.** The password now goes to `POST /my-account` with the account details it requires (read from the profile unless you pass them), order downloads are read from the order's details, and reviews come from `products/reviews/mine`.
- **`removeCoupon()` broke for coupon codes with spaces, `%`, `#` or `?`.** The code went into the URL unencoded. It's now encoded.
- **`ProductOrderBy` allowed `'price'`, which CoCart rejects.** It now lists the sort orders CoCart accepts: sort by price with `price_asc` or `price_desc`. `menu_order`, `name`, `alphabetical`, `reverse_alpha`, `sales`, `review_count`, `by_stock`, `on_sale_first` and `featured_first` were missing, and `relevance` and `rand` work with CoCart Starter.
- **Error messages included the full request URL**, which can contain the cart key and API credentials. They now name only the route.
- **The default Stripe `tokenize` failed when the Payment Element hides its own billing fields.** It now calls `elements.submit()` first and sends the checkout's billing address to Stripe. This applies to `createStripeGateway()` and `createWooPaymentsGateway()`.
