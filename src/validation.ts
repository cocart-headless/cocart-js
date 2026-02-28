import { ValidationError } from './exceptions/validation-error.js';

/**
 * Validate that a product ID is a positive integer.
 * Throws ValidationError before a network request is made if invalid.
 */
export function validateProductId(id: string | number): void {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (!Number.isFinite(numId) || numId < 1 || Math.floor(numId) !== numId) {
    throw new ValidationError(
      'Product ID must be a positive integer',
      0,
      'cocart_invalid_product_id',
    );
  }
}

/**
 * Validate that a quantity is a positive number.
 * Throws ValidationError before a network request is made if invalid.
 */
export function validateQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new ValidationError(
      'Quantity must be a positive number',
      0,
      'cocart_invalid_quantity',
    );
  }
}

/**
 * Validate that an email address has a valid basic format.
 * This is a lightweight check — full validation should be done server-side.
 */
export function validateEmail(email: string): void {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError(
      'A valid email address is required',
      0,
      'cocart_invalid_email',
    );
  }
}
