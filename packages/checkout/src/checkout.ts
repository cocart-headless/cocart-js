import { CheckoutResult, CoCartError, toPaymentDataPairs } from '@cocartheadless/sdk';
import type { CoCart, Response } from '@cocartheadless/sdk';
import { CheckoutOutcomeUnknownError } from './errors.js';
import { createCheckoutTheme } from './presets.js';
import type {
  AddressDetails,
  AddressDetailsParams,
  AddressSearchParams,
  AddressSearchResult,
  CheckoutConfig,
  CheckoutExpressBar,
  CheckoutFormDefinition,
  CheckoutFormField,
  CheckoutFormSection,
  CheckoutGatewayAdapter,
  CheckoutGatewayPresentation,
  CheckoutOrderSummary,
  CheckoutParams,
  CheckoutPaymentMethodsResponse,
  CheckoutProcessInput,
  CheckoutProcessResponse,
  CheckoutSDK,
  CheckoutSDKOptions,
  CheckoutShippingPackage,
  CheckoutShippingRate,
  CheckoutState,
  CheckoutStatus,
  CheckoutSubmitInput,
  CheckoutSubmitResult,
  CheckoutTheme,
  CheckoutUpdateInput,
  ConfirmOrderPaymentResponse,
  ConfirmReturnOptions,
  OrderReceived,
  PayForOrderInput,
  PaymentDataItem,
  PlaceOrderInput,
  SavedPaymentMethod,
} from './types.js';

const DEFAULT_CONTACT_FIELDS: CheckoutFormField[] = [
  { name: 'billing_address.email', label: 'Email address', type: 'email', autoComplete: 'email', required: true },
  { name: 'billing_address.phone', label: 'Phone number', type: 'tel', autoComplete: 'tel' },
];

const DEFAULT_BILLING_FIELDS: CheckoutFormField[] = [
  { name: 'billing_address.first_name', label: 'First name', type: 'text', autoComplete: 'given-name', required: true },
  { name: 'billing_address.last_name', label: 'Last name', type: 'text', autoComplete: 'family-name', required: true },
  { name: 'billing_address.address_1', label: 'Address line 1', type: 'text', autoComplete: 'address-line1', required: true },
  { name: 'billing_address.address_2', label: 'Address line 2', type: 'text', autoComplete: 'address-line2' },
  { name: 'billing_address.city', label: 'City', type: 'text', autoComplete: 'address-level2', required: true },
  { name: 'billing_address.state', label: 'State / Province', type: 'text', autoComplete: 'address-level1' },
  { name: 'billing_address.postcode', label: 'Postal code', type: 'text', autoComplete: 'postal-code', required: true },
  { name: 'billing_address.country', label: 'Country', type: 'text', autoComplete: 'country-name', required: true },
];

const DEFAULT_SHIPPING_FIELDS: CheckoutFormField[] = [
  { name: 'shipping_address.first_name', label: 'First name', type: 'text', autoComplete: 'shipping given-name', required: true },
  { name: 'shipping_address.last_name', label: 'Last name', type: 'text', autoComplete: 'shipping family-name', required: true },
  { name: 'shipping_address.address_1', label: 'Address line 1', type: 'text', autoComplete: 'shipping address-line1', required: true },
  { name: 'shipping_address.address_2', label: 'Address line 2', type: 'text', autoComplete: 'shipping address-line2' },
  { name: 'shipping_address.city', label: 'City', type: 'text', autoComplete: 'shipping address-level2', required: true },
  { name: 'shipping_address.state', label: 'State / Province', type: 'text', autoComplete: 'shipping address-level1' },
  { name: 'shipping_address.postcode', label: 'Postal code', type: 'text', autoComplete: 'shipping postal-code', required: true },
  { name: 'shipping_address.country', label: 'Country', type: 'text', autoComplete: 'shipping country-name', required: true },
];

const DEFAULT_NOTES_FIELDS: CheckoutFormField[] = [
  { name: 'customer_note', label: 'Order notes', type: 'textarea', placeholder: 'Delivery instructions or special notes' },
];

export class CheckoutClient implements CheckoutSDK {
  private readonly client: CoCart;
  private readonly routeBase: string;
  /** Base for routes that sit alongside `/checkout` rather than under it (`/address/*`, `/order-received/*`). Derived from `routeBase` by stripping its trailing `/checkout` segment. */
  private readonly apiBase: string;
  private readonly adapters = new Map<string, CheckoutGatewayAdapter>();
  private readonly defaultTheme: CheckoutTheme;
  private readonly defaultGateway?: string;
  private readonly collectShippingAddress: boolean;
  private readonly shippingSameAsBilling: boolean;
  private readonly fields: CheckoutSDKOptions['fields'];
  private readonly consumerKey?: string;
  private readonly consumerSecret?: string;
  private readonly successUrl?: string;
  private readonly returnUrl?: string;
  /**
   * The total of the checkout the app last fetched or updated (`getCheckout()`, `updateCheckout()`),
   * i.e. the one the customer was shown. `submit()` refuses to take payment when the checkout's
   * total has changed since, as CoCart Plus does with `cocart_checkout_total_mismatch`.
   */
  private shownTotal?: string;

  constructor(client: CoCart, options: CheckoutSDKOptions = {}) {
    this.client = client;
    this.routeBase = (options.routeBase ?? 'cocart/v2/checkout').replace(/^\/+|\/+$/g, '');
    this.apiBase = this.routeBase.endsWith('/checkout') ? this.routeBase.slice(0, -'/checkout'.length) : 'cocart/v2';
    this.defaultTheme = options.defaultTheme ?? createCheckoutTheme();
    this.defaultGateway = options.defaultGateway;
    this.collectShippingAddress = options.collectShippingAddress ?? true;
    this.shippingSameAsBilling = options.shippingSameAsBilling ?? true;
    this.fields = options.fields;
    this.consumerKey = options.consumerKey;
    this.consumerSecret = options.consumerSecret;
    this.successUrl = options.successUrl;
    this.returnUrl = options.returnUrl;
  }

  registerGateway(adapter: CheckoutGatewayAdapter): this {
    this.adapters.set(adapter.id, adapter);
    return this;
  }

  registerGateways(adapters: CheckoutGatewayAdapter[]): this {
    for (const adapter of adapters) {
      this.registerGateway(adapter);
    }
    return this;
  }

  hasGateway(id: string): boolean {
    return this.adapters.has(id);
  }

  getGateway(id: string): CheckoutGatewayAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new CoCartError(`Payment gateway "${id}" is not registered.`, 0, 'checkout_gateway_not_registered');
    }
    return adapter;
  }

  listExpressGateways(): CheckoutGatewayPresentation[] {
    return [...this.adapters.values()]
      .filter((adapter) => adapter.express === true)
      .sort((a, b) => (a.expressCheckoutPriority ?? 100) - (b.expressCheckoutPriority ?? 100))
      .map((adapter) => ({
        id: adapter.id,
        label: adapter.label,
        provider: adapter.provider,
        description: adapter.description,
        supports: adapter.supports ?? [],
      }));
  }

  createExpressCheckoutBar(options: { layout?: 'scroll' | 'stack'; theme?: CheckoutTheme } = {}): CheckoutExpressBar {
    const theme = options.theme ?? this.defaultTheme;
    const layout = options.layout ?? 'scroll';

    const gateways = [...this.adapters.values()]
      .filter((adapter) => adapter.express === true)
      .sort((a, b) => (a.expressCheckoutPriority ?? 100) - (b.expressCheckoutPriority ?? 100))
      .map((adapter) => ({
        id: adapter.id,
        label: adapter.label,
        fields: applyTheme(
          adapter.getExpressFields?.({
            client: this.client,
            checkout: this,
            gatewayId: adapter.id,
            theme,
            collectShippingAddress: this.collectShippingAddress,
            successUrl: this.successUrl,
            returnUrl: this.returnUrl,
          }) ?? [],
          theme,
        ),
      }));

    return { layout, theme, gateways };
  }

  listGateways(remoteMethods?: CheckoutPaymentMethodsResponse): CheckoutGatewayPresentation[] {
    const methods = new Map((remoteMethods?.payment_methods ?? []).map((method) => [method.id, method]));
    const ids = new Set([...methods.keys(), ...this.adapters.keys()]);

    return [...ids].map((id) => {
      const remoteMethod = methods.get(id);
      const adapter = this.adapters.get(id);
      // The store says what the method supports as flags: `{ tokenization: true, refunds: false… }`.
      const remoteSupports = Object.entries(remoteMethod?.supports ?? {}).filter(([, on]) => on === true).map(([name]) => name);
      return {
        id,
        label: remoteMethod?.title || adapter?.label || id,
        provider: adapter?.provider ?? id,
        description: remoteMethod?.description || adapter?.description,
        supports: [...new Set([...(adapter?.supports ?? []), ...remoteSupports])],
        remoteMethod,
      };
    });
  }

  /**
   * The checkout as it stands, like a receipt: items, coupons, fees, `totals` and `total_lines`,
   * the payment method, the addresses, each shipping package with its rates, and `actions`.
   * Call it for the page the customer reviews before paying: CoCart Plus remembers the total it
   * showed, and refuses the order if the total has changed by then (`cocart_checkout_total_mismatch`).
   */
  async getCheckout(params: CheckoutParams = {}): Promise<Response<CheckoutState>> {
    const response = await this.fetchCheckout(params);
    this.rememberShownTotal(response);
    return response;
  }

  /**
   * Save addresses, the shipping method, the payment method, a coupon (`coupon_code`,
   * `coupon_action`) or the currency, without placing the order. Returns the checkout with what it
   * did in `result`: `checkout_updated`, or `checkout_partly_updated` with what wasn't applied, and
   * why, in `result.not_applied`. Every address field at fault is reported at once
   * (`CoCartError.getFields()`).
   */
  async updateCheckout(data: CheckoutUpdateInput): Promise<Response<CheckoutState>> {
    const response = await this.putCheckout(data);
    this.rememberShownTotal(response);
    return response;
  }

  private async fetchCheckout(params: CheckoutParams = {}): Promise<Response<CheckoutState>> {
    try {
      return (await this.client.requestRaw('GET', this.routeBase, this.withPreviewAuth(toQueryParams(params)))) as Response<CheckoutState>;
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve checkout state.', 'checkout_fetch_failed');
    }
  }

  private async putCheckout(data: CheckoutUpdateInput): Promise<Response<CheckoutState>> {
    try {
      return (await this.client.requestRaw('PUT', this.routeBase, this.withPreviewAuth(), data as Record<string, unknown>)) as Response<CheckoutState>;
    } catch (err) {
      throw wrapError(err, 'Failed to update checkout.', 'checkout_update_failed');
    }
  }

  private rememberShownTotal(response: Response<CheckoutState>): void {
    const total = checkoutTotal(response.toObject());
    if (total !== undefined) this.shownTotal = total;
  }

  async processCheckout(data: CheckoutProcessInput): Promise<Response<CheckoutProcessResponse>> {
    try {
      return this.client.requestRaw('POST', this.routeBase, this.withPreviewAuth(), data as Record<string, unknown>) as Promise<Response<CheckoutProcessResponse>>;
    } catch (err) {
      throw wrapError(err, 'Failed to process checkout.', 'checkout_process_failed');
    }
  }

  /**
   * Creates the order and takes payment (`POST /checkout`). `payment_data` is a map of the keys the
   * WooCommerce gateway reads, e.g. `{ 'wc-stripe-payment-method': 'pm_…' }`; a free order needs
   * neither it nor `payment_method`. Calling again for the same cart lands on the same order.
   *
   * A declined card is a failed result, not an exception. Errors before payment (missing fields,
   * an empty cart) are thrown as `CoCartError`.
   *
   * The order is sent with a random `checkout_id` (or the one in `input`). When no answer comes
   * back, or another request is still taking payment for the cart (`409 cocart_payment_in_progress`),
   * the order may have been placed: this throws `CheckoutOutcomeUnknownError`, and
   * `getCheckoutStatus(error.checkoutId)` tells how it ended.
   *
   * A total that changed since `getCheckout()` or `updateCheckout()` is
   * `409 cocart_checkout_total_mismatch`: get the checkout again and show the new total.
   */
  async placeOrder(input: PlaceOrderInput): Promise<CheckoutResult> {
    const checkoutId = input.checkout_id ?? createCheckoutId();
    if (!CHECKOUT_ID.test(checkoutId)) {
      throw new CoCartError('checkout_id must be 16 to 64 letters, digits, "-" or "_".', 0, 'checkout_invalid_checkout_id');
    }
    const body: Record<string, unknown> = { ...input, checkout_id: checkoutId };
    if (input.payment_data !== undefined) body.payment_data = toPaymentDataPairs(input.payment_data);
    if (Array.isArray(input.meta_keys)) body.meta_keys = input.meta_keys.join(',');
    try {
      return CheckoutResult.fromResponse(await this.client.requestRaw('POST', this.routeBase, this.withPreviewAuth(), body));
    } catch (err) {
      if (isLostResponse(err) || isPaymentInProgress(err)) throw new CheckoutOutcomeUnknownError(err, checkoutId);
      throw wrapError(err, 'Failed to place the order.', 'checkout_process_failed');
    }
  }

  /**
   * How a checkout ended, when `placeOrder()` got no answer (`CheckoutOutcomeUnknownError`).
   * Ask from the same cart, or as the same customer. `code` is:
   *
   * - `order_placed`: show the order (`orderId`, `orderKey`).
   * - `payment_required`: the order was placed but isn't paid; pay it with `payForOrder()`.
   * - `in_progress`: the checkout is still running; ask again in a few seconds.
   * - `not_placed`: nothing went through; place the order again.
   */
  async getCheckoutStatus(checkoutId: string): Promise<CheckoutStatus> {
    try {
      const data = ((await this.client.requestRaw('GET', `${this.routeBase}/status`, this.withPreviewAuth({ checkout_id: checkoutId }))).toObject() ?? {}) as Record<string, unknown>;
      const result = isRecord(data.result) ? data.result : {};
      const order = isRecord(data.order) ? data.order : undefined;
      const status = isRecord(order?.status) ? order.status : undefined;
      return {
        checkoutId: typeof data.checkout_id === 'string' ? data.checkout_id : checkoutId,
        code: typeof result.code === 'string' ? result.code : '',
        message: typeof result.message === 'string' ? result.message : '',
        orderId: typeof order?.id === 'number' ? order.id : null,
        orderKey: typeof order?.key === 'string' ? order.key : null,
        orderNumber: order?.number === null || order?.number === undefined ? null : String(order.number),
        orderStatus: typeof status?.code === 'string' ? status.code : null,
      };
    } catch (err) {
      throw wrapError(err, 'Failed to check how the checkout ended.', 'checkout_status_failed');
    }
  }

  async getPaymentMethods(): Promise<Response<CheckoutPaymentMethodsResponse>> {
    try {
      return this.client.requestRaw('GET', `${this.routeBase}/payment-methods`, this.withPreviewAuth()) as Promise<Response<CheckoutPaymentMethodsResponse>>;
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve payment methods.', 'checkout_payment_methods_failed');
    }
  }

  /**
   * A logged-in customer's saved payment methods, from `GET /checkout/payment-methods`, for every
   * gateway or one. Pay with one as `wc-{gatewayId}-payment-token` in `payment_data`, or change a
   * subscription's card with its `id` as `token_id`. Empty for a guest.
   */
  async getSavedPaymentMethods(gatewayId?: string): Promise<SavedPaymentMethod[]> {
    const response = (await this.getPaymentMethods()).toObject() as unknown;
    const methods = isRecord(response) && Array.isArray(response.payment_methods) ? response.payment_methods : [];
    const cards: SavedPaymentMethod[] = [];
    for (const method of methods) {
      if (!isRecord(method) || typeof method.id !== 'string') continue;
      if (gatewayId !== undefined && method.id !== gatewayId) continue;
      const supports = isRecord(method.supports) ? method.supports : {};
      const tokens = Array.isArray(method.saved_tokens) ? method.saved_tokens : [];
      for (const token of tokens) {
        if (!isRecord(token)) continue;
        cards.push({
          id: Number(token.id),
          gatewayId: method.id,
          label: String(token.label ?? ''),
          type: String(token.type ?? ''),
          expires: typeof token.expires === 'string' && token.expires !== '' ? token.expires : null,
          isDefault: token.is_default === true,
          supportsSubscriptions: supports.subscriptions === true,
        });
      }
    }
    return cards;
  }

  /**
   * Public — does not require a cart session. Field/locale/country/shipping/account/store/validation
   * config for building a checkout form, `order_received_url` for `confirmReturn()`, whether address
   * search is available (`address_autocomplete.enabled`), and the terms text with its links.
   */
  async getCheckoutConfig(): Promise<Response<CheckoutConfig>> {
    try {
      return this.client.requestRaw('GET', `${this.routeBase}/config`, this.withPreviewAuth()) as Promise<Response<CheckoutConfig>>;
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve checkout config.', 'checkout_config_failed');
    }
  }

  /**
   * Public — does not require a cart session. `query` must be at least 3 characters long. Without a
   * server-side address provider it's `404 cocart_address_search_no_provider`: check
   * `getCheckoutConfig()`'s `address_autocomplete.enabled` first.
   */
  async searchAddresses(params: AddressSearchParams): Promise<Response<AddressSearchResult>> {
    try {
      return this.client.requestRaw('GET', `${this.apiBase}/address/search`, this.withPreviewAuth(toQueryParams(params))) as Promise<Response<AddressSearchResult>>;
    } catch (err) {
      throw wrapError(err, 'Failed to search addresses.', 'checkout_address_search_failed');
    }
  }

  /** Public — does not require a cart session. Resolves a suggestion ID from `searchAddresses()` into full address details. */
  async getAddressDetails(params: AddressDetailsParams): Promise<Response<AddressDetails>> {
    try {
      return this.client.requestRaw('GET', `${this.apiBase}/address/details`, this.withPreviewAuth(toQueryParams(params))) as Promise<Response<AddressDetails>>;
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve address details.', 'checkout_address_details_failed');
    }
  }

  /**
   * The order, for the "order received" / thank-you page. `orderKey` must match the order's key; a
   * wrong key, or someone else's order, is `404 cocart_order_not_found`.
   */
  async getOrderReceived(orderId: number, orderKey: string, params: CheckoutParams = {}): Promise<Response<OrderReceived>> {
    try {
      return (await this.client.requestRaw('GET', `${this.apiBase}/order-received/${orderId}`, this.withPreviewAuth({ ...toQueryParams(params), order_key: orderKey }))) as Response<OrderReceived>;
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve order.', 'checkout_order_received_failed');
    }
  }

  /**
   * Takes payment for an existing `pending` or `failed` order, e.g. to retry a failed payment.
   * Returns the same `CheckoutResult` as `placeOrder()`, read the same way: a declined card is a
   * failed result, not an exception. The order key is sent in the body, not the URL. An order that
   * needs no payment or can't be paid is a `409`, and so is another payment still running for it
   * (`cocart_payment_in_progress`).
   */
  async payForOrder(orderId: number, orderKey: string, data: PayForOrderInput): Promise<CheckoutResult> {
    const body: Record<string, unknown> = { ...data, order_key: orderKey };
    if (data.payment_data !== undefined) body.payment_data = toPaymentDataPairs(data.payment_data);
    try {
      return CheckoutResult.fromResponse(
        await this.client.requestRaw('POST', `${this.apiBase}/order-received/${orderId}/pay`, this.withPreviewAuth(), body),
      );
    } catch (err) {
      throw wrapError(err, 'Failed to pay for order.', 'checkout_pay_for_order_failed');
    }
  }

  /**
   * Finishes a payment after the customer returns from an off-site step (e.g. a Stripe-hosted
   * 3D Secure page). Pass every query parameter the return URL carried, unchanged — the gateway
   * integration server-side uses them to confirm the payment with the provider. Safe to call more
   * than once. See `confirmReturn()` to do this straight from the return URL.
   */
  async confirmOrderPayment(orderId: number, orderKey: string, returnParams: Record<string, string> = {}): Promise<Response<ConfirmOrderPaymentResponse>> {
    try {
      return (await this.client.requestRaw(
        'POST',
        `${this.apiBase}/order-received/${orderId}/confirm`,
        this.withPreviewAuth(),
        { order_key: orderKey, return_params: returnParams },
      )) as Response<ConfirmOrderPaymentResponse>;
    } catch (err) {
      throw wrapError(err, 'Failed to confirm the order payment.', 'checkout_confirm_order_failed');
    }
  }

  /**
   * Finishes a payment from the URL the customer returned to, e.g. on the frontend's order-received
   * page: `await checkout.confirmReturn(window.location.href)`. Reads the order ID (`order_id`) and
   * order key (`key`) on the URL, and forwards every query parameter as the return parameters.
   * Returns a `CheckoutResult`; `isPending` means the gateway hasn't confirmed yet: call again shortly.
   */
  async confirmReturn(url: string | URL, options: ConfirmReturnOptions = {}): Promise<CheckoutResult> {
    const params = queryParams(String(url));
    const orderId = options.orderId ?? Number(params.order_id);
    const orderKey = options.orderKey ?? params.key;

    if (!Number.isInteger(orderId) || orderId <= 0 || !orderKey) {
      throw new CoCartError(
        'The return URL has no order ID or order key. Pass them in the options if your route carries them elsewhere.',
        0,
        'checkout_return_missing_order',
      );
    }

    return CheckoutResult.fromResponse(await this.confirmOrderPayment(orderId, orderKey, params));
  }

  /**
   * Apply a coupon at checkout (`PUT /checkout` with `coupon_code`). Returns the checkout with its
   * new totals. A coupon that couldn't be applied is listed in `result.not_applied`
   * (`checkout_partly_updated`), or is an error when nothing else was asked for.
   */
  async applyCoupon(code: string): Promise<Response<CheckoutState>> {
    try {
      return await this.updateCheckout({ coupon_code: code, coupon_action: 'apply' });
    } catch (err) {
      throw wrapError(err, `Failed to apply coupon "${code}".`, 'checkout_coupon_apply_failed');
    }
  }

  /** Remove a coupon at checkout (`PUT /checkout` with `coupon_action: 'remove'`). Returns the checkout with its new totals. */
  async removeCoupon(code: string): Promise<Response<CheckoutState>> {
    try {
      return await this.updateCheckout({ coupon_code: code, coupon_action: 'remove' });
    } catch (err) {
      throw wrapError(err, `Failed to remove coupon "${code}".`, 'checkout_coupon_remove_failed');
    }
  }

  /** The checkout's items, coupons and totals, ready to show (from `getCheckout()`). */
  async getOrderSummary(): Promise<CheckoutOrderSummary> {
    let state: CheckoutState;
    try {
      state = (await this.getCheckout()).toObject();
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve order summary.', 'checkout_summary_failed');
    }

    const items: CheckoutOrderSummary['items'] = (Array.isArray(state.items) ? state.items : []).map((item) => ({
      key: String(item.item_key ?? ''),
      name: String(item.name ?? ''),
      quantity: Number(item.quantity?.value ?? 0),
      price: String(item.price ?? ''),
      subtotal: String(item.totals?.subtotal ?? ''),
    }));

    const coupons: CheckoutOrderSummary['coupons'] = (Array.isArray(state.coupons) ? state.coupons : []).map((coupon) => ({
      code: String(coupon.coupon ?? ''),
      label: String(coupon.label ?? ''),
      saving: String(coupon.saving ?? ''),
    }));

    const totals = state.totals ?? ({} as Partial<CheckoutState['totals']>);
    return {
      items,
      coupons,
      totals: {
        subtotal: String(totals.subtotal ?? ''),
        discount_total: String(totals.discount_total ?? ''),
        shipping_total: String(totals.shipping_total ?? ''),
        fee_total: String(totals.fee_total ?? ''),
        tax_total: String(totals.total_tax ?? ''),
        total: String(totals.total ?? ''),
      },
      lines: Array.isArray(state.total_lines) ? state.total_lines : [],
    };
  }

  /**
   * The checkout's shipping packages, each with its `rates` and the `chosen_rate` (from
   * `getCheckout()`'s `delivery.packages`). Send a rate's `id` as `shipping_method`. Empty when the
   * cart needs no shipping.
   */
  async getShippingMethods(): Promise<CheckoutShippingPackage[]> {
    try {
      const state = (await this.getCheckout()).toObject();
      return Array.isArray(state.delivery?.packages) ? state.delivery.packages : [];
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve shipping methods.', 'checkout_shipping_methods_failed');
    }
  }

  /**
   * Build a form definition for rendering a checkout UI.
   * The `payment` section is only included when a gateway is resolved (via `gatewayId`, `defaultGateway`, or the first registered adapter).
   * If no adapters are registered and no default is set, the returned form will have no payment section.
   */

  createForm(options: { gatewayId?: string; theme?: CheckoutTheme; needsPayment?: boolean; includeSummary?: boolean; shippingMethods?: CheckoutShippingRate[] } = {}): CheckoutFormDefinition {
    const theme = options.theme ?? this.defaultTheme;
    const gatewayId = options.gatewayId ?? this.defaultGateway ?? [...this.adapters.keys()][0];
    const isExpressGateway = gatewayId ? (this.adapters.get(gatewayId)?.express ?? false) : false;

    const WALLET_HIDDEN_FIELDS = new Set([
      'billing_address.first_name',
      'billing_address.last_name',
    ]);

    const sections: CheckoutFormSection[] = [
      {
        id: 'contact',
        title: 'Contact',
        fields: applyTheme(this.fields?.contact ?? DEFAULT_CONTACT_FIELDS, theme),
        className: theme.sectionClassName,
      },
      {
        id: 'billing',
        title: 'Billing address',
        fields: applyTheme(markHiddenForWallet(this.fields?.billing ?? DEFAULT_BILLING_FIELDS, isExpressGateway, WALLET_HIDDEN_FIELDS), theme),
        className: theme.sectionClassName,
      },
    ];

    if (this.collectShippingAddress && !this.shippingSameAsBilling) {
      sections.push({
        id: 'shipping',
        title: 'Shipping address',
        fields: applyTheme(this.fields?.shipping ?? DEFAULT_SHIPPING_FIELDS, theme),
        className: theme.sectionClassName,
      });
    }

    sections.push({
      id: 'notes',
      title: 'Order notes',
      fields: applyTheme(this.fields?.notes ?? DEFAULT_NOTES_FIELDS, theme),
      className: theme.sectionClassName,
    });

    if (options.shippingMethods && options.shippingMethods.length > 0) {
      sections.push({
        id: 'shipping-methods',
        title: 'Shipping method',
        fields: applyTheme([
          {
            name: 'shipping_method',
            label: 'Shipping method',
            type: 'radio',
            required: true,
            options: options.shippingMethods.map((rate) => ({
              label: `${rate.label} — ${rate.cost}`,
              value: rate.id,
              description: rate.method_id,
            })),
          },
        ], theme),
        className: theme.sectionClassName,
      });
    }

    if (options.needsPayment !== false && gatewayId && this.hasGateway(gatewayId)) {
      const gateway = this.getGateway(gatewayId);
      const isOffline = gateway.supports?.includes('offline') ?? false;
      const fields = isOffline
        ? []
        : gateway.getFields?.({
            client: this.client,
            checkout: this,
            gatewayId,
            theme,
            collectShippingAddress: this.collectShippingAddress,
            successUrl: this.successUrl,
            returnUrl: this.returnUrl,
          }) ?? [
            {
              name: 'payment_data',
              label: gateway.label,
              type: 'gateway-element' as const,
              description: gateway.description,
            },
          ];

      sections.push({
        id: 'payment',
        title: 'Payment',
        description: isOffline ? gateway.description : 'Render provider-native payment fields here.',
        fields: applyTheme(fields, theme),
        className: `${theme.sectionClassName} ${theme.paymentContainerClassName}`.trim(),
      });
    }

    if (options.includeSummary) {
      sections.push({
        id: 'order-summary',
        title: 'Order Summary',
        fields: [],
        className: theme.orderSummaryClassName,
      });
    }

    return {
      gatewayId,
      theme,
      sections,
    };
  }

  async submit(input: CheckoutSubmitInput): Promise<CheckoutSubmitResult> {
    const gateway = this.getGateway(input.gatewayId);
    const skipPayment = input.zeroTotal === true;

    // The total the customer was shown, before submit() fetches or updates the checkout itself:
    // either refreshes CoCart Plus's own record of it, so the check is made here.
    const shownTotal = this.shownTotal;

    let checkoutState: CheckoutState | undefined;
    try {
      checkoutState = input.hydrateCheckoutState === false ? undefined : (await this.fetchCheckout()).toObject();
    } catch (err) {
      throw wrapError(err, 'Failed to load checkout state before submission.', 'checkout_submit_hydrate_failed');
    }
    if (checkoutState) this.refuseChangedTotal(shownTotal, checkoutState);

    const checkoutId = String(checkoutState?.cart_key ?? '');
    const successUrl = this.successUrl?.replace('{CHECKOUT_ID}', checkoutId);
    const returnUrl = this.returnUrl;

    let paymentData: Record<string, unknown> | undefined;
    if (!skipPayment && gateway.tokenize) {
      try {
        paymentData = await gateway.tokenize({
          client: this.client,
          checkout: this,
          gatewayId: input.gatewayId,
          checkoutState,
          // What POST /checkout will receive (update fields win, as below), so a gateway can use
          // the billing address even when it was passed in `update` only.
          input: { ...(input.process ?? {}), ...(input.update ?? {}), payment_method: input.gatewayId },
          successUrl,
          returnUrl,
        });
      } catch (err) {
        throw wrapError(err, 'Payment tokenization failed.', 'checkout_tokenize_failed');
      }
    }

    const updatePayload = {
      ...(input.update ?? {}),
      payment_method: input.gatewayId,
    };

    const processPayload = {
      ...(input.process ?? {}),
      ...updatePayload,
      payment_method: input.gatewayId,
      payment_data: paymentData ? toPaymentDataArray(paymentData) : input.process?.payment_data,
    };

    const hasExtraUpdateFields = Object.keys(input.update ?? {}).length > 0;
    let updateResponse: Response<CheckoutState> | undefined;
    if (hasExtraUpdateFields) {
      try {
        updateResponse = await this.putCheckout(updatePayload);
      } catch (err) {
        throw wrapError(err, 'Failed to update checkout before processing.', 'checkout_update_failed');
      }
      // The update (an address, a shipping method) can change the total: the customer sees the
      // new one before paying.
      this.refuseChangedTotal(shownTotal, updateResponse.toObject());
    }

    let processResponse: Response<CheckoutProcessResponse>;
    try {
      processResponse = await this.processCheckout(processPayload);
    } catch (err) {
      throw wrapError(err, 'Failed to process payment.', 'checkout_process_failed');
    }
    let result = CheckoutResult.fromResponse(processResponse);

    // An off-site step (e.g. a Stripe-hosted 3D Secure page): nothing to confirm in-page and
    // nothing to retry — the customer has to go there. The gateway finishes the order once they
    // come back (see confirmReturn()).
    if (result.needsRedirect) {
      return {
        updateResponse,
        processResponse,
        result,
        paymentData,
        redirectUrl: result.redirectUrl,
      };
    }

    // The order is placed, but the customer still pays in the page (Stripe's Cash App Pay, WeChat
    // Pay or a voucher). The gateway's webhook marks the order paid: nothing to retry. If paying
    // fails, the order stays unpaid; the error carries its ID and key for payForOrder().
    if (result.isAwaitingPayment && result.clientSecret !== undefined && gateway.confirmAction) {
      try {
        await gateway.confirmAction({
          client: this.client,
          checkout: this,
          gatewayId: input.gatewayId,
          actionType: result.actionType ?? '',
          actionData: result.actionData ?? {},
          checkoutState,
          successUrl,
          returnUrl,
          redirectUrl: result.redirectUrl,
        });
      } catch (err) {
        throw new CoCartError(
          err instanceof Error ? err.message : 'The payment was not completed.',
          0,
          'checkout_payment_not_completed',
          { order_id: result.orderId, order_key: result.orderKey },
        );
      }

      return {
        updateResponse,
        processResponse,
        result,
        paymentData,
      };
    }

    // The gateway needs the customer to do something in the page before the payment can complete
    // (e.g. Stripe 3D Secure/SCA). The order and cart session are left intact server-side —
    // resolve the action, then POST /checkout again to land on the same order.
    if (result.code === 'action_required' && gateway.confirmAction) {
      let confirmData: Record<string, unknown> | void;
      try {
        confirmData = await gateway.confirmAction({
          client: this.client,
          checkout: this,
          gatewayId: input.gatewayId,
          actionType: result.actionType ?? '',
          actionData: result.actionData ?? {},
          checkoutState,
          successUrl,
          returnUrl,
        });
      } catch (err) {
        throw wrapError(err, 'Failed to confirm the required payment action.', 'checkout_confirm_action_failed');
      }

      const retryPayload = confirmData
        ? { ...processPayload, payment_data: toPaymentDataArray(confirmData) }
        : processPayload;

      try {
        processResponse = await this.processCheckout(retryPayload);
      } catch (err) {
        throw wrapError(err, 'Failed to process payment after confirming the required action.', 'checkout_process_failed');
      }
      result = CheckoutResult.fromResponse(processResponse);
    }

    return {
      updateResponse,
      processResponse,
      result,
      paymentData,
    };
  }

  /**
   * Refuses to take payment when the checkout's total differs from the one the customer was last
   * shown, with the same code CoCart Plus uses (`409 cocart_checkout_total_mismatch`) and the
   * checkout in `data.checkout` to show. The new total counts as shown from then on.
   */
  private refuseChangedTotal(shownTotal: string | undefined, state: CheckoutState): void {
    const total = checkoutTotal(state);
    if (shownTotal === undefined || total === undefined || total === shownTotal) return;
    this.shownTotal = total;
    throw new CoCartError(
      'The total has changed since it was shown. Show the new total before taking payment.',
      409,
      'cocart_checkout_total_mismatch',
      { code: 'cocart_checkout_total_mismatch', data: { status: 409, checkout: state } },
    );
  }

  private withPreviewAuth(params: Record<string, string> = {}): Record<string, string> {
    const credentials = this.client.getWooCommerceCredentials() ?? null;
    const consumerKey = this.consumerKey ?? credentials?.key;
    const consumerSecret = this.consumerSecret ?? credentials?.secret;

    if (!consumerKey || !consumerSecret) {
      return { ...params };
    }

    return {
      ...params,
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    };
  }
}

/** What `checkout_id` CoCart Plus accepts: 16 to 64 letters, digits, `-` or `_`. */
const CHECKOUT_ID = /^[A-Za-z0-9_-]{16,64}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A checkout's total, in the units it was sent in, or `undefined` when it has none. */
function checkoutTotal(state: unknown): string | undefined {
  const totals = isRecord(state) && isRecord(state.totals) ? state.totals : undefined;
  const total = totals?.total;
  return typeof total === 'string' || typeof total === 'number' ? String(total) : undefined;
}

/** Another request is still taking payment for the same cart, so how this one ends isn't known yet. */
function isPaymentInProgress(err: unknown): err is CoCartError {
  return err instanceof CoCartError && err.httpCode === 409 && err.errorCode === 'cocart_payment_in_progress';
}

/**
 * A URL's query parameters, decoded. Read by hand rather than with `URL.searchParams`, which
 * React Native's `URL` doesn't always implement.
 */
function queryParams(url: string): Record<string, string> {
  const query = url.split('#')[0].split('?').slice(1).join('?');
  const decode = (value: string) => {
    try {
      return decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
      return value;
    }
  };
  const params: Record<string, string> = {};
  for (const part of query.split('&')) {
    if (part === '') continue;
    const [key, ...value] = part.split('=');
    params[decode(key)] = decode(value.join('='));
  }
  return params;
}

/** Gateway adapters return `payment_data` as a plain object; the API expects an array of `{key, value}` pairs. */
function toPaymentDataArray(data: Record<string, unknown>): PaymentDataItem[] {
  return Object.entries(data).map(([key, value]) => ({
    key,
    value: value as string | boolean | number,
  }));
}

/** Convert a typed params object to `Record<string, string>` for query-string building, dropping `undefined` values. A list is comma-joined. */
function toQueryParams(params: object): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result[key] = Array.isArray(value) ? value.join(',') : String(value);
    }
  }
  return result;
}

/** A random ID for one checkout, sent as `checkout_id`: `chk_` and 32 hex digits. */
function createCheckoutId(): string {
  const bytes = new Uint8Array(16);
  const crypto = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
  if (typeof crypto?.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return `chk_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

/** No answer came back for the request: the connection dropped, it timed out, or a proxy gave up. */
function isLostResponse(err: unknown): err is CoCartError {
  if (!(err instanceof CoCartError)) return false;
  if (err.httpCode === 0) return err.errorCode === 'network_error' || err.errorCode === 'request_timeout';
  return err.httpCode === 502 || err.httpCode === 504;
}

function wrapError(err: unknown, fallbackMessage: string, code: string): CoCartError {
  if (err instanceof CoCartError) return err;
  const message = err instanceof Error ? err.message : fallbackMessage;
  return new CoCartError(message, 0, code);
}

function applyTheme(fields: CheckoutFormField[], theme: CheckoutTheme): CheckoutFormField[] {
  return fields.map((field) => ({
    ...field,
    className: field.className ?? theme.fieldClassName,
    inputClassName: field.inputClassName ?? theme.inputClassName,
  }));
}

function markHiddenForWallet(fields: CheckoutFormField[], isWallet: boolean, hiddenNames: Set<string>): CheckoutFormField[] {
  if (!isWallet) return fields;
  return fields.map((f) => hiddenNames.has(f.name) ? { ...f, hidden: true } : f);
}
