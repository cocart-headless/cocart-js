import type { CurrencyInfo } from './cocart.types.js';

/**
 * Currency formatting utility.
 *
 * CoCart API returns prices as smallest-unit integers (e.g., `4599` for $45.99).
 * This class converts those values into human-readable formatted strings using
 * the currency metadata from the API response.
 *
 * @example
 * ```typescript
 * const fmt = new CurrencyFormatter();
 * const currency = response.getCurrency();
 *
 * fmt.format(4599, currency);        // "$45.99"
 * fmt.formatDecimal(4599, currency); // "45.99"
 * ```
 */
export class CurrencyFormatter {
  /**
   * Format a smallest-unit integer into a locale-aware currency string.
   *
   * @param amount - Price in smallest currency unit (e.g., cents)
   * @param currencyInfo - Currency metadata from the API response
   * @returns Formatted string (e.g., "$45.99", "€12,50")
   */
  format(amount: number, currencyInfo: CurrencyInfo): string {
    const value = amount / Math.pow(10, currencyInfo.currency_minor_unit);

    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyInfo.currency_code,
        minimumFractionDigits: currencyInfo.currency_minor_unit,
        maximumFractionDigits: currencyInfo.currency_minor_unit,
      }).format(value);
    } catch {
      // Fallback if Intl doesn't recognize the currency code
      return `${currencyInfo.currency_prefix}${value.toFixed(currencyInfo.currency_minor_unit)}${currencyInfo.currency_suffix}`;
    }
  }

  /**
   * Format a smallest-unit integer into a plain decimal string (no currency symbol).
   *
   * @param amount - Price in smallest currency unit (e.g., cents)
   * @param currencyInfo - Currency metadata from the API response
   * @returns Decimal string (e.g., "45.99")
   */
  formatDecimal(amount: number, currencyInfo: CurrencyInfo): string {
    const value = amount / Math.pow(10, currencyInfo.currency_minor_unit);
    return value.toFixed(currencyInfo.currency_minor_unit);
  }
}
