import type { CoCartExtension } from '@cocartheadless/sdk';

export interface GA4Item {
  item_id?: string;
  item_name?: string;
  price?: number;
  quantity?: number;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_variant?: string;
  currency?: string;
  discount?: number;
  index?: number;
  [key: string]: unknown;
}

export interface DataLayerEvent {
  event: string;
  ecommerce?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface GtmOptions {
  /** Your GTM container ID (e.g. 'GTM-XXXXXXX'). Stored for reference — the extension does not inject the GTM script. */
  containerId: string;
  /** Default currency code for ecommerce events (e.g. 'USD'). */
  currency?: string;
}

export interface GtmSDK {
  /** Manually push any event to window.dataLayer. */
  push(event: string, data?: Record<string, unknown>): void;
  /** Unsubscribe all CoCart event listeners. */
  destroy(): void;
}

export type GtmExtension = CoCartExtension<'gtm', GtmSDK>;
