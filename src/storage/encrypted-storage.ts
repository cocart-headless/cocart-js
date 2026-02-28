import type { StorageInterface } from './storage.interface.js';

/**
 * Browser localStorage adapter with AES-256-GCM encryption.
 *
 * Uses the Web Crypto API (zero dependencies). All values are encrypted
 * before being stored in localStorage and decrypted on read.
 *
 * Encryption details:
 * - Key derivation: PBKDF2 with SHA-256, 100,000 iterations
 * - Cipher: AES-256-GCM with random 12-byte IV per write
 * - Stored format: base64(iv + ciphertext) — salt stored separately
 */
export class EncryptedStorage implements StorageInterface {
  private prefix: string;
  private cryptoKey: CryptoKey | null = null;
  private keyPromise: Promise<CryptoKey> | null = null;
  private encryptionKey: string;

  constructor(encryptionKey: string, options?: { prefix?: string }) {
    this.encryptionKey = encryptionKey;
    this.prefix = options?.prefix ?? 'cocart_enc_';
  }

  async get(key: string): Promise<string | null> {
    const stored = globalThis.localStorage.getItem(this.prefix + key);
    if (stored === null) {
      return null;
    }

    try {
      const cryptoKey = await this.getKey();
      const raw = this.base64ToBytes(stored);

      // First 12 bytes are the IV
      const iv = raw.slice(0, 12);
      const ciphertext = raw.slice(12);

      const decrypted = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        ciphertext,
      );

      return new TextDecoder().decode(decrypted);
    } catch {
      // If decryption fails (e.g. key changed), remove corrupted data
      globalThis.localStorage.removeItem(this.prefix + key);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    const cryptoKey = await this.getKey();
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(value);

    const ciphertext = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encoded,
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    globalThis.localStorage.setItem(this.prefix + key, this.bytesToBase64(combined));
  }

  delete(key: string): void {
    globalThis.localStorage.removeItem(this.prefix + key);
  }

  /**
   * Get or derive the CryptoKey. Cached after first derivation.
   */
  private async getKey(): Promise<CryptoKey> {
    if (this.cryptoKey) {
      return this.cryptoKey;
    }

    if (!this.keyPromise) {
      this.keyPromise = this.deriveKey();
    }

    this.cryptoKey = await this.keyPromise;
    return this.cryptoKey;
  }

  /**
   * Derive an AES-256-GCM key from the encryption key using PBKDF2.
   */
  private async deriveKey(): Promise<CryptoKey> {
    const salt = this.getOrCreateSalt();
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.encryptionKey),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    return globalThis.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: 100_000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Get the salt from localStorage, or create and store a new one.
   */
  private getOrCreateSalt(): Uint8Array {
    const saltKey = this.prefix + '_salt';
    const stored = globalThis.localStorage.getItem(saltKey);

    if (stored) {
      return this.base64ToBytes(stored);
    }

    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    globalThis.localStorage.setItem(saltKey, this.bytesToBase64(salt));
    return salt;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
