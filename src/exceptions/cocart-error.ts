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

  /**
   * Every field at fault, by path (e.g. `billing.postcode`), with its message: CoCart Plus checks
   * a whole form at once (`data.fields`). Empty when the error isn't about fields.
   */
  getFields(): Record<string, string> {
    const fields = this.data()?.fields;
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
    const out: Record<string, string> = {};
    for (const [path, message] of Object.entries(fields as Record<string, unknown>)) {
      if (typeof message === 'string') out[path] = message;
    }
    return out;
  }

  /** The first field at fault, as a path such as `billing.postcode` (`data.field`), or `null`. */
  getField(): string | null {
    const field = this.data()?.field;
    return typeof field === 'string' && field !== '' ? field : null;
  }

  /** The underlying plugin's own reason, when there is one (`data.reason`), or `null`. */
  getReason(): string | null {
    const reason = this.data()?.reason;
    return typeof reason === 'string' && reason !== '' ? reason : null;
  }

  private data(): Record<string, unknown> | undefined {
    const data = this.responseData.data;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : undefined;
  }
}
