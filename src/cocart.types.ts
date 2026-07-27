import type { StorageInterface } from './storage/storage.interface.js';

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
  /** Maximum number of retries for transient failures (default: 0) */
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
  /** CoCart main plugin: 'basic' (default) or 'legacy' for CoCart Community plugin */
  mainPlugin?: 'basic' | 'legacy';
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
// ---------------------------------------------------------------------------

/** Money value as returned by the API. */
export interface CurrencyInfo {
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

/** Cart item image. */
export interface CartItemImage {
  id: number;
  src: string;
  thumbnail: string;
  name: string;
  alt: string;
}

/** A single item in the cart. */
export interface CartItem {
  item_key: string;
  id: number;
  name: string;
  title: string;
  price: string;
  quantity: { value: number; minimum: number; maximum: number; multiple_of: number; editable: boolean };
  totals: { subtotal: string; subtotal_tax: string; total: string; tax: string };
  slug: string;
  meta: { product_type: string; sku: string; dimensions: Record<string, string>; weight: number };
  backorders: string;
  cart_item_data: Record<string, unknown>;
  featured_image: string;
  [key: string]: unknown;
}

/** Cart totals. */
export interface CartTotals {
  subtotal: string;
  subtotal_tax: string;
  fee_total: string;
  fee_tax: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  total: string;
  total_tax: string;
  [key: string]: unknown;
}

/** Customer address fields. */
export interface CustomerAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}

/** Customer details in the cart. */
export interface CartCustomer {
  billing_address: CustomerAddress;
  shipping_address: CustomerAddress;
  [key: string]: unknown;
}

/** Applied coupon. */
export interface CartCoupon {
  coupon: string;
  label: string;
  saving: string;
  saving_html: string;
  [key: string]: unknown;
}

/** Cart fee. */
export interface CartFee {
  name: string;
  fee: string;
  [key: string]: unknown;
}

/**
 * Cart tax line, normalized by `Response.getTaxes()`. One entry per tax
 * rate when the store's tax display setting is itemized (`key` is WC's
 * composite rate code, e.g. `US-US-1`), or a single synthetic entry keyed
 * `"total"` when it isn't. Empty when tax is disabled or prices already
 * include tax.
 */
export interface CartTax {
  key: string;
  name: string;
  price: string;
  [key: string]: unknown;
}

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

/** Shipping rate. */
export interface ShippingRate {
  key: string;
  method_id: string;
  instance_id: number;
  label: string;
  cost: string;
  tax: string;
  meta_data: Record<string, unknown>;
  [key: string]: unknown;
}

/** Shipping package. */
export interface ShippingPackage {
  package_name: string;
  rates: Record<string, ShippingRate>;
  chosen_method: string;
  [key: string]: unknown;
}

/** Cross-sell product. */
export interface CrossSellProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price: string;
  sale_price: string;
  featured_image: string;
  [key: string]: unknown;
}

/** Full cart response shape. */
export interface CartResponse {
  cart_hash: string;
  cart_key: string;
  currency: CurrencyInfo;
  customer: CartCustomer;
  items: CartItem[];
  item_count: number;
  items_weight: number;
  coupons: CartCoupon[];
  needs_payment: boolean;
  needs_shipping: boolean;
  shipping: ShippingPackage[];
  fees: CartFee[];
  taxes: CartTaxesResponse;
  totals: CartTotals;
  removed_items: CartItem[];
  cross_sells: CrossSellProduct[];
  notices: unknown[];
  [key: string]: unknown;
}

/** Product image. */
export interface ProductImage {
  id: number;
  src: string;
  thumbnail: string;
  name: string;
  alt: string;
  position: number;
  [key: string]: unknown;
}

/** Product category reference. */
export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  [key: string]: unknown;
}

/** Product tag reference. */
export interface ProductTag {
  id: number;
  name: string;
  slug: string;
  [key: string]: unknown;
}

/** Product attribute. */
export interface ProductAttribute {
  id: number;
  name: string;
  slug: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
  [key: string]: unknown;
}

/** Product price range (for variable products). */
export interface ProductPrices {
  price: string;
  regular_price: string;
  sale_price: string;
  price_range?: { from: string; to: string };
  on_sale: boolean;
  [key: string]: unknown;
}

/** Product stock status. */
export type StockStatus = 'instock' | 'outofstock' | 'onbackorder';

/** Single product response shape. */
export interface Product {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  description: string;
  short_description: string;
  sku: string;
  prices: ProductPrices;
  images: ProductImage[];
  categories: ProductCategory[];
  tags: ProductTag[];
  attributes: ProductAttribute[];
  stock: { stock_quantity: number | null; stock_status: StockStatus; [key: string]: unknown };
  conditions: { is_purchasable: boolean; [key: string]: unknown };
  featured: boolean;
  average_rating: string;
  review_count: number;
  [key: string]: unknown;
}

/** Product variation response shape. */
export interface ProductVariation {
  id: number;
  sku: string;
  description: string;
  prices: ProductPrices;
  attributes: Record<string, string>;
  stock: { stock_quantity: number | null; stock_status: StockStatus; [key: string]: unknown };
  images: ProductImage[];
  [key: string]: unknown;
}

/** Product review. */
export interface ProductReview {
  id: number;
  product_id: number;
  reviewer: string;
  reviewer_email: string;
  review: string;
  rating: number;
  verified: boolean;
  date_created: string;
  [key: string]: unknown;
}

/** Store info response. */
export interface StoreInfo {
  store_name: string;
  store_description: string;
  store_url: string;
  routes: Record<string, unknown>;
  [key: string]: unknown;
}

/** Session item in admin sessions list. */
export interface SessionItem {
  session_key: string;
  session_value: Record<string, unknown>;
  session_expiry: string;
  [key: string]: unknown;
}

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
export type ProductOrderBy = 'date' | 'id' | 'include' | 'title' | 'slug' | 'price' | 'popularity' | 'rating';

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
  url: string;
  status: number;
  duration: number;
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

export interface AccountUser {
  id: number;
  date_registered: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  addresses: {
    billing: AccountAddress;
    shipping: AccountAddress;
  };
  orders_count: number;
  total_spent: string;
  is_paying_customer: boolean;
  avatar_url: string;
}

export interface AccountProfile {
  user: AccountUser;
  recent_order: {
    order_id: number | null;
    order_date: string | null;
    order_data: string | null;
  };
  meta: {
    is_customer_outside_base: boolean;
    is_vat_exempt: boolean;
  };
  extensions?: Record<string, unknown>;
}

export interface AccountOrderSummary {
  order_id: number;
  order_status: string;
  order_date: string;
  item_count: number;
  order_total: string;
  order_actions: Record<string, { url: string; name: string }>;
}

export interface AccountOrdersResponse {
  orders: AccountOrderSummary[];
  pagination: {
    previous: string | null;
    next: string | null;
  };
}

export interface AccountOrderDetail {
  order_id: number;
  order_number: string;
  order_parent: number;
  order_date: string;
  order_status: string;
  order_currency: string;
  billing_address: string;
  shipping_address: string;
  phone: string;
  email: string;
  ship_to_billing: boolean;
  items: Record<string, unknown>[];
  totals: Record<string, unknown>;
  order_note: string;
  order_notes: Record<string, unknown>[];
  downloads: AccountDownload[];
  order_actions: Record<string, { url: string; name: string }>;
}

export interface AccountDownload {
  product_name: string;
  download_name: string;
  file: string;
  downloads_remaining: string;
  download_expires: string;
}

export interface AccountUpdateInput {
  account_first_name: string;
  account_last_name: string;
  account_display_name: string;
  account_email: string;
}

export interface AccountChangePasswordInput {
  current: string;
  password: string;
  confirm: string;
}

export interface AccountOrdersParams {
  page?: number;
  per_page?: number;
  order?: 'ASC' | 'DESC';
}
