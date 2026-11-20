import type { StorageInterface } from './storage/storage.interface.js';
import type { components } from './generated/cocart-starter-v2.js';
import type { components as plusComponents } from './generated/cocart-plus-v2.js';
import type { components as plusCheckoutComponents } from './generated/cocart-plus-checkout-v2.js';
import type { CartExtensions, CartItemExtensions, ProductExtensions } from './extensions.types.js';

/**
 * Extension registry for module augmentation.
 *
 * Third-party SDKs can augment this interface to provide strongly typed
 * access to installed extensions via `client.extension('name')`.
 */
export interface CoCartExtensionRegistry {}

/**
 * Extension contract for composing additional SDK modules onto CoCart.
 */
export interface CoCartExtension<Name extends string = string, Instance = unknown> {
  /** Unique extension name. Also used as the runtime property name on the client. */
  name: Name;
  /** Install the extension and return the public instance to expose. */
  install: (client: import('./cocart.js').CoCart) => Instance;
}

/** The CoCart plugin the store runs: 'starter' (CoCart Starter) or 'legacy' (the CoCart Community plugin, 4.x). */
export type MainPlugin = 'starter' | 'legacy';

/**
 * Configuration options for the CoCart client.
 */
export interface CoCartOptions {
  /** Existing cart key for guest session */
  cartKey?: string;
  /** Username for Basic Auth */
  username?: string;
  /** Password for Basic Auth */
  password?: string;
  /** JWT token for authentication */
  jwtToken?: string;
  /** JWT refresh token */
  jwtRefreshToken?: string;
  /** WooCommerce consumer key (for admin operations) */
  consumerKey?: string;
  /** WooCommerce consumer secret (for admin operations) */
  consumerSecret?: string;
  /** HTTP timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** WordPress REST API prefix (default: 'wp-json') */
  restPrefix?: string;
  /** API namespace, supports white-labelling (default: 'cocart') */
  namespace?: string;
  /** Custom headers to send with every request */
  headers?: Record<string, string>;
  /**
   * Storage adapter for persisting cart key and tokens.
   * Defaults to LocalStorage in browser environments and MemoryStorage in Node.js/SSR.
   * Pass a custom adapter to override.
   */
  storage?: StorageInterface;
  /** Storage key name for the cart key (default: 'cocart_cart_key') */
  storageKey?: string;
  /**
   * Maximum number of retries for transient failures (default: 0): a 429 for any request, a 503,
   * timeout or dropped connection for a GET only, so an order is never placed twice.
   */
  maxRetries?: number;
  /** Encryption key — when provided (and no explicit `storage` is set), automatically uses EncryptedStorage in the browser */
  encryptionKey?: string;
  /** Enable debug logging to console (default: false) */
  debug?: boolean;
  /** Custom authorization header name (default: 'Authorization'). Useful when hosting strips the Authorization header. */
  authHeaderName?: string;
  /** Transform every API response before it's returned. Useful for currency formatting, metadata injection, etc. */
  responseTransformer?: (response: import('./response.js').Response) => import('./response.js').Response;
  /** Enable ETag conditional requests for reduced bandwidth (default: true) */
  etag?: boolean;
  /** CoCart main plugin: 'starter' (default) for CoCart Starter, or 'legacy' for the CoCart Community plugin */
  mainPlugin?: MainPlugin;
  /**
   * Locale for SDK-internal messages (validation errors, JWT errors, debug logs, etc.).
   * Defaults to 'en-us'. Additional locales must be registered first via a side-effect import:
   *
   *   import '@cocartheadless/sdk/i18n/fr'
   */
  locale?: string;
  /** Extensions to install during client construction. */
  extensions?: CoCartExtension[];
}

/**
 * Two Factor Authentication challenge data returned in the step-1 401 response.
 */
export interface TwoFactorAuthChallenge {
  /** Providers available for verification (e.g. 'totp', 'email', 'backup'). */
  available_providers: string[];
  /** The default provider the server will use if none is specified. */
  default_provider: string | null;
  /** Whether the server has already sent a code via email. */
  email_sent: boolean;
}

/**
 * JWT Manager options.
 */
export interface JwtOptions {
  /** Enable automatic token refresh on auth errors (default: false) */
  autoRefresh?: boolean;
  /** Storage key for the JWT access token */
  tokenStorageKey?: string;
  /** Storage key for the JWT refresh token */
  refreshTokenStorageKey?: string;
}

/**
 * Item data for adding to cart.
 */
export interface CartItemData {
  id: string | number;
  quantity: string | number;
  variation?: Record<string, string>;
  item_data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Authentication credentials (internal).
 */
export interface AuthCredentials {
  username: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Response types — typed shapes for API responses
//
// Derived from the CoCart Starter v2 OpenAPI spec (cocart-openapi), whose response schemas are
// checked against live responses. Regenerate src/generated/cocart-starter-v2.ts with
// `npm run generate:types` after the spec changes. Every field is present unless the request
// narrows the response with `_fields` (see `Cart.getFiltered()`).
//
// CoCart quirks the types reflect:
// - Empty maps (`notices`, `extensions`, `cart_item_data`, `price_range`, `purchase_quantity`, product
//   `attributes`) arrive as `{}` since CoCart Starter 5. CoCart 4.x sent `[]`; the `Response` helpers accept both.
// - Amounts are minor-unit strings (`"1800"`), or formatted (`"$18.00"`) when requested.
// - Customer address fields are prefixed (`billing_first_name`, `shipping_city`).
// ---------------------------------------------------------------------------

/** All component schemas of the CoCart Starter v2 spec, for shapes without a named export below. */
export type CoCartSchemas = components['schemas'];

/** Currency fields sent beside amounts (cart `currency`, product `prices.currency`). */
export type CurrencyInfo = CoCartSchemas['Currency'];

/**
 * @deprecated Cart items carry `featured_image` as a URL string, not an image object; this
 * shape was never returned. Use `CartItem['featured_image']`.
 */
export interface CartItemImage {
  id: number;
  src: string;
  thumbnail: string;
  name: string;
  alt: string;
}

/**
 * `extensions` typed with the known extension data (see `extensions.types.ts`), and open to any other key.
 */
type WithExtensions<T, E> = Omit<T, 'extensions'> & { extensions: E & Record<string, unknown> };

/** A single item in the cart (`items[]` of `GET /cart`; `GET /cart/items` keys them by `item_key`). */
export type CartItem = WithExtensions<CoCartSchemas['CartItem'], CartItemExtensions>;

/** Cart totals in minor-unit strings, as on `GET /cart`. */
export type CartTotals = CoCartSchemas['CartTotals'];

/** Cart totals as `GET /cart/totals` returns them: the full breakdown, in minor-unit strings. */
export type CartTotalsBreakdown = CoCartSchemas['CartTotalsBreakdown'];

/** The cart's billing address. Fields are prefixed: `billing_first_name`, `billing_email`, … */
export type CartBillingAddress = CoCartSchemas['BillingAddress'];

/** The cart's shipping address. Fields are prefixed: `shipping_first_name`, `shipping_city`, … */
export type CartShippingAddress = CoCartSchemas['ShippingAddress'];

/**
 * @deprecated The cart's addresses use prefixed field names; use `CartBillingAddress` or
 * `CartShippingAddress`. (`Cart.updateCustomer()` still takes unprefixed fields.)
 */
export type CustomerAddress = CartBillingAddress | CartShippingAddress;

/** Customer details in the cart. */
export type CartCustomer = CoCartSchemas['Customer'];

/** Applied coupon. `saving` is a negative minor-unit amount (`"-180"`). */
export type CartCoupon = CoCartSchemas['AppliedCoupon'];

/** Cart fee: its `name` and the `fee` amount. The cart keys fees by fee ID; `Response.getFees()` lists them. */
export type CartFee = CoCartSchemas['CartFee'];

/**
 * Cart tax line, normalized by `Response.getTaxes()`. One entry per tax
 * rate when the store's tax display setting is itemized (`key` is WC's
 * composite rate code, e.g. `US-US-1`), or a single synthetic entry keyed
 * `"total"` when it isn't. Empty when tax is disabled or prices already
 * include tax.
 */
export type CartTax = CoCartSchemas['CartTax'];

/** A tax line's value as it appears under the legacy object-keyed shape (no `key`, since the object's own key serves as it). */
export interface CartTaxLegacyEntry {
  name: string;
  price: string;
  [key: string]: unknown;
}

/**
 * Raw `taxes` field as it appears on the wire. CoCart Starter (5.0+)
 * returns a flat array (`CartTax[]`); the community CoCart plugin (and
 * older Starter versions) still return an object keyed by the tax rate
 * code, e.g. `{ "US-US-1": { name, price } }`, with no `key` in the
 * value itself. `Response.getTaxes()` normalizes both into `CartTax[]`.
 */
export type CartTaxesResponse =
  | CartTax[]
  | Record<string, CartTaxLegacyEntry>;

/** Shipping rate. `cost` is pre-formatted (`"$5.00"`); `taxes` is in minor units. */
export type ShippingRate = CoCartSchemas['ShippingRate'];

/** Shipping package: its rates are keyed by rate ID (e.g. `flat_rate:1`). */
export type ShippingPackage = CoCartSchemas['ShippingPackage'];

/** The cart's `shipping` field: package count, whether shipping is calculated, and the packages keyed by package ID. */
export type CartShipping = CoCartSchemas['Shipping'];

/** Cross-sell product. */
export type CrossSellProduct = CoCartSchemas['CrossSellItem'];

/** Full cart response shape (`GET /cart`, and the cart returned by cart actions). */
export type CartResponse = Omit<WithExtensions<CoCartSchemas['CartV2'], CartExtensions>, 'items'> & { items: CartItem[] };

/** Product image. `src` maps image size names to URLs (`thumbnail`, `woocommerce_single`, `full`, …). */
export type ProductImage = CoCartSchemas['ProductImage'];

/** A category as embedded in a product (`Product['categories']`). */
export type ProductCategory = CoCartSchemas['ProductCategory'];

/** A category from `GET /products/categories[/{id}]`, with its description, count, parent and image. */
export type ProductCategoryDetail = CoCartSchemas['ProductCategoryDetail'];

/** Product tag. */
export type ProductTag = CoCartSchemas['ProductTag'];

/** A product attribute taxonomy (`GET /products/attributes`). For a product's own attributes see `ProductAttributeDetail`. */
export type ProductAttribute = CoCartSchemas['ProductAttribute'];

/** An attribute on a product (`Product['attributes']`, keyed by `attribute_<slug>`); `options` maps term slugs to labels. */
export type ProductAttributeDetail = CoCartSchemas['ProductAttributeDetail'];

/** Product prices. `price_range` is `{ from, to }` for variable and grouped products and `{}` otherwise. */
export type ProductPrices = CoCartSchemas['Product']['prices'];

/** Product stock status. */
export type StockStatus = 'instock' | 'outofstock' | 'onbackorder';

/** Single product response shape. */
export type Product = WithExtensions<CoCartSchemas['Product'], ProductExtensions>;

/** A variation as embedded in its parent (`Product['variations'][number]`): attributes are `attribute_<slug>` → value. */
export type ProductVariationSummary = CoCartSchemas['ProductVariationSummary'];

/** A full variation (`GET /products/{id}/variations[/{variation_id}]`). */
export type ProductVariation = CoCartSchemas['ProductVariation'];

/** Product review. */
export type ProductReview = CoCartSchemas['ProductReview'];

/** Store info response (`GET /store`). */
export type StoreInfo = CoCartSchemas['StoreInfo'];

/** A cart session as listed by `GET /sessions` (admin). */
export type SessionItem = CoCartSchemas['SessionSummary'];

// ---------------------------------------------------------------------------
// Parameter types — typed query parameters for API requests
// ---------------------------------------------------------------------------

/** Common pagination parameters. */
export interface PaginationParams {
  /** Page number (1-indexed). */
  page?: number | string;
  /** Results per page. */
  per_page?: number | string;
}

/** Sort order direction. */
export type SortOrder = 'asc' | 'desc';

/** Valid product orderby fields. */
/**
 * Product sort orders accepted by CoCart. Price sorts by direction (`price_asc`, `price_desc`);
 * `relevance` (with a search term) and `rand` need CoCart Starter.
 */
export type ProductOrderBy =
  | 'date'
  | 'id'
  | 'menu_order'
  | 'include'
  | 'title'
  | 'slug'
  | 'name'
  | 'alphabetical'
  | 'reverse_alpha'
  | 'popularity'
  | 'sales'
  | 'rating'
  | 'review_count'
  | 'by_stock'
  | 'on_sale_first'
  | 'featured_first'
  | 'price_asc'
  | 'price_desc'
  | 'relevance'
  | 'rand';

/** Parameters for listing products. */
export interface ProductListParams extends PaginationParams {
  search?: string;
  orderby?: ProductOrderBy;
  order?: SortOrder;
  category?: string;
  tag?: string;
  brand?: string;
  featured?: boolean | string;
  on_sale?: boolean | string;
  stock_status?: StockStatus;
  min_price?: number | string;
  max_price?: number | string;
  /** Comma-separated list of fields to include in the response. */
  _fields?: string;
  [key: string]: unknown;
}

/** Parameters for getting a single product. */
export interface ProductParams {
  /** Comma-separated list of fields to include in the response. */
  _fields?: string;
  [key: string]: unknown;
}

/** Parameters for getting the cart. */
export interface CartGetParams {
  /** Filter specific fields in the response. */
  _fields?: string;
  /** Specify a cart key (e.g., when transferring guest cart). */
  cart_key?: string;
  [key: string]: unknown;
}

/**
 * Options for `cart().addItem()`, beside the product and quantity. Other plugins' fields can be passed too.
 */
export interface AddItemOptions {
  /** Variation attributes, e.g. `{ attribute_pa_color: 'blue' }`. */
  variation?: Record<string, string>;
  /** Extra data saved on the item; items with different data are separate lines. */
  item_data?: Record<string, unknown> & {
    /** WooCommerce Warranty (CoCart Plus): the option's `key` from the product's `extensions.warranty.options`, or its index. */
    warranty?: string;
  };
  /** The customer's billing email. */
  email?: string;
  /** The customer's billing phone number. */
  phone?: string;
  /** A custom price for the item, where the store allows it (CoCart Plus). */
  price?: string;
  /** Return the added item instead of the cart. */
  return_item?: boolean;
  /**
   * Subscription plans (CoCart Plus): the `value` of one of the product's `extensions.subscription_schemes`
   * options (`'0'` for one-time). Without it the product's default option applies.
   */
  convert_to_sub?: string;
  /** Gifting for WooCommerce Subscriptions (CoCart Plus): who receives the subscription. */
  recipient_email?: string;
  [key: string]: unknown;
}

/**
 * A single sub-request within a batch call to `cocart/batch` (requires CoCart Plus).
 *
 * `path` must be a full REST route relative to the site root (e.g. `/cocart/v2/cart/item/{key}`).
 */
export interface BatchRequestItem {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Event types — for the hook/event system
// ---------------------------------------------------------------------------

/** Payload for the 'request' event. */
export interface RequestEvent {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

/** Payload for the 'response' event. */
export interface ResponseEvent {
  method: string;
  /** The full request URL. Its query can hold the cart key, an order key or an email: don't send it anywhere. */
  url: string;
  status: number;
  duration: number;
  /** The response, e.g. to read what a checkout did (`result.code`). */
  response?: import('./response.js').Response;
}

/** Payload for the 'error' event. */
export interface ErrorEvent {
  method: string;
  url: string;
  error: Error;
}

/** Payload for the 'retry' event. */
export interface RetryEvent {
  method: string;
  url: string;
  attempt: number;
  maxRetries: number;
  delay: number;
  reason: string;
}

/** Map of event names to their payload types. */
export interface CoCartEventMap {
  'request': RequestEvent;
  'response': ResponseEvent;
  'error': ErrorEvent;
  'retry': RetryEvent;
  'auth:refresh': { success: boolean };
}

/** Event listener function type. */
export type CoCartEventListener<K extends keyof CoCartEventMap> = (event: CoCartEventMap[K]) => void;

// --- Account ---

export interface AccountAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  email?: string;
}

// The CoCart Plus 2.0 documents, derived from the CoCart Plus v2 OpenAPI specs. Regenerate
// src/generated/cocart-plus-v2.ts and cocart-plus-checkout-v2.ts with `npm run generate:types`.
//
// Every document has `object` (what it is: `order`, `subscription`, `customer`…), and a response
// to a request that changes something has `result` first: `{ code, message }`, the code to branch
// on. `actions` lists what can be done next, keyed by action, each `{ label, method, href }`.
// Amounts are minor-unit strings, or formatted for display with `formatted: true`.

/** All component schemas of the CoCart Plus v2 spec (cart, products, my account, others). */
export type CoCartPlusSchemas = plusComponents['schemas'];

/** All component schemas of the CoCart Plus v2 checkout spec. */
export type CoCartPlusCheckoutSchemas = plusCheckoutComponents['schemas'];

/** What a request that changes something did: `result` on a document. */
export interface DocumentResult {
  /** Code to branch on, not translated, e.g. `account_updated` or `order_cancelled`. */
  code: string;
  /** Message for the customer. */
  message: string;
}

/** An order, as every order route returns it (my account, order received, checkout). */
export type Order = CoCartPlusSchemas['Order'];

/** A page of orders (`GET /my-account/orders`), with `pagination`. */
export type OrderList = CoCartPlusSchemas['OrderList'];

/** An order after a change, with `result` (`POST /my-account/orders/{id}/cancel`). */
export type OrderUpdate = CoCartPlusSchemas['OrderUpdate'];

/** An order after a payment attempt, with what the payment did in `result` (checkout, pay, confirm). */
export type OrderPayment = CoCartPlusCheckoutSchemas['OrderPayment'];

/** A subscription (WooCommerce Subscriptions). */
export type Subscription = CoCartPlusSchemas['Subscription'];

/** A page of subscriptions (`GET /my-account/subscriptions`), with `pagination`. */
export type SubscriptionList = CoCartPlusSchemas['SubscriptionList'];

/** A subscription after a change, with `result` (suspend, cancel, reactivate, auto-renew). */
export type SubscriptionUpdate = CoCartPlusSchemas['SubscriptionUpdate'];

/** A subscription after its payment method changed, with what the change did in `result`. */
export type SubscriptionPaymentMethodChange = CoCartPlusSchemas['SubscriptionPaymentMethodChange'];

/** `GET /my-account/downloads` and `GET /my-account/orders/{id}/downloads`: `{ downloads: [...] }`. */
export type Downloads = CoCartPlusSchemas['Downloads'];

/** `GET /cart/mini`: a part of the cart for a mini cart. */
export type MiniCart = CoCartPlusSchemas['MiniCart'];

/** `GET /cart/coupons`: `{ coupons: [...] }`. */
export type CartCoupons = CoCartPlusSchemas['CartCoupons'];

/** `GET /products/{id}/shipping-rates`. */
export type ProductShippingRates = CoCartPlusSchemas['ProductShippingRates'];

/** `GET /my-account/verify-email`: the email the account now has, with `result`. */
export type EmailChange = CoCartPlusSchemas['EmailChange'];

/** `POST /my-account/verify-order-email`: where the link went, with `result` and `retry_after`. */
export type EmailVerification = CoCartPlusSchemas['EmailVerification'];

/** `POST /order-withdrawal`, with `result` (`withdrawal_requested`). */
export type OrderWithdrawal = CoCartPlusSchemas['OrderWithdrawal'];

/** The signed-in customer (`GET /my-account`): name, email, addresses, stats, `actions`. */
export type AccountProfile = CoCartPlusSchemas['Customer'];

/** @deprecated The customer's details are at the top of `AccountProfile` now, not under `user`. */
export type AccountUser = AccountProfile;

/** One order in `AccountOrdersResponse.orders`. */
export type AccountOrderSummary = OrderList['orders'][number];

/** `GET /my-account/orders`. */
export type AccountOrdersResponse = OrderList;

/** `GET /my-account/orders/{id}`. */
export type AccountOrderDetail = Order;

/** One file in `Downloads.downloads`. */
export type AccountDownload = Downloads['downloads'][number];

/**
 * `POST /my-account`. Send only what changes. A new email is confirmed by email first when the
 * store asks for it.
 */
export interface AccountUpdateInput {
  account_first_name?: string;
  account_last_name?: string;
  account_display_name?: string;
  account_email?: string;
}

/** `POST /my-account/address` (CoCart Plus). Fields are unprefixed. */
export interface AccountAddressUpdateInput {
  billing_address?: AccountAddress;
  shipping_address?: AccountAddress;
}

/** `POST /my-account/orders/{id}/cancel` (CoCart Plus): the order, with `result`. */
export type AccountCancelOrderResult = OrderUpdate;

/**
 * `POST /my-account/subscriptions/{id}/payment-method` (CoCart Plus). Pass a saved card's `token_id`,
 * or a new card in `payment_data`.
 */
export interface AccountSubscriptionPaymentMethodInput {
  /** Gateway ID, e.g. `stripe`. */
  payment_method: string;
  /** A saved card's ID (see the checkout package's `getSavedPaymentMethods()`). */
  token_id?: number;
  /** A new card, as the keys the gateway reads, e.g. `{ 'wc-stripe-payment-method': 'pm_…' }`. Sent as `{key, value}` pairs. */
  payment_data?: import('./checkout-result.js').PaymentDataInput;
}

/** `result.response` after a subscription's payment method changed (CoCart Plus): the subscription, with `result`. */
export type AccountSubscriptionPaymentMethodResult = SubscriptionPaymentMethodChange;

/** `POST /order-withdrawal` (CoCart Plus, WooCommerce's order withdrawal feature). */
export interface OrderWithdrawalInput {
  first_name: string;
  last_name: string;
  email: string;
  email_confirmation: string;
  order_number: string;
  withdrawal_type?: 'full_order' | 'specific_items_only';
  /** Required when `withdrawal_type` is `specific_items_only`. */
  additional_details?: string;
}

/** Optional on the routes that return a document: amounts formatted, and which `meta` keys. */
export interface DocumentParams {
  /** Amounts formatted for display (`"$18.00"`) instead of minor units (`"1800"`). */
  formatted?: boolean;
  /** Only these keys in each `meta`. Narrows the keys the store allows; it can never add one. */
  meta_keys?: string[];
}

/** `POST /products/reviews`. Guests give `reviewer` and `reviewer_email`; stores that only allow verified owners check the email against past orders. */
export interface ProductReviewInput {
  product_id: number;
  review: string;
  /** 1–5. */
  rating?: number;
  reviewer?: string;
  reviewer_email?: string;
}

/** `GET /products/{id}/shipping-rates` (CoCart Plus). */
export interface ProductShippingRatesParams {
  /** Quantity to price shipping for. Default 1. */
  quantity?: number;
  /** Variation attributes, e.g. `{ attribute_pa_color: 'blue' }`. */
  variation?: Record<string, string>;
  /** Item data that makes the item unique. */
  item_data?: Record<string, string>;
}

/** The `RateLimit-*` headers (CoCart Plus, when rate limiting is on). */
export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  /** Unix time the window resets. */
  reset: number | null;
  /** Seconds to wait, on a 429. */
  retryAfter: number | null;
}

export interface AccountChangePasswordInput {
  current: string;
  password: string;
  confirm: string;
}

/** `GET /my-account/orders`. */
export interface AccountOrdersParams extends DocumentParams {
  page?: number;
  per_page?: number;
  order?: 'ASC' | 'DESC';
  /** Only orders with these statuses, e.g. `processing` or `['on-hold', 'completed']`. Default every status. */
  status?: string | string[];
  /** Only orders placed after this date (ISO 8601; without an offset it's UTC). */
  after?: string;
  /** Only orders placed before this date (ISO 8601; without an offset it's UTC). */
  before?: string;
  /** Only orders with this relationship to a subscription. */
  subscription_order_type?: 'parent' | 'renewal' | 'switch' | 'resubscribe';
}

/** `GET /my-account/subscriptions`. */
export interface AccountSubscriptionsParams extends DocumentParams {
  page?: number;
  per_page?: number;
  order?: 'ASC' | 'DESC';
  /** Only subscriptions with these statuses, e.g. `active` or `['on-hold', 'pending-cancel']`. */
  status?: string | string[];
}

/**
 * Input for `register()`. `requestedUsername`/`requestedPassword` are deliberately
 * not named `username`/`password` on the wire — CoCart Starter's auth layer treats
 * a request with non-empty `username`/`password` fields as a Basic Auth attempt,
 * which would collide with these registration fields.
 */
export interface RegisterCustomerInput {
  email: string;
  requestedUsername?: string;
  requestedPassword?: string;
}

/** `POST /register`: the new customer, as `GET /my-account` gives it, with `result` (`account_created`). Log in next. */
export type RegisteredCustomer = AccountProfile;
