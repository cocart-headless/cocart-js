import type { CoCart, CoCartExtension, Response } from '@cocartheadless/sdk';

export type CheckoutFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'gateway-element'
  | 'custom';

export interface CheckoutAddressInput {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}

export interface CheckoutUpdateInput {
  billing_address?: CheckoutAddressInput;
  shipping_address?: CheckoutAddressInput;
  payment_method?: string;
  shipping_method?: string;
  customer_note?: string;
  create_account?: boolean;
  [key: string]: unknown;
}

export interface CheckoutProcessInput extends CheckoutUpdateInput {
  payment_data?: Record<string, unknown>;
}

export interface CheckoutPaymentMethod {
  title?: string;
  description?: string;
  enabled?: boolean;
  supports?: string[];
  icon?: string;
  [key: string]: unknown;
}

export interface CheckoutPaymentMethodsResponse {
  [gatewayId: string]: CheckoutPaymentMethod;
}

export interface CheckoutShippingRate {
  key: string;
  method_id: string;
  instance_id: number;
  label: string;
  cost: string;
  tax: string;
  [key: string]: unknown;
}

export interface CheckoutShippingPackage {
  package_name: string;
  rates: Record<string, CheckoutShippingRate>;
  chosen_method: string;
  [key: string]: unknown;
}

export interface CheckoutState {
  cart?: Record<string, unknown>;
  totals?: Record<string, unknown>;
  billing_address?: CheckoutAddressInput;
  shipping_address?: CheckoutAddressInput;
  shipping_methods?: CheckoutShippingPackage[];
  payment_methods?: CheckoutPaymentMethodsResponse;
  customer_data?: Record<string, unknown>;
  needs_payment?: boolean;
  needs_shipping?: boolean;
  payment_result?: {
    payment_status?: string;
    redirect_url?: string;
    message?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CheckoutSummaryItem {
  key: string;
  name: string;
  quantity: number;
  price: string;
  subtotal: string;
}

export interface CheckoutSummaryTotals {
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  fee_total: string;
  tax_total: string;
  total: string;
}

export interface CheckoutSummaryCoupon {
  code: string;
  label: string;
  saving: string;
}

export interface CheckoutOrderSummary {
  items: CheckoutSummaryItem[];
  coupons: CheckoutSummaryCoupon[];
  totals: CheckoutSummaryTotals;
}

export interface CheckoutPaymentContextRequest {
  payment_method: string;
  [key: string]: unknown;
}

export interface CheckoutFormFieldOption {
  label: string;
  value: string;
  description?: string;
}

export interface CheckoutFormField {
  name: string;
  label: string;
  type: CheckoutFieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string | boolean;
  options?: CheckoutFormFieldOption[];
  component?: string;
  className?: string;
  inputClassName?: string;
  [key: string]: unknown;
}

export interface CheckoutFormSection {
  id: string;
  title: string;
  description?: string;
  fields: CheckoutFormField[];
  className?: string;
}

export interface CheckoutTheme {
  name: string;
  containerClassName: string;
  sectionClassName: string;
  fieldClassName: string;
  inputClassName: string;
  labelClassName: string;
  helperTextClassName: string;
  submitButtonClassName: string;
  paymentContainerClassName: string;
  orderSummaryClassName: string;
}

export interface CheckoutFormDefinition {
  gatewayId?: string;
  theme: CheckoutTheme;
  sections: CheckoutFormSection[];
}

export interface CheckoutGatewayRenderContext {
  client: CoCart;
  checkout: CheckoutSDK;
  gatewayId: string;
  remoteMethod?: CheckoutPaymentMethod;
  theme: CheckoutTheme;
  /** Success URL with `{CHECKOUT_ID}` already substituted if a checkout ID is available, otherwise the raw template. */
  successUrl?: string;
  /** Return URL for failed or cancelled payments. */
  returnUrl?: string;
}

export interface CheckoutGatewayTokenizeContext {
  client: CoCart;
  checkout: CheckoutSDK;
  gatewayId: string;
  paymentContext?: Record<string, unknown>;
  checkoutState?: CheckoutState;
  input: CheckoutProcessInput;
  /** Success URL with `{CHECKOUT_ID}` substituted from the current checkout state, if available. */
  successUrl?: string;
  /** Return URL for failed or cancelled payments. */
  returnUrl?: string;
}

export interface CheckoutGatewayAdapter {
  id: string;
  provider: 'stripe' | 'paypal' | 'authorizenet' | string;
  label: string;
  description?: string;
  supports?: string[];
  getFields?: (context: CheckoutGatewayRenderContext) => CheckoutFormField[];
  tokenize?: (context: CheckoutGatewayTokenizeContext) => Promise<Record<string, unknown>>;
}

export interface CheckoutGatewayPresentation {
  id: string;
  label: string;
  provider: string;
  description?: string;
  supports: string[];
  remoteMethod?: CheckoutPaymentMethod;
}

export interface CheckoutSDKOptions {
  routeBase?: string;
  /**
   * Override consumer key for API requests.
   * Only needed when the API requires a different key pair from the main CoCart client credentials.
   * If omitted, credentials are pulled from the parent `CoCart` instance via `getWooCommerceCredentials()`.
   */
  consumerKey?: string;
  /**
   * Override consumer secret for API requests.
   * Only needed when the API requires a different key pair from the main CoCart client credentials.
   * If omitted, credentials are pulled from the parent `CoCart` instance via `getWooCommerceCredentials()`.
   */
  consumerSecret?: string;
  defaultGateway?: string;
  defaultTheme?: CheckoutTheme;
  collectShippingAddress?: boolean;
  shippingSameAsBilling?: boolean;
  fields?: Partial<Record<'contact' | 'billing' | 'shipping' | 'notes', CheckoutFormField[]>>;
  /**
   * URL to redirect the customer to after a successful payment.
   * Include `{CHECKOUT_ID}` as a placeholder — it will be replaced with the actual checkout/order ID.
   * Example: `'https://your-store.com/order-complete?id={CHECKOUT_ID}'`
   */
  successUrl?: string;
  /**
   * URL to redirect the customer to if payment fails or is cancelled.
   * Example: `'https://your-store.com/checkout'`
   */
  returnUrl?: string;
}

export interface CheckoutSubmitInput {
  gatewayId: string;
  update?: CheckoutUpdateInput;
  process?: CheckoutProcessInput;
  hydratePaymentContext?: boolean;
  zeroTotal?: boolean;
}

export interface CheckoutSubmitResult {
  updateResponse?: Response;
  processResponse: Response;
  paymentContext?: Record<string, unknown>;
  paymentData?: Record<string, unknown>;
}

export interface CheckoutSDK {
  registerGateway(adapter: CheckoutGatewayAdapter): this;
  registerGateways(adapters: CheckoutGatewayAdapter[]): this;
  hasGateway(id: string): boolean;
  getGateway(id: string): CheckoutGatewayAdapter;
  listGateways(remoteMethods?: CheckoutPaymentMethodsResponse): CheckoutGatewayPresentation[];
  getCheckout(params?: Record<string, string>): Promise<Response<CheckoutState>>;
  updateCheckout(data: CheckoutUpdateInput): Promise<Response<CheckoutState>>;
  processCheckout(data: CheckoutProcessInput): Promise<Response<CheckoutState>>;
  getPaymentMethods(): Promise<Response<CheckoutPaymentMethodsResponse>>;
  createPaymentContext(request: CheckoutPaymentContextRequest): Promise<Response<Record<string, unknown>>>;
  createForm(options?: { gatewayId?: string; theme?: CheckoutTheme; needsPayment?: boolean; includeSummary?: boolean; shippingMethods?: CheckoutShippingRate[] }): CheckoutFormDefinition;
  submit(input: CheckoutSubmitInput): Promise<CheckoutSubmitResult>;
  applyCoupon(code: string): Promise<Response>;
  removeCoupon(code: string): Promise<Response>;
  getOrderSummary(): Promise<CheckoutOrderSummary>;
  getShippingMethods(): Promise<CheckoutShippingPackage[]>;
}

export interface CheckoutOptions extends CheckoutSDKOptions {
  gatewayAdapters?: CheckoutGatewayAdapter[];
}

export type CheckoutExtension = CoCartExtension<'checkout', CheckoutSDK>;

/** Minimal Stripe.js interface required by the pre-wired gateway helper. */
export interface StripeInstance {
  confirmPayment(options: {
    elements: StripeElementsInstance;
    confirmParams?: Record<string, unknown>;
    redirect: 'if_required';
  }): Promise<{ error?: { message?: string }; paymentIntent?: { id: string } }>;
}

/** Minimal Stripe Elements interface required by the pre-wired gateway helper. */
export interface StripeElementsInstance {
  [key: string]: unknown;
}

/**
 * Options for `createStripeGateway`.
 *
 * **Pre-wired path** — pass `stripe` and `elements` for a ready-to-use integration.
 * `tokenize` defaults to calling `stripe.confirmPayment()` with the `client_secret`
 * from the payment context response.
 *
 * **Manual path** — provide a custom `tokenize` callback for full control.
 */
export type StripeGatewayOptions =
  | {
      label?: string;
      description?: string;
      stripe: StripeInstance;
      elements: StripeElementsInstance;
      tokenize?: never;
    }
  | {
      label?: string;
      description?: string;
      stripe?: never;
      elements?: never;
      tokenize: (context: CheckoutGatewayTokenizeContext) => Promise<{
        payment_intent_id?: string;
        payment_method_id?: string;
        setup_future_usage?: string;
        [key: string]: unknown;
      }>;
    };

/**
 * Options for `createPayPalGateway`.
 *
 * **Pre-wired path** — pass `createOrder` and `onApprove` matching the PayPal JS SDK
 * Buttons callbacks. `tokenize` captures and returns the order/payer IDs automatically.
 *
 * **Manual path** — provide a custom `tokenize` callback for full control.
 */
export type PayPalGatewayOptions =
  | {
      label?: string;
      description?: string;
      createOrder: () => Promise<string>;
      onApprove: (data: { orderID: string; payerID?: string }) => Promise<void>;
      tokenize?: never;
    }
  | {
      label?: string;
      description?: string;
      createOrder?: never;
      onApprove?: never;
      tokenize: (context: CheckoutGatewayTokenizeContext) => Promise<{
        order_id?: string;
        payer_id?: string;
        [key: string]: unknown;
      }>;
    };

/**
 * Options for `createAuthorizeNetGateway`.
 *
 * **Pre-wired path** — pass `dispatchData` (wrapping `Accept.dispatchData`) along with
 * `clientKey` and `apiLoginID`. `tokenize` calls it and returns the opaque token automatically.
 *
 * **Manual path** — provide a custom `tokenize` callback for full control.
 */
export type AuthorizeNetGatewayOptions =
  | {
      label?: string;
      description?: string;
      dispatchData: (
        authData: { clientKey: string; apiLoginID: string },
        cardData: Record<string, string>,
      ) => Promise<{ opaqueData: { dataDescriptor: string; dataValue: string } }>;
      clientKey: string;
      apiLoginID: string;
      cardData?: Record<string, string>;
      tokenize?: never;
    }
  | {
      label?: string;
      description?: string;
      dispatchData?: never;
      clientKey?: never;
      apiLoginID?: never;
      cardData?: never;
      tokenize: (context: CheckoutGatewayTokenizeContext) => Promise<{
        data_descriptor?: string;
        data_value?: string;
        [key: string]: unknown;
      }>;
    };

export interface OfflineGatewayOptions {
  label?: string;
  description?: string;
}

export type BankTransferGatewayOptions = OfflineGatewayOptions;
export type CheckPaymentGatewayOptions = OfflineGatewayOptions;
export type CashOnDeliveryGatewayOptions = OfflineGatewayOptions;
