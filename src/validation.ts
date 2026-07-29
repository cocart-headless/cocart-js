import { ValidationError } from './exceptions/validation-error.js';
import { t } from './i18n/i18n.js';

const NUMERIC_STRING = /^\s*-?\d+(\.\d+)?\s*$/;

/**
 * Validate a product ID, mirroring the server's own resolution rules.
 *
 * A numeric value (number, or a string containing only a number) must be a
 * positive integer. A non-numeric string is treated as a potential SKU and
 * passed through untouched — the server (`CoCart_Utilities_Cart_Helpers::validate_product_id()`
 * on CoCart Starter, and the identical method on the CoCart Community plugin)
 * resolves non-numeric IDs via `wc_get_product_id_by_sku()` before falling
 * back to a 404. The SDK can't verify a SKU exists without a network
 * request, so it only rejects input that's certain to be invalid — empty,
 * or a numeric value that isn't a positive integer — client-side.
 *
 * Note: this only applies where the server does its own SKU resolution —
 * `Cart.addItem()`/`Cart.addVariation()`/`Cart.addItems()`'s parent
 * `groupedProductId`, and `Products.find()`. The child product IDs passed to
 * `Cart.addItems()` are resolved via `wc_get_product()` directly and do
 * *not* support SKU lookups.
 *
 * Throws ValidationError before a network request is made if invalid.
 */
export function validateProductId(id: string | number, locale?: string): void {
  if (typeof id === 'string' && id.trim() !== '' && !NUMERIC_STRING.test(id)) {
    return; // Non-numeric string — treat as a SKU; the server resolves it.
  }

  const numId = typeof id === 'string' ? parseFloat(id) : id;
  if (!Number.isFinite(numId) || numId < 1 || Math.floor(numId) !== numId) {
    throw new ValidationError(
      t('validation.invalidProductId', undefined, locale),
      0,
      'cocart_invalid_product_id',
    );
  }
}

/**
 * Validate that a quantity is a positive number.
 * Throws ValidationError before a network request is made if invalid.
 */
export function validateQuantity(quantity: number, locale?: string): void {
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new ValidationError(
      t('validation.invalidQuantity', undefined, locale),
      0,
      'cocart_invalid_quantity',
    );
  }
}

/**
 * Validate that an email address has a valid basic format.
 * This is a lightweight check — full validation should be done server-side.
 */
export function validateEmail(email: string, locale?: string): void {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError(
      t('validation.invalidEmail', undefined, locale),
      0,
      'cocart_invalid_email',
    );
  }
}
