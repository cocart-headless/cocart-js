import { describe, expect, it, vi } from 'vitest';
import { CoCart, CoCartError } from '../src/index.js';

describe('Account endpoint', () => {
  it('getProfile calls GET cocart/v2/my-account', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({}) } as never);

    await client.account().getProfile();

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account', undefined);
  });

  it('updateProfile calls POST with the correct body', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({ success: true, message: 'Updated.' }) } as never);

    const input = {
      account_first_name: 'Jane',
      account_last_name: 'Doe',
      account_display_name: 'Jane Doe',
      account_email: 'jane@example.com',
    };

    await client.account().updateProfile(input);

    expect(requestRaw).toHaveBeenCalledWith('POST', 'cocart/v2/my-account', undefined, input);
  });

  it('getOrders calls GET cocart/v2/my-account/orders with no query params', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({ orders: [], pagination: {} }) } as never);

    await client.account().getOrders();

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders', undefined);
  });

  it('getOrders passes page, per_page, and order as query params', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({}) } as never);

    await client.account().getOrders({ page: 2, per_page: 20, order: 'ASC' });

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders', {
      page: '2',
      per_page: '20',
      order: 'ASC',
    });
  });

  it('getOrders sends the filters, joining a list of statuses and meta keys with commas', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({}) } as never);

    await client.account().getOrders({
      status: ['processing', 'on-hold'],
      after: '2026-01-01T00:00:00',
      before: '2026-12-31T23:59:59',
      subscription_order_type: 'renewal',
      formatted: true,
      meta_keys: ['gift_message', '_configuration'],
    });

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders', {
      status: 'processing,on-hold',
      after: '2026-01-01T00:00:00',
      before: '2026-12-31T23:59:59',
      subscription_order_type: 'renewal',
      formatted: 'true',
      meta_keys: 'gift_message,_configuration',
    });
  });

  it('getOrder calls GET cocart/v2/my-account/orders/{id}', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({}) } as never);

    await client.account().getOrder(123);

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders/123', undefined);
  });

  it('getGuestOrder passes email as query param', async () => {
    const client = new CoCart('https://store.com');
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({}) } as never);

    await client.account().getGuestOrder(123, 'jane@example.com');

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders/123', {
      email: 'jane@example.com',
    });
  });

  it('getOrderDownloads calls GET my-account/orders/{id}/downloads', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({ downloads: [] }) } as never);

    await client.account().getOrderDownloads(123);

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders/123/downloads');
  });

  it('getGuestOrderDownloads sends the billing email to the same route', async () => {
    const client = new CoCart('https://store.com');
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({ downloads: [] }) } as never);

    await client.account().getGuestOrderDownloads(123, 'jane@example.com');

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders/123/downloads', { email: 'jane@example.com' });
  });

  it('getDownloads calls GET cocart/v2/my-account/downloads', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ([]) } as never);

    await client.account().getDownloads();

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/downloads');
  });

  it('getReviews uses products/reviews/mine (there is no my-account/reviews route)', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const myReviews = vi.spyOn(client.products(), 'myReviews').mockResolvedValueOnce({ toObject: () => ([]) } as never);

    await client.account().getReviews();

    expect(myReviews).toHaveBeenCalled();
  });

  it('changePassword posts only the password fields to POST my-account, in one request', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({ object: 'customer' }) } as never);

    await client.account().changePassword({ current: 'old-password', password: 'new-password', confirm: 'new-password' });

    expect(requestRaw).toHaveBeenCalledTimes(1);
    expect(requestRaw).toHaveBeenCalledWith('POST', 'cocart/v2/my-account', undefined, {
      password_current: 'old-password',
      password_1: 'new-password',
      password_2: 'new-password',
    });
  });

  it('updateAddress posts to my-account/address', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({}) } as never);
    const data = { billing_address: { first_name: 'Jane', city: 'Paris' } };

    await client.account().updateAddress(data);

    expect(requestRaw).toHaveBeenCalledWith('POST', 'cocart/v2/my-account/address', undefined, data);
  });

  it('cancelOrder posts to my-account/orders/{id}/cancel', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({ success: true }) } as never);

    await client.account().cancelOrder(42);

    expect(requestRaw).toHaveBeenCalledWith('POST', 'cocart/v2/my-account/orders/42/cancel');
  });

  it('email verification methods use verify-email and verify-order-email', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValue({ toObject: () => ({}) } as never);

    await client.account().verifyEmail('k1', 7);
    await client.account().sendOrderEmailVerification();
    await client.account().verifyOrderEmail('k2', 7);

    expect(requestRaw).toHaveBeenNthCalledWith(1, 'GET', 'cocart/v2/my-account/verify-email', { key: 'k1', user_id: '7' });
    expect(requestRaw).toHaveBeenNthCalledWith(2, 'POST', 'cocart/v2/my-account/verify-order-email');
    expect(requestRaw).toHaveBeenNthCalledWith(3, 'GET', 'cocart/v2/my-account/verify-order-email', { key: 'k2', user_id: '7' });
  });

  it('subscription methods map to the my-account/subscriptions routes', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValue({ toObject: () => ({}) } as never);
    const a = client.account();

    await a.getSubscriptions({ page: 2, status: ['active', 'on-hold'] });
    await a.getSubscription(9);
    await a.suspendSubscription(9);
    await a.cancelSubscription(9);
    await a.reactivateSubscription(9);
    await a.setSubscriptionAutoRenew(9, false);
    await a.updateSubscriptionPaymentMethod(9, { payment_method: 'stripe', token_id: 3 });
    await a.resubscribe(9);
    await a.cancelResubscribe(9);

    const base = 'cocart/v2/my-account/subscriptions';
    expect(requestRaw.mock.calls).toEqual([
      ['GET', base, { page: '2', status: 'active,on-hold' }],
      ['GET', `${base}/9`, undefined],
      ['POST', `${base}/9/suspend`, undefined, null],
      ['POST', `${base}/9/cancel`, undefined, null],
      ['POST', `${base}/9/reactivate`, undefined, null],
      ['POST', `${base}/9/auto-renew`, undefined, { enabled: false }],
      ['POST', `${base}/9/payment-method`, undefined, { payment_method: 'stripe', token_id: 3 }],
      ['POST', `${base}/9/resubscribe`, undefined, null],
      ['DELETE', `${base}/9/resubscribe`],
    ]);
  });

  it('requestOrderWithdrawal posts to order-withdrawal', async () => {
    const client = new CoCart('https://store.com');
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({}) } as never);
    const data = { first_name: 'Jane', last_name: 'Doe', email: 'j@example.com', email_confirmation: 'j@example.com', order_number: '1234' };

    await client.account().requestOrderWithdrawal(data);

    expect(requestRaw).toHaveBeenCalledWith('POST', 'cocart/v2/order-withdrawal', undefined, data);
  });

  it('register calls POST cocart/v2/register with requested_username/requested_password field names', async () => {
    const client = new CoCart('https://store.com');
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({
      toObject: () => ({ user_id: 42, username: 'jane', message: 'Registration complete.' }),
    } as never);

    await client.account().register({
      email: 'jane@example.com',
      requestedUsername: 'jane',
      requestedPassword: 'secret123',
    });

    expect(requestRaw).toHaveBeenCalledWith('POST', 'cocart/v2/register', undefined, {
      email: 'jane@example.com',
      requested_username: 'jane',
      requested_password: 'secret123',
    });
  });

  it('register omits requested_username/requested_password when not provided', async () => {
    const client = new CoCart('https://store.com');
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({
      toObject: () => ({ user_id: 42, username: 'jane', message: 'Registration complete.' }),
    } as never);

    await client.account().register({ email: 'jane@example.com' });

    expect(requestRaw).toHaveBeenCalledWith('POST', 'cocart/v2/register', undefined, {
      email: 'jane@example.com',
    });
  });

  it('re-throws rest_no_route as cocart_plugin_required', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    vi.spyOn(client, 'requestRaw').mockRejectedValueOnce(
      new CoCartError('No route found.', 404, 'rest_no_route'),
    );

    try {
      await client.account().getProfile();
      expect.unreachable('Expected plugin-required error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(CoCartError);
      expect((error as CoCartError).errorCode).toBe('cocart_plugin_required');
    }
  });
});
