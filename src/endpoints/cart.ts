import { Endpoint } from './endpoint.js';
import type { Response } from '../response.js';
import type { CartGetParams, CartResponse } from '../cocart.types.js';
import { validateProductId, validateQuantity } from '../validation.js';

/**
 * Cart Endpoint
 *
 * Handles all cart-related API operations including adding items,
 * updating quantities, removing items, and managing the cart session.
 */
export class Cart extends Endpoint {
  protected endpoint = 'cart';

  /**
   * Get the cart contents.
   *
   * Overrides base Endpoint.get() — when called with no path argument
   * or with a params object, fetches the cart. When called with a string
   * path, delegates to the base class for sub-resource filtering.
   */
  override async get(pathOrParams?: string | CartGetParams | Record<string, string>, params?: Record<string, string>): Promise<Response> {
    if (typeof pathOrParams === 'object' || pathOrParams === undefined) {
      return this.client.get(this.endpoint, pathOrParams ? this.stringifyParams(pathOrParams) : undefined);
    }
    return super.get(pathOrParams, params);
  }

  /**
   * Get specific fields from the cart with type-safe response.
   *
   * The server only returns the requested fields (via `_fields` parameter),
   * and the TypeScript return type is narrowed to `Pick<CartResponse, K>`.
   *
   * @example
   * const response = await client.cart().getFiltered(['items', 'totals']);
   * const data = response.toObject();
   * // data.items → CartItem[]
   * // data.totals → CartTotals
   */
  async getFiltered<K extends keyof CartResponse>(fields: K[]): Promise<Response<Pick<CartResponse, K>>> {
    return this.client.get(this.endpoint, { _fields: fields.join(',') }) as Promise<Response<Pick<CartResponse, K>>>;
  }

  /**
   * Add an item to the cart.
   *
   * @param productId Product ID or variation ID
   * @param quantity  Quantity to add (default: 1)
   * @param options   Additional options (variation, item_data, email, return_item, etc.)
   */
  async addItem(
    productId: string | number,
    quantity: number = 1,
    options: Record<string, unknown> = {},
  ): Promise<Response> {
    validateProductId(productId);
    validateQuantity(quantity);
    const data = {
      id: String(productId),
      quantity: String(quantity),
      ...options,
    };
    return this.post('add-item', data);
  }

  /**
   * Add multiple items to the cart in a single request.
   */
  async addItems(items: Array<{ id: string | number; quantity: string | number; [key: string]: unknown }>): Promise<Response> {
    const formatted = items.map(item => ({
      ...item,
      id: String(item.id),
      quantity: String(item.quantity),
    }));
    return this.post('add-items', { items: formatted });
  }

  /**
   * Update an item in the cart.
   *
   * @param itemKey  The cart item key
   * @param quantity New quantity
   * @param options  Additional options
   */
  async updateItem(itemKey: string, quantity: number, options: Record<string, unknown> = {}): Promise<Response> {
    validateQuantity(quantity);
    const data = { quantity: String(quantity), ...options };
    return this.post(`item/${itemKey}`, data);
  }

  /**
   * Update multiple items in a single request.
   *
   * Accepts either shorthand (item_key => quantity) or full format.
   */
  async updateItems(
    items: Record<string, number> | Array<{ item_key: string; quantity: number; [key: string]: unknown }>,
  ): Promise<Response> {
    let formatted: Array<Record<string, unknown>>;

    if (Array.isArray(items)) {
      formatted = items.map(item => ({
        ...item,
        quantity: String(item.quantity),
      }));
    } else {
      formatted = Object.entries(items).map(([key, qty]) => ({
        item_key: key,
        quantity: String(qty),
      }));
    }

    return this.post('update', { items: formatted });
  }

  /** Remove an item from the cart. */
  async removeItem(itemKey: string): Promise<Response> {
    return this.delete(`item/${itemKey}`);
  }

  /** Remove multiple items from the cart. */
  async removeItems(itemKeys: string[]): Promise<Response> {
    const items = itemKeys.map(key => ({
      item_key: key,
      quantity: '0',
    }));
    return this.post('update', { items });
  }

  /** Restore a removed item to the cart. */
  async restoreItem(itemKey: string): Promise<Response> {
    return this.put(`item/${itemKey}`);
  }

  /** Get removed items that can be restored (filtered from cart response). */
  async getRemovedItems(): Promise<Response> {
    return super.get('', { _fields: 'removed_items' });
  }

  /** Clear all items from the cart. */
  async clear(): Promise<Response> {
    return this.post('clear');
  }

  /** Alias for clear(). */
  async empty(): Promise<Response> {
    return this.clear();
  }

  /** Calculate cart totals. */
  async calculate(params: Record<string, unknown> = {}): Promise<Response> {
    return this.post('calculate', params);
  }

  /** Get cart totals. */
  async getTotals(html: boolean = false): Promise<Response> {
    const params = html ? { html: 'true' } : undefined;
    return this.client.get('cart/totals', params);
  }

  /** Get count of items in cart. */
  async getItemCount(): Promise<Response> {
    return this.client.get('cart/items/count');
  }

  /** Create a new guest cart session without adding items. */
  async create(): Promise<Response> {
    return this.post('');
  }

  /** Get all items in the cart. */
  async getItems(params?: Record<string, string>): Promise<Response> {
    return super.get('items', params);
  }

  /** Get a specific item from the cart by item key. */
  async getItem(itemKey: string, params?: Record<string, string>): Promise<Response> {
    return super.get('item/' + itemKey, params);
  }

  /** Update the entire cart. */
  async update(data: Record<string, unknown>): Promise<Response> {
    return this.post('update', data);
  }

  // --- Coupons (CoCart Plus) ---

  /** Apply a coupon to the cart. */
  async applyCoupon(couponCode: string): Promise<Response> {
    return this.post('apply-coupon', { coupon: couponCode });
  }

  /** Remove a coupon from the cart. */
  async removeCoupon(couponCode: string): Promise<Response> {
    return this.delete(`coupons/${couponCode}`);
  }

  /** Get applied coupons (filtered from cart response). */
  async getCoupons(): Promise<Response> {
    return super.get('', { _fields: 'coupons' });
  }

  /** Check if applied coupons are still valid. */
  async checkCoupons(): Promise<Response> {
    return super.get('coupons/validate');
  }

  // --- Customer ---

  /**
   * Update customer details.
   *
   * @param billing  Billing address fields
   * @param shipping Shipping address fields
   */
  async updateCustomer(
    billing: Record<string, string> = {},
    shipping: Record<string, string> = {},
  ): Promise<Response> {
    const data: Record<string, string> = {};

    for (const [key, value] of Object.entries(billing)) {
      data[`billing_${key}`] = value;
    }
    for (const [key, value] of Object.entries(shipping)) {
      data[`shipping_${key}`] = value;
    }

    return this.post('update', data);
  }

  /** Get customer details (filtered from cart response). */
  async getCustomer(): Promise<Response> {
    return super.get('', { _fields: 'customer' });
  }

  // --- Shipping ---

  /** Get available shipping methods (filtered from cart response). */
  async getShippingMethods(): Promise<Response> {
    return super.get('', { _fields: 'shipping' });
  }

  /** Set shipping method for the cart (CoCart Plus). */
  async setShippingMethod(methodKey: string): Promise<Response> {
    return this.post('set-shipping-method', { method_key: methodKey });
  }

  /** Calculate shipping for the cart. */
  async calculateShipping(address: Record<string, string>): Promise<Response> {
    return this.post('calculate/shipping', address);
  }

  // --- Fees (CoCart Plus) ---

  /** Get cart fees (filtered from cart response). */
  async getFees(): Promise<Response> {
    return super.get('', { _fields: 'fees' });
  }

  /** Add a fee to the cart. */
  async addFee(name: string, amount: number, taxable: boolean = false): Promise<Response> {
    return this.post('add-fee', { name, amount, taxable });
  }

  /** Remove all fees from the cart. */
  async removeFees(): Promise<Response> {
    return this.post('remove-fees');
  }

  // --- Cross-sells ---

  /** Get cross-sell product recommendations (filtered from cart response). */
  async getCrossSells(): Promise<Response> {
    return super.get('', { _fields: 'cross_sells' });
  }

  // --- Shorthands ---

  /** Shorthand: Add a simple product to cart. */
  async add(productId: number, quantity: number = 1): Promise<Response> {
    return this.addItem(productId, quantity);
  }

  /** Shorthand: Add a variable product to cart. */
  async addVariation(
    variationId: number,
    quantity: number = 1,
    attributes: Record<string, string> = {},
  ): Promise<Response> {
    return this.addItem(variationId, quantity, { variation: attributes });
  }

  // --- Internal ---

  /** Convert typed params to Record<string, string> for the HTTP layer. */
  private stringifyParams(params: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }
    return result;
  }
}
