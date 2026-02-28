import type {
  CartItem, CartTotals, CartCustomer, CartCoupon, CartFee,
  ShippingPackage, CrossSellProduct, CurrencyInfo,
} from './cocart.types.js';

/**
 * Response wrapper for CoCart API responses.
 *
 * Provides dot-notation access, cart helpers, pagination helpers,
 * and error helpers — mirroring the PHP SDK's Response class.
 *
 * The generic parameter `T` represents the expected shape of the
 * JSON response body, enabling typed access via `toObject()`.
 */
export class Response<T = unknown> {
  readonly statusCode: number;
  readonly headers: Headers;
  readonly body: string;

  private data: T | null = null;

  constructor(statusCode: number, headers: Headers, body: string) {
    this.statusCode = statusCode;
    this.headers = headers;
    this.body = body;
  }

  // --- Data access ---

  /**
   * Get decoded response data as a typed object.
   */
  toObject(): T {
    if (this.data === null) {
      try {
        this.data = JSON.parse(this.body) as T;
      } catch {
        this.data = {} as T;
      }
    }
    return this.data;
  }

  /**
   * Get response as a JSON string.
   */
  toJson(pretty: boolean = true): string {
    return JSON.stringify(this.toObject(), null, pretty ? 2 : undefined);
  }

  /**
   * Check if the response was successful (2xx).
   */
  isSuccessful(): boolean {
    return this.statusCode >= 200 && this.statusCode < 300;
  }

  /**
   * Check if the response was an error (4xx/5xx).
   */
  isError(): boolean {
    return this.statusCode >= 400;
  }

  // --- Dot-notation access ---

  /**
   * Get a value from the response data using dot notation.
   *
   * @example
   * response.get('totals.subtotal')
   * response.get('items.0.name')
   */
  get<V = unknown>(key: string, defaultValue?: V): V {
    const data = this.toObject();
    const keys = key.split('.');
    let current: unknown = data;

    for (const k of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue as V;
      }
      current = (current as Record<string, unknown>)[k];
    }

    return (current !== undefined ? current : defaultValue) as V;
  }

  /**
   * Check if the response data contains a key (dot notation).
   */
  has(key: string): boolean {
    const data = this.toObject();
    const keys = key.split('.');
    let current: unknown = data;

    for (const k of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return false;
      }
      if (!(k in (current as Record<string, unknown>))) {
        return false;
      }
      current = (current as Record<string, unknown>)[k];
    }

    return true;
  }

  // --- Header access ---

  /**
   * Get a response header (case-insensitive).
   */
  getHeader(name: string, defaultValue: string | null = null): string | null {
    return this.headers.get(name) ?? defaultValue;
  }

  // --- Cart helpers ---

  /** Get cart key from the Cart-Key response header. */
  getCartKey(): string | null {
    return this.getHeader('Cart-Key');
  }

  /** Get cart hash from response data. */
  getCartHash(): string | null {
    return this.get<string | null>('cart_hash', null);
  }

  /** Get cart items from response data. */
  getItems(): CartItem[] {
    return this.get<CartItem[]>('items', []);
  }

  /** Get cart totals from response data. */
  getTotals(): CartTotals {
    return this.get<CartTotals>('totals', {} as CartTotals);
  }

  /** Get item count from response data. */
  getItemCount(): number {
    return this.get<number>('item_count', 0);
  }

  /** Check if cart has items. */
  hasItems(): boolean {
    return this.getItemCount() > 0;
  }

  /** Check if cart is empty. */
  isEmpty(): boolean {
    return this.getItemCount() === 0;
  }

  /** Get notices from response data. */
  getNotices(): unknown[] {
    return this.get<unknown[]>('notices', []);
  }

  /** Get applied coupons from response data. */
  getCoupons(): CartCoupon[] {
    return this.get<CartCoupon[]>('coupons', []);
  }

  /** Check if cart has coupons applied. */
  hasCoupons(): boolean {
    return this.getCoupons().length > 0;
  }

  /** Get customer details from response data. */
  getCustomer(): CartCustomer {
    return this.get<CartCustomer>('customer', {} as CartCustomer);
  }

  /** Get currency information from response data. */
  getCurrency(): CurrencyInfo {
    return this.get<CurrencyInfo>('currency', {} as CurrencyInfo);
  }

  /** Get shipping methods from response data. */
  getShippingMethods(): ShippingPackage[] {
    return this.get<ShippingPackage[]>('shipping', []);
  }

  /** Get cart fees from response data. */
  getFees(): CartFee[] {
    return this.get<CartFee[]>('fees', []);
  }

  /** Get cross-sell products from response data. */
  getCrossSells(): CrossSellProduct[] {
    return this.get<CrossSellProduct[]>('cross_sells', []);
  }

  // --- Pagination helpers (WP REST API standard headers) ---

  /** Get total number of results (from X-WP-Total header). */
  getTotalResults(): number | null {
    const total = this.getHeader('X-WP-Total');
    return total !== null ? parseInt(total, 10) : null;
  }

  /** Get total number of pages (from X-WP-TotalPages header). */
  getTotalPages(): number | null {
    const pages = this.getHeader('X-WP-TotalPages');
    return pages !== null ? parseInt(pages, 10) : null;
  }

  // --- Cache helpers ---

  /** Get the ETag header value. */
  getETag(): string | null {
    return this.getHeader('ETag');
  }

  /** Check if the response is a 304 Not Modified. */
  isNotModified(): boolean {
    return this.statusCode === 304;
  }

  /** Get the CoCart-Cache header value (HIT, MISS, or SKIP). */
  getCacheStatus(): string | null {
    return this.getHeader('CoCart-Cache');
  }

  // --- Error helpers ---

  /** Get the API error code from an error response. */
  getErrorCode(): string | null {
    if (!this.isError()) return null;
    return this.get<string | null>('code', null);
  }

  /** Get the error message from an error response. */
  getErrorMessage(): string | null {
    if (!this.isError()) return null;
    return this.get<string | null>('message', null);
  }
}
