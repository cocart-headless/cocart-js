import { Endpoint } from './endpoint.js';
import type { Response } from '../response.js';

/**
 * Sessions Endpoint
 *
 * Handles cart session management for administrators.
 * Requires WooCommerce REST API credentials (consumer_key/consumer_secret).
 *
 * Note: The list endpoint uses plural "sessions", while individual
 * session operations use singular "session/{key}" to match the API.
 */
export class Sessions extends Endpoint {
  protected endpoint = 'sessions';

  /** Get all cart sessions. */
  async all(params?: Record<string, string>): Promise<Response> {
    return this.get('', params);
  }

  /** Get a specific cart session. */
  async find(sessionKey: string, params?: Record<string, string>): Promise<Response> {
    return this.client.get('session/' + sessionKey, params);
  }

  /** Delete a cart session. */
  async destroy(sessionKey: string): Promise<Response> {
    return this.client.delete('session/' + sessionKey);
  }

  /** Get session items. */
  async getItems(sessionKey: string): Promise<Response> {
    return this.client.get('session/' + sessionKey + '/items');
  }

  /** Get session by customer ID. */
  async bySession(customerId: number): Promise<Response> {
    return this.client.get('session/' + String(customerId));
  }

  /** Delete session by customer ID. */
  async destroySession(customerId: number): Promise<Response> {
    return this.client.delete('session/' + String(customerId));
  }
}
