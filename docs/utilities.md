# Utilities

The SDK includes standalone utility classes for common tasks in headless WooCommerce projects. These are optional — you can use them when you need them, and they don't affect the core SDK behavior.

## Currency Formatter

### Why do prices come back as integers?

CoCart returns prices as **smallest-unit integers** — that means cents for USD, pence for GBP, or the smallest denomination for any currency. For example, `4599` means $45.99 (4599 cents). This is an industry-standard practice because floating-point numbers (like `45.99`) can cause rounding errors in calculations, while integers are always exact.

The `CurrencyFormatter` class converts these integers into human-readable price strings. It uses **`Intl.NumberFormat`** — a built-in JavaScript API (available in all modern browsers and Node.js) that knows how to format numbers according to different currencies and locales (e.g., `$45.99` in the US, `45,99 €` in Germany).

```ts
import { CurrencyFormatter } from '@cocart/sdk';

const fmt = new CurrencyFormatter();
```

### Formatting Prices

Use the `CurrencyInfo` object from a cart response to format amounts:

```ts
const response = await client.cart().get();
const currency = response.getCurrency();
// currency => { currency_code: 'USD', currency_minor_unit: 2, ... }

fmt.format(4599, currency);        // "$45.99"
fmt.format(100, currency);         // "$1.00"
fmt.format(0, currency);           // "$0.00"
```

### Decimal String (No Symbol)

```ts
fmt.formatDecimal(4599, currency); // "45.99"
```

### Different Currencies

The formatter respects the `currency_code` and `currency_minor_unit` from the API response:

```ts
// Euro (2 decimal places)
const eur = { currency_code: 'EUR', currency_minor_unit: 2 } as CurrencyInfo;
fmt.format(1299, eur);  // "€12.99"

// Japanese Yen (0 decimal places)
const jpy = { currency_code: 'JPY', currency_minor_unit: 0 } as CurrencyInfo;
fmt.format(1500, jpy);  // "¥1,500"
```

### Custom Locale

A **locale** is a code that represents a language and region (e.g., `en-US` for US English, `de-DE` for German). It controls how numbers are formatted — for example, whether the decimal separator is a period or a comma, and where the currency symbol goes. Pass a locale to the constructor to override the default:

```ts
const fmt = new CurrencyFormatter('de-DE');
fmt.format(4599, eur); // "12,99 €"
```

---

## Timezone Helper

### Why do timezones matter?

Your WooCommerce store has a configured timezone (e.g., `America/New_York` or `UTC`), and dates in API responses use that timezone. But your customer might be in a completely different timezone. If an order was created at "10:00 AM" in the store's timezone, you may want to display it as "7:00 AM" for a customer in Los Angeles, or "4:00 PM" for a customer in London.

The `TimezoneHelper` class handles these conversions. It uses **`Intl.DateTimeFormat`** — another built-in JavaScript API (like `Intl.NumberFormat` for currencies) that understands timezone rules, including daylight saving time changes.

```ts
import { TimezoneHelper } from '@cocart/sdk';

const tz = new TimezoneHelper();
```

### Detect User Timezone

```ts
const timezone = tz.detectTimezone();
// "America/New_York", "Europe/London", "Asia/Tokyo", etc.
```

### Convert Between Timezones

```ts
tz.convert('2025-01-15T10:00:00', 'UTC', 'America/New_York');
// "2025-01-15T05:00:00" (EST is UTC-5)

tz.convert('2025-06-15T10:00:00', 'UTC', 'America/New_York');
// "2025-06-15T06:00:00" (EDT is UTC-4)
```

### Convert Store Time to Local Time

Shorthand for converting a store date to the user's local timezone:

```ts
// Store is in UTC, user is in America/New_York
tz.toLocal('2025-01-15T10:00:00', 'UTC');
// => local time string based on Intl.DateTimeFormat

// If no store timezone is provided, defaults to UTC
tz.toLocal('2025-01-15T10:00:00');
```

---

## Response Transformer

A **response transformer** is a function that the SDK calls on every API response before returning it to your code. Think of it as a middleware or interceptor — it receives the response, you can inspect or modify it, and then you return it.

Common uses:

- **Logging** — Log every response status for debugging.
- **Metrics** — Track response times or error rates.
- **Data enrichment** — Add computed fields or format values before your UI code sees them.

### Via Constructor

```ts
const client = new CoCart('https://your-store.com', {
  responseTransformer: (response) => {
    console.log(`[${response.statusCode}] Response received`);
    return response;
  },
});
```

### Via Fluent Setter

```ts
const client = new CoCart('https://your-store.com')
  .setResponseTransformer((response) => {
    // Add timing metadata, format currencies, etc.
    return response;
  });
```

### Clearing the Transformer

```ts
client.setResponseTransformer(null);
```

### Example: Logging All Responses

```ts
client.setResponseTransformer((response) => {
  console.log(`Status: ${response.statusCode}`);
  console.log(`Items: ${response.getItemCount()}`);
  return response;
});
```
