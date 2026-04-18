# Writing Extensions

The CoCart SDK is designed to be extended. An extension is a small object with a `name` and an `install` function — nothing more. When you call `.use()`, the SDK calls `install(client)` and exposes whatever it returns as `client.<name>`.

This guide walks through building a custom extension from scratch, subscribing to client events, and packaging it for distribution.

---

## How extensions work

```text
createMyExtension()         →  { name: 'myExtension', install(client) { ... } }
client.use(createMyExtension())  →  calls install(client), stores the result
client.myExtension          →  the object returned by install()
```

`.use()` is **idempotent** — calling it twice with the same extension name installs it once and returns the same client. It throws if the name conflicts with an existing property on the client.

You can also pass extensions to the constructor so they are installed before any other code runs:

```ts
const client = new CoCart('https://your-store.com', {
  extensions: [createMyExtension()],
});
```

---

## Minimal example

```ts
import type { CoCart, CoCartExtension } from '@cocartheadless/sdk';

interface MyExtensionSDK {
  ping(): string;
}

export function createMyExtension(): CoCartExtension<'myExtension', MyExtensionSDK> {
  return {
    name: 'myExtension',
    install(client: CoCart): MyExtensionSDK {
      return {
        ping: () => `pong from ${client.getStoreUrl()}`,
      };
    },
  };
}
```

Install and use:

```ts
import { CoCart } from '@cocartheadless/sdk';
import { createMyExtension } from './my-extension';

const client = new CoCart('https://your-store.com').use(createMyExtension());

client.myExtension.ping(); // 'pong from https://your-store.com'
```

---

## TypeScript autocomplete via module augmentation

`client.myExtension` is already typed from `.use()`'s return type. But `client.extension('myExtension')` — the lookup method — needs a separate declaration so TypeScript knows what it returns.

Add this augmentation in your extension's source file (or a `global.d.ts`):

```ts
declare module '@cocartheadless/sdk' {
  interface CoCartExtensionRegistry {
    myExtension: MyExtensionSDK;
  }
}
```

Once augmented:

```ts
const ext = client.extension('myExtension'); // typed as MyExtensionSDK
```

---

## Subscribing to client events

Extensions are the right place to wire up cross-cutting concerns — logging, analytics, error tracking, tracing. The CoCart client emits events for every HTTP request, response, retry, and auth refresh.

**Event reference:**

| Event | When it fires | Payload |
|---|---|---|
| `request` | Before each HTTP request | `method`, `url`, `headers`, `body?` |
| `response` | After each successful response | `method`, `url`, `status`, `duration` |
| `error` | When a request fails | `method`, `url`, `error` |
| `retry` | Before each retry attempt | `method`, `url`, `attempt`, `maxRetries`, `delay`, `reason` |
| `auth:refresh` | After a JWT refresh attempt | `success` |

Subscribe in `install()`. Store references to the listener functions so you can unsubscribe later via a `destroy()` method on the returned API:

```ts
import type {
  CoCart,
  CoCartExtension,
  RequestEvent,
  ResponseEvent,
  ErrorEvent,
} from '@cocartheadless/sdk';

interface AnalyticsSDK {
  destroy(): void;
}

export function createAnalyticsExtension(): CoCartExtension<'analytics', AnalyticsSDK> {
  return {
    name: 'analytics',
    install(client: CoCart): AnalyticsSDK {
      const starts = new Map<string, number>();

      const onRequest = ({ url }: RequestEvent) => {
        starts.set(url, Date.now());
      };

      const onResponse = ({ url, status }: ResponseEvent) => {
        const ms = Date.now() - (starts.get(url) ?? Date.now());
        console.log(`[analytics] ${status} ${url} — ${ms}ms`);
        starts.delete(url);
      };

      const onError = ({ url, error }: ErrorEvent) => {
        console.error(`[analytics] error on ${url}`, error);
      };

      client.on('request', onRequest);
      client.on('response', onResponse);
      client.on('error', onError);

      return {
        destroy() {
          client.off('request', onRequest);
          client.off('response', onResponse);
          client.off('error', onError);
        },
      };
    },
  };
}
```

> [!NOTE]
> Event listeners are called synchronously. Errors thrown inside a listener are silently swallowed by the SDK — they will not break requests or surface to callers.

---

## Making API calls from an extension

`install()` receives the full `CoCart` instance. Your extension can call any client method:

```ts
install(client: CoCart) {
  return {
    async getCustomData() {
      const response = await client.get('/wp-json/my-plugin/v1/custom-data');
      return response.toObject();
    },
  };
}
```

---

## Cleanup and teardown

There is no `uninstall` lifecycle — extensions live for the duration of the client instance. If your extension allocates resources (timers, event listeners, network connections), expose a `destroy()` method on the public API and document that callers should call it when they are done with the client.

---

## Publishing as an npm package

Structure your package so consumers can install and use the extension in one line:

```text
my-extension/
  src/
    index.ts        ← exports factory function + public types + module augmentation
  package.json
  tsconfig.json
```

**`package.json`** — declare `@cocartheadless/sdk` as a peer dependency:

```json
{
  "name": "my-cocart-extension",
  "peerDependencies": {
    "@cocartheadless/sdk": ">=1.0.0"
  }
}
```

**`src/index.ts`** — export everything the consumer needs, including the module augmentation:

```ts
export type { MyExtensionSDK } from './types.js';
export { createMyExtension } from './extension.js';

// Module augmentation — consumers get autocomplete without any extra setup
declare module '@cocartheadless/sdk' {
  interface CoCartExtensionRegistry {
    myExtension: import('./types.js').MyExtensionSDK;
  }
}
```

With this in place, a consumer installs `my-cocart-extension`, imports the factory, and gets full autocomplete with no extra configuration.
