/**
 * Interface for session storage adapters.
 *
 * Methods may return promises to support async storage backends
 * (e.g. encrypted localStorage using Web Crypto API).
 */
export interface StorageInterface {
  /** Get a value from storage */
  get(key: string): string | null | Promise<string | null>;
  /** Set a value in storage */
  set(key: string, value: string): void | Promise<void>;
  /** Delete a value from storage */
  delete(key: string): void | Promise<void>;
}
