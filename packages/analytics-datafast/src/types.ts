import type { CoCartExtension } from '@cocartheadless/sdk';

export interface DatafastInstance {
  track(event: string, data?: Record<string, unknown>): void;
  identify(userId: string, properties?: Record<string, unknown>): void;
  trackPageview(path: string): void;
  flush(): void;
  reset(): void;
  getTrackingParams(): Record<string, string>;
  buildCrossDomainUrl(url: string): string;
}

export interface DatafastOptions {
  websiteId: string;
  domain?: string;
  debug?: boolean;
  /**
   * Enable cookieless tracking mode. Uses sessionStorage instead of cookies for visitor IDs.
   * No consent banner required for analytics. Cross-domain tracking is disabled in this mode.
   */
  cookieless?: boolean;
  /** Automatically capture pageviews on initial load and history navigation. */
  autoCapturePageviews?: boolean | { trackHashChanges?: boolean };
  /** Allow tracking on localhost (default: false). */
  allowLocalhost?: boolean;
  /** Called with the Datafast instance after initialization — use for custom tracking setup. */
  onReady?: (df: DatafastInstance) => void;
}

export interface DatafastSDK {
  track(event: string, data?: Record<string, unknown>): void;
  identify(userId: string, properties?: Record<string, unknown>): void;
  trackPageview(path: string): void;
  flush(): void;
  reset(): void;
  destroy(): void;
}

export type DatafastExtension = CoCartExtension<'datafast', DatafastSDK>;
