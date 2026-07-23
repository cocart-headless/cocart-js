import { Endpoint } from './endpoint.js';
import type { Response } from '../response.js';
import type { BatchRequestItem, CartGetParams, CartResponse } from '../cocart.types.js';
import { validateProductId, validateQuantity } from '../validation.js';
import { ValidationError } from '../exceptions/validation-error.js';

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
    validateProductId(productId, this.client.getLocale());
    validateQuantity(quantity, this.client.getLocale());
    const data = {
      id: String(productId),
      quantity: String(quantity),
      ...options,
    };
    return this.post('add-item', data);
  }

  /**
   * Add multiple children of a WooCommerce Grouped Product to the cart in a
   * single request, via the dedicated `cart/add-items` endpoint.
   *
   * This is NOT a generic "add several unrelated products" call — the server
   * requires a single grouped product ID plus a map of that group's child
   * product IDs to quantities (confirmed against
   * `class-cocart-add-items-controller.php`'s `add_to_cart_handler_grouped()`).
   * For adding unrelated products in one request, use `client.batch()` instead.
   *
   * @param groupedProductId The parent grouped product's ID.
   * @param items            Map of child product ID => quantity (shorthand), or an array of `{ id, quantity }` entries.
   */
  async addItems(
    groupedProductId: string | number,
    items: Record<string, number> | Array<{ id: string | number; quantity: number }>,
  ): Promise<Response> {
    validateProductId(groupedProductId, this.client.getLocale());

    const entries: Array<[string, number]> = Array.isArray(items)
      ? items.map(item => [String(item.id), item.quantity])
      : Object.entries(items);

    if (entries.length === 0) {
      throw new ValidationError('addItems() requires at least one item.');
    }

    const quantity: Record<string, string> = {};
    for (const [childId, qty] of entries) {
      quantity[childId] = String(qty);
    }

    return this.post('add-items', { id: String(groupedProductId), quantity });
  }

  /**
   * Update an item in the cart.
   *
   * @param itemKey  The cart item key
   * @param quantity New quantity - 0 removes the item (the API's own
   *                 behavior on this endpoint), so it's exempt from the
   *                 usual positive-quantity validation.
   * @param options  Additional options
   */
  async updateItem(itemKey: string, quantity: number, options: Record<string, unknown> = {}): Promise<Response> {
    if (quantity !== 0) {
      validateQuantity(quantity, this.client.getLocale());
    }
    const data = { quantity: String(quantity), ...options };
    return this.post(`item/${itemKey}`, data);
  }

  /**
   * Update multiple items' quantities, one request per item, sequentially.
   *
   * Accepts either shorthand (item_key => quantity) or full format. Returns
   * the response from the last update (reflects the fully-updated cart).
   *
   * @see CHANGELOG for why this isn't a single bulk request.
   */
  async updateItems(
    items: Record<string, number> | Array<{ item_key: string; quantity: number; [key: string]: unknown }>,
  ): Promise<Response> {
    const entries = this.normalizeItemEntries(items);

    if (entries.length === 0) {
      throw new ValidationError('updateItems() requires at least one item.');
    }

    let response: Response | undefined;
    for (const [itemKey, quantity] of entries) {
      response = await this.updateItem(itemKey, quantity);
    }

    return response as Response;
  }

  /**
   * Update multiple items' quantities in a single request via the `cocart/batch`
   * endpoint (requires CoCart Plus). Unlike `updateItems()`, this is a true
   * single round trip instead of one sequential request per item.
   *
   * Accepts the same shorthand/full formats as `updateItems()`.
   */
  async batchUpdateItems(
    items: Record<string, number> | Array<{ item_key: string; quantity: number; [key: string]: unknown }>,
  ): Promise<Response> {
    const entries = this.normalizeItemEntries(items);

    if (entries.length === 0) {
      throw new ValidationError('batchUpdateItems() requires at least one item.');
    }

    const requests: BatchRequestItem[] = entries.map(([itemKey, quantity]) => ({
      method: 'POST',
      path: `/${this.client.getNamespace()}/${this.client.getApiVersion()}/cart/item/${itemKey}`,
      body: { quantity: String(quantity) },
    }));

    return this.client.batch(requests);
  }

  /** Convert the shorthand (item_key => quantity) or full array format into entry tuples. */
  private normalizeItemEntries(
    items: Record<string, number> | Array<{ item_key: string; quantity: number; [key: string]: unknown }>,
  ): Array<[string, number]> {
    return Array.isArray(items)
      ? items.map(item => [item.item_key, item.quantity] as [string, number])
      : Object.entries(items);
  }

  /** Remove an item from the cart. */
  async removeItem(itemKey: string): Promise<Response> {
    return this.delete(`item/${itemKey}`);
  }

  /**
   * Remove multiple items from the cart, one request per item, sequentially.
   * Returns the response from the last removal (reflects the fully-updated cart).
   *
   * @see CHANGELOG for why this isn't a single bulk request.
   */
  async removeItems(itemKeys: string[]): Promise<Response> {
    if (itemKeys.length === 0) {
      throw new ValidationError('removeItems() requires at least one item key.');
    }

    let response: Response | undefined;
    for (const itemKey of itemKeys) {
      response = await this.removeItem(itemKey);
    }

    return response as Response;
  }

  /**
   * Remove multiple items in a single request via the `cocart/batch` endpoint
   * (requires CoCart Plus). Unlike `removeItems()`, this is a true single
   * round trip instead of one sequential request per item.
   */
  async batchRemoveItems(itemKeys: string[]): Promise<Response> {
    if (itemKeys.length === 0) {
      throw new ValidationError('batchRemoveItems() requires at least one item key.');
    }

    const requests: BatchRequestItem[] = itemKeys.map(itemKey => ({
      method: 'DELETE',
      path: `/${this.client.getNamespace()}/${this.client.getApiVersion()}/cart/item/${itemKey}`,
    }));

    return this.client.batch(requests);
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
    this.client.requiresBasic('cart()->create');
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
   * Update customer billing (and optionally shipping) address on the cart.
   *
   * Posts to the `update-customer` callback on `POST /cart/update`, verified
   * against the CoCart plugin's actual `update-customer.php` callback -
   * billing fields are sent unprefixed (`first_name`, `address_1`, ...) and
   * shipping fields are sent `s_`-prefixed (`s_first_name`, `s_address_1`,
   * ...), which the server always validates as required for any address
   * field the destination country marks required, independent of whether
   * `ship_to_different_address` is set. If `shipping` is omitted, billing is
   * mirrored into the `s_` fields so that check passes and the shipping
   * address matches billing, same as leaving "ship to a different address"
   * unchecked at a normal WooCommerce checkout.
   *
   * Setting an address is available on CoCart Basic. If the destination
   * country/state has shipping zones configured, the response's cart-level
   * `shipping` field (see `getShippingMethods()`) is populated with
   * calculated packages and rates - also Basic. Selecting a non-default rate
   * (`setShippingMethod()`) requires CoCart Plus.
   *
   * @param billing  Billing address fields (unprefixed, e.g. `{ first_name, address_1, city, postcode, country, email, phone }`)
   * @param shipping Shipping address fields, if different from billing. Omit to mirror billing.
   */
  async updateCustomer(
    billing: Record<string, string> = {},
    shipping?: Record<string, string>,
  ): Promise<Response> {
    const shipTo = shipping && Object.keys(shipping).length > 0 ? shipping : billing;
    const data: Record<string, unknown> = { namespace: 'update-customer' };

    for (const [key, value] of Object.entries(billing)) {
      data[key] = value;
    }
    for (const [key, value] of Object.entries(shipTo)) {
      data[`s_${key}`] = value;
    }
    if (shipping && Object.keys(shipping).length > 0) {
      data.ship_to_different_address = true;
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

  /**
   * Select a shipping rate for a package (CoCart Plus).
   *
   * Posts `rate_id` (and optional `package_id`) to `POST /cart/set-shipping-method`,
   * verified against CoCart Plus's actual set-shipping-method controller.
   * Omit `packageId` to apply the rate to every package.
   *
   * @param rateId     The chosen rate's key, e.g. `flat_rate:2` (see a shipping package's `rates` map).
   * @param packageId  Restrict the selection to one package. Omit to apply to all packages.
   */
  async setShippingMethod(rateId: string, packageId?: string): Promise<Response> {
    const data: Record<string, unknown> = { rate_id: rateId };
    if (packageId) data.package_id = packageId;
    return this.post('set-shipping-method', data);
  }

  /**
   * @deprecated There is no address-taking shipping-calculation endpoint in
   * the CoCart REST API - `POST /cart/calculate/shipping` (what this method
   * used to call) does not exist. To calculate shipping, call
   * `updateCustomer()` with the destination address first (the server
   * recalculates totals as part of that request); this method now just
   * delegates to `calculate()`, ignoring `address`. Prefer `calculate()`
   * directly.
   */
  async calculateShipping(address?: Record<string, string>): Promise<Response> {
    void address;
    return this.calculate();
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
}
