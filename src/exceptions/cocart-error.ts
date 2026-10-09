import type { CartResponse } from '../cocart.types.js';

/**
 * Base error class for CoCart SDK.
 */
export class CoCartError extends Error {
  /** HTTP status code */
  readonly httpCode: number;
  /** API error code (e.g. 'rest_no_route', 'cocart_invalid_product') */
  readonly errorCode: string | null;
  /** Full API response data */
  readonly responseData: Record<string, unknown>;

  constructor(
    message: string,
    httpCode: number = 0,
    errorCode: string | null = null,
    responseData: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'CoCartError';
    this.httpCode = httpCode;
    this.errorCode = errorCode;
    this.responseData = responseData;
  }

  /**
   * The cart sent with the error, when CoCart sends one: `cocart_item_not_in_cart` (an item key that
   * isn't in the cart) carries the cart as it is now, so you can show it without another request.
   */
  getCart(): CartResponse | null {
    const data = this.responseData.data as { cart?: unknown } | undefined;
    const cart = data?.cart;
    return cart && typeof cart === 'object' && !Array.isArray(cart) ? (cart as CartResponse) : null;
  }
}
