import { useContext } from 'react';
import type { CoCart } from '@cocartheadless/sdk';
import { CoCartContext } from './CoCartContext.js';

/** Read the CoCart client provided by the nearest `<CoCartProvider>`. */
export function useCoCart(): CoCart {
  const client = useContext(CoCartContext);

  if (!client) {
    throw new Error('useCoCart() must be used within a <CoCartProvider>.');
  }

  return client;
}
