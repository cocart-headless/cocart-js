import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDatafast } from '../src/extension.js';

const mockDf = vi.hoisted(() => ({
  track: vi.fn(),
  identify: vi.fn(),
  trackPageview: vi.fn(),
  flush: vi.fn(),
  reset: vi.fn(),
  getTrackingParams: vi.fn(),
  buildCrossDomainUrl: vi.fn(),
}));

vi.mock('datafast', () => ({
  initDataFast: vi.fn().mockResolvedValue(mockDf),
}));

function makeClient() {
  const listeners: Record<string, Set<(...args: unknown[]) => void>> = {};
  return {
    on: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
      (listeners[event] ??= new Set()).add(fn);
    }),
    off: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
      listeners[event]?.delete(fn);
    }),
    emit(event: string, payload: unknown) {
      listeners[event]?.forEach((fn) => fn(payload));
    },
  };
}

describe('createDatafast', () => {
  beforeEach(() => vi.clearAllMocks());

  it('installs and subscribes to response and error events', () => {
    const client = makeClient();
    const ext = createDatafast({ websiteId: 'dfid_test' });
    ext.install(client as never);
    expect(client.on).toHaveBeenCalledWith('response', expect.any(Function));
    expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('tracks add_to_cart on cart add-item response', async () => {
    const client = makeClient();
    const ext = createDatafast({ websiteId: 'dfid_test' });
    ext.install(client as never);
    await vi.waitFor(() => expect(mockDf.track).not.toHaveBeenCalled());
    client.emit('response', { method: 'POST', url: '/wp-json/cocart/v2/cart/add-item', status: 200, duration: 50 });
    await vi.waitFor(() => expect(mockDf.track).toHaveBeenCalledWith('add_to_cart', expect.objectContaining({ url: expect.stringContaining('add-item') })));
  });

  it('tracks remove_from_cart on cart item DELETE', async () => {
    const client = makeClient();
    const ext = createDatafast({ websiteId: 'dfid_test' });
    ext.install(client as never);
    client.emit('response', { method: 'DELETE', url: '/wp-json/cocart/v2/cart/item/abc123', status: 200, duration: 30 });
    await vi.waitFor(() => expect(mockDf.track).toHaveBeenCalledWith('remove_from_cart', expect.anything()));
  });

  it('tracks purchase, with the order as transaction_id, when a checkout placed the order', async () => {
    const client = makeClient();
    const ext = createDatafast({ websiteId: 'dfid_test' });
    ext.install(client as never);
    const order = { object: 'order', id: 217, result: { code: 'order_placed' }, currency: { currency_code: 'USD', currency_minor_unit: 2 }, totals: { total: '2300' } };
    client.emit('response', { method: 'POST', url: '/wp-json/cocart/v2/checkout', status: 200, duration: 100, response: { toObject: () => order } });
    await vi.waitFor(() => expect(mockDf.track).toHaveBeenCalledWith('purchase', { url: '/cocart/v2/checkout', transaction_id: '217', currency: 'USD', value: 23 }));
  });

  it('does not track purchase for a declined card or a 3D Secure step (both 200s)', async () => {
    const client = makeClient();
    const ext = createDatafast({ websiteId: 'dfid_test' });
    ext.install(client as never);
    for (const code of ['payment_failed', 'action_required']) {
      client.emit('response', { method: 'POST', url: '/wp-json/cocart/v2/checkout', status: 200, duration: 100, response: { toObject: () => ({ object: 'order', id: 217, result: { code } }) } });
    }
    client.emit('response', { method: 'DELETE', url: '/wp-json/cocart/v2/cart/item/abc123', status: 200, duration: 30 });
    await vi.waitFor(() => expect(mockDf.track).toHaveBeenCalledWith('remove_from_cart', expect.anything()));
    expect(mockDf.track).not.toHaveBeenCalledWith('purchase', expect.anything());
  });

  it('sends the route only: no host and no query string, which can hold the cart key or an email', async () => {
    const client = makeClient();
    const ext = createDatafast({ websiteId: 'dfid_test' });
    ext.install(client as never);
    client.emit('response', { method: 'POST', url: 'https://store.com/wp-json/cocart/v2/cart/add-item?cart_key=t_secret', status: 200, duration: 50 });
    await vi.waitFor(() => expect(mockDf.track).toHaveBeenCalledWith('add_to_cart', { url: '/cocart/v2/cart/add-item' }));
  });

  it('tracks api_error on error event, with the route only', async () => {
    const client = makeClient();
    const ext = createDatafast({ websiteId: 'dfid_test' });
    ext.install(client as never);
    client.emit('error', { method: 'GET', url: 'https://store.com/wp-json/cocart/v2/my-account/orders/9?email=jane%40example.com', error: new Error('Network error') });
    await vi.waitFor(() => expect(mockDf.track).toHaveBeenCalledWith('api_error', { method: 'GET', url: '/cocart/v2/my-account/orders/9', message: 'Network error' }));
  });

  it('destroy() unsubscribes listeners', () => {
    const client = makeClient();
    const ext = createDatafast({ websiteId: 'dfid_test' });
    const sdk = ext.install(client as never);
    sdk.destroy();
    expect(client.off).toHaveBeenCalledWith('response', expect.any(Function));
    expect(client.off).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('calls onReady after initialization', async () => {
    const onReady = vi.fn();
    const client = makeClient();
    const ext = createDatafast({ websiteId: 'dfid_test', onReady });
    ext.install(client as never);
    await vi.waitFor(() => expect(onReady).toHaveBeenCalledWith(mockDf));
  });
});
