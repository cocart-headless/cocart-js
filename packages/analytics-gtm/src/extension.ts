import type { CoCart, ResponseEvent, ErrorEvent } from '@cocartheadless/sdk';
import type { DataLayerEvent, GtmExtension, GtmOptions, GtmSDK } from './types.js';

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

      const onResponse = ({ method, url }: ResponseEvent) => {
        if (url.includes('/cart/add-item') && method === 'POST') {
          pushToDataLayer('add_to_cart', { ecommerce: { currency } });
        } else if (url.includes('/cart/item/') && method === 'DELETE') {
          pushToDataLayer('remove_from_cart', { ecommerce: { currency } });
        } else if (url.includes('/cart/clear')) {
          pushToDataLayer('cart_cleared', {});
        } else if (url.includes('/checkout') && method === 'PUT') {
          pushToDataLayer('begin_checkout', { ecommerce: { currency } });
        } else if (url.includes('/checkout') && method === 'POST') {
          pushToDataLayer('purchase', { ecommerce: { currency } });
        }
      };

      const onError = ({ method, url, error }: ErrorEvent) => {
        pushToDataLayer('api_error', { method, url, error_message: error.message });
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
