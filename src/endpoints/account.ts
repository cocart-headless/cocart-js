import { Endpoint } from './endpoint.js';
import type { Response } from '../response.js';
import { Response as CoCartResponse } from '../response.js';
import type {
  AccountAddressUpdateInput,
  AccountCancelOrderResult,
  AccountChangePasswordInput,
  AccountDownload,
  AccountOrderDetail,
  AccountOrdersParams,
  AccountOrdersResponse,
  AccountProfile,
  AccountSubscriptionPaymentMethodInput,
  AccountUpdateInput,
  OrderWithdrawalInput,
  RegisterCustomerInput,
  RegisteredCustomer,
} from '../cocart.types.js';

const ROUTE_BASE = 'cocart/v2/my-account';
const REGISTER_ROUTE = 'cocart/v2/register';
const WITHDRAWAL_ROUTE = 'cocart/v2/order-withdrawal';

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

  async getProfile(): Promise<Response<AccountProfile>> {
    try {
      return (await this.client.requestRaw('GET', ROUTE_BASE)) as Response<AccountProfile>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  async updateProfile(data: AccountUpdateInput): Promise<Response<{ success: boolean; message: string }>> {
    try {
      return (await this.client.requestRaw('POST', ROUTE_BASE, undefined, data as unknown as Record<string, unknown>)) as Response<{ success: boolean; message: string }>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * Change the customer's password.
   *
   * CoCart Plus takes the new password on `POST /my-account`, which also requires the account's
   * first name, last name, display name and email. Pass them in `details`, or leave it out and
   * they're read from the profile first (one extra request).
   */
  async changePassword(
    data: AccountChangePasswordInput,
    details?: AccountUpdateInput,
  ): Promise<Response<{ success: boolean; message: string }>> {
    let account = details;
    if (!account) {
      const user = (await this.getProfile()).toObject().user;
      account = {
        account_first_name: user.first_name,
        account_last_name: user.last_name,
        account_display_name: user.display_name,
        account_email: user.email,
      };
    }
    const body = {
      ...account,
      password_current: data.current,
      password_1: data.password,
      password_2: data.confirm,
    };
    try {
      return (await this.client.requestRaw('POST', ROUTE_BASE, undefined, body)) as Response<{ success: boolean; message: string }>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * Update the customer's saved billing and/or shipping address (`POST /my-account/address`).
   * Fields are unprefixed (`first_name`, `address_1`…).
   */
  async updateAddress(data: AccountAddressUpdateInput): Promise<Response> {
    try {
      return await this.client.requestRaw('POST', `${ROUTE_BASE}/address`, undefined, data as unknown as Record<string, unknown>);
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  async getOrders(params: AccountOrdersParams = {}): Promise<Response<AccountOrdersResponse>> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query['page'] = String(params.page);
    if (params.per_page !== undefined) query['per_page'] = String(params.per_page);
    if (params.order !== undefined) query['order'] = params.order;
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/orders`, query)) as Response<AccountOrdersResponse>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  async getOrder(id: number): Promise<Response<AccountOrderDetail>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/orders/${id}`)) as Response<AccountOrderDetail>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  async getGuestOrder(id: number, email: string): Promise<Response<AccountOrderDetail>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/orders/${id}`, { email })) as Response<AccountOrderDetail>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** Cancel one of the customer's orders, where WooCommerce allows it (e.g. pending or failed). */
  async cancelOrder(id: number): Promise<Response<AccountCancelOrderResult>> {
    try {
      return (await this.client.requestRaw('POST', `${ROUTE_BASE}/orders/${id}/cancel`)) as Response<AccountCancelOrderResult>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** Downloads for one order, taken from the order's details (`downloads`). */
  async getOrderDownloads(id: number): Promise<Response<AccountDownload[]>> {
    return Account.downloadsOf(await this.getOrder(id));
  }

  /** Downloads for a guest order, taken from the order's details (`downloads`). */
  async getGuestOrderDownloads(id: number, email: string): Promise<Response<AccountDownload[]>> {
    return Account.downloadsOf(await this.getGuestOrder(id, email));
  }

  private static downloadsOf(order: Response<AccountOrderDetail>): Response<AccountDownload[]> {
    const downloads = order.toObject().downloads ?? [];
    return new CoCartResponse<AccountDownload[]>(order.statusCode, order.headers, JSON.stringify(Array.isArray(downloads) ? downloads : Object.values(downloads)));
  }

  async getDownloads(): Promise<Response<AccountDownload[]>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/downloads`)) as Response<AccountDownload[]>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** The customer's product reviews (`GET /products/reviews/mine`). Same as `products().myReviews()`. */
  async getReviews(params?: Record<string, string>): Promise<Response<unknown>> {
    return this.client.products().myReviews(params);
  }

  // --- Email verification (CoCart Plus) ---

  /** Confirm a pending email change with the `key` and `user_id` from the emailed link. */
  async verifyEmail(key: string, userId: number): Promise<Response> {
    try {
      return await this.client.requestRaw('GET', `${ROUTE_BASE}/verify-email`, { key, user_id: String(userId) });
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * Email the customer a link proving they own their account email, so WooCommerce can link past
   * guest orders placed with it. Throttled to once a minute (`status: throttled`). WooCommerce 11+.
   */
  async sendOrderEmailVerification(): Promise<Response<{ success: boolean; status: string }>> {
    try {
      return (await this.client.requestRaw('POST', `${ROUTE_BASE}/verify-order-email`)) as Response<{ success: boolean; status: string }>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** Confirm the order-email verification with the `key` and `user_id` from the emailed link. */
  async verifyOrderEmail(key: string, userId: number): Promise<Response<{ success: boolean; email: string }>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/verify-order-email`, { key, user_id: String(userId) })) as Response<{ success: boolean; email: string }>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  // --- Subscriptions (CoCart Plus with WooCommerce Subscriptions) ---

  /** The customer's subscriptions. */
  async getSubscriptions(params: AccountOrdersParams = {}): Promise<Response> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query['page'] = String(params.page);
    if (params.per_page !== undefined) query['per_page'] = String(params.per_page);
    if (params.order !== undefined) query['order'] = params.order;
    try {
      return await this.client.requestRaw('GET', `${ROUTE_BASE}/subscriptions`, query);
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** One subscription. Pass `email` to view it as a guest. */
  async getSubscription(id: number, email?: string): Promise<Response> {
    try {
      return await this.client.requestRaw('GET', `${ROUTE_BASE}/subscriptions/${id}`, email ? { email } : undefined);
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** Suspend (put on hold) a subscription. */
  async suspendSubscription(id: number): Promise<Response> {
    return this.subscriptionAction(id, 'suspend');
  }

  /** Cancel a subscription. */
  async cancelSubscription(id: number): Promise<Response> {
    return this.subscriptionAction(id, 'cancel');
  }

  /** Reactivate a suspended subscription. */
  async reactivateSubscription(id: number): Promise<Response> {
    return this.subscriptionAction(id, 'reactivate');
  }

  /** Turn automatic renewal on or off. */
  async setSubscriptionAutoRenew(id: number, enabled: boolean): Promise<Response> {
    return this.subscriptionAction(id, 'auto-renew', { enabled });
  }

  /** Change the payment method used for renewals. */
  async updateSubscriptionPaymentMethod(id: number, data: AccountSubscriptionPaymentMethodInput): Promise<Response> {
    return this.subscriptionAction(id, 'payment-method', data as unknown as Record<string, unknown>);
  }

  /** Put an ended subscription's items in the cart to subscribe again (checkout follows as usual). */
  async resubscribe(id: number): Promise<Response> {
    return this.subscriptionAction(id, 'resubscribe');
  }

  /** Undo `resubscribe()`: restore the cart as it was before. */
  async cancelResubscribe(id: number): Promise<Response> {
    try {
      return await this.client.requestRaw('DELETE', `${ROUTE_BASE}/subscriptions/${id}/resubscribe`);
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  private async subscriptionAction(id: number, action: string, body?: Record<string, unknown>): Promise<Response> {
    try {
      return await this.client.requestRaw('POST', `${ROUTE_BASE}/subscriptions/${id}/${action}`, undefined, body ?? null);
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  // --- Order withdrawal (CoCart Plus) ---

  /** Submit an order withdrawal (right of withdrawal) request. Doesn't need the customer logged in. */
  async requestOrderWithdrawal(data: OrderWithdrawalInput): Promise<Response> {
    try {
      return await this.client.requestRaw('POST', WITHDRAWAL_ROUTE, undefined, data as unknown as Record<string, unknown>);
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * Register a new customer. Unauthenticated — does not require the customer to be logged in.
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
