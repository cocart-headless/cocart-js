import type {
  AuthorizeNetGatewayOptions,
  BankTransferGatewayOptions,
  CashOnDeliveryGatewayOptions,
  CheckoutGatewayAdapter,
  CheckPaymentGatewayOptions,
  PayPalGatewayOptions,
  StripeGatewayOptions,
} from './types.js';

export function createStripeGateway(options: StripeGatewayOptions): CheckoutGatewayAdapter {
  const tokenize: CheckoutGatewayAdapter['tokenize'] = options.stripe
    ? async ({ paymentContext, successUrl, returnUrl }) => {
        const clientSecret = String(paymentContext?.client_secret ?? '');
        const confirmParams: Record<string, unknown> = {};
        if (successUrl) confirmParams.return_url = successUrl;
        else if (returnUrl) confirmParams.return_url = returnUrl;
        const { error, paymentIntent } = await options.stripe!.confirmPayment({
          elements: options.elements!,
          confirmParams,
          redirect: 'if_required',
        });
        if (error) throw new Error(error.message ?? 'Stripe payment failed');
        return { payment_intent_id: paymentIntent?.id ?? clientSecret };
      }
    : options.tokenize;

  return {
    id: 'stripe',
    provider: 'stripe',
    label: options.label ?? 'Stripe',
    description: options.description ?? 'Card payments powered by Stripe Elements and Payment Intents.',
    supports: ['payment_context', 'payment_intents', 'saved_cards'],
    getFields: ({ theme }) => [
      {
        name: 'payment_data.payment_element',
        label: 'Card details',
        type: 'gateway-element',
        component: 'StripePaymentElement',
        className: theme.paymentContainerClassName,
      },
    ],
    tokenize,
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
    supports: ['payment_context', 'buttons', 'redirectless_checkout'],
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
