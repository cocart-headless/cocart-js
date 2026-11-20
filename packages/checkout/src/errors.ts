import { CoCartError } from '@cocartheadless/sdk';

/**
 * `placeOrder()` sent the order but no answer came back (the connection dropped, the request timed
 * out, or a proxy gave up waiting), so the order may or may not have been placed. Don't place it
 * again blindly: ask `getCheckoutStatus(error.checkoutId)` how it ended.
 *
 * Keeps the original error's message and codes, so code that catches `CoCartError` still works.
 */
export class CheckoutOutcomeUnknownError extends CoCartError {
  /** The `checkout_id` the order was sent with. */
  readonly checkoutId: string;

  constructor(cause: CoCartError, checkoutId: string) {
    super(cause.message, cause.httpCode, cause.errorCode, cause.responseData);
    this.name = 'CheckoutOutcomeUnknownError';
    this.checkoutId = checkoutId;
  }
}
