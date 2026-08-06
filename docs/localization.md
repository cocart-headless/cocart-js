# Localization

By default, all SDK-internal messages — validation errors, JWT errors, debug logs, and network error messages — are in English (US). The localization system lets developers read those messages in their own language without affecting the language of the WooCommerce store itself.

The store can be in English (US) while the SDK speaks French to the developer. These are completely independent.

## Quick Start

English (US) works out of the box with no configuration needed. To use another language, register a locale file via a side-effect import and pass `locale` when constructing the client:

```ts
import { CoCart } from '@cocartheadless/sdk';
import '@cocartheadless/sdk/i18n/fr'; // registers French (once available)

const client = new CoCart('https://your-store.com', {
  locale: 'fr',
});
```

That's it. All SDK messages — validation errors, JWT errors, debug logs — will now be in French for this client instance.

## How It Works

The i18n system is a lightweight registry with no external dependencies. Locale files are separate entry points that register themselves when imported. If a locale is not registered, or a translation key is missing, the SDK silently falls back to English (US).

```
import '@cocartheadless/sdk/i18n/fr'
       │
       └─ calls registerLocale('fr', { ... })
              │
              └─ stored in registry

new CoCart({ locale: 'fr' })
       │
       └─ t('validation.invalidProductId', undefined, 'fr')
              │
              ├─ found in 'fr' registry → returns French string
              └─ not found → falls back to 'en'
```

## Fallback Behaviour

The SDK always falls back to English (US) silently:

- No `locale` option set → English (US)
- `locale: 'fr'` but French not registered → English (US)
- `locale: 'fr'`, French registered but a specific key is missing → English (US) for that key

No warnings or errors are thrown. This means partial translations work — you can ship a locale with only some keys translated.

## Fluent API

Locale can also be set or changed after construction:

```ts
const client = new CoCart('https://your-store.com');

client.setLocale('fr');

// Or as part of a chain
CoCart.create('https://your-store.com')
  .setLocale('fr')
  .setDebug(true);
```

## Global Locale

If you have multiple client instances and want them all to use the same locale by default, set the global locale once at startup:

```ts
import { setLocale } from '@cocartheadless/sdk';
import '@cocartheadless/sdk/i18n/fr';

setLocale('fr'); // all clients without an explicit locale will use French
```

Individual client instances with `locale` set in their options override the global locale for that instance only.

## Validation Functions

The standalone validation functions also accept an optional `locale` parameter:

```ts
import { validateProductId, validateQuantity, validateEmail } from '@cocartheadless/sdk';

validateProductId('abc', 'fr');   // throws ValidationError with French message
validateQuantity(-1, 'fr');       // throws ValidationError with French message
validateEmail('bad', 'fr');       // throws ValidationError with French message
```

## Contributing a Locale

To add a new language, create a file at `src/i18n/locales/{locale}.ts` that calls `registerLocale` with all 18 message keys:

```ts
// src/i18n/locales/fr.ts
import { registerLocale } from '../i18n.js';

registerLocale('fr', {
  // Validation
  'validation.invalidProductId': "L'ID produit doit être un entier positif",
  'validation.invalidQuantity':  'La quantité doit être un nombre positif',
  'validation.invalidEmail':     'Une adresse e-mail valide est requise',

  // JWT
  'jwt.tokenMissing':   "Token JWT introuvable dans la réponse. Le plugin CoCart JWT Authentication est-il installé ?",
  'jwt.noRefreshToken': "Aucun token de rafraîchissement disponible. Veuillez vous connecter d'abord.",

  // Version
  'version.requiresBasic': "{method}() nécessite CoCart Starter. Veuillez mettre à niveau depuis le plugin CoCart legacy.",

  // Endpoint
  'endpoint.pluginRequired': "Cette méthode n'est disponible qu'avec un autre plugin CoCart. Contactez le support.",

  // Extension
  'extension.nameConflict': 'Impossible d\'installer l\'extension "{name}" car cette propriété existe déjà sur le client CoCart.',
  'extension.notInstalled': 'L\'extension "{name}" n\'est pas installée sur ce client CoCart.',

  // Network / request
  'request.networkError': 'Erreur réseau',
  'request.timeout':      'La requête a expiré après {timeout}ms',
  'request.unknownError': 'Une erreur inconnue est survenue',

  // Debug logs
  'debug.request':           '[CoCart] {method} {url}',
  'debug.response':          '[CoCart] {method} {url} → {status} ({duration}ms)',
  'debug.error':             '[CoCart] {method} {url} → Erreur :',
  'debug.retry':             '[CoCart] Nouvelle tentative {attempt}/{maxRetries} après {delay}ms ({reason})',
  'debug.jwtRefreshSuccess': '[CoCart] Rafraîchissement du token JWT réussi',
  'debug.jwtRefreshFailed':  '[CoCart] Rafraîchissement du token JWT échoué',
});
```

Then add it as a build entry in [tsup.i18n.ts](../tsup.i18n.ts) and a subpath export in [package.json](../package.json):

```ts
// tsup.i18n.ts
entry: {
  'i18n/en-us': 'src/i18n/locales/en-us.ts',
  'i18n/fr': 'src/i18n/locales/fr.ts', // add this
},
```

```json
// package.json
"./i18n/fr": {
  "import": {
    "types": "./dist/i18n/fr.d.ts",
    "default": "./dist/i18n/fr.js"
  },
  "require": {
    "types": "./dist/i18n/fr.d.cts",
    "default": "./dist/i18n/fr.cjs"
  }
}
```

### Message key reference

All 18 keys must be present. Interpolation placeholders (`{name}`) must be preserved exactly.

| Key | Placeholders | Description |
|-----|-------------|-------------|
| `validation.invalidProductId` | — | Product ID is not a positive integer |
| `validation.invalidQuantity` | — | Quantity is not a positive number |
| `validation.invalidEmail` | — | Email address format is invalid |
| `jwt.tokenMissing` | — | JWT token absent from login response |
| `jwt.noRefreshToken` | — | No refresh token available |
| `version.requiresBasic` | `{method}` | Method requires CoCart Starter |
| `endpoint.pluginRequired` | — | Method requires an additional CoCart plugin |
| `extension.nameConflict` | `{name}` | Extension name conflicts with existing client property |
| `extension.notInstalled` | `{name}` | Extension has not been installed on the client |
| `request.networkError` | — | Generic network failure |
| `request.timeout` | `{timeout}` | Request timed out (ms) |
| `request.unknownError` | — | Fallback when API returns no message |
| `debug.request` | `{method}`, `{url}` | Outgoing request log line |
| `debug.response` | `{method}`, `{url}`, `{status}`, `{duration}` | Response log line |
| `debug.error` | `{method}`, `{url}` | Error log line prefix |
| `debug.retry` | `{attempt}`, `{maxRetries}`, `{delay}`, `{reason}` | Retry log line |
| `debug.jwtRefreshSuccess` | — | JWT refresh succeeded |
| `debug.jwtRefreshFailed` | — | JWT refresh failed |

## i18n API Reference

```ts
import { registerLocale, setLocale, getLocale, t } from '@cocartheadless/sdk';
```

### `registerLocale(locale, catalog)`

Registers a message catalog for a locale. Safe to call multiple times — later calls overwrite earlier ones for the same locale.

```ts
registerLocale('de', { 'validation.invalidProductId': '...', /* ... */ });
```

### `setLocale(locale)`

Sets the global default locale used by all client instances that don't specify their own.

```ts
setLocale('de');
```

### `getLocale()`

Returns the current global locale (default: `'en-us'`).

```ts
const lang = getLocale(); // 'en'
```

### `t(key, params?, locale?)`

Translates a message key with optional interpolation. Useful if you want to use the SDK's message catalog in your own UI:

```ts
import { t } from '@cocartheadless/sdk';

t('validation.invalidProductId');                        // 'Product ID must be a positive integer'
t('request.timeout', { timeout: 5000 });                // 'Request timed out after 5000ms'
t('version.requiresBasic', { method: 'findBySlug' });   // 'findBySlug() requires CoCart Starter...'
```
