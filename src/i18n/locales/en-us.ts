import { registerLocale } from '../i18n.js';

registerLocale('en-us', {
  // Validation
  'validation.invalidProductId': 'Product ID must be a positive integer',
  'validation.invalidQuantity':  'Quantity must be a positive number',
  'validation.invalidEmail':     'A valid email address is required',

  // JWT
  'jwt.tokenMissing':    'JWT token not found in login response. Is the CoCart JWT Authentication plugin installed?',
  'jwt.noRefreshToken':  'No refresh token available. Please login first.',

  // Version
  'version.requiresBasic': '{method}() requires CoCart Basic. Please upgrade from the legacy CoCart plugin to use this feature.',

  // Endpoint
  'endpoint.pluginRequired': 'This method is only available with another CoCart plugin. Please ask support for assistance!',

  // Extension
  'extension.nameConflict': 'Cannot install extension "{name}" because that property already exists on the CoCart client.',
  'extension.notInstalled': 'The "{name}" extension is not installed on this CoCart client.',

  // Network / request
  'request.networkError': 'Network error',
  'request.timeout':      'Request timed out after {timeout}ms',
  'request.unknownError': 'An unknown error occurred',

  // Debug logs
  'debug.request':          '[CoCart] {method} {url}',
  'debug.response':         '[CoCart] {method} {url} \u2192 {status} ({duration}ms)',
  'debug.error':            '[CoCart] {method} {url} \u2192 Error:',
  'debug.retry':            '[CoCart] Retry {attempt}/{maxRetries} after {delay}ms ({reason})',
  'debug.jwtRefreshSuccess': '[CoCart] JWT token refresh succeeded',
  'debug.jwtRefreshFailed':  '[CoCart] JWT token refresh failed',
});
