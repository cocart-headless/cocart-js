import { CoCartError } from './cocart-error.js';

/**
 * Thrown when the API returns a validation error (400, invalid/missing fields).
 */
export class ValidationError extends CoCartError {
  constructor(
    message: string,
    httpCode: number = 400,
    errorCode: string | null = null,
    responseData: Record<string, unknown> = {},
  ) {
    super(message, httpCode, errorCode, responseData);
    this.name = 'ValidationError';
  }
}
