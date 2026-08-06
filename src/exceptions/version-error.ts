import { CoCartError } from './cocart-error.js';
import { t } from '../i18n/i18n.js';

/**
 * Thrown when a method requires CoCart Starter but the SDK
 * is configured for the CoCart Community plugin.
 */
export class VersionError extends CoCartError {
  constructor(method: string, locale?: string) {
    super(
      t('version.requiresBasic', { method }, locale),
      0,
      'cocart_version_required',
    );
    this.name = 'VersionError';
  }
}
