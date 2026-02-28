import { describe, it, expect } from 'vitest';
import { validateProductId, validateQuantity, validateEmail } from '../src/validation.js';
import { ValidationError } from '../src/exceptions/validation-error.js';

describe('validateProductId', () => {
  it('accepts positive integers', () => {
    expect(() => validateProductId(1)).not.toThrow();
    expect(() => validateProductId(123)).not.toThrow();
    expect(() => validateProductId('42')).not.toThrow();
  });

  it('rejects zero', () => {
    expect(() => validateProductId(0)).toThrow(ValidationError);
  });

  it('rejects negative numbers', () => {
    expect(() => validateProductId(-1)).toThrow(ValidationError);
  });

  it('rejects decimals', () => {
    expect(() => validateProductId(1.5)).toThrow(ValidationError);
  });

  it('rejects NaN', () => {
    expect(() => validateProductId(NaN)).toThrow(ValidationError);
  });

  it('rejects non-numeric strings', () => {
    expect(() => validateProductId('abc')).toThrow(ValidationError);
  });

  it('error has correct error code', () => {
    try {
      validateProductId(-1);
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).errorCode).toBe('cocart_invalid_product_id');
    }
  });
});

describe('validateQuantity', () => {
  it('accepts positive numbers', () => {
    expect(() => validateQuantity(1)).not.toThrow();
    expect(() => validateQuantity(100)).not.toThrow();
  });

  it('rejects zero', () => {
    expect(() => validateQuantity(0)).toThrow(ValidationError);
  });

  it('rejects negative numbers', () => {
    expect(() => validateQuantity(-5)).toThrow(ValidationError);
  });

  it('rejects NaN', () => {
    expect(() => validateQuantity(NaN)).toThrow(ValidationError);
  });

  it('rejects Infinity', () => {
    expect(() => validateQuantity(Infinity)).toThrow(ValidationError);
  });

  it('error has correct error code', () => {
    try {
      validateQuantity(0);
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).errorCode).toBe('cocart_invalid_quantity');
    }
  });
});

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(() => validateEmail('user@example.com')).not.toThrow();
    expect(() => validateEmail('test.name@domain.co.uk')).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => validateEmail('')).toThrow(ValidationError);
  });

  it('rejects missing @', () => {
    expect(() => validateEmail('userexample.com')).toThrow(ValidationError);
  });

  it('rejects missing domain', () => {
    expect(() => validateEmail('user@')).toThrow(ValidationError);
  });

  it('rejects missing TLD', () => {
    expect(() => validateEmail('user@domain')).toThrow(ValidationError);
  });

  it('error has correct error code', () => {
    try {
      validateEmail('bad');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).errorCode).toBe('cocart_invalid_email');
    }
  });
});
