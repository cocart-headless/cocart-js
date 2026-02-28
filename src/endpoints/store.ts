import { Endpoint } from './endpoint.js';
import type { Response } from '../response.js';

/**
 * Store Endpoint
 *
 * Handles store information API operations.
 */
export class Store extends Endpoint {
  protected endpoint = 'store';

  /** Get store information. */
  async info(params?: Record<string, string>): Promise<Response> {
    return this.get('', params);
  }
}
