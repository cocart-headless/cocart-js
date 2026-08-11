import type { ReactNode } from 'react';
import type { CoCart } from '@cocartheadless/sdk';
import { CoCartContext } from './CoCartContext.js';

export interface CoCartProviderProps {
  /** A CoCart client instance, created with `createBrowserClient` (or a framework adapter's browser client). */
  client: CoCart;
  children: ReactNode;
}

/**
 * Makes a CoCart client available to `useCoCart()` and `useAuth()` for
 * every component beneath it, so auth/cart state read anywhere in the tree
 * reflects the same client instance.
 */
export function CoCartProvider({ client, children }: CoCartProviderProps) {
  return <CoCartContext.Provider value={client}>{children}</CoCartContext.Provider>;
}
