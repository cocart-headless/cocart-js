export type { DatafastOptions, DatafastSDK, DatafastInstance, DatafastExtension } from './types.js';
export { createDatafast } from './extension.js';

declare module '@cocartheadless/sdk' {
  interface CoCartExtensionRegistry {
    datafast: import('./types.js').DatafastSDK;
  }
}
