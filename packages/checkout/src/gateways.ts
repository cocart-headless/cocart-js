import type {
  AuthorizeNetGatewayOptions,
  BankTransferGatewayOptions,
  CashOnDeliveryGatewayOptions,
  CheckoutAddressInput,
  CheckoutGatewayAdapter,
  CheckPaymentGatewayOptions,
  PayPalGatewayOptions,
  StripeBillingDetails,
  StripeElementsInstance,
  StripeExpressGatewayOptions,
  StripeGatewayOptions,
  StripeInstance,
  WooPaymentsGatewayOptions,
} from './types.js';

/**
 * Shared by createStripeGateway/createWooPaymentsGateway's pre-wired path — tokenizes
 * whatever's mounted in `elements` (a deferred-mode Payment Element, no clientSecret needed
 * yet) into a PaymentMethod, then returns it under the literal `$_POST` key the WooCommerce
 * gateway's `process_payment()` actually reads: `wc-stripe-payment-method`, verified against
 * `WC_Stripe_UPE_Payment_Gateway::prepare_payment_information_from_request()`
 * (`class-wc-stripe-upe-payment-gateway.php:3304`); `wcpay-payment-method` for WooPayments,
 * verified against `class-payment-information.php:311`. Without this, `process_payment()` has
 * no PaymentMethod to charge and fails outright on the first attempt — there is no
 * bootstrap-free path for the default (non-"Optimized Checkout") flow.
 */
function createStripeStyleTokenize(
  stripe: StripeInstance | undefined,
  elements: StripeElementsInstance | undefined,
  paymentMethodDataKey: string,
): CheckoutGatewayAdapter['tokenize'] {
  if (!stripe || !elements) return undefined;
  return async ({ input }) => {
    // Stripe requires elements.submit() before createPaymentMethod() in deferred mode: it
    // validates the form and collects wallet details. Mocks and older shims may not have it.
    if (typeof elements.submit === 'function') {
      const submitted = await elements.submit();
      if (submitted?.error) throw new Error(submitted.error.message ?? 'Check your card details.');
    }

    // The checkout's billing address, so it also works when the Payment Element hides its own
    // billing fields (`fields.billingDetails: 'never'`), which makes Stripe require them here.
    const billingDetails = toStripeBillingDetails(input.billing_address);
    const { error, paymentMethod } = await stripe.createPaymentMethod(
      billingDetails ? { elements, params: { billing_details: billingDetails } } : { elements },
    );
    if (error) throw new Error(error.message ?? 'Failed to process card details.');
    return { [paymentMethodDataKey]: paymentMethod.id };
  };
}

/**
 * A checkout billing address as Stripe `billing_details`; undefined when there's no address.
 * Every field is sent, empty ones as `null`: when the Payment Element hides billing fields
 * (`'never'`), Stripe rejects createPaymentMethod() unless each hidden field is passed, even
 * when the customer left it blank (e.g. an optional phone).
 */
function toStripeBillingDetails(address: CheckoutAddressInput | undefined): StripeBillingDetails | undefined {
  if (!address || Object.keys(address).length === 0) return undefined;
  const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);
  return {
    name: [text(address.first_name), text(address.last_name)].filter(Boolean).join(' ') || null,
    email: text(address.email),
    phone: text(address.phone),
    address: {
      line1: text(address.address_1),
      line2: text(address.address_2),
      city: text(address.city),
      state: text(address.state),
      postal_code: text(address.postcode),
      country: text(address.country),
    },
  };
}

/**
 * Shared by createStripeGateway/createWooPaymentsGateway — both surface a `requires_action`
 * PaymentIntent/SetupIntent confirmation (`client_secret`/`intent_type`) through the same
 * Stripe.js API, just from two different WooCommerce gateway plugins with their own redirect
 * conventions server-side (decoded into the same envelope shape by their respective compat
 * files). Uses `confirmCardPayment`/`confirmCardSetup`, not `confirmPayment({ elements })` —
 * the PaymentMethod was already attached to the intent server-side by the initial charge
 * attempt, so no `elements` rebind against the new `clientSecret` is needed (and `elements`
 * was never initialized with one to rebind to in the first place, per the deferred-mode setup
 * above).
 */
function createStripeStyleConfirmAction(
  stripe: StripeInstance | undefined,
  failureMessage: string,
): CheckoutGatewayAdapter['confirmAction'] {
  if (!stripe) return undefined;
  return async ({ actionData }) => {
    const clientSecret = String(actionData.client_secret ?? '');
    const { error } =
      actionData.intent_type === 'setup_intent'
        ? await stripe.confirmCardSetup(clientSecret)
        : await stripe.confirmCardPayment(clientSecret);
    if (error) throw new Error(error.message ?? failureMessage);
  };
}

export function createStripeGateway(options: StripeGatewayOptions): CheckoutGatewayAdapter {
  return {
    id: 'stripe',
    provider: 'stripe',
    label: options.label ?? 'Stripe',
    description: options.description ?? 'Card payments powered by Stripe Elements and Payment Intents.',
    supports: ['requires_action', 'payment_intents', 'saved_cards'],
    getFields: ({ theme }) => [
      {
        name: 'payment_data.payment_element',
        label: 'Card details',
        type: 'gateway-element',
        component: 'StripePaymentElement',
        className: theme.paymentContainerClassName,
      },
    ],
    tokenize:
      options.tokenize ??
      createStripeStyleTokenize(options.stripe, options.elements, 'wc-stripe-payment-method'),
    confirmAction: createStripeStyleConfirmAction(options.stripe, 'Stripe payment confirmation failed'),
  };
}

/**
 * WooPayments (WooCommerce Payments) — a separate plugin from the standalone WooCommerce
 * Stripe Gateway, but Stripe-based under the hood, so the client-side integration is
 * identical: pass `stripe`/`elements` for the pre-wired path, same as `createStripeGateway`.
 * The server-side compat integration decodes WooPayments' own redirect convention into the
 * same `{ client_secret, intent_type }` envelope (`action_type: 'wcpay_confirm_payment'`).
 */
export function createWooPaymentsGateway(options: WooPaymentsGatewayOptions): CheckoutGatewayAdapter {
  return {
    id: 'woocommerce_payments',
    provider: 'stripe',
    label: options.label ?? 'WooPayments',
    description: options.description ?? 'Card and local payment methods powered by WooPayments.',
    supports: ['requires_action', 'payment_intents', 'saved_cards'],
    getFields: ({ theme }) => [
      {
        name: 'payment_data.payment_element',
        label: 'Card details',
        type: 'gateway-element',
        component: 'StripePaymentElement',
        className: theme.paymentContainerClassName,
      },
    ],
    tokenize:
      options.tokenize ??
      createStripeStyleTokenize(options.stripe, options.elements, 'wcpay-payment-method'),
    confirmAction: createStripeStyleConfirmAction(options.stripe, 'WooPayments payment confirmation failed'),
  };
}

export function createPayPalGateway(options: PayPalGatewayOptions): CheckoutGatewayAdapter {
  let capturedOrderID: string | undefined;
  let capturedPayerID: string | undefined;

  const tokenize: CheckoutGatewayAdapter['tokenize'] = options.createOrder
    ? async () => {
        capturedOrderID = await options.createOrder!();
        await options.onApprove!({ orderID: capturedOrderID, payerID: capturedPayerID });
        return { order_id: capturedOrderID, payer_id: capturedPayerID };
      }
    : options.tokenize;

  return {
    id: 'paypal',
    provider: 'paypal',
    label: options.label ?? 'PayPal',
    description: options.description ?? 'Smart Buttons and PayPal order approval flow.',
    supports: ['buttons', 'redirectless_checkout'],
    getFields: ({ theme }) => [
      {
        name: 'payment_data.paypal_buttons',
        label: 'PayPal',
        type: 'gateway-element',
        component: 'PayPalButtons',
        className: theme.paymentContainerClassName,
      },
    ],
    tokenize,
  };
}

export function createAuthorizeNetGateway(options: AuthorizeNetGatewayOptions): CheckoutGatewayAdapter {
  const tokenize: CheckoutGatewayAdapter['tokenize'] = options.dispatchData
    ? async () => {
        const result = await options.dispatchData!(
          { clientKey: options.clientKey!, apiLoginID: options.apiLoginID! },
          options.cardData ?? {},
        );
        return {
          data_descriptor: result.opaqueData.dataDescriptor,
          data_value: result.opaqueData.dataValue,
        };
      }
    : options.tokenize;

  return {
    id: 'authorizenet',
    provider: 'authorizenet',
    label: options.label ?? 'Authorize.Net',
    description: options.description ?? 'Accept.js based tokenization for card payments.',
    supports: ['opaque_data', 'accept_js'],
    getFields: ({ theme }) => [
      {
        name: 'payment_data.acceptjs',
        label: 'Card details',
        type: 'gateway-element',
        component: 'AuthorizeNetAcceptHosted',
        className: theme.paymentContainerClassName,
      },
    ],
    tokenize,
  };
}

export function createStripeExpressGateway(options: StripeExpressGatewayOptions): CheckoutGatewayAdapter {
  return {
    id: 'stripe-express',
    provider: 'stripe',
    label: options.label ?? 'Express Checkout',
    description: options.description ?? 'Pay with Apple Pay, Google Pay, or Link.',
    supports: ['requires_action', 'payment_intents', 'express_checkout'],
    express: true,
    expressCheckoutPriority: options.expressCheckoutPriority ?? 10,
    getExpressFields: ({ theme, collectShippingAddress }) => [
      {
        name: 'payment_data.express_element',
        label: 'Express checkout',
        type: 'gateway-element',
        component: 'StripeExpressCheckoutElement',
        className: theme.paymentContainerClassName,
        props: { requestShipping: collectShippingAddress },
      },
    ],
    // The Express Checkout Element resolves a confirmed payment method entirely client-side
    // (Apple Pay/Google Pay sheet) before submit() is ever called — no tokenize step needed here.
    // Same as the standard Stripe gateway, submit() sends no payment_data on the first POST /checkout;
    // confirmAction only comes into play on the rare case a wallet payment still needs 3D Secure.
    confirmAction: async ({ actionData, successUrl, returnUrl }) => {
      const clientSecret = String(actionData.client_secret ?? '');
      const confirmParams: Record<string, unknown> = {};
      if (successUrl) confirmParams.return_url = successUrl;
      else if (returnUrl) confirmParams.return_url = returnUrl;
      const { error } = await options.stripe.confirmPayment({
        elements: options.elements,
        clientSecret,
        confirmParams,
        redirect: 'if_required',
      });
      if (error) throw new Error(error.message ?? 'Stripe express payment confirmation failed');
    },
  };
}

export function createBankTransferGateway(options: BankTransferGatewayOptions = {}): CheckoutGatewayAdapter {
  return {
    id: 'bacs',
    provider: 'bacs',
    label: options.label ?? 'Direct Bank Transfer',
    description: options.description,
    supports: ['offline'],
  };
}

export function createCheckPaymentGateway(options: CheckPaymentGatewayOptions = {}): CheckoutGatewayAdapter {
  return {
    id: 'cheque',
    provider: 'cheque',
    label: options.label ?? 'Check Payment',
    description: options.description,
    supports: ['offline'],
  };
}

export function createCashOnDeliveryGateway(options: CashOnDeliveryGatewayOptions = {}): CheckoutGatewayAdapter {
  return {
    id: 'cod',
    provider: 'cod',
    label: options.label ?? 'Cash on Delivery',
    description: options.description,
    supports: ['offline'],
  };
}
