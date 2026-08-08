import { describe, expect, it, vi } from 'vitest';
import { CoCart, CoCartError } from '../src/index.js';

describe('Account endpoint', () => {
  it('getProfile calls GET cocart/v2/my-account', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({}) } as never);

    await client.account().getProfile();

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account');
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

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders', {});
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

  it('getOrder calls GET cocart/v2/my-account/orders/{id}', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({}) } as never);

    await client.account().getOrder(123);

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders/123');
  });

  it('getGuestOrder passes email as query param', async () => {
    const client = new CoCart('https://store.com');
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({}) } as never);

    await client.account().getGuestOrder(123, 'jane@example.com');

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders/123', {
      email: 'jane@example.com',
    });
  });

  it('getOrderDownloads calls GET cocart/v2/my-account/orders/{id}/downloads', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ([]) } as never);

    await client.account().getOrderDownloads(123);

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders/123/downloads');
  });

  it('getGuestOrderDownloads passes email as query param', async () => {
    const client = new CoCart('https://store.com');
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ([]) } as never);

    await client.account().getGuestOrderDownloads(123, 'jane@example.com');

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/orders/123/downloads', {
      email: 'jane@example.com',
    });
  });

  it('getDownloads calls GET cocart/v2/my-account/downloads', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ([]) } as never);

    await client.account().getDownloads();

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/downloads');
  });

  it('getReviews calls GET cocart/v2/my-account/reviews', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ([]) } as never);

    await client.account().getReviews();

    expect(requestRaw).toHaveBeenCalledWith('GET', 'cocart/v2/my-account/reviews');
  });

  it('changePassword calls POST cocart/v2/my-account/change-password with mapped fields', async () => {
    const client = new CoCart('https://store.com', { username: 'user', password: 'pass' });
    const requestRaw = vi.spyOn(client, 'requestRaw').mockResolvedValueOnce({ toObject: () => ({ success: true, message: 'Password changed.' }) } as never);

    await client.account().changePassword({
      current: 'old-password',
      password: 'new-password',
      confirm: 'new-password',
    });

    expect(requestRaw).toHaveBeenCalledWith('POST', 'cocart/v2/my-account/change-password', undefined, {
      password_current: 'old-password',
      password_1: 'new-password',
      password_2: 'new-password',
    });
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
