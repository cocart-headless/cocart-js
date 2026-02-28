/**
 * Base error class for CoCart SDK.
 */
export class CoCartError extends Error {
  /** HTTP status code */
  readonly httpCode: number;
  /** API error code (e.g. 'rest_no_route', 'cocart_invalid_product') */
  readonly errorCode: string | null;
  /** Full API response data */
  readonly responseData: Record<string, unknown>;

  constructor(
    message: string,
    httpCode: number = 0,
    errorCode: string | null = null,
    responseData: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'CoCartError';
    this.httpCode = httpCode;
    this.errorCode = errorCode;
    this.responseData = responseData;
  }
}
