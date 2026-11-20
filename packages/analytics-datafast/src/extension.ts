import type { CoCart, ResponseEvent, ErrorEvent } from '@cocartheadless/sdk';
import type { DatafastExtension, DatafastInstance, DatafastOptions, DatafastSDK } from './types.js';
import { initDataFast } from 'datafast';

/**
 * The REST route of a request, from `/wp-json` on, with no host and no query string: the query can
 * hold the cart key, an order key or an email address, which mustn't be sent to an analytics service.
 */
export function routeOf(url: string): string {
  const path = url.split('#')[0].split('?')[0];
  const i = path.indexOf('/wp-json/');
  if (i >= 0) return path.slice(i + '/wp-json'.length);
  return path.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, '');
}

/** An order a checkout, payment or payment confirmation just placed (`result.code: order_placed`), or `null`. */
export function placedOrder(event: ResponseEvent): { id: number; currency?: string; value?: number } | null {
  if (event.method !== 'POST' || event.status >= 400) return null;
  if (!/\/(checkout|order-received\/\d+\/(pay|confirm))$/.test(routeOf(event.url))) return null;
  const body = event.response?.toObject() as {
    object?: string;
    id?: number;
    result?: { code?: string };
    currency?: { currency_code?: string; currency_minor_unit?: number };
    totals?: { total?: string };
  } | undefined;
  if (body?.object !== 'order' || body.result?.code !== 'order_placed' || typeof body.id !== 'number') return null;
  const minorUnit = body.currency?.currency_minor_unit;
  const total = Number(body.totals?.total);
  return {
    id: body.id,
    currency: body.currency?.currency_code,
    // Amounts are minor units unless the request asked for them formatted.
    value: typeof minorUnit === 'number' && Number.isFinite(total) ? total / 10 ** minorUnit : undefined,
  };
}

function matchesCartAdd(url: string): boolean {
  return url.includes('/cart/add-item');
}

function matchesCartRemove(method: string, url: string): boolean {
  return method === 'DELETE' && url.includes('/cart/item/');
}

function matchesCartClear(url: string): boolean {
  return url.includes('/cart/clear');
}

function matchesCheckoutUpdate(method: string, url: string): boolean {
  return method === 'PUT' && url.endsWith('/checkout');
}

export function createDatafast(options: DatafastOptions): DatafastExtension {
  return {
    name: 'datafast',
    install(client: CoCart) {
      let df: DatafastInstance | null = null;
      const queue: Array<() => void> = [];

      const dispatch = (fn: () => void) => {
        if (df) {
          fn();
        } else {
          queue.push(fn);
        }
      };

      // initDataFast is async — events that fire before it resolves are queued
      initDataFast(options).then((instance: DatafastInstance) => {
        df = instance;
        for (const fn of queue) fn();
        queue.length = 0;
        options.onReady?.(df);
      });

      const onResponse = (event: ResponseEvent) => {
        const { method, status } = event;
        if (status >= 400) return;
        // The route only: the query can hold the cart key, an order key or an email address.
        const url = routeOf(event.url);
        // Only an order that was placed is a purchase: a declined card or a 3D Secure step is a 200 too.
        const order = placedOrder(event);
        if (order) {
          dispatch(() => df!.track('purchase', { url, transaction_id: String(order.id), ...(order.currency ? { currency: order.currency } : {}), ...(order.value !== undefined ? { value: order.value } : {}) }));
        } else if (matchesCartAdd(url)) {
          dispatch(() => df!.track('add_to_cart', { url }));
        } else if (matchesCartRemove(method, url)) {
          dispatch(() => df!.track('remove_from_cart', { url }));
        } else if (matchesCartClear(url)) {
          dispatch(() => df!.track('cart_cleared', { url }));
        } else if (matchesCheckoutUpdate(method, url)) {
          dispatch(() => df!.track('checkout_started', { url }));
        }
      };

      const onError = ({ method, url, error }: ErrorEvent) => {
        dispatch(() => df!.track('api_error', { method, url: routeOf(url), message: error.message }));
      };

      client.on('response', onResponse);
      client.on('error', onError);

      const sdk: DatafastSDK = {
        track: (event, data) => dispatch(() => df!.track(event, data)),
        identify: (userId, properties) => dispatch(() => df!.identify(userId, properties)),
        trackPageview: (path) => dispatch(() => df!.trackPageview(path)),
        flush: () => dispatch(() => df!.flush()),
        reset: () => dispatch(() => df!.reset()),
        destroy() {
          client.off('response', onResponse);
          client.off('error', onError);
        },
      };

      return sdk;
    },
  };
}
