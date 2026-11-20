import type { Response } from './response.js';

/**
 * What a call that takes payment did: `result.code` (CoCart Plus 2.0). Open-ended, so a value a
 * store or gateway adds still comes through as it is.
 *
 * - `order_placed`: paid, nothing to pay, or held for review or offline payment.
 * - `action_required`: the customer must do something first, e.g. 3D Secure. See `action`.
 * - `payment_pending`: the gateway hasn't confirmed the payment yet.
 * - `payment_failed`: the gateway declined the payment. See `error`.
 * - `payment_method_changed`: a subscription's payment method changed.
 */
export type PaymentResultCode =
  | 'order_placed'
  | 'action_required'
  | 'payment_pending'
  | 'payment_failed'
  | 'payment_method_changed'
  | (string & {});

/** `payment_data` as the API takes it: a list of `{key, value}` pairs. */
export interface PaymentDataPair {
  key: string;
  value: string | number | boolean;
}

/** `payment_data` as a map of the keys the WooCommerce gateway reads, or already as pairs. */
export type PaymentDataInput = Record<string, string | number | boolean> | PaymentDataPair[];

/** Turns a `payment_data` map into the `{key, value}` pairs the API takes. A list passes through as it is. */
export function toPaymentDataPairs(data: PaymentDataInput): PaymentDataPair[] {
  if (Array.isArray(data)) return data;
  return Object.entries(data).map(([key, value]) => ({ key, value }));
}

type Body = Record<string, unknown>;

const isObject = (value: unknown): value is Body =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * A web address the customer can be sent to: `https` or `http` only. Anything else (`javascript:`,
 * `data:`, another app's link, a relative path) is left out, so a response can't make the page run
 * script or open another app.
 */
const webUrl = (value: unknown): string | undefined => {
  const url = text(value);
  return url !== undefined && /^https?:\/\/[^\s/?#]/i.test(url) ? url : undefined;
};

const integer = (value: unknown): number | undefined => {
  const n = typeof value === 'string' && value !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) ? n : undefined;
};

/**
 * The outcome of a call that takes payment: placing an order, paying for an unpaid order,
 * returning from an off-site step, or changing a subscription's payment method (CoCart Plus 2.0).
 *
 * Read it from the response's `result`. A declined card is a result (`isFailed`), not an
 * exception: exceptions are kept for requests the store refuses before it tries to take payment.
 */
export class CheckoutResult {
  /** `result.code`: `order_placed`, `action_required`, `payment_pending`, `payment_failed`, or `payment_method_changed` for a subscription. */
  readonly code: PaymentResultCode;
  /** The document returned: `order`, or `subscription` after a subscription's payment method change. */
  readonly object?: string;
  /** The order's ID, when the document is an order. */
  readonly orderId?: number;
  /** The order's key, needed to view or pay for it as a guest. */
  readonly orderKey?: string;
  /** The order number, for display. Can differ from the ID. */
  readonly orderNumber?: string;
  /** The order's status code, e.g. `processing`, `on-hold` or `pending`. */
  readonly orderStatus?: string;
  /** The subscription's ID, when the document is a subscription. */
  readonly subscriptionId?: number;
  /**
   * Where to send the customer: the off-site step when `needsRedirect`, otherwise the page to show
   * once the payment is done (the order-received page, or the gateway's own). Only ever an
   * `https` or `http` address.
   */
  readonly redirectUrl?: string;
  /** For an in-page step (3D Secure), or a payment the customer makes in the page: give it to the gateway's SDK. */
  readonly clientSecret?: string;
  /** `payment_intent` or `setup_intent`, alongside `clientSecret`. */
  readonly intentType?: string;
  /** The Stripe payment method to pay with when `isAwaitingPayment`: `cashapp`, `wechat_pay`, `boleto`, `oxxo` or `multibanco`. */
  readonly paymentMethodType?: string;
  /** A message for the customer, for every code: why a payment failed, or that the order was received. */
  readonly message?: string;
  /** CoCart's code for why the payment failed: `card_declined`, `insufficient_funds`… or `payment_failed`. */
  readonly errorCode?: string;
  /** The gateway's own error code, for logging. */
  readonly gatewayErrorCode?: string;
  /** The gateway's own message, for logging. */
  readonly gatewayMessage?: string;
  /** What the customer must do, as the gateway integration names it, e.g. `stripe_confirm_payment` or `stripe_voucher_payment`. */
  readonly actionType?: string;
  /** What the action needs, e.g. `client_secret` or `redirect`. */
  readonly actionData?: Record<string, unknown>;
  /** The raw response: the order, or the subscription. */
  readonly response: Response;

  private constructor(fields: Omit<CheckoutResult, 'isComplete' | 'isAwaitingPayment' | 'needsConfirmation' | 'needsRedirect' | 'isPending' | 'isFailed'>) {
    Object.assign(this, fields);
    this.code = fields.code;
    this.response = fields.response;
  }

  /** Paid, nothing to pay, or held for review or offline payment: the order is placed (or the subscription's payment method changed). */
  get isComplete(): boolean {
    return (this.code === 'order_placed' || this.code === 'payment_method_changed') && this.actionType === undefined;
  }

  /**
   * The order is placed but not paid yet: the customer pays outside the checkout. With
   * `clientSecret`, pay in the page with the gateway's SDK for `paymentMethodType` (Cash App Pay,
   * WeChat Pay, a Boleto, OXXO or Multibanco voucher); otherwise `actionType` says what to show
   * (`stripe_blik_confirmation_pending`: approve in the banking app; bank transfer instructions…).
   * The gateway's webhook marks the order paid, so don't place the order again.
   */
  get isAwaitingPayment(): boolean {
    return this.code === 'order_placed' && this.actionType !== undefined;
  }

  /** The card needs an in-page step (3D Secure). Confirm `clientSecret` with the gateway's SDK, then make the same call again. */
  get needsConfirmation(): boolean {
    return this.code === 'action_required' && this.clientSecret !== undefined;
  }

  /** The payment needs an off-site step. Send the customer to `redirectUrl`, then call `confirmReturn()` when they come back. */
  get needsRedirect(): boolean {
    return this.code === 'action_required' && this.clientSecret === undefined && webUrl(this.actionData?.redirect) !== undefined;
  }

  /** The gateway hasn't confirmed the payment yet. Confirm again shortly, or check the order. */
  get isPending(): boolean {
    return this.code === 'payment_pending';
  }

  /** The payment was declined or couldn't be taken. Show `message`; the order can be paid again. */
  get isFailed(): boolean {
    return this.code === 'payment_failed';
  }

  /** Reads the document a call that takes payment returns, with what the payment did in `result`. */
  static fromResponse(response: Response): CheckoutResult {
    const body = response.toObject();
    const data: Body = isObject(body) ? body : {};
    const result: Body = isObject(data.result) ? data.result : {};
    const action = isObject(result.action) ? result.action : undefined;
    const actionData = isObject(action?.data) ? action.data : undefined;
    const error = isObject(result.error) ? result.error : undefined;
    const object = text(data.object);
    const isOrder = object !== 'subscription';
    const code = text(result.code) ?? 'payment_failed';
    const status = isObject(data.status) ? data.status : undefined;
    const number = text(data.number) ?? (integer(data.number) !== undefined ? String(data.number) : undefined);
    const offSite = webUrl(actionData?.redirect);

    return new CheckoutResult({
      code,
      object,
      orderId: isOrder ? integer(data.id) : undefined,
      orderKey: isOrder ? text(data.key) : undefined,
      orderNumber: isOrder ? number : undefined,
      orderStatus: isOrder ? text(status?.code) : undefined,
      subscriptionId: isOrder ? undefined : integer(data.id),
      redirectUrl: code === 'action_required' ? offSite ?? webUrl(result.redirect_url) : webUrl(result.redirect_url) ?? offSite,
      clientSecret: text(actionData?.client_secret),
      intentType: text(actionData?.intent_type),
      paymentMethodType: text(actionData?.payment_method_type),
      message: text(result.message),
      errorCode: text(error?.code),
      gatewayErrorCode: text(error?.gateway_code),
      gatewayMessage: text(error?.gateway_message),
      actionType: text(action?.type),
      actionData,
      response,
    });
  }
}
