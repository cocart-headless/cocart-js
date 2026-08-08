import { CoCartError } from '@cocartheadless/sdk';
import type { CoCart, Response } from '@cocartheadless/sdk';
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
  CheckoutPaymentMethodsResponse,
  CheckoutProcessInput,
  CheckoutProcessResponse,
  CheckoutSDK,
  CheckoutSDKOptions,
  CheckoutShippingPackage,
  CheckoutShippingRate,
  CheckoutState,
  CheckoutSubmitInput,
  CheckoutSubmitResult,
  CheckoutTheme,
  CheckoutUpdateInput,
  OrderReceived,
  PayForOrderInput,
  PayForOrderResponse,
  PaymentDataItem,
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
    const methods = remoteMethods ?? {};
    const ids = new Set([...Object.keys(methods), ...this.adapters.keys()]);

    return [...ids].map((id) => {
      const remoteMethod = methods[id];
      const adapter = this.adapters.get(id);
      return {
        id,
        label: remoteMethod?.title ?? adapter?.label ?? id,
        provider: adapter?.provider ?? id,
        description: remoteMethod?.description ?? adapter?.description,
        supports: [...new Set([...(adapter?.supports ?? []), ...(remoteMethod?.supports ?? [])])],
        remoteMethod,
      };
    });
  }

  async getCheckout(params?: Record<string, string>): Promise<Response<CheckoutState>> {
    try {
      return this.client.requestRaw('GET', this.routeBase, this.withPreviewAuth(params)) as Promise<Response<CheckoutState>>;
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve checkout state.', 'checkout_fetch_failed');
    }
  }

  async updateCheckout(data: CheckoutUpdateInput): Promise<Response<CheckoutState>> {
    try {
      return this.client.requestRaw('PUT', this.routeBase, this.withPreviewAuth(), data as Record<string, unknown>) as Promise<Response<CheckoutState>>;
    } catch (err) {
      throw wrapError(err, 'Failed to update checkout.', 'checkout_update_failed');
    }
  }

  async processCheckout(data: CheckoutProcessInput): Promise<Response<CheckoutProcessResponse>> {
    try {
      return this.client.requestRaw('POST', this.routeBase, this.withPreviewAuth(), data as Record<string, unknown>) as Promise<Response<CheckoutProcessResponse>>;
    } catch (err) {
      throw wrapError(err, 'Failed to process checkout.', 'checkout_process_failed');
    }
  }

  async getPaymentMethods(): Promise<Response<CheckoutPaymentMethodsResponse>> {
    try {
      return this.client.requestRaw('GET', `${this.routeBase}/payment-methods`, this.withPreviewAuth()) as Promise<Response<CheckoutPaymentMethodsResponse>>;
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve payment methods.', 'checkout_payment_methods_failed');
    }
  }

  /** Public — does not require a cart session. Field/locale/country/shipping/account/store/validation config for building a checkout form. */
  async getCheckoutConfig(): Promise<Response<CheckoutConfig>> {
    try {
      return this.client.requestRaw('GET', `${this.routeBase}/config`, this.withPreviewAuth()) as Promise<Response<CheckoutConfig>>;
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve checkout config.', 'checkout_config_failed');
    }
  }

  /** Public — does not require a cart session. `query` must be at least 3 characters long. */
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

  /** Order confirmation data for the "order received" / thank-you page. `orderKey` must match the order's key. */
  async getOrderReceived(orderId: number, orderKey: string): Promise<Response<OrderReceived>> {
    try {
      return this.client.requestRaw('GET', `${this.apiBase}/order-received/${orderId}`, this.withPreviewAuth({ order_key: orderKey })) as Promise<Response<OrderReceived>>;
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve order.', 'checkout_order_received_failed');
    }
  }

  /**
   * Processes payment for an existing `pending` or `failed` order, e.g. to retry a failed payment.
   * Unlike `processCheckout()`, a payment failure here raises a `cocart_payment_failed` error
   * rather than being returned inline.
   */
  async payForOrder(orderId: number, orderKey: string, data: PayForOrderInput): Promise<Response<PayForOrderResponse>> {
    try {
      return this.client.requestRaw('POST', `${this.apiBase}/order-received/${orderId}/pay`, this.withPreviewAuth({ order_key: orderKey }), data as unknown as Record<string, unknown>) as Promise<Response<PayForOrderResponse>>;
    } catch (err) {
      throw wrapError(err, 'Failed to pay for order.', 'checkout_pay_for_order_failed');
    }
  }

  async applyCoupon(code: string): Promise<Response> {
    if (typeof this.client.cart !== 'function') {
      throw new CoCartError('Cart endpoint is not available on the CoCart client.', 0, 'checkout_cart_unavailable');
    }
    try {
      return await this.client.cart().applyCoupon(code);
    } catch (err) {
      throw wrapError(err, `Failed to apply coupon "${code}".`, 'checkout_coupon_apply_failed');
    }
  }

  async removeCoupon(code: string): Promise<Response> {
    if (typeof this.client.cart !== 'function') {
      throw new CoCartError('Cart endpoint is not available on the CoCart client.', 0, 'checkout_cart_unavailable');
    }
    try {
      return await this.client.cart().removeCoupon(code);
    } catch (err) {
      throw wrapError(err, `Failed to remove coupon "${code}".`, 'checkout_coupon_remove_failed');
    }
  }

  async getOrderSummary(): Promise<CheckoutOrderSummary> {
    let state: CheckoutState;
    try {
      state = (await this.getCheckout()).toObject();
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve order summary.', 'checkout_summary_failed');
    }

    const itemsData = (state.items ?? {}) as Record<string, unknown>;
    const totalsData = (state.cart_totals ?? {}) as Record<string, unknown>;

    const items: CheckoutOrderSummary['items'] = Object.values(itemsData)
      .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null && 'item_key' in v)
      .map((item) => ({
        key: String(item['item_key'] ?? ''),
        name: String(item['name'] ?? ''),
        quantity: Number((item['quantity'] as Record<string, unknown> | null)?.['value'] ?? item['quantity'] ?? 0),
        price: String(item['price'] ?? ''),
        subtotal: String((item['totals'] as Record<string, unknown> | null)?.['subtotal'] ?? ''),
      }));

    const couponsRaw = (state.coupons ?? []) as unknown[];
    const coupons: CheckoutOrderSummary['coupons'] = Array.isArray(couponsRaw)
      ? couponsRaw.map((c) => {
          const coupon = c as Record<string, unknown>;
          return {
            code: String(coupon['coupon'] ?? ''),
            label: String(coupon['label'] ?? ''),
            saving: String(coupon['saving'] ?? ''),
          };
        })
      : [];

    return {
      items,
      coupons,
      totals: {
        subtotal: String(totalsData['subtotal'] ?? ''),
        discount_total: String(totalsData['discount_total'] ?? ''),
        shipping_total: String(totalsData['shipping_total'] ?? ''),
        fee_total: String(totalsData['fee_total'] ?? ''),
        tax_total: String(totalsData['total_tax'] ?? ''),
        total: String(totalsData['total'] ?? ''),
      },
    };
  }

  /**
   * Build a form definition for rendering a checkout UI.
   * The `payment` section is only included when a gateway is resolved (via `gatewayId`, `defaultGateway`, or the first registered adapter).
   * If no adapters are registered and no default is set, the returned form will have no payment section.
   */
  async getShippingMethods(): Promise<CheckoutShippingPackage[]> {
    if (typeof this.client.cart !== 'function') {
      throw new CoCartError('Cart endpoint is not available on the CoCart client.', 0, 'checkout_cart_unavailable');
    }
    try {
      const response = (await this.client.cart().getShippingMethods()).toObject() as Record<string, unknown>;
      const shipping = response['shipping'] ?? response;
      return Array.isArray(shipping) ? (shipping as CheckoutShippingPackage[]) : [];
    } catch (err) {
      throw wrapError(err, 'Failed to retrieve shipping methods.', 'checkout_shipping_methods_failed');
    }
  }

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
              value: rate.key,
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

    let checkoutState: CheckoutState | undefined;
    try {
      checkoutState = input.hydrateCheckoutState === false ? undefined : (await this.getCheckout()).toObject();
    } catch (err) {
      throw wrapError(err, 'Failed to load checkout state before submission.', 'checkout_submit_hydrate_failed');
    }

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
          input: input.process ?? { payment_method: input.gatewayId },
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
        updateResponse = await this.updateCheckout(updatePayload);
      } catch (err) {
        throw wrapError(err, 'Failed to update checkout before processing.', 'checkout_update_failed');
      }
    }

    let processResponse: Response<CheckoutProcessResponse>;
    try {
      processResponse = await this.processCheckout(processPayload);
    } catch (err) {
      throw wrapError(err, 'Failed to process payment.', 'checkout_process_failed');
    }

    // The gateway needs the customer to do something else before the payment can complete
    // (e.g. Stripe 3D Secure/SCA). The order and cart session are left intact server-side —
    // resolve the action, then POST /checkout again to land on the same order.
    const paymentResult = processResponse.toObject().payment_result;
    if (paymentResult?.payment_status === 'requires_action' && gateway.confirmAction) {
      let confirmData: Record<string, unknown> | void;
      try {
        confirmData = await gateway.confirmAction({
          client: this.client,
          checkout: this,
          gatewayId: input.gatewayId,
          actionType: String(paymentResult.action_type ?? ''),
          actionData: paymentResult.action_data ?? {},
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
    }

    return {
      updateResponse,
      processResponse,
      paymentData,
    };
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

/** Gateway adapters return `payment_data` as a plain object; the API expects an array of `{key, value}` pairs. */
function toPaymentDataArray(data: Record<string, unknown>): PaymentDataItem[] {
  return Object.entries(data).map(([key, value]) => ({
    key,
    value: value as string | boolean | number,
  }));
}

/** Convert a typed params object to `Record<string, string>` for query-string building, dropping `undefined` values. */
function toQueryParams(params: object): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
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
