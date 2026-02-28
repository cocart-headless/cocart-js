import type { StorageInterface } from './storage.interface.js';

/**
 * Browser localStorage adapter (plain text).
 *
 * Wraps window.localStorage with an optional key prefix.
 * Use EncryptedStorage instead when storing sensitive data.
 */
export class LocalStorage implements StorageInterface {
  private prefix: string;

  constructor(prefix: string = 'cocart_') {
    this.prefix = prefix;
  }

  get(key: string): string | null {
    return globalThis.localStorage.getItem(this.prefix + key);
  }

  set(key: string, value: string): void {
    globalThis.localStorage.setItem(this.prefix + key, value);
  }

  delete(key: string): void {
    globalThis.localStorage.removeItem(this.prefix + key);
  }
}
