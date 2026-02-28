import type { StorageInterface } from './storage.interface.js';

/**
 * In-memory storage adapter.
 *
 * Default for Node.js and SSR environments. Data does not survive
 * process restart — suitable for per-request server-side usage.
 */
export class MemoryStorage implements StorageInterface {
  private store = new Map<string, string>();

  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}
