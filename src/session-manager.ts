import type { CoCart } from './cocart.js';
import type { Response } from './response.js';
import type { StorageInterface } from './storage/storage.interface.js';
import type { JwtOptions } from './cocart.types.js';
import { JwtManager } from './jwt-manager.js';

/**
 * Session Manager
 *
 * Helper class for managing cart sessions, especially useful for
 * tracking guest customer carts and handling the transition to authenticated users.
 */
export class SessionManager {
  private client: CoCart;
  private storage: StorageInterface | null;
  private storageKey: string = 'cocart_cart_key';
  private jwtManagerInstance: JwtManager | null = null;

  constructor(client: CoCart, storage: StorageInterface | null = null) {
    this.client = client;
    this.storage = storage;
  }

  /** Set a custom storage key name. */
  setStorageKey(key: string): this {
    this.storageKey = key;
    return this;
  }

  /** Get the current cart key. */
  getCartKey(): string | null {
    return this.client.getCartKey();
  }

  /** Set the cart key manually. */
  async setCartKey(cartKey: string): Promise<this> {
    this.client.setCartKey(cartKey);
    if (this.storage) {
      await this.storage.set(this.storageKey, cartKey);
    }
    return this;
  }

  /**
   * Initialize a new cart session.
   * Makes a request to the cart endpoint to get a new cart key for a guest customer.
   */
  async initializeCart(): Promise<string | null> {
    const response = await this.client.cart().get();
    const cartKey = response.getCartKey() ?? this.client.getCartKey();

    if (cartKey && this.storage) {
      await this.storage.set(this.storageKey, cartKey);
    }

    return cartKey;
  }

  /**
   * Login with Basic Auth and optionally transfer guest cart.
   */
  async login(username: string, password: string, mergeCart: boolean = true): Promise<Response> {
    const guestCartKey = this.client.getCartKey();

    this.client.setAuth(username, password);
    await this.clearStoredCartKey();

    if (mergeCart && guestCartKey) {
      return this.client.cart().get({ cart_key: guestCartKey });
    }

    return this.client.cart().get();
  }

  /**
   * Login with an existing JWT token.
   */
  async loginWithToken(token: string): Promise<Response> {
    const guestCartKey = this.client.getCartKey();

    this.client.setJwtToken(token);
    await this.clearStoredCartKey();

    if (guestCartKey) {
      return this.client.cart().get({ cart_key: guestCartKey });
    }

    return this.client.cart().get();
  }

  /** Get the JWT manager instance. */
  jwt(options: JwtOptions = {}): JwtManager {
    if (this.jwtManagerInstance === null) {
      this.jwtManagerInstance = new JwtManager(this.client, this.storage, options);
    }
    return this.jwtManagerInstance;
  }

  /**
   * Login with JWT authentication.
   * Acquires JWT tokens via the login endpoint, then optionally merges the guest cart.
   */
  async loginWithJwt(username: string, password: string, mergeCart: boolean = true): Promise<Response> {
    const guestCartKey = this.client.getCartKey();

    const loginResponse = await this.jwt().login(username, password);
    await this.clearStoredCartKey();

    if (mergeCart && guestCartKey) {
      await this.client.cart().get({ cart_key: guestCartKey });
    }

    return loginResponse;
  }

  /** Logout and start a new guest session. */
  async logout(): Promise<this> {
    if (this.jwtManagerInstance) {
      await this.jwtManagerInstance.clearTokens();
    }
    await this.client.clearSession();
    await this.clearStoredCartKey();
    return this;
  }

  isAuthenticated(): boolean {
    return this.client.isAuthenticated();
  }

  isGuest(): boolean {
    return this.client.isGuest();
  }

  getClient(): CoCart {
    return this.client;
  }

  // --- Internal ---

  private async clearStoredCartKey(): Promise<void> {
    if (this.storage) {
      await this.storage.delete(this.storageKey);
    }
  }
}
