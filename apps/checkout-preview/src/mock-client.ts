import type { CoCart } from '@cocartheadless/sdk';

export const mockCoCartClient = {
  requestRaw: () => Promise.reject(new Error('No API in preview mode')),
  getWooCommerceCredentials: () => null,
  cart: undefined,
} as unknown as CoCart;
