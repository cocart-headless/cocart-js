import { describe, expect, it, vi } from 'vitest';
import { CoCart, CoCartError } from '@cocartheadless/sdk';
import {
  createAuthorizeNetGateway,
  createBankTransferGateway,
  createCashOnDeliveryGateway,
  createCheckout,
  createCheckPaymentGateway,
  createPayPalGateway,
  createStripeGateway,
  createTailwindCheckoutTheme,
  shadcnCheckoutTheme,
} from '../src/index.js';

describe('@cocartheadless/checkout', () => {
  it('installs as a separate package extension and uses preview checkout routes', async () => {
    const client = new CoCart('https://store.com', {
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
    }).use(createCheckout({
      gatewayAdapters: [
        createStripeGateway({
          tokenize: async () => ({ payment_intent_id: 'pi_123' }),
        }),
      ],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValue({ toObject: () => ({}) } as never);

    await client.checkout.getCheckout();
    expect(requestRaw).toHaveBeenCalledTimes(1);
    const [method, route, params] = requestRaw.mock.calls[0];
    expect(method).toBe('GET');
    expect(route).toBe('cocart/preview/checkout');
    expect(params).toEqual(expect.objectContaining({
      consumer_key: 'ck_test',
      consumer_secret: 'cs_test',
    }));
  });

  it('submits through update + process and includes tokenized payment_data', async () => {
    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [
        createStripeGateway({
          tokenize: async ({ paymentContext }) => ({
            payment_intent_id: String(paymentContext?.client_secret ?? 'pi_123'),
          }),
        }),
      ],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ client_secret: 'pi_123_secret' }) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ updated: true }) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ payment_result: { payment_status: 'processing' } }) } as never);

    await client.checkout.submit({
      gatewayId: 'stripe',
      update: {
        billing_address: {
          first_name: 'Jane',
          address_1: '1 Main Street',
        },
      },
      process: {
        shipping_method: 'flat_rate:1',
      },
    });

    expect(requestRaw).toHaveBeenNthCalledWith(2,
      'POST',
      'cocart/preview/checkout/payment-context',
      expect.any(Object),
      { payment_method: 'stripe' },
    );
    expect(requestRaw).toHaveBeenNthCalledWith(4,
      'PUT',
      'cocart/preview/checkout',
      expect.any(Object),
      expect.objectContaining({
        payment_method: 'stripe',
        payment_data: {
          payment_intent_id: 'pi_123_secret',
        },
      }),
    );
  });

  it('provides themed forms for shadcn or tailwind rendering', () => {
    const client = new CoCart('https://store.com').use(createCheckout({
      defaultTheme: createTailwindCheckoutTheme(),
      shippingSameAsBilling: false,
      gatewayAdapters: [
        createPayPalGateway({
          tokenize: async () => ({ order_id: 'order_123' }),
        }),
      ],
    }));

    const form = client.checkout.createForm({ gatewayId: 'paypal' });
    expect(form.theme.name).toBe('tailwind');
    expect(form.sections.map((section) => section.id)).toEqual(['contact', 'billing', 'shipping', 'notes', 'payment']);
    expect(shadcnCheckoutTheme.inputClassName).toContain('border-input');
  });

  it('ships focused helpers for stripe, paypal, and authorizenet', () => {
    const stripe = createStripeGateway({ tokenize: async () => ({ payment_intent_id: 'pi_123' }) });
    const paypal = createPayPalGateway({ tokenize: async () => ({ order_id: 'po_123' }) });
    const authorizenet = createAuthorizeNetGateway({ tokenize: async () => ({ data_descriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', data_value: 'opaque' }) });

    expect(stripe.id).toBe('stripe');
    expect(paypal.id).toBe('paypal');
    expect(authorizenet.id).toBe('authorizenet');
  });

  it('pre-wired stripe gateway calls confirmPayment with client_secret from payment context', async () => {
    const confirmPayment = vi.fn().mockResolvedValue({ paymentIntent: { id: 'pi_confirmed' } });
    const mockStripe = { confirmPayment };
    const mockElements = {};

    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [
        createStripeGateway({ stripe: mockStripe, elements: mockElements }),
      ],
    }));

    vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ client_secret: 'pi_secret_123' }) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ payment_result: { payment_status: 'processing' } }) } as never);

    const result = await client.checkout.submit({ gatewayId: 'stripe' });

    expect(confirmPayment).toHaveBeenCalledWith(expect.objectContaining({
      elements: mockElements,
      redirect: 'if_required',
    }));
    expect(result.paymentData).toEqual({ payment_intent_id: 'pi_confirmed' });
  });

  it('pre-wired paypal gateway calls createOrder and onApprove during tokenize', async () => {
    const createOrder = vi.fn().mockResolvedValue('PAYPAL_ORDER_123');
    const onApprove = vi.fn().mockResolvedValue(undefined);

    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [
        createPayPalGateway({ createOrder, onApprove }),
      ],
    }));

    vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ payment_result: { payment_status: 'processing' } }) } as never);

    const result = await client.checkout.submit({ gatewayId: 'paypal' });

    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledWith({ orderID: 'PAYPAL_ORDER_123', payerID: undefined });
    expect(result.paymentData).toEqual({ order_id: 'PAYPAL_ORDER_123', payer_id: undefined });
  });

  it('pre-wired authorizenet gateway calls dispatchData during tokenize', async () => {
    const dispatchData = vi.fn().mockResolvedValue({
      opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'opaque_token_abc' },
    });

    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [
        createAuthorizeNetGateway({
          dispatchData,
          clientKey: 'pub_client_key',
          apiLoginID: 'api_login_id',
        }),
      ],
    }));

    vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ payment_result: { payment_status: 'processing' } }) } as never);

    const result = await client.checkout.submit({ gatewayId: 'authorizenet' });

    expect(dispatchData).toHaveBeenCalledWith(
      { clientKey: 'pub_client_key', apiLoginID: 'api_login_id' },
      {},
    );
    expect(result.paymentData).toEqual({
      data_descriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
      data_value: 'opaque_token_abc',
    });
  });

  it('throws a typed error when an unregistered gateway is requested', () => {
    const client = new CoCart('https://store.com').use(createCheckout());

    try {
      client.checkout.getGateway('missing');
      expect.unreachable('Expected missing gateway to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CoCartError);
      expect((error as CoCartError).errorCode).toBe('checkout_gateway_not_registered');
    }
  });

  it('offline gateway factories return adapters with correct id, provider, label, and supports', () => {
    const bacs = createBankTransferGateway();
    const cheque = createCheckPaymentGateway();
    const cod = createCashOnDeliveryGateway();

    expect(bacs.id).toBe('bacs');
    expect(bacs.provider).toBe('bacs');
    expect(bacs.label).toBe('Direct Bank Transfer');
    expect(bacs.supports).toContain('offline');
    expect(bacs.tokenize).toBeUndefined();
    expect(bacs.getFields).toBeUndefined();

    expect(cheque.id).toBe('cheque');
    expect(cheque.provider).toBe('cheque');
    expect(cheque.label).toBe('Check Payment');

    expect(cod.id).toBe('cod');
    expect(cod.provider).toBe('cod');
    expect(cod.label).toBe('Cash on Delivery');
  });

  it('offline gateway factories accept custom label and description', () => {
    const bacs = createBankTransferGateway({ label: 'Wire Transfer', description: 'Pay via bank wire.' });
    expect(bacs.label).toBe('Wire Transfer');
    expect(bacs.description).toBe('Pay via bank wire.');
  });

  it('createForm omits the payment section when needsPayment is false', () => {
    const client = new CoCart('https://store.com').use(createCheckout({
      gatewayAdapters: [createBankTransferGateway()],
    }));

    const form = client.checkout.createForm({ gatewayId: 'bacs', needsPayment: false });
    expect(form.sections.map((s) => s.id)).not.toContain('payment');
  });

  it('createForm includes a payment section with no fields for offline gateways', () => {
    const client = new CoCart('https://store.com').use(createCheckout({
      gatewayAdapters: [createCashOnDeliveryGateway({ description: 'Pay on delivery.' })],
    }));

    const form = client.checkout.createForm({ gatewayId: 'cod' });
    const paymentSection = form.sections.find((s) => s.id === 'payment');
    expect(paymentSection).toBeDefined();
    expect(paymentSection!.fields).toHaveLength(0);
    expect(paymentSection!.description).toBe('Pay on delivery.');
  });

  it('submit skips createPaymentContext and tokenize when zeroTotal is true', async () => {
    const tokenize = vi.fn().mockResolvedValue({ payment_intent_id: 'pi_123' });
    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [createStripeGateway({ tokenize })],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ payment_result: { payment_status: 'processing' } }) } as never);

    const result = await client.checkout.submit({ gatewayId: 'stripe', zeroTotal: true });

    expect(tokenize).not.toHaveBeenCalled();
    expect(requestRaw).toHaveBeenCalledTimes(2);
    expect(result.paymentData).toBeUndefined();
    expect(result.paymentContext).toBeUndefined();
  });

  it('submit with an offline gateway does not call createPaymentContext', async () => {
    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [createBankTransferGateway()],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ payment_result: { payment_status: 'on-hold' } }) } as never);

    const result = await client.checkout.submit({ gatewayId: 'bacs' });

    const paymentContextCall = requestRaw.mock.calls.find(([, route]) =>
      typeof route === 'string' && route.includes('payment-context'),
    );
    expect(paymentContextCall).toBeUndefined();
    expect(result.paymentData).toBeUndefined();
    expect(requestRaw).toHaveBeenCalledTimes(2);
  });
});
