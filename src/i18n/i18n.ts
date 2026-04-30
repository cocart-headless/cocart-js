/**
 * CoCart SDK Internationalization
 *
 * Lightweight, zero-dependency i18n system for SDK-internal messages.
 * English is bundled by default. Additional locales are registered via
 * side-effect imports:
 *
 *   import '@cocart/sdk/i18n/fr'
 *
 * Then pass `locale` when constructing the client:
 *
 *   new CoCart('https://example.com', { locale: 'fr' })
 *
 * Falls back to English silently for any missing translation key or locale.
 */

export type MessageKey =
  // Validation
  | 'validation.invalidProductId'
  | 'validation.invalidQuantity'
  | 'validation.invalidEmail'
  // JWT
  | 'jwt.tokenMissing'
  | 'jwt.noRefreshToken'
  // Version
  | 'version.requiresBasic'
  // Endpoint
  | 'endpoint.pluginRequired'
  // Extension
  | 'extension.nameConflict'
  | 'extension.notInstalled'
  // Network / request
  | 'request.networkError'
  | 'request.timeout'
  | 'request.unknownError'
  // Debug logs
  | 'debug.request'
  | 'debug.response'
  | 'debug.error'
  | 'debug.retry'
  | 'debug.jwtRefreshSuccess'
  | 'debug.jwtRefreshFailed';

export type MessageParams = Record<string, string | number>;

export type MessageCatalog = Record<MessageKey, string>;

// ---------------------------------------------------------------------------
// Internal registry
// ---------------------------------------------------------------------------

const registry = new Map<string, MessageCatalog>();

let activeLocale = 'en-us';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a locale's message catalog.
 * Call this once per locale, typically via a side-effect import.
 *
 * @example
 * // src/i18n/locales/fr.ts
 * import { registerLocale } from '../i18n.js';
 * registerLocale('fr', { ... });
 */
export function registerLocale(locale: string, catalog: MessageCatalog): void {
  registry.set(locale, catalog);
}

/**
 * Set the global active locale for all CoCart instances that do not
 * specify their own locale in options.
 */
export function setLocale(locale: string): void {
  activeLocale = locale;
}

/** Get the current global locale. */
export function getLocale(): string {
  return activeLocale;
}

/**
 * Translate a message key, interpolating `{param}` placeholders.
 *
 * Resolves in order:
 *   1. The requested locale
 *   2. English fallback
 *   3. The raw key (should never happen in practice)
 */
export function t(key: MessageKey, params?: MessageParams, locale?: string): string {
  const lang = locale ?? activeLocale;
  const catalog = registry.get(lang) ?? registry.get('en-us');
  const template = catalog?.[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}
