import { CoCartError } from './cocart-error.js';

/**
 * Thrown when a method requires CoCart Basic but the SDK
 * is configured for the legacy CoCart plugin.
 */
export class VersionError extends CoCartError {
  constructor(method: string) {
    super(
      `${method}() requires CoCart Basic. Please upgrade from the legacy CoCart plugin to use this feature.`,
      0,
      'cocart_version_required',
    );
    this.name = 'VersionError';
  }
}
