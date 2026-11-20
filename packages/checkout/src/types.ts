import type { CheckoutResult, CoCart, CoCartExtension, CoCartPlusCheckoutSchemas, PaymentDataInput, Response } from '@cocartheadless/sdk';

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
  /** Apply (or, with `coupon_action: 'remove'`, remove) a coupon as part of the update. */
  coupon_code?: string;
  coupon_action?: 'apply' | 'remove';
  customer_note?: string;
  create_account?: boolean;
  /** Amounts formatted for display instead of minor units. */
  formatted?: boolean;
  /** `false` leaves each item's `featured_image` empty. */
  thumb?: boolean;
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

/**
 * `placeOrder()` input: what `POST /checkout` takes, with `payment_data` as a map of the keys the
 * WooCommerce gateway reads (or already as `{key, value}` pairs). A free order needs neither
 * `payment_method` nor `payment_data`.
 */
export interface PlaceOrderInput extends CheckoutUpdateInput {
  billing_address?: CheckoutAddressInput;
  payment_data?: PaymentDataInput;
  customer_password?: string;
  /**
   * An ID for this checkout (16 to 64 letters, digits, `-` or `_`), to ask `getCheckoutStatus()`
   * about it. `placeOrder()` makes a random one when you leave it out, and refuses one that
   * doesn't fit (`checkout_invalid_checkout_id`).
   */
  checkout_id?: string;
  /** Only these keys in the order's `meta`. */
  meta_keys?: string[];
}

/**
 * How a checkout ended, from `getCheckoutStatus()` (`GET /checkout/status`). The order fields are
 * `null` unless the checkout placed an order.
 */
export interface CheckoutStatus {
  checkoutId: string;
  /**
   * `order_placed`: show the order. `payment_required`: the order was placed but isn't paid; pay it
   * with `payForOrder()`. `in_progress`: the checkout is still running; ask again in a few seconds.
   * `not_placed`: nothing went through; place the order again (it reuses the draft order).
   */
  code: 'order_placed' | 'payment_required' | 'in_progress' | 'not_placed' | (string & {});
  /** A message for the customer. */
  message: string;
  orderId: number | null;
  orderKey: string | null;
  orderNumber: string | null;
  /** The order's status code, e.g. `processing` or `pending`. */
  orderStatus: string | null;
}

/** A logged-in customer's saved payment method, from `getSavedPaymentMethods()`. */
export interface SavedPaymentMethod {
  /** Pass as `wc-{gatewayId}-payment-token` in `payment_data`, or as `token_id` to change a subscription's card. */
  id: number;
  gatewayId: string;
  /** As the customer sees it, e.g. `Visa ending in 4242`. */
  label: string;
  type: string;
  /** `MM/YYYY`, or `null` when it has no expiry. */
  expires: string | null;
  isDefault: boolean;
  /** The gateway can charge subscription renewals with it. */
  supportsSubscriptions: boolean;
}

/** All component schemas of the CoCart Plus v2 checkout spec. */
type Schemas = CoCartPlusCheckoutSchemas;

/** `GET /checkout/payment-methods`: `{ payment_methods: [...] }`, in the order the store lists them. */
export type CheckoutPaymentMethodsResponse = Schemas['PaymentMethods'];

/** One payment method: `id`, `title`, `description`, `supports`, `saved_tokens`… */
export type CheckoutPaymentMethod = CheckoutPaymentMethodsResponse['payment_methods'][number];

/** A saved payment method on `CheckoutPaymentMethod.saved_tokens`: `id`, `label`, `type`, `is_default`, `expires`. */
export type PaymentToken = CheckoutPaymentMethod['saved_tokens'][number];

/** `GET`, `PUT` and `PATCH /checkout`: the checkout as it stands, like a receipt. No order yet. */
export type CheckoutState = Schemas['Checkout'];

/** One shipping package of the checkout (`delivery.packages`), with its rates and the one chosen. */
export type CheckoutShippingPackage = CheckoutState['delivery']['packages'][number];

/** One shipping rate of a package. Send its `id` as `shipping_method`. */
export type CheckoutShippingRate = CheckoutShippingPackage['rates'][number];

/** @deprecated Use `CheckoutShippingRate`. */
export type ShippingMethodOption = CheckoutShippingRate;

/**
 * Known `action.type` values on a payment's `result`. Not exhaustive: any gateway without a
 * dedicated integration falls back to `gateway_redirect_required`, and a store can add its own.
 * Kept as a loose union (`| (string & {})`) so unknown values still type-check.
 */
export type CheckoutActionType =
  | 'stripe_confirm_payment'
  | 'stripe_wallet_payment'
  | 'stripe_voucher_payment'
  | 'stripe_blik_confirmation_pending'
  | 'wcpay_confirm_payment'
  | 'wcpay_multibanco_voucher'
  | 'paypal_approve'
  | 'paypal_confirm_3ds'
  | 'mercadopago_confirm_3ds'
  | 'mercadopago_pix_payment'
  | 'mercadopago_ticket_payment'
  | 'mollie_bank_transfer_instructions'
  | 'elavon_checkout_js_payment'
  | 'razorpay_checkout_subscription'
  | 'gateway_redirect_required'
  | (string & {});

/** `action.data` for `stripe_confirm_payment` / `wcpay_confirm_payment` (`action_required`): confirm with the gateway's Stripe.js, then place the order again. */
export interface ConfirmPaymentActionData {
  client_secret: string;
  intent_type: 'payment_intent' | 'setup_intent';
}

/**
 * `action.data` for `stripe_wallet_payment` (Cash App Pay, WeChat Pay) and `stripe_voucher_payment`
 * (Boleto, OXXO, Multibanco). Comes with `order_placed`: the order is placed but not paid. The
 * customer pays in the page with the Stripe.js method for `payment_method_type`
 * (`createStripeGateway`'s `confirmAction` does it in `submit()`), and Stripe's webhook marks the
 * order paid. There's nothing to retry.
 */
export interface StripeAsyncPaymentActionData {
  /** `cashapp`, `wechat_pay`, `boleto`, `oxxo` or `multibanco`. */
  payment_method_type: string;
  client_secret: string;
}

/** `action.data` for `wcpay_multibanco_voucher`. Comes with `order_placed`: details to show the customer, nothing to retry. */
export interface MultibancoVoucherActionData {
  entity: string;
  reference: string;
  voucher_url: string;
  expires_at: string;
}

/**
 * `action.data` for `paypal_approve`, `paypal_confirm_3ds`, and the generic `gateway_redirect_required`
 * fallback (`action_required`): send the customer to `redirect`. When they come back (to the store's
 * order-received URL, which CoCart rewrites to the frontend), call `confirmReturn()` so the gateway
 * can finish the order. Don't assume the payment is done as soon as the redirect returns.
 */
export interface RedirectActionData {
  redirect: string;
}

/**
 * CoCart's code for why a payment failed. Fraud-related declines are reported as `card_declined`,
 * and `payment_failed` means the reason isn't known.
 */
export type PaymentErrorCode =
  | 'card_declined'
  | 'insufficient_funds'
  | 'expired_card'
  | 'incorrect_cvc'
  | 'incorrect_number'
  | 'incorrect_postcode'
  | 'authentication_failed'
  | 'processing_error'
  | 'payment_method_not_supported'
  | 'amount_not_supported'
  | 'payment_failed'
  | (string & {});

/**
 * What a payment did: `result` on the order that `POST /checkout`, `POST /order-received/{id}/pay`
 * and `POST /order-received/{id}/confirm` return. `code` is `order_placed`, `action_required`
 * (see `action`), `payment_pending` or `payment_failed` (see `error`). Read it with `CheckoutResult`.
 */
export type PaymentResult = Schemas['OrderPayment']['result'];

/** Why a payment failed: `result.error` when `result.code` is `payment_failed`. */
export interface PaymentError {
  /** Stable code to branch on. Stripe and WooPayments report their reasons; other gateways give `payment_failed`. */
  code: PaymentErrorCode;
  /** The gateway's own error or decline code (e.g. Stripe's `generic_decline`), or `null`. */
  gateway_code: string | null;
  /** The gateway's own message, for logging, or `null`. Show `result.message` to the customer. */
  gateway_message: string | null;
}

/** `POST /checkout`: the order it placed, with what the payment did in `result`. Read it with `CheckoutResult`. */
export type CheckoutProcessResponse = Schemas['OrderPayment'];

// --- Checkout config (GET /checkout/config) ---

/**
 * `GET /checkout/config`. Public: doesn't need a cart session. Includes `order_received_url`
 * (where gateways send the customer back after an off-site step: your page for `confirmReturn()`),
 * `address_autocomplete` (`enabled` and the `providers`: without one, address search is `404`), and
 * in `store` the terms text with its links (`terms_text`, `terms_links`, `terms_url`, `privacy_url`).
 */
export type CheckoutConfig = Schemas['CheckoutConfig'];
/** One field definition in `CheckoutConfig.fields`. */
export type CheckoutFieldDefinition = CheckoutConfig['fields']['billing'][number];
export type CheckoutCountriesConfig = CheckoutConfig['countries'];
export type CheckoutShippingConfig = CheckoutConfig['shipping'];
export type CheckoutAccountConfig = CheckoutConfig['account'];
export type CheckoutStoreConfig = CheckoutConfig['store'];
export type CheckoutValidationConfig = CheckoutConfig['validation'];

// --- Address autocomplete (GET /address/search, GET /address/details) ---

/** `GET /address/search`. */
export type AddressSearchResult = Schemas['AddressSearch'];
export type AddressSuggestion = AddressSearchResult['suggestions'][number];
export type AddressMatchedSubstring = AddressSuggestion['matched_substrings'][number];
export type AddressProvider = AddressSearchResult['provider'];

export interface AddressSearchParams {
  /** At least 3 characters. */
  query: string;
  /** Two-letter country code to scope the search to. */
  country?: string;
  type?: 'billing' | 'shipping';
  /** Address provider ID (`CheckoutConfig.address_autocomplete.providers`). Defaults to the first. */
  provider?: string;
}

export interface AddressDetailsParams {
  /** The suggestion ID returned by `searchAddresses()`. */
  address_id: string;
  /** The address provider ID that returned the suggestion. */
  provider: string;
}

/** `GET /address/details`. */
export type AddressDetails = Schemas['AddressDetails'];

// --- Order received / pay for order (GET /order-received/{id}, POST /order-received/{id}/pay) ---

/**
 * `GET /order-received/{order_id}`: the order, as a thank-you page shows it (and as my account
 * gives it). `actions` has `pay` while it needs payment, and `downloads` when it has files.
 */
export type OrderReceived = Schemas['Order'];
/** The billing address on an order (`customer.billing`), with `formatted` for display. */
export type OrderAddress = NonNullable<OrderReceived['customer']['billing']>;
export type OrderLineItem = OrderReceived['items'][number];
export type OrderLineItemMeta = OrderLineItem['meta_data'][number];
/** One line of the order's totals, for display: `key`, `label`, `amount`, `detail`. */
export type OrderTotalLine = OrderReceived['total_lines'][number];
/** A payment method the order can be paid with while it needs payment (`payment.available_methods`). */
export type AvailablePaymentMethod = OrderReceived['payment']['available_methods'][number];

export interface PayForOrderInput {
  payment_method: string;
  /** A map of the keys the gateway reads, or `{key, value}` pairs. */
  payment_data?: PaymentDataInput;
}

/** `POST /order-received/{order_id}/pay`: the order, with what the payment did in `result`. Read it with `CheckoutResult`. */
export type PayForOrderResponse = Schemas['OrderPayment'];

/**
 * `POST /order-received/{order_id}/confirm`: the order (or, for a subscription whose payment method
 * was being changed, the subscription, as `object` says), with what the confirmation found in
 * `result`. `payment_pending` means it isn't confirmed yet. Safe to call more than once.
 */
export type ConfirmOrderPaymentResponse = Schemas['PaymentConfirmation'];

/** Options for `getCheckout()` and `getOrderReceived()`. */
export interface CheckoutParams {
  /** Show prices in this currency (multi-currency stores). `getCheckout()` only. */
  currency?: string;
  /** Amounts formatted for display (`"$18.00"`) instead of minor units (`"1800"`). */
  formatted?: boolean;
  /** `false` leaves each item's `featured_image` empty. `getCheckout()` only. */
  thumb?: boolean;
  /** Only these keys in the order's `meta`. `getOrderReceived()` only. */
  meta_keys?: string[];
}

/** Options for `confirmReturn()`, overriding what it reads from the return URL. */
export interface ConfirmReturnOptions {
  /** Defaults to the `order_id` query parameter the payment gateway adds to the return URL. */
  orderId?: number;
  /** Defaults to the `key` query parameter (the order key) on the return URL. */
  orderKey?: string;
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
  /** The totals as lines to display, in order: `key`, `label`, `amount`, `detail`. */
  lines: CheckoutState['total_lines'];
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
  /** `result.action.type` on the `POST /checkout` response (`CheckoutResult.actionType`). See `CheckoutActionType`. */
  actionType: CheckoutActionType;
  /** `result.action.data` — shape is gateway-specific, e.g. `{ client_secret, intent_type }` for Stripe. */
  actionData: Record<string, unknown>;
  checkoutState?: CheckoutState;
  /** Success URL with `{CHECKOUT_ID}` substituted from the current checkout state, if available. */
  successUrl?: string;
  /** Return URL for failed or cancelled payments. */
  returnUrl?: string;
  /** `result.redirect_url`: the order-received URL, when the order is already placed (`order_placed`). */
  redirectUrl?: string;
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
   * Called by `submit()` when `POST /checkout` returns `result.code: 'action_required'` with
   * something to do in the page (e.g. 3D Secure/SCA). Should perform whatever client-side confirmation the gateway needs — for Stripe,
   * `stripe.confirmCardPayment()`/`confirmCardSetup()` using `actionData.client_secret`. `submit()` then calls `processCheckout()`
   * again automatically; return additional `payment_data` to merge into that retry, or nothing if it
   * needs none. If a gateway has no `confirmAction`, `submit()` returns the `action_required` result
   * as-is for the caller to handle.
   *
   * Also called for an `order_placed` result whose `action.data` has a `client_secret` (Stripe's Cash App
   * Pay, WeChat Pay and vouchers: `CheckoutResult.isAwaitingPayment`): the order is placed, the customer pays in the page, and the
   * gateway's webhook marks the order paid. `submit()` doesn't retry then, and ignores anything returned.
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
   * Final `POST /checkout` response. If the gateway's `confirmAction` resolved an
   * `action_required` result, this is the response from the automatic retry, not
   * the original `action_required` response.
   */
  processResponse: Response<CheckoutProcessResponse>;
  /** What the final `POST /checkout` did, read from `processResponse`: `isComplete`, `isFailed`, `orderId`… */
  result: CheckoutResult;
  paymentData?: Record<string, unknown>;
  /**
   * Set when the payment needs an off-site step: an `action_required` result whose `action.data`
   * carries a `redirect` URL rather than something to confirm in-page (e.g. `gateway_redirect_required`
   * for a Stripe-hosted 3D Secure page). Send the customer here; `submit()` doesn't retry in this case.
   * When they return, call `confirmReturn()` on the page they land on.
   */
  redirectUrl?: string;
}

export interface CheckoutSDK {
  registerGateway(adapter: CheckoutGatewayAdapter): this;
  registerGateways(adapters: CheckoutGatewayAdapter[]): this;
  hasGateway(id: string): boolean;
  getGateway(id: string): CheckoutGatewayAdapter;
  listGateways(remoteMethods?: CheckoutPaymentMethodsResponse): CheckoutGatewayPresentation[];
  getCheckout(params?: CheckoutParams): Promise<Response<CheckoutState>>;
  updateCheckout(data: CheckoutUpdateInput): Promise<Response<CheckoutState>>;
  processCheckout(data: CheckoutProcessInput): Promise<Response<CheckoutProcessResponse>>;
  placeOrder(input: PlaceOrderInput): Promise<CheckoutResult>;
  getCheckoutStatus(checkoutId: string): Promise<CheckoutStatus>;
  getPaymentMethods(): Promise<Response<CheckoutPaymentMethodsResponse>>;
  getSavedPaymentMethods(gatewayId?: string): Promise<SavedPaymentMethod[]>;
  createForm(options?: { gatewayId?: string; theme?: CheckoutTheme; needsPayment?: boolean; includeSummary?: boolean; shippingMethods?: CheckoutShippingRate[] }): CheckoutFormDefinition;
  listExpressGateways(): CheckoutGatewayPresentation[];
  createExpressCheckoutBar(options?: { layout?: 'scroll' | 'stack'; theme?: CheckoutTheme }): CheckoutExpressBar;
  submit(input: CheckoutSubmitInput): Promise<CheckoutSubmitResult>;
  applyCoupon(code: string): Promise<Response<CheckoutState>>;
  removeCoupon(code: string): Promise<Response<CheckoutState>>;
  getOrderSummary(): Promise<CheckoutOrderSummary>;
  getShippingMethods(): Promise<CheckoutShippingPackage[]>;
  getCheckoutConfig(): Promise<Response<CheckoutConfig>>;
  searchAddresses(params: AddressSearchParams): Promise<Response<AddressSearchResult>>;
  getAddressDetails(params: AddressDetailsParams): Promise<Response<AddressDetails>>;
  getOrderReceived(orderId: number, orderKey: string, params?: CheckoutParams): Promise<Response<OrderReceived>>;
  payForOrder(orderId: number, orderKey: string, data: PayForOrderInput): Promise<CheckoutResult>;
  confirmOrderPayment(orderId: number, orderKey: string, returnParams?: Record<string, string>): Promise<Response<ConfirmOrderPaymentResponse>>;
  confirmReturn(url: string | URL, options?: ConfirmReturnOptions): Promise<CheckoutResult>;
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
    params?: { billing_details?: StripeBillingDetails };
  }): Promise<{ error?: { message?: string }; paymentMethod: { id: string } }>;
  /**
   * Confirms a PaymentIntent by client secret alone — no `elements` needed, since the
   * PaymentMethod was already attached to the intent server-side by the initial charge
   * attempt. Used by `createStripeGateway`/`createWooPaymentsGateway`'s pre-wired
   * `confirmAction` to resolve `action_required`/`{stripe,wcpay}_confirm_payment` when
   * `action.data.intent_type === 'payment_intent'`.
   */
  confirmCardPayment(
    clientSecret: string,
  ): Promise<{ error?: { message?: string }; paymentIntent?: { id: string; status?: string } }>;
  /** Same as `confirmCardPayment`, for the `action.data.intent_type === 'setup_intent'` case (order total is 0 — free trial/100%-off coupon). */
  confirmCardSetup(
    clientSecret: string,
  ): Promise<{ error?: { message?: string }; setupIntent?: { id: string; status?: string } }>;
  /**
   * The Stripe.js methods for an order placed on hold (`order_placed` with an action) that the customer still pays in the page
   * (`stripe_wallet_payment`, `stripe_voucher_payment`). Real Stripe.js has them all; only the ones
   * for the payment methods the store offers are needed.
   */
  confirmCashappPayment?(clientSecret: string, data?: Record<string, unknown>): Promise<StripeAsyncPaymentResult>;
  confirmCashappSetup?(clientSecret: string, data?: Record<string, unknown>): Promise<StripeAsyncPaymentResult>;
  confirmWechatPayPayment?(clientSecret: string, data?: Record<string, unknown>): Promise<StripeAsyncPaymentResult>;
  confirmBoletoPayment?(clientSecret: string, data?: Record<string, unknown>): Promise<StripeAsyncPaymentResult>;
  confirmOxxoPayment?(clientSecret: string, data?: Record<string, unknown>): Promise<StripeAsyncPaymentResult>;
  confirmMultibancoPayment?(clientSecret: string, data?: Record<string, unknown>): Promise<StripeAsyncPaymentResult>;
}

/** What Stripe.js's Cash App Pay, WeChat Pay and voucher methods resolve with. */
export interface StripeAsyncPaymentResult {
  error?: { message?: string };
  paymentIntent?: { id: string; status?: string; last_payment_error?: { message?: string } | null };
  setupIntent?: { id: string; status?: string; last_setup_error?: { message?: string } | null };
}

/** Minimal Stripe Elements interface required by the pre-wired gateway helper. */
export interface StripeElementsInstance {
  /** Validates the Payment Element and collects wallet details; Stripe requires it before `createPaymentMethod()` in deferred mode. */
  submit?(): Promise<{ error?: { message?: string } }>;
  [key: string]: unknown;
}

/** Billing details passed to `stripe.createPaymentMethod()`, built from the checkout's billing address. */
export interface StripeBillingDetails {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null };
}

/**
 * Options for `createStripeGateway`.
 *
 * **Pre-wired path** — pass `stripe` and `elements` (a deferred-mode Payment Element, no
 * PaymentIntent/clientSecret needed yet) for a ready-to-use integration. On the first
 * `POST /checkout`, `tokenize` calls `elements.submit()`, then `stripe.createPaymentMethod({ elements, params: { billing_details } })`
 * with the checkout's billing address (so the Payment Element can hide its own billing fields), and sends the
 * result as `payment_data: [{ key: 'wc-stripe-payment-method', value: paymentMethod.id }]` —
 * the literal `$_POST` key `WC_Gateway_Stripe::process_payment()` reads; without it the charge
 * fails outright, there is no bootstrap-free path. If the response comes back
 * `action_required` (3D Secure/SCA), `confirmAction` calls `stripe.confirmCardPayment()` (or
 * `confirmCardSetup()` for a `setup_intent`) with `action.data.client_secret` — no `elements`
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
