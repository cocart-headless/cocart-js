import type {
  AuthorizeNetGatewayOptions,
  BankTransferGatewayOptions,
  CashOnDeliveryGatewayOptions,
  CheckoutGatewayAdapter,
  CheckPaymentGatewayOptions,
  PayPalGatewayOptions,
  StripeElementsInstance,
  StripeExpressGatewayOptions,
  StripeGatewayOptions,
  StripeInstance,
  WooPaymentsGatewayOptions,
} from './types.js';

/**
 * Shared by createStripeGateway/createWooPaymentsGateway — both surface a `requires_action`
 * PaymentIntent confirmation (`client_secret`/`intent_type`) through the same Stripe.js API,
 * just from two different WooCommerce gateway plugins with their own redirect conventions
 * server-side (decoded into the same envelope shape by their respective compat files).
 */
function createStripeStyleConfirmAction(
  stripe: StripeInstance | undefined,
  elements: StripeElementsInstance | undefined,
  failureMessage: string,
): CheckoutGatewayAdapter['confirmAction'] {
  if (!stripe || !elements) return undefined;
  return async ({ actionData, successUrl, returnUrl }) => {
    const clientSecret = String(actionData.client_secret ?? '');
    const confirmParams: Record<string, unknown> = {};
    if (successUrl) confirmParams.return_url = successUrl;
    else if (returnUrl) confirmParams.return_url = returnUrl;
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams,
      redirect: 'if_required',
    });
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
    // WooCommerce's Stripe gateway creates the PaymentIntent server-side during POST /checkout —
    // there's no client_secret (or anything else) to gather before the first submission, so the
    // pre-wired path sends no payment_data unless a manual `tokenize` was also provided.
    tokenize: options.tokenize,
    confirmAction: createStripeStyleConfirmAction(options.stripe, options.elements, 'Stripe payment confirmation failed'),
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
    tokenize: options.tokenize,
    confirmAction: createStripeStyleConfirmAction(options.stripe, options.elements, 'WooPayments payment confirmation failed'),
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
