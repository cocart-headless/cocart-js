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
  use_different_billing?: boolean;
  payment_method?: string;
  shipping_method?: string;
  currency?: string;
  coupon_code?: string;
  coupon_action?: 'apply' | 'remove';
  customer_note?: string;
  create_account?: boolean;
  [key: string]: unknown;
}

/** A single payment field as sent to the API — the wire format is an array of `{key, value}` pairs, not a plain object. */
export interface PaymentDataItem {
  key: string;
  value: string | boolean | number;
}

export interface CheckoutProcessInput extends CheckoutUpdateInput {
  /**
   * Required by the API for `POST /checkout` (order creation). Left optional on this type
   * because `CheckoutClient.submit()` fills it in from `CheckoutSubmitInput.update.billing_address`
   * before calling `processCheckout()` — see `submit()` in checkout.ts.
   */
  billing_address?: CheckoutAddressInput;
  payment_data?: PaymentDataItem[];
  customer_password?: string;
}

export interface PaymentToken {
  id: string;
  token: string;
  type: string;
  gateway_id: string;
  is_default: boolean;
  expires?: string;
  [key: string]: unknown;
}

export interface CheckoutPaymentMethod {
  id?: string;
  title?: string;
  description?: string;
  supports?: string[];
  has_fields?: boolean;
  order_button_text?: string;
  method_title?: string;
  method_description?: string;
  config?: {
    test_mode?: boolean;
    is_connected?: boolean;
    supports_tokenization?: boolean;
    supports_refunds?: boolean;
    supports_subscriptions?: boolean;
    requires_billing_address?: boolean;
    [key: string]: unknown;
  };
  saved_tokens?: PaymentToken[];
  supports_save_payment?: boolean;
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

export interface ShippingMethodOption {
  id: string;
  label: string;
  cost: string;
  method_id: string;
  instance_id: number;
  [key: string]: unknown;
}

/** Response shape of `GET`/`PUT`/`PATCH /checkout` — the current checkout data, no order created yet. */
export interface CheckoutState {
  cart_hash?: string;
  cart_key?: string;
  currency?: Record<string, unknown>;
  customer?: {
    customer_id?: number;
    billing_address?: CheckoutAddressInput;
    shipping_address?: CheckoutAddressInput;
    [key: string]: unknown;
  };
  items?: Record<string, unknown>;
  coupons?: unknown[];
  needs_payment?: boolean;
  needs_shipping?: boolean;
  shipping_methods?: Record<string, ShippingMethodOption>;
  payment_method?: string;
  fees?: unknown[];
  cart_totals?: Record<string, unknown>;
  message?: string;
  [key: string]: unknown;
}

/**
 * Known `action_type` values for `PaymentResult.action_type`. Not exhaustive — any gateway
 * without a dedicated compat integration falls back to `gateway_redirect_required`, and a
 * store could add its own via the `cocart_payment_result` filter server-side. Kept as a loose
 * union (`| (string & {})`) so unknown values still type-check without losing autocomplete for
 * the known ones.
 */
export type CheckoutActionType =
  | 'stripe_confirm_payment'
  | 'wcpay_confirm_payment'
  | 'wcpay_multibanco_voucher'
  | 'paypal_approve'
  | 'paypal_confirm_3ds'
  | 'gateway_redirect_required'
  | (string & {});

/** `action_data` for `stripe_confirm_payment` / `wcpay_confirm_payment` — confirm client-side with the gateway's Stripe.js instance, then retry. */
export interface ConfirmPaymentActionData {
  client_secret: string;
  intent_type: 'payment_intent' | 'setup_intent';
}

/** `action_data` for `wcpay_multibanco_voucher`. Appears alongside `payment_status: 'on_hold'`, not `requires_action` — the order is already placed; there's nothing to retry, just details to show the customer. */
export interface MultibancoVoucherActionData {
  entity: string;
  reference: string;
  voucher_url: string;
  expires_at: string;
}

/** `action_data` for `paypal_approve`, `paypal_confirm_3ds`, and the generic `gateway_redirect_required` fallback — open `redirect` in the browser. Completion may be asynchronous (webhook-driven); don't assume the payment is done as soon as the redirect returns. */
export interface RedirectActionData {
  redirect: string;
}

/**
 * The outcome of payment processing on `POST /checkout` (and `POST /order-received/{id}/pay`).
 * Which fields are present depends on `payment_status`:
 * - `success` / `no_payment_required` → `redirect_url`
 * - `failed` → `message`
 * - `on_hold` → the payment was authorized/captured but needs manual or fraud/risk review —
 *   not an error, and not something the *customer* needs to act on. `redirect_url` is present
 *   the same as `success`. Occasionally also carries `action_type`/`action_data` (e.g.
 *   `wcpay_multibanco_voucher`) when there's extra information to show the customer even
 *   though nothing needs to be retried on this endpoint.
 * - `requires_action` → `action_type` and `action_data` instead of `redirect_url`/`message`. The
 *   order and cart session are deliberately left intact — the gateway needs the customer to do
 *   something else (e.g. Stripe 3D Secure/SCA, an off-site approval redirect) before the payment
 *   can complete. Resolve the action client-side (see `CheckoutGatewayAdapter.confirmAction`),
 *   then call `processCheckout()`/`submit()` again with the same cart/session to land on the
 *   same order rather than creating a duplicate. If a gateway reports success with genuinely
 *   nothing to act on, this is reported as a plain `failed` instead — never an unresolvable
 *   `requires_action`.
 */
export interface PaymentResult {
  payment_status?: 'success' | 'no_payment_required' | 'failed' | 'requires_action' | 'on_hold' | (string & {});
  /** Present when `payment_status` is `success`, `no_payment_required`, or `on_hold`. */
  redirect_url?: string;
  /** Present when `payment_status` is `failed`. */
  message?: string;
  /** Present when `payment_status` is `requires_action`, and occasionally `on_hold`. See `CheckoutActionType`. */
  action_type?: CheckoutActionType;
  /** Present alongside `action_type`. Shape depends on `action_type` — see `ConfirmPaymentActionData`/`MultibancoVoucherActionData`/`RedirectActionData`. */
  action_data?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Response shape of `POST /checkout` — an order has been created (and payment attempted). */
export interface CheckoutProcessResponse {
  order_id?: number;
  status?: string;
  order_key?: string;
  order_number?: string;
  payment_result?: PaymentResult;
  customer_id?: number;
  billing_address?: CheckoutAddressInput;
  shipping_address?: CheckoutAddressInput;
  [key: string]: unknown;
}

// --- Checkout config (GET /checkout/config) ---

export interface CheckoutFieldDefinition {
  type?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  class?: string[];
  autocomplete?: string;
  priority?: number;
  validate?: string[];
  custom_attributes?: Record<string, unknown>;
  options?: Record<string, string>;
  default?: string;
  country_field?: string;
  maxlength?: number;
  input_class?: string[];
  label_class?: string[];
  [key: string]: unknown;
}

export interface CheckoutCountriesConfig {
  allowed_countries?: Record<string, string>;
  shipping_countries?: Record<string, string>;
  states?: Record<string, Record<string, string>>;
  default_country?: string;
  eu_countries?: string[];
}

export interface CheckoutShippingConfig {
  enabled?: boolean;
  calc_shipping?: boolean;
  ship_to_countries?: string;
  ship_to_billing_address?: boolean;
  shipping_cost_requires_address?: boolean;
}

export interface CheckoutAccountConfig {
  allow_registration?: boolean;
  registration_generate_username?: boolean;
  registration_generate_password?: boolean;
  guest_checkout_enabled?: boolean;
  must_create_account?: boolean;
}

export interface CheckoutStoreConfig {
  currency?: string;
  currency_symbol?: string;
  currency_position?: string;
  price_decimal_sep?: string;
  price_thousand_sep?: string;
  price_decimals?: number;
  tax_enabled?: boolean;
  tax_display_cart?: string;
  prices_include_tax?: boolean;
  coupons_enabled?: boolean;
  terms_page_id?: number | null;
  privacy_page_id?: number | null;
  store_address?: {
    address_1?: string;
    address_2?: string;
    city?: string;
    postcode?: string;
    country?: string;
    state?: string;
  };
  /** Only present when a terms page is configured. */
  terms_text?: string;
}

export interface CheckoutValidationConfig {
  postcode?: { patterns?: Record<string, string> };
  phone?: { enabled?: boolean };
  email?: { enabled?: boolean };
}

/** Response of `GET /checkout/config`. Public — does not require a cart session. */
export interface CheckoutConfig {
  fields?: {
    billing?: Record<string, CheckoutFieldDefinition>;
    shipping?: Record<string, CheckoutFieldDefinition>;
    account?: Record<string, CheckoutFieldDefinition>;
    order?: Record<string, CheckoutFieldDefinition>;
  };
  /** Per-country locale overrides for address fields (label, required, etc.). */
  locale_settings?: Record<string, unknown>;
  countries?: CheckoutCountriesConfig;
  shipping?: CheckoutShippingConfig;
  account?: CheckoutAccountConfig;
  store?: CheckoutStoreConfig;
  validation?: CheckoutValidationConfig;
}

// --- Address autocomplete (GET /address/search, GET /address/details) ---

export interface AddressProvider {
  id?: string;
  name?: string;
}

export interface AddressMatchedSubstring {
  offset: number;
  length: number;
}

export interface AddressSuggestion {
  /** Opaque suggestion ID, pass to `getAddressDetails()` to resolve the full address. */
  id: string;
  label: string;
  matched_substrings?: AddressMatchedSubstring[];
}

export interface AddressSearchParams {
  /** Must be at least 3 characters long. */
  query: string;
  /** Two-letter country code to scope the search to. */
  country?: string;
  type?: 'billing' | 'shipping';
  /** Specific address provider ID to use. Defaults to the first available provider. */
  provider?: string;
}

export interface AddressSearchResult {
  suggestions: AddressSuggestion[];
  count: number;
  provider: AddressProvider;
  search_country: string;
  query: string;
}

export interface AddressDetailsParams {
  /** The suggestion ID returned by `searchAddresses()`. */
  address_id: string;
  /** The address provider ID that returned the suggestion. */
  provider: string;
}

export interface AddressDetails {
  address: {
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  provider: AddressProvider;
}

// --- Order received / pay for order (GET /order-received/{id}, POST /order-received/{id}/pay) ---

export interface OrderAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface OrderLineItemMeta {
  id?: number;
  key?: string;
  display_key?: string;
  display_value?: string;
}

export interface OrderLineItem {
  item_id: number;
  product_id: number;
  /** 0 when the item is not a variation. */
  variation_id: number;
  product_name: string;
  product_image?: string;
  quantity: number;
  subtotal: string;
  total: string;
  meta_data?: OrderLineItemMeta[];
}

export interface OrderTotalLine {
  key: string;
  label: string;
  value: string;
}

export interface AvailablePaymentMethod {
  id: string;
  title: string;
  description?: string;
  has_fields?: boolean;
}

/** Response of `GET /order-received/{order_id}` — order confirmation data for the thank-you page. */
export interface OrderReceived {
  order_id: number;
  order_number: string;
  order_key: string;
  status: string;
  status_name: string;
  date_created: string;
  date_paid?: string | null;
  currency: string;
  total: string;
  subtotal: string;
  tax_total: string;
  shipping_total: string;
  discount_total: string;
  payment_method: string;
  payment_method_title: string;
  customer_id: number;
  customer_note?: string;
  billing_address: OrderAddress;
  shipping_address: OrderAddress;
  items: OrderLineItem[];
  totals: OrderTotalLine[];
  needs_payment: boolean;
  needs_shipping: boolean;
  has_downloads: boolean;
  /** Only present when `has_downloads` is true. */
  download_url?: string | null;
  /** Only present when `needs_payment` is true. */
  available_payment_methods?: AvailablePaymentMethod[];
}

export interface PayForOrderInput {
  payment_method: string;
  payment_data?: PaymentDataItem[];
}

/**
 * Response of `POST /order-received/{order_id}/pay`.
 * Unlike `POST /checkout`, a payment failure here raises a `400 cocart_payment_failed`
 * error rather than being returned inline via `order_status`.
 */
export interface PayForOrderResponse {
  success: boolean;
  order_id: number;
  order_status: string;
  redirect_url?: string;
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
  hidden?: boolean;
  [key: string]: unknown;
}

export interface CheckoutFormSection {
  id: string;
  title: string;
  description?: string;
  fields: CheckoutFormField[];
  className?: string;
}

export interface CheckoutThemeVariables {
  // Colors
  colorPrimary: string;
  colorBackground: string;
  colorBackgroundAlt: string;
  colorBackgroundHover: string;
  colorSurface: string;
  colorText: string;
  colorTextMuted: string;
  colorBorder: string;
  colorError: string;
  colorButton: string;
  colorButtonText: string;
  // Typography
  fontFamily: string;
  fontSizeBase: string;
  fontWeightNormal: string;
  fontWeightMedium: string;
  fontWeightBold: string;
  // Shape
  borderRadius: string;
  borderRadiusFull: string;
  inputHeight: string;
  // Spacing
  spacingUnit: string;
  fieldGap: string;
  sectionGap: string;
}

export type CheckoutThemeRules = Record<string, Record<string, string>>;

export interface CheckoutTheme {
  name?: string;
  preset?: 'modern' | 'tailwind' | 'shadcn';
  variables?: Partial<CheckoutThemeVariables>;
  rules?: CheckoutThemeRules;
  // Class name overrides — applied after variables; Tailwind/shadcn power users
  containerClassName?: string;
  sectionClassName?: string;
  fieldClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  helperTextClassName?: string;
  submitButtonClassName?: string;
  paymentContainerClassName?: string;
  orderSummaryClassName?: string;
  expressCheckoutBarClassName?: string;
}

export interface CheckoutExpressBarGateway {
  id: string;
  label: string;
  fields: CheckoutFormField[];
}

export interface CheckoutExpressBar {
  layout: 'scroll' | 'stack';
  theme: CheckoutTheme;
  gateways: CheckoutExpressBarGateway[];
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
  /** Whether the checkout is collecting a shipping address. Pass to express gateways so they can request shipping from the wallet (e.g. Stripe `requestShipping`). */
  collectShippingAddress: boolean;
  /** Success URL with `{CHECKOUT_ID}` already substituted if a checkout ID is available, otherwise the raw template. */
  successUrl?: string;
  /** Return URL for failed or cancelled payments. */
  returnUrl?: string;
}

export interface CheckoutGatewayTokenizeContext {
  client: CoCart;
  checkout: CheckoutSDK;
  gatewayId: string;
  checkoutState?: CheckoutState;
  input: CheckoutProcessInput;
  /** Success URL with `{CHECKOUT_ID}` substituted from the current checkout state, if available. */
  successUrl?: string;
  /** Return URL for failed or cancelled payments. */
  returnUrl?: string;
}

export interface CheckoutGatewayActionContext {
  client: CoCart;
  checkout: CheckoutSDK;
  gatewayId: string;
  /** From `payment_result.action_type` on the `POST /checkout` response. See `CheckoutActionType`. */
  actionType: CheckoutActionType;
  /** From `payment_result.action_data` — shape is gateway-specific, e.g. `{ client_secret, intent_type }` for Stripe. */
  actionData: Record<string, unknown>;
  checkoutState?: CheckoutState;
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
  /** Set to true to indicate this gateway can render express checkout buttons (Apple Pay, Google Pay, etc.). */
  express?: boolean;
  /** Lower number = higher priority in the express checkout bar. Defaults to 100. */
  expressCheckoutPriority?: number;
  getFields?: (context: CheckoutGatewayRenderContext) => CheckoutFormField[];
  /** Returns fields for the express checkout button bar, rendered above the main form. */
  getExpressFields?: (context: CheckoutGatewayRenderContext) => CheckoutFormField[];
  /** Gathers `payment_data` before the first `POST /checkout` call, if this gateway needs any (e.g. a captured PayPal order ID). */
  tokenize?: (context: CheckoutGatewayTokenizeContext) => Promise<Record<string, unknown>>;
  /**
   * Called by `submit()` when `POST /checkout` returns `payment_result.payment_status: 'requires_action'`
   * (e.g. 3D Secure/SCA). Should perform whatever client-side confirmation the gateway needs — for Stripe,
   * `stripe.confirmCardPayment()`/`confirmCardSetup()` using `actionData.client_secret`. `submit()` then calls `processCheckout()`
   * again automatically; return additional `payment_data` to merge into that retry, or nothing if it
   * needs none. If a gateway has no `confirmAction`, `submit()` returns the `requires_action` response
   * as-is for the caller to handle.
   */
  confirmAction?: (context: CheckoutGatewayActionContext) => Promise<Record<string, unknown> | void>;
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
  /** Set to `false` to skip the `getCheckout()` call that normally hydrates `checkoutState`/`successUrl` before submission. */
  hydrateCheckoutState?: boolean;
  zeroTotal?: boolean;
}

export interface CheckoutSubmitResult {
  updateResponse?: Response;
  /**
   * Final `POST /checkout` response. If the gateway's `confirmAction` resolved a
   * `requires_action` result, this is the response from the automatic retry, not
   * the original `requires_action` response.
   */
  processResponse: Response<CheckoutProcessResponse>;
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
  processCheckout(data: CheckoutProcessInput): Promise<Response<CheckoutProcessResponse>>;
  getPaymentMethods(): Promise<Response<CheckoutPaymentMethodsResponse>>;
  createForm(options?: { gatewayId?: string; theme?: CheckoutTheme; needsPayment?: boolean; includeSummary?: boolean; shippingMethods?: CheckoutShippingRate[] }): CheckoutFormDefinition;
  listExpressGateways(): CheckoutGatewayPresentation[];
  createExpressCheckoutBar(options?: { layout?: 'scroll' | 'stack'; theme?: CheckoutTheme }): CheckoutExpressBar;
  submit(input: CheckoutSubmitInput): Promise<CheckoutSubmitResult>;
  applyCoupon(code: string): Promise<Response>;
  removeCoupon(code: string): Promise<Response>;
  getOrderSummary(): Promise<CheckoutOrderSummary>;
  getShippingMethods(): Promise<CheckoutShippingPackage[]>;
  getCheckoutConfig(): Promise<Response<CheckoutConfig>>;
  searchAddresses(params: AddressSearchParams): Promise<Response<AddressSearchResult>>;
  getAddressDetails(params: AddressDetailsParams): Promise<Response<AddressDetails>>;
  getOrderReceived(orderId: number, orderKey: string): Promise<Response<OrderReceived>>;
  payForOrder(orderId: number, orderKey: string, data: PayForOrderInput): Promise<Response<PayForOrderResponse>>;
}

export interface CheckoutOptions extends CheckoutSDKOptions {
  gatewayAdapters?: CheckoutGatewayAdapter[];
}

export type CheckoutExtension = CoCartExtension<'checkout', CheckoutSDK>;

/** Minimal Stripe.js interface required by the pre-wired gateway helper. */
export interface StripeInstance {
  /** Used only by `createStripeExpressGateway` — the Express Checkout Element manages its own PaymentIntent lifecycle and needs `elements` to confirm. */
  confirmPayment(options: {
    elements: StripeElementsInstance;
    clientSecret?: string;
    confirmParams?: Record<string, unknown>;
    redirect: 'if_required';
  }): Promise<{ error?: { message?: string }; paymentIntent?: { id: string } }>;
  /**
   * Tokenizes whatever's mounted in `elements` (a deferred-mode Payment Element — no
   * PaymentIntent/clientSecret needed yet) into a PaymentMethod. Used by
   * `createStripeGateway`/`createWooPaymentsGateway`'s pre-wired `tokenize` to produce the
   * `wc-stripe-payment-method`/`wcpay-payment-method` value WooCommerce's gateway reads on the
   * first `POST /checkout`.
   */
  createPaymentMethod(options: {
    elements: StripeElementsInstance;
  }): Promise<{ error?: { message?: string }; paymentMethod: { id: string } }>;
  /**
   * Confirms a PaymentIntent by client secret alone — no `elements` needed, since the
   * PaymentMethod was already attached to the intent server-side by the initial charge
   * attempt. Used by `createStripeGateway`/`createWooPaymentsGateway`'s pre-wired
   * `confirmAction` to resolve `requires_action`/`{stripe,wcpay}_confirm_payment` when
   * `action_data.intent_type === 'payment_intent'`.
   */
  confirmCardPayment(
    clientSecret: string,
  ): Promise<{ error?: { message?: string }; paymentIntent?: { id: string; status?: string } }>;
  /** Same as `confirmCardPayment`, for the `action_data.intent_type === 'setup_intent'` case (order total is 0 — free trial/100%-off coupon). */
  confirmCardSetup(
    clientSecret: string,
  ): Promise<{ error?: { message?: string }; setupIntent?: { id: string; status?: string } }>;
}

/** Minimal Stripe Elements interface required by the pre-wired gateway helper. */
export interface StripeElementsInstance {
  [key: string]: unknown;
}

/**
 * Options for `createStripeGateway`.
 *
 * **Pre-wired path** — pass `stripe` and `elements` (a deferred-mode Payment Element, no
 * PaymentIntent/clientSecret needed yet) for a ready-to-use integration. On the first
 * `POST /checkout`, `tokenize` calls `stripe.createPaymentMethod({ elements })` and sends the
 * result as `payment_data: [{ key: 'wc-stripe-payment-method', value: paymentMethod.id }]` —
 * the literal `$_POST` key `WC_Gateway_Stripe::process_payment()` reads; without it the charge
 * fails outright, there is no bootstrap-free path. If the response comes back
 * `requires_action` (3D Secure/SCA), `confirmAction` calls `stripe.confirmCardPayment()` (or
 * `confirmCardSetup()` for a `setup_intent`) with `action_data.client_secret` — no `elements`
 * needed for this step, the PaymentMethod is already attached to the intent server-side — then
 * `submit()` retries `processCheckout()` automatically, with no `payment_data` needed on retry.
 *
 * **Manual path** — provide a custom `tokenize` callback for full control over the initial
 * `payment_data` (e.g. a saved payment token collected up front, keyed
 * `wc-stripe-payment-token`). `confirmAction` still defaults to the same 3D Secure handling as
 * long as `stripe` is also passed.
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
      stripe?: StripeInstance;
      elements?: StripeElementsInstance;
      tokenize: (context: CheckoutGatewayTokenizeContext) => Promise<{
        /** The `$_POST` key `WC_Gateway_Stripe::process_payment()` reads for a PaymentMethod id (`pm_...`) obtained via `stripe.createPaymentMethod()`. */
        'wc-stripe-payment-method'?: string;
        /** Alternative to `wc-stripe-payment-method` — a ConfirmationToken id (`ctoken_...`) obtained via `stripe.createConfirmationToken()`. Only one of the two should be sent. */
        'wc-stripe-confirmation-token'?: string;
        [key: string]: unknown;
      }>;
    };

/**
 * Options for `createWooPaymentsGateway`. Structurally identical to `StripeGatewayOptions` —
 * WooPayments (WooCommerce Payments) is Stripe-based under the hood, so the same `stripe`/
 * `elements` pre-wired path and `confirmAction` 3D Secure/SCA handling apply; only the
 * WooCommerce gateway ID/plugin (and its server-side redirect convention) differs.
 */
export type WooPaymentsGatewayOptions = StripeGatewayOptions;

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

export interface StripeExpressGatewayOptions {
  label?: string;
  description?: string;
  expressCheckoutPriority?: number;
  /** The Stripe.js instance — used to render the ExpressCheckoutElement. */
  stripe: StripeInstance;
  /** The Stripe Elements instance configured for express checkout. */
  elements: StripeElementsInstance;
}
