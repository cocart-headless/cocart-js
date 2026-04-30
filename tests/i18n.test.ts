import { describe, it, expect, beforeEach } from 'vitest';
import { registerLocale, setLocale, getLocale, t } from '../src/i18n/i18n.js';
import '../src/i18n/locales/en-us.js';
import { validateProductId, validateQuantity, validateEmail } from '../src/validation.js';
import { VersionError } from '../src/exceptions/version-error.js';
import { ValidationError } from '../src/exceptions/validation-error.js';

// ---------------------------------------------------------------------------
// Minimal French fixture — only a subset of keys needed for testing
// ---------------------------------------------------------------------------

const frCatalog = {
  'validation.invalidProductId': "L'identifiant du produit doit être un entier positif",
  'validation.invalidQuantity':  'La quantité doit être un nombre positif',
  'validation.invalidEmail':     'Une adresse e-mail valide est requise',
  'jwt.tokenMissing':            'Jeton JWT introuvable dans la réponse de connexion.',
  'jwt.noRefreshToken':          'Aucun jeton de rafraîchissement disponible.',
  'version.requiresBasic':       '{method}() nécessite CoCart Basic.',
  'endpoint.pluginRequired':     'Cette méthode nécessite une extension CoCart supplémentaire.',
  'request.networkError':        'Erreur réseau',
  'request.timeout':             'Délai dépassé après {timeout}ms',
  'request.unknownError':        'Une erreur inconnue est survenue',
  'debug.request':               '[CoCart] {method} {url}',
  'debug.response':              '[CoCart] {method} {url} → {status} ({duration}ms)',
  'debug.error':                 '[CoCart] {method} {url} → Erreur :',
  'debug.retry':                 '[CoCart] Tentative {attempt}/{maxRetries} dans {delay}ms ({reason})',
  'debug.jwtRefreshSuccess':     '[CoCart] Rafraîchissement du jeton JWT réussi',
  'debug.jwtRefreshFailed':      '[CoCart] Échec du rafraîchissement du jeton JWT',
} as const;

// ---------------------------------------------------------------------------
// i18n core
// ---------------------------------------------------------------------------

describe('i18n registry', () => {
  it('en-us is registered by default', () => {
    expect(t('request.networkError')).toBe('Network error');
  });

  it('registerLocale makes a locale available', () => {
    registerLocale('fr', frCatalog);
    expect(t('request.networkError', undefined, 'fr')).toBe('Erreur réseau');
  });

  it('getLocale returns the active locale', () => {
    expect(getLocale()).toBe('en-us');
  });

  it('setLocale changes the global active locale', () => {
    registerLocale('fr', frCatalog);
    setLocale('fr');
    expect(getLocale()).toBe('fr');
    expect(t('request.networkError')).toBe('Erreur réseau');
    setLocale('en-us'); // restore
  });
});

describe('t() translation function', () => {
  beforeEach(() => {
    registerLocale('fr', frCatalog);
    setLocale('en-us');
  });

  it('returns English for en-us', () => {
    expect(t('validation.invalidEmail')).toBe('A valid email address is required');
  });

  it('returns translated string when locale is specified', () => {
    expect(t('validation.invalidEmail', undefined, 'fr')).toBe('Une adresse e-mail valide est requise');
  });

  it('falls back to en-us for unregistered locale', () => {
    expect(t('request.networkError', undefined, 'de')).toBe('Network error');
  });

  it('falls back to en-us when locale is undefined', () => {
    expect(t('request.networkError', undefined, undefined)).toBe('Network error');
  });

  it('interpolates {param} placeholders', () => {
    expect(t('request.timeout', { timeout: 5000 })).toBe('Request timed out after 5000ms');
  });

  it('interpolates {param} placeholders in translated string', () => {
    expect(t('request.timeout', { timeout: 3000 }, 'fr')).toBe('Délai dépassé après 3000ms');
  });

  it('interpolates {method} in version.requiresBasic', () => {
    expect(t('version.requiresBasic', { method: 'products()->findBySlug' }))
      .toContain('products()->findBySlug');
  });

  it('leaves unknown placeholder as-is', () => {
    expect(t('request.timeout', {} as Record<string, string>)).toBe('Request timed out after {timeout}ms');
  });

  it('returns raw key as last resort (no catalog registered)', () => {
    // Use a type cast to simulate a missing key scenario
    const result = t('validation.invalidProductId', undefined, 'xx-unknown');
    // Should fall back to en-us, not return the raw key
    expect(result).toBe('Product ID must be a positive integer');
  });
});

// ---------------------------------------------------------------------------
// Validation — locale propagation
// ---------------------------------------------------------------------------

describe('validateProductId with locale', () => {
  beforeEach(() => {
    registerLocale('fr', frCatalog);
    setLocale('en-us');
  });

  it('throws English message by default', () => {
    expect(() => validateProductId(-1)).toThrow('Product ID must be a positive integer');
  });

  it('throws translated message when locale passed', () => {
    expect(() => validateProductId(-1, 'fr'))
      .toThrow("L'identifiant du produit doit être un entier positif");
  });
});

describe('validateQuantity with locale', () => {
  beforeEach(() => {
    registerLocale('fr', frCatalog);
    setLocale('en-us');
  });

  it('throws English message by default', () => {
    expect(() => validateQuantity(0)).toThrow('Quantity must be a positive number');
  });

  it('throws translated message when locale passed', () => {
    expect(() => validateQuantity(0, 'fr')).toThrow('La quantité doit être un nombre positif');
  });
});

describe('validateEmail with locale', () => {
  beforeEach(() => {
    registerLocale('fr', frCatalog);
    setLocale('en-us');
  });

  it('throws English message by default', () => {
    expect(() => validateEmail('bad')).toThrow('A valid email address is required');
  });

  it('throws translated message when locale passed', () => {
    expect(() => validateEmail('bad', 'fr')).toThrow('Une adresse e-mail valide est requise');
  });

  it('error code is always cocart_invalid_email regardless of locale', () => {
    try {
      validateEmail('bad', 'fr');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).errorCode).toBe('cocart_invalid_email');
    }
  });
});

// ---------------------------------------------------------------------------
// VersionError — locale propagation
// ---------------------------------------------------------------------------

describe('VersionError with locale', () => {
  beforeEach(() => {
    registerLocale('fr', frCatalog);
    setLocale('en-us');
  });

  it('throws English message by default', () => {
    const error = new VersionError('products()->findBySlug');
    expect(error.message).toContain('CoCart Basic');
    expect(error.message).toContain('products()->findBySlug');
  });

  it('throws translated message when locale passed', () => {
    const error = new VersionError('products()->findBySlug', 'fr');
    expect(error.message).toContain('nécessite CoCart Basic');
    expect(error.message).toContain('products()->findBySlug');
  });

  it('error code is always cocart_version_required regardless of locale', () => {
    const error = new VersionError('test', 'fr');
    expect(error.errorCode).toBe('cocart_version_required');
  });
});
