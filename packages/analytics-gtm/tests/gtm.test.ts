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

  it('pushes purchase on checkout POST', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    client.emit('response', { method: 'POST', url: '/wp-json/cocart/v2/checkout', status: 200, duration: 100 });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toContainEqual(expect.objectContaining({ event: 'purchase' }));
  });

  it('clears ecommerce object before each ecommerce event', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    client.emit('response', { method: 'POST', url: '/wp-json/cocart/v2/cart/add-item', status: 200, duration: 50 });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toContainEqual(expect.objectContaining({ event: 'clear_ecommerce', ecommerce: null }));
  });

  it('pushes api_error on error event', () => {
    const client = makeClient();
    const ext = createGtm({ containerId: 'GTM-TEST' });
    ext.install(client as never);
    client.emit('error', { method: 'GET', url: '/wp-json/cocart/v2/cart', error: new Error('Network error') });
    const dl = ((globalThis as Record<string, unknown>).window as Record<string, unknown>).dataLayer as unknown[];
    expect(dl).toContainEqual(expect.objectContaining({ event: 'api_error', error_message: 'Network error' }));
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
