export type { GtmOptions, GtmSDK, GtmExtension, GA4Item, DataLayerEvent } from './types.js';
export { createGtm } from './extension.js';

declare module '@cocartheadless/sdk' {
  interface CoCartExtensionRegistry {
    gtm: import('./types.js').GtmSDK;
  }
}
