import { CoCartError } from './cocart-error.js';

/**
 * Thrown when authentication fails (401, JWT expired, invalid credentials).
 */
export class AuthenticationError extends CoCartError {
  constructor(
    message: string,
    httpCode: number = 401,
    errorCode: string | null = null,
    responseData: Record<string, unknown> = {},
  ) {
    super(message, httpCode, errorCode, responseData);
    this.name = 'AuthenticationError';
  }
}
