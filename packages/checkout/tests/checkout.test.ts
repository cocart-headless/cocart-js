import { describe, expect, it, vi } from 'vitest';
import { CoCart, CoCartError } from '@cocartheadless/sdk';
import {
  createAuthorizeNetGateway,
  createBankTransferGateway,
  createCashOnDeliveryGateway,
  createCheckout,
  createCheckPaymentGateway,
  createPayPalGateway,
  createStripeExpressGateway,
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

  it('getShippingMethods proxies to the core cart endpoint and returns packages', async () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const mockPackages = [
      {
        package_name: 'Default',
        chosen_method: 'flat_rate:1',
        rates: {
          'flat_rate:1': { key: 'flat_rate:1', method_id: 'flat_rate', instance_id: 1, label: 'Flat rate', cost: '5.00', tax: '0.00' },
          'free_shipping:1': { key: 'free_shipping:1', method_id: 'free_shipping', instance_id: 1, label: 'Free shipping', cost: '0.00', tax: '0.00' },
        },
      },
    ];

    vi.spyOn(client, 'cart').mockReturnValue({
      getShippingMethods: vi.fn().mockResolvedValue({ toObject: () => ({ shipping: mockPackages }) }),
    } as never);

    const packages = await client.checkout.getShippingMethods();
    expect(packages).toHaveLength(1);
    expect(packages[0].package_name).toBe('Default');
    expect(packages[0].chosen_method).toBe('flat_rate:1');
  });

  it('createForm with shippingMethods renders a radio field with rate options', () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const rates = [
      { key: 'flat_rate:1', method_id: 'flat_rate', instance_id: 1, label: 'Flat rate', cost: '5.00', tax: '0.00' },
      { key: 'free_shipping:1', method_id: 'free_shipping', instance_id: 1, label: 'Free shipping', cost: '0.00', tax: '0.00' },
    ];

    const form = client.checkout.createForm({ shippingMethods: rates });
    const section = form.sections.find((s) => s.id === 'shipping-methods');

    expect(section).toBeDefined();
    expect(section!.fields).toHaveLength(1);
    expect(section!.fields[0].type).toBe('radio');
    expect(section!.fields[0].options).toHaveLength(2);
    expect(section!.fields[0].options![0].value).toBe('flat_rate:1');
    expect(section!.fields[0].options![1].value).toBe('free_shipping:1');
  });

  it('createForm without shippingMethods omits the shipping-methods section', () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const form = client.checkout.createForm();
    expect(form.sections.map((s) => s.id)).not.toContain('shipping-methods');
  });

  it('applyCoupon delegates to the core cart endpoint', async () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const spy = vi.fn().mockResolvedValue({ toObject: () => ({}) } as never);
    vi.spyOn(client, 'cart').mockReturnValue({ applyCoupon: spy } as never);

    await client.checkout.applyCoupon('SAVE10');
    expect(spy).toHaveBeenCalledWith('SAVE10');
  });

  it('removeCoupon delegates to the core cart endpoint', async () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const spy = vi.fn().mockResolvedValue({ toObject: () => ({}) } as never);
    vi.spyOn(client, 'cart').mockReturnValue({ removeCoupon: spy } as never);

    await client.checkout.removeCoupon('SAVE10');
    expect(spy).toHaveBeenCalledWith('SAVE10');
  });

  it('getOrderSummary maps cart items, coupons, and totals from checkout state', async () => {
    const client = new CoCart('https://store.com').use(createCheckout());

    vi.spyOn(client, 'requestRaw').mockResolvedValue({
      toObject: () => ({
        cart: {
          abc123: {
            item_key: 'abc123',
            name: 'Test Product',
            price: '10.00',
            quantity: { value: 2 },
            totals: { subtotal: '20.00' },
          },
        },
        coupons: [
          { coupon: 'SAVE10', label: 'Save 10%', saving: '2.00', saving_html: '<del>2.00</del>' },
        ],
        totals: {
          subtotal: '20.00',
          discount_total: '2.00',
          shipping_total: '5.00',
          fee_total: '0.00',
          total_tax: '1.80',
          total: '24.80',
        },
      }),
    } as never);

    const summary = await client.checkout.getOrderSummary();

    expect(summary.items).toHaveLength(1);
    expect(summary.items[0]).toEqual({ key: 'abc123', name: 'Test Product', price: '10.00', quantity: 2, subtotal: '20.00' });
    expect(summary.coupons).toHaveLength(1);
    expect(summary.coupons[0]).toEqual({ code: 'SAVE10', label: 'Save 10%', saving: '2.00' });
    expect(summary.totals).toEqual({
      subtotal: '20.00',
      discount_total: '2.00',
      shipping_total: '5.00',
      fee_total: '0.00',
      tax_total: '1.80',
      total: '24.80',
    });
  });

  it('createForm with includeSummary: true appends an order-summary section', () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const form = client.checkout.createForm({ includeSummary: true });
    const summarySection = form.sections.find((s) => s.id === 'order-summary');

    expect(summarySection).toBeDefined();
    expect(summarySection!.fields).toHaveLength(0);
    expect(summarySection!.className).toBe(form.theme.orderSummaryClassName);
  });

  it('createForm without includeSummary does not include an order-summary section', () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const form = client.checkout.createForm();
    expect(form.sections.map((s) => s.id)).not.toContain('order-summary');
  });

  it('listExpressGateways returns only adapters with express: true', () => {
    const mockStripe = { confirmPayment: vi.fn() };
    const mockElements = {};
    const client = new CoCart('https://store.com').use(createCheckout({
      gatewayAdapters: [
        createStripeGateway({ tokenize: async () => ({ payment_intent_id: 'pi_123' }) }),
        createStripeExpressGateway({ stripe: mockStripe, elements: mockElements }),
      ],
    }));

    const express = client.checkout.listExpressGateways();
    expect(express).toHaveLength(1);
    expect(express[0].id).toBe('stripe-express');
  });

  it('listExpressGateways sorts by expressCheckoutPriority ascending', () => {
    const mockStripe = { confirmPayment: vi.fn() };
    const mockElements = {};
    const client = new CoCart('https://store.com').use(createCheckout({
      gatewayAdapters: [
        createStripeExpressGateway({ stripe: mockStripe, elements: mockElements, expressCheckoutPriority: 50 }),
        { id: 'paypal-express', provider: 'paypal', label: 'PayPal Express', express: true, expressCheckoutPriority: 5 },
      ],
    }));

    const express = client.checkout.listExpressGateways();
    expect(express[0].id).toBe('paypal-express');
    expect(express[1].id).toBe('stripe-express');
  });

  it('createExpressCheckoutBar returns gateways with fields from getExpressFields', () => {
    const mockStripe = { confirmPayment: vi.fn() };
    const mockElements = {};
    const client = new CoCart('https://store.com').use(createCheckout({
      gatewayAdapters: [
        createStripeExpressGateway({ stripe: mockStripe, elements: mockElements }),
      ],
    }));

    const bar = client.checkout.createExpressCheckoutBar({ layout: 'stack' });
    expect(bar.layout).toBe('stack');
    expect(bar.gateways).toHaveLength(1);
    expect(bar.gateways[0].id).toBe('stripe-express');
    expect(bar.gateways[0].fields).toHaveLength(1);
    expect(bar.gateways[0].fields[0].component).toBe('StripeExpressCheckoutElement');
  });

  it('createExpressCheckoutBar defaults to scroll layout', () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const bar = client.checkout.createExpressCheckoutBar();
    expect(bar.layout).toBe('scroll');
  });

  it('createStripeExpressGateway returns adapter with express: true and express_checkout support', () => {
    const mockStripe = { confirmPayment: vi.fn() };
    const mockElements = {};
    const adapter = createStripeExpressGateway({ stripe: mockStripe, elements: mockElements });

    expect(adapter.id).toBe('stripe-express');
    expect(adapter.express).toBe(true);
    expect(adapter.supports).toContain('express_checkout');
    expect(adapter.expressCheckoutPriority).toBe(10);
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
