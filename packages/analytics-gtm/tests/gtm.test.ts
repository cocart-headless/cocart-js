import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGtm } from '../src/extension.js';

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

describe('createGtm', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).window = { dataLayer: [] };
  });

  it('installs and subscribes to response and error events', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    expect(client.on).toHaveBeenCalledWith('response', expect.any(Function));
    expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('pushes add_to_cart on cart add-item POST', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST', currency: 'USD' });
    ext.install(client as never);
    client.emit('response', { method: 'POST', url: '/wp-json/cocart/v2/cart/add-item', status: 200, duration: 50 });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toContainEqual(expect.objectContaining({ event: 'add_to_cart' }));
  });

  it('pushes remove_from_cart on cart item DELETE', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    client.emit('response', { method: 'DELETE', url: '/wp-json/cocart/v2/cart/item/abc123', status: 200, duration: 30 });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toContainEqual(expect.objectContaining({ event: 'remove_from_cart' }));
  });

  it('pushes begin_checkout on checkout PUT', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    client.emit('response', { method: 'PUT', url: '/wp-json/cocart/v2/checkout', status: 200, duration: 80 });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toContainEqual(expect.objectContaining({ event: 'begin_checkout' }));
  });

  it('pushes purchase, with the order as transaction_id and its value, when a checkout placed the order', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    client.emit('response', { method: 'POST', url: '/wp-json/cocart/v2/checkout', status: 200, duration: 100, response: { toObject: () => ({ object: 'order', id: 217, result: { code: 'order_placed' }, currency: { currency_code: 'USD', currency_minor_unit: 2 }, totals: { total: '2300' } }) } });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toContainEqual({ event: 'purchase', ecommerce: { transaction_id: '217', currency: 'USD', value: 23 } });
  });

  it('pushes purchase when paying for an order or confirming its payment places it', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    client.emit('response', { method: 'POST', url: 'https://store.com/wp-json/cocart/v2/order-received/217/confirm', status: 200, duration: 100, response: { toObject: () => ({ object: 'order', id: 217, result: { code: 'order_placed' }, currency: { currency_code: 'USD', currency_minor_unit: 2 }, totals: { total: '2300' } }) } });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toContainEqual(expect.objectContaining({ event: 'purchase' }));
  });

  it('does not push purchase for a declined card or a 3D Secure step (both 200s)', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    for (const code of ['payment_failed', 'action_required', 'payment_pending']) {
      client.emit('response', { method: 'POST', url: '/wp-json/cocart/v2/checkout', status: 200, duration: 100, response: { toObject: () => ({ object: 'order', id: 217, result: { code } }) } });
    }
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).not.toContainEqual(expect.objectContaining({ event: 'purchase' }));
  });

  it('pushes nothing for a request the store refused', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    client.emit('response', { method: 'POST', url: '/wp-json/cocart/v2/cart/add-item', status: 400, duration: 50 });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toEqual([]);
  });

  it('clears ecommerce object before each ecommerce event', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    client.emit('response', { method: 'POST', url: '/wp-json/cocart/v2/cart/add-item', status: 200, duration: 50 });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toContainEqual(expect.objectContaining({ event: 'clear_ecommerce', ecommerce: null }));
  });

  it('pushes api_error on error event, with the route only: no host, no query string', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    client.emit('error', { method: 'GET', url: 'https://store.com/wp-json/cocart/v2/order-received/217?order_key=wc_order_secret', error: new Error('Network error') });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toContainEqual({ event: 'api_error', method: 'GET', url: '/cocart/v2/order-received/217', error_message: 'Network error' });
  });

  it('manual push() adds event to dataLayer', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    const sdk = ext.install(client as never);
    sdk.push('viewed_product', { item_id: '123' });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toContainEqual(expect.objectContaining({ event: 'viewed_product', item_id: '123' }));
  });

  it('destroy() unsubscribes listeners', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    const sdk = ext.install(client as never);
    sdk.destroy();
    expect(client.off).toHaveBeenCalledWith('response', expect.any(Function));
    expect(client.off).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
