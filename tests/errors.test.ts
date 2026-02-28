import { describe, it, expect } from 'vitest';
import { CoCartError } from '../src/exceptions/cocart-error.js';
import { AuthenticationError } from '../src/exceptions/authentication-error.js';
import { ValidationError } from '../src/exceptions/validation-error.js';

describe('Error hierarchy', () => {
  describe('CoCartError', () => {
    it('stores message, httpCode, errorCode, responseData', () => {
      const err = new CoCartError('Something failed', 500, 'server_error', { detail: 'info' });
      expect(err.message).toBe('Something failed');
      expect(err.httpCode).toBe(500);
      expect(err.errorCode).toBe('server_error');
      expect(err.responseData).toEqual({ detail: 'info' });
      expect(err.name).toBe('CoCartError');
    });

    it('has sensible defaults', () => {
      const err = new CoCartError('Fail');
      expect(err.httpCode).toBe(0);
      expect(err.errorCode).toBeNull();
      expect(err.responseData).toEqual({});
    });

    it('is an instance of Error', () => {
      const err = new CoCartError('Fail');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(CoCartError);
    });
  });

  describe('AuthenticationError', () => {
    it('extends CoCartError', () => {
      const err = new AuthenticationError('Unauthorized', 401, 'auth_failed');
      expect(err).toBeInstanceOf(CoCartError);
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.name).toBe('AuthenticationError');
      expect(err.httpCode).toBe(401);
    });

    it('defaults to 401', () => {
      const err = new AuthenticationError('Bad');
      expect(err.httpCode).toBe(401);
    });
  });

  describe('ValidationError', () => {
    it('extends CoCartError', () => {
      const err = new ValidationError('Invalid input', 400, 'invalid_param');
      expect(err).toBeInstanceOf(CoCartError);
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.name).toBe('ValidationError');
      expect(err.httpCode).toBe(400);
    });

    it('defaults to 400', () => {
      const err = new ValidationError('Bad');
      expect(err.httpCode).toBe(400);
    });
  });

  describe('instanceof checks', () => {
    it('can distinguish error types in catch blocks', () => {
      const authErr = new AuthenticationError('auth');
      const valErr = new ValidationError('val');
      const baseErr = new CoCartError('base');

      // AuthenticationError is not a ValidationError
      expect(authErr).not.toBeInstanceOf(ValidationError);
      // ValidationError is not an AuthenticationError
      expect(valErr).not.toBeInstanceOf(AuthenticationError);
      // Both are CoCartError
      expect(authErr).toBeInstanceOf(CoCartError);
      expect(valErr).toBeInstanceOf(CoCartError);
      // Base is neither subclass
      expect(baseErr).not.toBeInstanceOf(AuthenticationError);
      expect(baseErr).not.toBeInstanceOf(ValidationError);
    });
  });
});
