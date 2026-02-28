import type { StorageInterface } from './storage/storage.interface.js';

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
  /** Storage adapter for persisting cart key and tokens */
  storage?: StorageInterface;
  /** Storage key name for the cart key (default: 'cocart_cart_key') */
  storageKey?: string;
  /** Maximum number of retries for transient failures (default: 0) */
  maxRetries?: number;
  /** Encryption key for EncryptedStorage */
  encryptionKey?: string;
  /** Enable debug logging to console (default: false) */
  debug?: boolean;
  /** Custom authorization header name (default: 'Authorization'). Useful when hosting strips the Authorization header. */
  authHeaderName?: string;
  /** Transform every API response before it's returned. Useful for currency formatting, metadata injection, etc. */
  responseTransformer?: (response: import('./response.js').Response) => import('./response.js').Response;
  /** Enable ETag conditional requests for reduced bandwidth (default: true) */
  etag?: boolean;
  /** CoCart main plugin: 'basic' (default) or 'legacy' for legacy CoCart plugin */
  mainPlugin?: 'basic' | 'legacy';
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
  quantity: { value: number; min_purchase: number; max_purchase: number };
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
  taxes: Record<string, unknown>;
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
