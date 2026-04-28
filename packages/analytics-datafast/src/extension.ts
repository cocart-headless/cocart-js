import type { CoCart, ResponseEvent, ErrorEvent } from '@cocartheadless/sdk';
import type { DatafastExtension, DatafastInstance, DatafastOptions, DatafastSDK } from './types.js';
import { initDataFast } from 'datafast';

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
  return method === 'PUT' && url.includes('/checkout');
}

function matchesCheckoutProcess(method: string, url: string): boolean {
  return method === 'POST' && url.includes('/checkout');
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

      const onResponse = ({ method, url }: ResponseEvent) => {
        if (matchesCartAdd(url)) {
          dispatch(() => df!.track('add_to_cart', { url }));
        } else if (matchesCartRemove(method, url)) {
          dispatch(() => df!.track('remove_from_cart', { url }));
        } else if (matchesCartClear(url)) {
          dispatch(() => df!.track('cart_cleared', { url }));
        } else if (matchesCheckoutProcess(method, url)) {
          dispatch(() => df!.track('purchase', { url }));
        } else if (matchesCheckoutUpdate(method, url)) {
          dispatch(() => df!.track('checkout_started', { url }));
        }
      };

      const onError = ({ method, url, error }: ErrorEvent) => {
        dispatch(() => df!.track('api_error', { method, url, message: error.message }));
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
