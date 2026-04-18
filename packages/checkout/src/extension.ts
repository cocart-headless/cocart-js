import type { CheckoutExtension, CheckoutOptions, CheckoutGatewayAdapter } from './types.js';
import { CheckoutClient } from './checkout.js';

export function createCheckout(options: CheckoutOptions = {}): CheckoutExtension {
  return {
    name: 'checkout',
    install: (client) => {
      const checkout = new CheckoutClient(client, options);
      if (options.gatewayAdapters) {
        checkout.registerGateways(options.gatewayAdapters);
      }
      return checkout;
    },
  };
}

export function createGatewayAdapter<T extends CheckoutGatewayAdapter>(adapter: T): T {
  return adapter;
}
