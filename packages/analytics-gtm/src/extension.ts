import type { CoCart, ResponseEvent, ErrorEvent } from '@cocartheadless/sdk';
import type { DataLayerEvent, GtmExtension, GtmOptions, GtmSDK } from './types.js';

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

function getDataLayer(): DataLayerEvent[] {
  if (typeof window === 'undefined') return [];
  (window as unknown as Record<string, unknown>).dataLayer =
    (window as unknown as Record<string, unknown>).dataLayer ?? [];
  return (window as unknown as Record<string, unknown>).dataLayer as DataLayerEvent[];
}

function pushToDataLayer(event: string, data?: Record<string, unknown>): void {
  const dl = getDataLayer();
  if (!dl.length && typeof window === 'undefined') return;
  // Clear previous ecommerce object before pushing a new ecommerce event (GA4 best practice)
  if (data?.ecommerce !== undefined) {
    dl.push({ event: 'clear_ecommerce', ecommerce: null });
  }
  dl.push({ event, ...data });
}

export function createGtm(options: GtmOptions): GtmExtension {
  return {
    name: 'gtm',
    install(client: CoCart): GtmSDK {
      const currency = options.currency ?? 'USD';

      const onResponse = (event: ResponseEvent) => {
        const { method, status } = event;
        if (status >= 400) return;
        const route = routeOf(event.url);
        if (route.endsWith('/cart/add-item') && method === 'POST') {
          pushToDataLayer('add_to_cart', { ecommerce: { currency } });
        } else if (route.includes('/cart/item/') && method === 'DELETE') {
          pushToDataLayer('remove_from_cart', { ecommerce: { currency } });
        } else if (route.endsWith('/cart/clear')) {
          pushToDataLayer('cart_cleared', {});
        } else if (route.endsWith('/checkout') && method === 'PUT') {
          pushToDataLayer('begin_checkout', { ecommerce: { currency } });
        } else {
          // Only an order that was placed is a purchase: a declined card or a 3D Secure step is a 200 too.
          const order = placedOrder(event);
          if (order) {
            pushToDataLayer('purchase', {
              ecommerce: { transaction_id: String(order.id), currency: order.currency ?? currency, ...(order.value !== undefined ? { value: order.value } : {}) },
            });
          }
        }
      };

      const onError = ({ method, url, error }: ErrorEvent) => {
        pushToDataLayer('api_error', { method, url: routeOf(url), error_message: error.message });
      };

      client.on('response', onResponse);
      client.on('error', onError);

      const sdk: GtmSDK = {
        push(event, data) {
          pushToDataLayer(event, data);
        },
        destroy() {
          client.off('response', onResponse);
          client.off('error', onError);
        },
      };

      return sdk;
    },
  };
}
