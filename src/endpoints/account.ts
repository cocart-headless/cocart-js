import { Endpoint } from './endpoint.js';
import type { Response } from '../response.js';
import { CheckoutResult, toPaymentDataPairs } from '../checkout-result.js';
import type {
  AccountAddressUpdateInput,
  AccountCancelOrderResult,
  AccountChangePasswordInput,
  AccountOrderDetail,
  AccountOrdersParams,
  AccountOrdersResponse,
  AccountProfile,
  AccountSubscriptionPaymentMethodInput,
  AccountSubscriptionsParams,
  AccountUpdateInput,
  DocumentParams,
  Downloads,
  EmailChange,
  EmailVerification,
  OrderWithdrawal,
  OrderWithdrawalInput,
  RegisterCustomerInput,
  RegisteredCustomer,
  Subscription,
  SubscriptionList,
  SubscriptionUpdate,
} from '../cocart.types.js';

const ROUTE_BASE = 'cocart/v2/my-account';
const REGISTER_ROUTE = 'cocart/v2/register';
const WITHDRAWAL_ROUTE = 'cocart/v2/order-withdrawal';

/**
 * The query for `formatted`, `meta_keys` and any other values given, as strings, or `undefined`
 * when there are none. A list is comma-joined.
 */
function documentQuery(params: object = {}): Record<string, string> | undefined {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    query[key] = Array.isArray(value) ? value.join(',') : String(value);
  }
  return Object.keys(query).length > 0 ? query : undefined;
}

/**
 * Account Endpoint
 *
 * Provides access to the authenticated customer's account data —
 * profile, address, orders, downloads, subscriptions and email verification (CoCart Plus).
 *
 * All methods require the customer to be authenticated (Basic Auth or JWT).
 * If the required CoCart plugin is not installed, a `cocart_plugin_required`
 * error is thrown via the inherited `handleNoRoute()` fail-safe.
 */
export class Account extends Endpoint {
  protected endpoint = ROUTE_BASE;

  /** The signed-in customer: name, email, addresses, order stats and `actions`. */
  async getProfile(params: DocumentParams = {}): Promise<Response<AccountProfile>> {
    try {
      return (await this.client.requestRaw('GET', ROUTE_BASE, documentQuery(params))) as Response<AccountProfile>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * Save the account details: send only what changes. Returns the customer with `account_updated`
   * in `result`. Every field at fault is reported at once (`CoCartError.getFields()`).
   */
  async updateProfile(data: AccountUpdateInput): Promise<Response<AccountProfile>> {
    try {
      return (await this.client.requestRaw('POST', ROUTE_BASE, undefined, data as unknown as Record<string, unknown>)) as Response<AccountProfile>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * Change the customer's password (`POST /my-account`). Returns the customer with
   * `account_updated` in `result`. A wrong current password is a `ValidationError`
   * (`cocart_account_incorrect_current_password`).
   */
  async changePassword(data: AccountChangePasswordInput): Promise<Response<AccountProfile>> {
    const body = {
      password_current: data.current,
      password_1: data.password,
      password_2: data.confirm,
    };
    try {
      return (await this.client.requestRaw('POST', ROUTE_BASE, undefined, body)) as Response<AccountProfile>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * Update the customer's saved billing and/or shipping address (`POST /my-account/address`).
   * Fields are unprefixed (`first_name`, `address_1`…). Returns the customer.
   */
  async updateAddress(data: AccountAddressUpdateInput): Promise<Response<AccountProfile>> {
    try {
      return (await this.client.requestRaw('POST', `${ROUTE_BASE}/address`, undefined, data as unknown as Record<string, unknown>)) as Response<AccountProfile>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * The customer's orders, newest first, with `pagination` (also in `X-WP-Total` and
   * `X-WP-TotalPages`). Filter by `status`, by date with `after` and `before`, and by
   * `subscription_order_type`.
   */
  async getOrders(params: AccountOrdersParams = {}): Promise<Response<AccountOrdersResponse>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/orders`, documentQuery(params))) as Response<AccountOrdersResponse>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** One of the customer's orders. Someone else's order is `404 cocart_order_not_found`. */
  async getOrder(id: number, params: DocumentParams = {}): Promise<Response<AccountOrderDetail>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/orders/${id}`, documentQuery(params))) as Response<AccountOrderDetail>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * A guest's order, looked up with its billing email. It comes without its `key`. Lookups are
   * rate limited (`429 cocart_guest_lookup_rate_limited`).
   */
  async getGuestOrder(id: number, email: string, params: DocumentParams = {}): Promise<Response<AccountOrderDetail>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/orders/${id}`, documentQuery({ ...params, email }))) as Response<AccountOrderDetail>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** Cancel one of the customer's orders, where WooCommerce allows it (e.g. pending or failed). Returns the order with `result`. */
  async cancelOrder(id: number): Promise<Response<AccountCancelOrderResult>> {
    try {
      return (await this.client.requestRaw('POST', `${ROUTE_BASE}/orders/${id}/cancel`)) as Response<AccountCancelOrderResult>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** The files one of the customer's orders can download: `{ downloads: [...] }`. */
  async getOrderDownloads(id: number): Promise<Response<Downloads>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/orders/${id}/downloads`)) as Response<Downloads>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** The files a guest's order can download, looked up with its billing email: `{ downloads: [...] }`. */
  async getGuestOrderDownloads(id: number, email: string): Promise<Response<Downloads>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/orders/${id}/downloads`, { email })) as Response<Downloads>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** Every file the customer can download: `{ downloads: [...] }`. */
  async getDownloads(): Promise<Response<Downloads>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/downloads`)) as Response<Downloads>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** The customer's product reviews (`GET /products/reviews/mine`). Same as `products().myReviews()`. */
  async getReviews(params?: Record<string, string>): Promise<Response<unknown>> {
    return this.client.products().myReviews(params);
  }

  // --- Email verification (CoCart Plus) ---

  /** Confirm a pending email change with the `key` and `user_id` from the emailed link. Returns the new email with `result`. */
  async verifyEmail(key: string, userId: number): Promise<Response<EmailChange>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/verify-email`, { key, user_id: String(userId) })) as Response<EmailChange>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * Email the customer a link proving they own their account email, so WooCommerce can link past
   * guest orders placed with it. Returns where it went, with `retry_after` (seconds before another
   * can be sent). WooCommerce 11+.
   */
  async sendOrderEmailVerification(): Promise<Response<EmailVerification>> {
    try {
      return (await this.client.requestRaw('POST', `${ROUTE_BASE}/verify-order-email`)) as Response<EmailVerification>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** Confirm the order-email verification with the `key` and `user_id` from the emailed link. Returns the customer with `result`. */
  async verifyOrderEmail(key: string, userId: number): Promise<Response<AccountProfile>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/verify-order-email`, { key, user_id: String(userId) })) as Response<AccountProfile>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  // --- Subscriptions (CoCart Plus with WooCommerce Subscriptions) ---

  /** The customer's subscriptions, with `pagination`. Filter by `status`. */
  async getSubscriptions(params: AccountSubscriptionsParams = {}): Promise<Response<SubscriptionList>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/subscriptions`, documentQuery(params))) as Response<SubscriptionList>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** One subscription. Pass `email` to view it as a guest. */
  async getSubscription(id: number, email?: string, params: DocumentParams = {}): Promise<Response<Subscription>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/subscriptions/${id}`, documentQuery(email ? { ...params, email } : params))) as Response<Subscription>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** Suspend (put on hold) a subscription. */
  async suspendSubscription(id: number): Promise<Response<SubscriptionUpdate>> {
    return this.subscriptionAction(id, 'suspend');
  }

  /** Cancel a subscription. */
  async cancelSubscription(id: number): Promise<Response<SubscriptionUpdate>> {
    return this.subscriptionAction(id, 'cancel');
  }

  /** Reactivate a suspended subscription. */
  async reactivateSubscription(id: number): Promise<Response<SubscriptionUpdate>> {
    return this.subscriptionAction(id, 'reactivate');
  }

  /** Turn automatic renewal on or off. */
  async setSubscriptionAutoRenew(id: number, enabled: boolean): Promise<Response<SubscriptionUpdate>> {
    return this.subscriptionAction(id, 'auto-renew', { enabled });
  }

  /**
   * Change the card a subscription renews with: a saved card (`token_id`) or a new one (`payment_data`).
   * A new card may need 3D Secure, so this returns a `CheckoutResult` as checkout does:
   * `isComplete` once changed (`payment_method_changed`, with `subscriptionId`); on
   * `needsConfirmation`, confirm `clientSecret` with the gateway's SDK and call again with the same
   * input; on `needsRedirect`, send the customer to `redirectUrl`. A declined card is a failed
   * result, not an exception. Another change still running is `409 cocart_payment_in_progress`.
   */
  async updateSubscriptionPaymentMethod(id: number, data: AccountSubscriptionPaymentMethodInput): Promise<CheckoutResult> {
    const body: Record<string, unknown> = { ...data };
    if (data.payment_data !== undefined) body.payment_data = toPaymentDataPairs(data.payment_data);
    return CheckoutResult.fromResponse(await this.subscriptionAction(id, 'payment-method', body));
  }

  /** Put an ended subscription's items in the cart to subscribe again (checkout follows as usual). */
  async resubscribe(id: number): Promise<Response> {
    return this.subscriptionAction<unknown>(id, 'resubscribe');
  }

  /** Undo `resubscribe()`: restore the cart as it was before. */
  async cancelResubscribe(id: number): Promise<Response> {
    try {
      return await this.client.requestRaw('DELETE', `${ROUTE_BASE}/subscriptions/${id}/resubscribe`);
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  private async subscriptionAction<T = SubscriptionUpdate>(id: number, action: string, body?: Record<string, unknown>): Promise<Response<T>> {
    try {
      return (await this.client.requestRaw('POST', `${ROUTE_BASE}/subscriptions/${id}/${action}`, undefined, body ?? null)) as Response<T>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  // --- Order withdrawal (CoCart Plus) ---

  /**
   * Submit an order withdrawal (right of withdrawal) request. Doesn't need the customer logged in.
   * Returns `withdrawal_requested` in `result` with the email the acknowledgement went to.
   * Needs WooCommerce 11.1+ with its order withdrawal feature on (else `404 cocart_order_withdrawal_unavailable`).
   */
  async requestOrderWithdrawal(data: OrderWithdrawalInput): Promise<Response<OrderWithdrawal>> {
    try {
      return (await this.client.requestRaw('POST', WITHDRAWAL_ROUTE, undefined, data as unknown as Record<string, unknown>)) as Response<OrderWithdrawal>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * Register a new customer. Unauthenticated — does not require the customer to be logged in.
   * Returns `201` with the customer and `account_created` in `result`; log in next. An email or
   * username already used is `409` (`cocart_account_exists`, `cocart_registration_username_exists`).
   */
  async register(data: RegisterCustomerInput): Promise<Response<RegisteredCustomer>> {
    const body: Record<string, unknown> = { email: data.email };
    if (data.requestedUsername !== undefined) body.requested_username = data.requestedUsername;
    if (data.requestedPassword !== undefined) body.requested_password = data.requestedPassword;
    try {
      return (await this.client.requestRaw('POST', REGISTER_ROUTE, undefined, body)) as Response<RegisteredCustomer>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }
}
