import { describe, it, expect } from 'vitest';
import { CurrencyFormatter } from '../src/currency-formatter.js';
import type { CurrencyInfo } from '../src/cocart.types.js';

const USD: CurrencyInfo = {
  currency_code: 'USD',
  currency_symbol: '$',
  currency_minor_unit: 2,
  currency_decimal_separator: '.',
  currency_thousand_separator: ',',
  currency_prefix: '$',
  currency_suffix: '',
};

const EUR: CurrencyInfo = {
  currency_code: 'EUR',
  currency_symbol: '€',
  currency_minor_unit: 2,
  currency_decimal_separator: ',',
  currency_thousand_separator: '.',
  currency_prefix: '',
  currency_suffix: '€',
};

const JPY: CurrencyInfo = {
  currency_code: 'JPY',
  currency_symbol: '¥',
  currency_minor_unit: 0,
  currency_decimal_separator: '.',
  currency_thousand_separator: ',',
  currency_prefix: '¥',
  currency_suffix: '',
};

describe('CurrencyFormatter', () => {
  const fmt = new CurrencyFormatter();

  describe('format()', () => {
    it('formats USD cents to dollar string', () => {
      const result = fmt.format(4599, USD);
      // Intl.NumberFormat output varies by locale, but should contain 45.99
      expect(result).toContain('45.99');
    });

    it('formats zero amount', () => {
      const result = fmt.format(0, USD);
      expect(result).toContain('0.00');
    });

    it('formats JPY (zero decimal places)', () => {
      const result = fmt.format(1500, JPY);
      // JPY has 0 minor units so 1500 stays 1,500
      expect(result).toContain('1,500');
    });

    it('formats EUR amounts', () => {
      const result = fmt.format(1250, EUR);
      // Should contain 12.50 or 12,50 depending on locale
      expect(result).toMatch(/12[.,]50/);
    });
  });

  describe('formatDecimal()', () => {
    it('formats USD to plain decimal', () => {
      expect(fmt.formatDecimal(4599, USD)).toBe('45.99');
    });

    it('formats zero', () => {
      expect(fmt.formatDecimal(0, USD)).toBe('0.00');
    });

    it('formats JPY (no decimal places)', () => {
      expect(fmt.formatDecimal(1500, JPY)).toBe('1500');
    });

    it('formats EUR to decimal', () => {
      expect(fmt.formatDecimal(1250, EUR)).toBe('12.50');
    });

    it('handles large amounts', () => {
      expect(fmt.formatDecimal(999999, USD)).toBe('9999.99');
    });

    it('handles single cent', () => {
      expect(fmt.formatDecimal(1, USD)).toBe('0.01');
    });
  });
});
