import type { CoCart } from '../cocart.js';
import type { Response } from '../response.js';
import { CoCartError } from '../exceptions/cocart-error.js';
import { t } from '../i18n/i18n.js';

/**
 * Abstract base class for all endpoint classes.
 *
 * Provides HTTP method helpers that prepend the endpoint prefix
 * and handle `rest_no_route` errors with a friendly message.
 */
export abstract class Endpoint {
  protected client: CoCart;
  protected endpoint: string = '';

  constructor(client: CoCart) {
    this.client = client;
  }

  /** Build the full endpoint path. */
  protected buildPath(path: string = ''): string {
    if (!path) return this.endpoint;
    return this.endpoint.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
  }

  /** Make a GET request. */
  protected async get(pathOrParams?: string | Record<string, string>, params?: Record<string, string>): Promise<Response> {
    const path = typeof pathOrParams === 'string' ? pathOrParams : '';
    const resolvedParams = typeof pathOrParams === 'object' ? pathOrParams : params;
    try {
      return await this.client.get(this.buildPath(path), resolvedParams);
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** Make a POST request. */
  protected async post(path: string = '', data?: Record<string, unknown>, params?: Record<string, string>): Promise<Response> {
    try {
      return await this.client.post(this.buildPath(path), data, params);
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** Make a PUT request. */
  protected async put(path: string = '', data?: Record<string, unknown>, params?: Record<string, string>): Promise<Response> {
    try {
      return await this.client.put(this.buildPath(path), data, params);
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /** Make a DELETE request. */
  protected async delete(path: string = '', params?: Record<string, string>): Promise<Response> {
    try {
      return await this.client.delete(this.buildPath(path), params);
    } catch (e) {
      this.handleNoRoute(e);
    }
  }

  /**
   * Handle rest_no_route errors with a friendly message.
   * Catches errors from CoCart extensions that are not installed.
   */
  protected handleNoRoute(e: unknown): never {
    if (e instanceof CoCartError && e.errorCode === 'rest_no_route') {
      throw new CoCartError(
        t('endpoint.pluginRequired', undefined, this.client.getLocale()),
        404,
        'cocart_plugin_required',
      );
    }
    throw e;
  }

  /** Convert typed params to Record<string, string> for the HTTP layer. */
  protected stringifyParams(params: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }
    return result;
  }
}
