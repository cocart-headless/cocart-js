import { describe, expect, it, vi } from 'vitest';
import { CoCart, CoCartError } from '@cocartheadless/sdk';
import {
  createAuthorizeNetGateway,
  createBankTransferGateway,
  createCashOnDeliveryGateway,
  createCheckout,
  createCheckPaymentGateway,
  createGatewayAdapter,
  createPayPalGateway,
  createStripeExpressGateway,
  createStripeGateway,
  createWooPaymentsGateway,
  createTailwindCheckoutTheme,
  createShadcnCheckoutTheme,
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
    expect(route).toBe('cocart/v2/checkout');
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
          tokenize: async () => ({ payment_intent_id: 'pi_123' }),
        }),
      ],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ updated: true }) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ payment_result: { payment_status: 'success' } }) } as never);

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

    expect(requestRaw).toHaveBeenCalledTimes(3);
    expect(requestRaw).toHaveBeenNthCalledWith(2,
      'PUT',
      'cocart/v2/checkout',
      expect.any(Object),
      expect.objectContaining({ payment_method: 'stripe' }),
    );
    expect(requestRaw).toHaveBeenNthCalledWith(3,
      'POST',
      'cocart/v2/checkout',
      expect.any(Object),
      expect.objectContaining({
        payment_method: 'stripe',
        payment_data: [
          { key: 'payment_intent_id', value: 'pi_123' },
        ],
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
    expect(form.theme.preset).toBe('tailwind');
    expect(form.sections.map((section) => section.id)).toEqual(['contact', 'billing', 'shipping', 'notes', 'payment']);
    expect(createShadcnCheckoutTheme().preset).toBe('shadcn');
  });

  it('ships focused helpers for stripe, woopayments, paypal, and authorizenet', () => {
    const stripe = createStripeGateway({ tokenize: async () => ({ payment_intent_id: 'pi_123' }) });
    const woopayments = createWooPaymentsGateway({ tokenize: async () => ({ payment_intent_id: 'pi_123' }) });
    const paypal = createPayPalGateway({ tokenize: async () => ({ order_id: 'po_123' }) });
    const authorizenet = createAuthorizeNetGateway({ tokenize: async () => ({ data_descriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', data_value: 'opaque' }) });

    expect(stripe.id).toBe('stripe');
    expect(woopayments.id).toBe('woocommerce_payments');
    expect(paypal.id).toBe('paypal');
    expect(authorizenet.id).toBe('authorizenet');
  });

  it('pre-wired stripe gateway tokenizes via createPaymentMethod and sends it as wc-stripe-payment-method, no requires_action retry when payment succeeds outright', async () => {
    const createPaymentMethod = vi.fn().mockResolvedValue({ paymentMethod: { id: 'pm_123' } });
    const confirmCardPayment = vi.fn();
    const confirmCardSetup = vi.fn();
    const mockStripe = { createPaymentMethod, confirmCardPayment, confirmCardSetup, confirmPayment: vi.fn() };
    const mockElements = {};

    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [
        createStripeGateway({ stripe: mockStripe, elements: mockElements }),
      ],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ payment_result: { payment_status: 'success', redirect_url: 'https://store.com/order-received/1' } }) } as never);

    const result = await client.checkout.submit({ gatewayId: 'stripe' });

    expect(createPaymentMethod).toHaveBeenCalledWith({ elements: mockElements });
    expect(confirmCardPayment).not.toHaveBeenCalled();
    expect(confirmCardSetup).not.toHaveBeenCalled();
    expect(requestRaw).toHaveBeenCalledTimes(2);
    expect(requestRaw).toHaveBeenNthCalledWith(2,
      'POST',
      'cocart/v2/checkout',
      expect.any(Object),
      expect.objectContaining({ payment_data: [{ key: 'wc-stripe-payment-method', value: 'pm_123' }] }),
    );
    expect(result.paymentData).toEqual({ 'wc-stripe-payment-method': 'pm_123' });
    expect(result.processResponse.toObject().payment_result?.payment_status).toBe('success');
  });

  it('pre-wired stripe gateway resolves requires_action (3D Secure) via confirmCardPayment and retries processCheckout', async () => {
    const createPaymentMethod = vi.fn().mockResolvedValue({ paymentMethod: { id: 'pm_123' } });
    const confirmCardPayment = vi.fn().mockResolvedValue({ paymentIntent: { id: 'pi_confirmed' } });
    const confirmCardSetup = vi.fn();
    const mockStripe = { createPaymentMethod, confirmCardPayment, confirmCardSetup, confirmPayment: vi.fn() };
    const mockElements = {};

    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [
        createStripeGateway({ stripe: mockStripe, elements: mockElements }),
      ],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({
        toObject: () => ({
          payment_result: {
            payment_status: 'requires_action',
            action_type: 'stripe_confirm_payment',
            action_data: { client_secret: 'pi_secret_123', intent_type: 'payment_intent' },
          },
        }),
      } as never)
      .mockResolvedValueOnce({ toObject: () => ({ payment_result: { payment_status: 'success', redirect_url: 'https://store.com/order-received/1' } }) } as never);

    const result = await client.checkout.submit({ gatewayId: 'stripe' });

    expect(confirmCardPayment).toHaveBeenCalledWith('pi_secret_123');
    expect(confirmCardSetup).not.toHaveBeenCalled();
    expect(requestRaw).toHaveBeenCalledTimes(3);
    expect(result.processResponse.toObject().payment_result?.payment_status).toBe('success');
  });

  it('a requires_action response with no confirmAction on the gateway is returned as-is for the caller to handle', async () => {
    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [
        createPayPalGateway({ tokenize: async () => ({ order_id: 'order_123' }) }),
      ],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({
        toObject: () => ({ payment_result: { payment_status: 'requires_action', action_type: 'some_gateway_action', action_data: {} } }),
      } as never);

    const result = await client.checkout.submit({ gatewayId: 'paypal' });

    expect(requestRaw).toHaveBeenCalledTimes(2);
    expect(result.processResponse.toObject().payment_result?.payment_status).toBe('requires_action');
  });

  it('an on_hold payment_result is treated as terminal — no confirmAction retry', async () => {
    const confirmAction = vi.fn();
    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [
        createGatewayAdapter({
          id: 'square',
          provider: 'square',
          label: 'Square',
          tokenize: async () => ({ nonce: 'cnon:card-nonce-ok' }),
          confirmAction,
        }),
      ],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({
        toObject: () => ({
          payment_result: { payment_status: 'on_hold', redirect_url: 'https://store.com/order-received/1' },
        }),
      } as never);

    const result = await client.checkout.submit({ gatewayId: 'square' });

    expect(confirmAction).not.toHaveBeenCalled();
    expect(requestRaw).toHaveBeenCalledTimes(2);
    expect(result.processResponse.toObject().payment_result?.payment_status).toBe('on_hold');
  });

  it('createWooPaymentsGateway sends wcpay-payment-method on the first attempt and confirms via confirmCardPayment on requires_action', async () => {
    const createPaymentMethod = vi.fn().mockResolvedValue({ paymentMethod: { id: 'pm_456' } });
    const confirmCardPayment = vi.fn().mockResolvedValue({ paymentIntent: { id: 'pi_confirmed' } });
    const confirmCardSetup = vi.fn();
    const mockStripe = { createPaymentMethod, confirmCardPayment, confirmCardSetup, confirmPayment: vi.fn() };
    const mockElements = {};

    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [
        createWooPaymentsGateway({ stripe: mockStripe, elements: mockElements }),
      ],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({
        toObject: () => ({
          payment_result: {
            payment_status: 'requires_action',
            action_type: 'wcpay_confirm_payment',
            action_data: { client_secret: 'pi_secret_456', intent_type: 'payment_intent' },
          },
        }),
      } as never)
      .mockResolvedValueOnce({ toObject: () => ({ payment_result: { payment_status: 'success', redirect_url: 'https://store.com/order-received/1' } }) } as never);

    const result = await client.checkout.submit({ gatewayId: 'woocommerce_payments' });

    expect(createPaymentMethod).toHaveBeenCalledWith({ elements: mockElements });
    expect(confirmCardPayment).toHaveBeenCalledWith('pi_secret_456');
    expect(confirmCardSetup).not.toHaveBeenCalled();
    expect(requestRaw).toHaveBeenCalledTimes(3);
    expect(requestRaw).toHaveBeenNthCalledWith(2,
      'POST',
      'cocart/v2/checkout',
      expect.any(Object),
      expect.objectContaining({
        payment_method: 'woocommerce_payments',
        payment_data: [{ key: 'wcpay-payment-method', value: 'pm_456' }],
      }),
    );
    expect(result.processResponse.toObject().payment_result?.payment_status).toBe('success');
  });

  it('createWooPaymentsGateway surfaces a Multibanco voucher on_hold result without retrying', async () => {
    const createPaymentMethod = vi.fn().mockResolvedValue({ paymentMethod: { id: 'pm_789' } });
    const confirmCardPayment = vi.fn();
    const confirmCardSetup = vi.fn();
    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [
        createWooPaymentsGateway({ stripe: { createPaymentMethod, confirmCardPayment, confirmCardSetup, confirmPayment: vi.fn() }, elements: {} }),
      ],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({
        toObject: () => ({
          payment_result: {
            payment_status: 'on_hold',
            redirect_url: 'https://store.com/order-received/1',
            action_type: 'wcpay_multibanco_voucher',
            action_data: { entity: '12345', reference: '999888777', voucher_url: 'https://wcpay.test/voucher/1', expires_at: '2026-08-15' },
          },
        }),
      } as never);

    const result = await client.checkout.submit({ gatewayId: 'woocommerce_payments' });

    expect(confirmCardPayment).not.toHaveBeenCalled();
    expect(confirmCardSetup).not.toHaveBeenCalled();
    expect(requestRaw).toHaveBeenCalledTimes(2);
    const paymentResult = result.processResponse.toObject().payment_result;
    expect(paymentResult?.payment_status).toBe('on_hold');
    expect(paymentResult?.action_type).toBe('wcpay_multibanco_voucher');
    expect((paymentResult?.action_data as Record<string, unknown>)?.reference).toBe('999888777');
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

  it('submit skips tokenize when zeroTotal is true', async () => {
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
        items: {
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
        cart_totals: {
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
    const mockStripe = {
      confirmPayment: vi.fn(),
      createPaymentMethod: vi.fn(),
      confirmCardPayment: vi.fn(),
      confirmCardSetup: vi.fn(),
    };
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
    const mockStripe = {
      confirmPayment: vi.fn(),
      createPaymentMethod: vi.fn(),
      confirmCardPayment: vi.fn(),
      confirmCardSetup: vi.fn(),
    };
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
    const mockStripe = {
      confirmPayment: vi.fn(),
      createPaymentMethod: vi.fn(),
      confirmCardPayment: vi.fn(),
      confirmCardSetup: vi.fn(),
    };
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
    const mockStripe = {
      confirmPayment: vi.fn(),
      createPaymentMethod: vi.fn(),
      confirmCardPayment: vi.fn(),
      confirmCardSetup: vi.fn(),
    };
    const mockElements = {};
    const adapter = createStripeExpressGateway({ stripe: mockStripe, elements: mockElements });

    expect(adapter.id).toBe('stripe-express');
    expect(adapter.express).toBe(true);
    expect(adapter.supports).toContain('express_checkout');
    expect(adapter.expressCheckoutPriority).toBe(10);
  });

  it('submit with an offline gateway sends no payment_data and needs only getCheckout + processCheckout', async () => {
    const client = new CoCart('https://store.com').use(createCheckout({
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      gatewayAdapters: [createBankTransferGateway()],
    }));

    const requestRaw = vi.spyOn(client, 'requestRaw')
      .mockResolvedValueOnce({ toObject: () => ({}) } as never)
      .mockResolvedValueOnce({ toObject: () => ({ payment_result: { payment_status: 'on-hold' } }) } as never);

    const result = await client.checkout.submit({ gatewayId: 'bacs' });

    expect(result.paymentData).toBeUndefined();
    expect(requestRaw).toHaveBeenCalledTimes(2);
  });

  it('getCheckoutConfig calls GET cocart/v2/checkout/config', async () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({ store: { currency: 'USD' } }) } as never);

    await client.checkout.getCheckoutConfig();

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/checkout/config', {});
  });

  it('searchAddresses calls GET cocart/v2/address/search with query params', async () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({
      toObject: () => ({ suggestions: [], count: 0, provider: { id: 'google_places' }, search_country: 'US', query: '123 Main' }),
    } as never);

    await client.checkout.searchAddresses({ query: '123 Main', country: 'US', type: 'billing' });

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/address/search', {
      query: '123 Main',
      country: 'US',
      type: 'billing',
    });
  });

  it('getAddressDetails calls GET cocart/v2/address/details with address_id and provider', async () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({
      toObject: () => ({ address: { address_1: '123 Main Street' }, provider: { id: 'google_places' } }),
    } as never);

    await client.checkout.getAddressDetails({ address_id: 'addr_12345', provider: 'google_places' });

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/address/details', {
      address_id: 'addr_12345',
      provider: 'google_places',
    });
  });

  it('getOrderReceived calls GET cocart/v2/order-received/{id} with order_key query param', async () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({ order_id: 1234 }) } as never);

    await client.checkout.getOrderReceived(1234, 'wc_order_abc123');

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/order-received/1234', {
      order_key: 'wc_order_abc123',
    });
  });

  it('payForOrder calls POST cocart/v2/order-received/{id}/pay with order_key query param and body', async () => {
    const client = new CoCart('https://store.com').use(createCheckout());
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({
      toObject: () => ({ success: true, order_id: 1234, order_status: 'processing' }),
    } as never);

    await client.checkout.payForOrder(1234, 'wc_order_abc123', {
      payment_method: 'stripe',
      payment_data: [{ key: 'paymentMethodID', value: 'pm_1H8x2y2eZvKYlo2C' }],
    });

    expect(requestRaw).toHaveBeenCalledWith(
      'POST',
      'cocart/v2/order-received/1234/pay',
      { order_key: 'wc_order_abc123' },
      {
        payment_method: 'stripe',
        payment_data: [{ key: 'paymentMethodID', value: 'pm_1H8x2y2eZvKYlo2C' }],
      },
    );
  });

  it('address/order-received routes use a custom apiBase derived from a custom routeBase', async () => {
    const client = new CoCart('https://store.com').use(createCheckout({ routeBase: 'custom/v3/checkout' }));
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({}) } as never);

    await client.checkout.getOrderReceived(1, 'key');

    expect(requestRaw).toHaveBeenCalledWith('GET', 'custom/v3/order-received/1', { order_key: 'key' });
  });

  it('hides billing name fields when active gateway is express', () => {
    const client = new CoCart('https://store.com').use(createCheckout({
      gatewayAdapters: [
        createStripeExpressGateway({ stripe: {} as never, elements: {} as never }),
      ],
    }));

    const form = client.checkout.createForm({ gatewayId: 'stripe-express' });
    const billing = form.sections.find((s) => s.id === 'billing')!;
    const firstName = billing.fields.find((f) => f.name === 'billing_address.first_name')!;
    const lastName = billing.fields.find((f) => f.name === 'billing_address.last_name')!;
    const address = billing.fields.find((f) => f.name === 'billing_address.address_1')!;

    expect(firstName.hidden).toBe(true);
    expect(lastName.hidden).toBe(true);
    expect(address.hidden).toBeUndefined();
  });

  it('does not hide billing name fields for non-express gateways', () => {
    const client = new CoCart('https://store.com').use(createCheckout({
      gatewayAdapters: [
        createStripeGateway({ tokenize: async () => ({ payment_intent_id: 'pi_123' }) }),
      ],
    }));

    const form = client.checkout.createForm({ gatewayId: 'stripe' });
    const billing = form.sections.find((s) => s.id === 'billing')!;
    const firstName = billing.fields.find((f) => f.name === 'billing_address.first_name')!;
    const lastName = billing.fields.find((f) => f.name === 'billing_address.last_name')!;

    expect(firstName.hidden).toBeUndefined();
    expect(lastName.hidden).toBeUndefined();
  });
});
