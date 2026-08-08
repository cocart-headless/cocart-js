import { Endpoint } from './endpoint.js';
import type { Response } from '../response.js';
import type {
  AccountChangePasswordInput,
  AccountDownload,
  AccountOrderDetail,
  AccountOrdersParams,
  AccountOrdersResponse,
  AccountProfile,
  AccountUpdateInput,
  RegisterCustomerInput,
  RegisteredCustomer,
} from '../cocart.types.js';

const ROUTE_BASE = 'cocart/v2/my-account';
const REGISTER_ROUTE = 'cocart/v2/register';

/**
 * Account Endpoint
 *
 * Provides access to the authenticated customer's account data —
 * profile, orders, downloads, and reviews.
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

  async changePassword(data: AccountChangePasswordInput): Promise<Response<{ success: boolean; message: string }>> {
    const body = {
      password_current: data.current,
      password_1: data.password,
      password_2: data.confirm,
    };
    try {
      return (await this.client.requestRaw('POST', `${ROUTE_BASE}/change-password`, undefined, body)) as Response<{ success: boolean; message: string }>;
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

  async getOrderDownloads(id: number): Promise<Response<AccountDownload[]>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/orders/${id}/downloads`)) as Response<AccountDownload[]>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  async getGuestOrderDownloads(id: number, email: string): Promise<Response<AccountDownload[]>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/orders/${id}/downloads`, { email })) as Response<AccountDownload[]>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  async getDownloads(): Promise<Response<AccountDownload[]>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/downloads`)) as Response<AccountDownload[]>;
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  async getReviews(): Promise<Response<unknown>> {
    try {
      return (await this.client.requestRaw('GET', `${ROUTE_BASE}/reviews`)) as Response<unknown>;
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
