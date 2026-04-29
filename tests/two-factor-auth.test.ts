import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoCart } from '../src/cocart.js';
import { JwtManager } from '../src/jwt-manager.js';
import { CoCartError } from '../src/exceptions/cocart-error.js';
import { AuthenticationError } from '../src/exceptions/authentication-error.js';
import { TwoFactorAuthRequiredError } from '../src/exceptions/two-factor-auth-required-error.js';
import { MemoryStorage } from '../src/storage/memory-storage.js';

function mockFetch(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('TwoFactorAuthRequiredError', () => {
  it('extends AuthenticationError and CoCartError', () => {
    const err = new TwoFactorAuthRequiredError('2FA required', {
      available_providers: ['totp', 'email'],
      default_provider: 'totp',
      email_sent: false,
    });
    expect(err).toBeInstanceOf(TwoFactorAuthRequiredError);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err).toBeInstanceOf(CoCartError);
    expect(err).toBeInstanceOf(Error);
  });

  it('sets name correctly', () => {
    const err = new TwoFactorAuthRequiredError('2FA required');
    expect(err.name).toBe('TwoFactorAuthRequiredError');
  });

  it('always has errorCode cocart_2fa_required', () => {
    const err = new TwoFactorAuthRequiredError('2FA required');
    expect(err.errorCode).toBe('cocart_2fa_required');
    expect(err.httpCode).toBe(401);
  });

  it('populates availableProviders, defaultProvider, emailSent from data', () => {
    const err = new TwoFactorAuthRequiredError('2FA required', {
      available_providers: ['totp', 'email'],
      default_provider: 'totp',
      email_sent: true,
    });
    expect(err.availableProviders).toEqual(['totp', 'email']);
    expect(err.defaultProvider).toBe('totp');
    expect(err.emailSent).toBe(true);
  });

  it('uses safe defaults when data fields are absent', () => {
    const err = new TwoFactorAuthRequiredError('2FA required');
    expect(err.availableProviders).toEqual([]);
    expect(err.defaultProvider).toBeNull();
    expect(err.emailSent).toBe(false);
  });

  it('is not an instance of AuthenticationError when checking base type of other errors', () => {
    const auth = new AuthenticationError('bad creds');
    expect(auth).not.toBeInstanceOf(TwoFactorAuthRequiredError);
  });
});

describe('JwtManager — 2FA flow', () => {
  let originalFetch: typeof globalThis.fetch;
  let client: CoCart;
  let jwt: JwtManager;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    client = new CoCart('https://store.example.com', { storage: new MemoryStorage() });
    jwt = new JwtManager(client, new MemoryStorage());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('login()', () => {
    it('throws TwoFactorAuthRequiredError when server returns cocart_2fa_required', async () => {
      globalThis.fetch = mockFetch(401, {
        code: 'cocart_2fa_required',
        message: '2FA verification required.',
        data: {
          status: 401,
          '2fa_required': true,
          available_providers: ['totp', 'email'],
          default_provider: 'totp',
          email_sent: false,
        },
      });

      await expect(jwt.login('user', 'pass')).rejects.toBeInstanceOf(TwoFactorAuthRequiredError);
    });

    it('TwoFactorAuthRequiredError carries provider metadata', async () => {
      globalThis.fetch = mockFetch(401, {
        code: 'cocart_2fa_required',
        message: '2FA verification required.',
        data: {
          status: 401,
          '2fa_required': true,
          available_providers: ['totp', 'email'],
          default_provider: 'email',
          email_sent: true,
        },
      });

      let caught: TwoFactorAuthRequiredError | null = null;
      try {
        await jwt.login('user', 'pass');
      } catch (e) {
        if (e instanceof TwoFactorAuthRequiredError) caught = e;
      }

      expect(caught).not.toBeNull();
      expect(caught!.availableProviders).toEqual(['totp', 'email']);
      expect(caught!.defaultProvider).toBe('email');
      expect(caught!.emailSent).toBe(true);
    });

    it('throws plain AuthenticationError for non-2FA 401 responses', async () => {
      globalThis.fetch = mockFetch(401, {
        code: 'cocart_authentication_error',
        message: 'Invalid credentials.',
        data: { status: 401 },
      });

      let caught: Error | null = null;
      try {
        await jwt.login('user', 'wrong');
      } catch (e) {
        if (e instanceof Error) caught = e;
      }

      expect(caught).toBeInstanceOf(AuthenticationError);
      expect(caught).not.toBeInstanceOf(TwoFactorAuthRequiredError);
    });
  });

  describe('verifyTwoFactor()', () => {
    it('acquires and stores JWT tokens on success', async () => {
      globalThis.fetch = mockFetch(200, {
        display_name: 'Jane',
        extras: {
          jwt_token: 'header.payload.sig',
          jwt_refresh: 'refresh_token_abc',
        },
      });

      await jwt.verifyTwoFactor('user', 'pass', '123456');

      expect(client.getJwtToken()).toBe('header.payload.sig');
      expect(client.getRefreshToken()).toBe('refresh_token_abc');
    });

    it('throws AuthenticationError with cocart_2fa_invalid_code on wrong code', async () => {
      globalThis.fetch = mockFetch(401, {
        code: 'cocart_2fa_invalid_code',
        message: 'Invalid 2FA code provided.',
        data: { status: 401 },
      });

      let caught: AuthenticationError | null = null;
      try {
        await jwt.verifyTwoFactor('user', 'pass', '000000');
      } catch (e) {
        if (e instanceof AuthenticationError) caught = e;
      }

      expect(caught).not.toBeNull();
      expect(caught!.errorCode).toBe('cocart_2fa_invalid_code');
      expect(caught!.httpCode).toBe(401);
    });

    it('throws AuthenticationError with cocart_2fa_invalid_provider for bad provider', async () => {
      globalThis.fetch = mockFetch(400, {
        code: 'cocart_2fa_invalid_provider',
        message: 'Invalid 2FA provider: fax',
        data: { status: 400 },
      });

      let caught: AuthenticationError | null = null;
      try {
        await jwt.verifyTwoFactor('user', 'pass', '123456', 'fax');
      } catch (e) {
        if (e instanceof AuthenticationError) caught = e;
        else if (e instanceof CoCartError) caught = e as unknown as AuthenticationError;
      }

      expect(caught).not.toBeNull();
      expect(caught!.errorCode).toBe('cocart_2fa_invalid_provider');
    });

    it('includes 2fa_provider in the request body when specified', async () => {
      const fetchSpy = mockFetch(200, {
        display_name: 'Jane',
        extras: { jwt_token: 'tok', jwt_refresh: 'ref' },
      });
      globalThis.fetch = fetchSpy;

      await jwt.verifyTwoFactor('user', 'pass', '654321', 'email');

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(callBody['2fa_code']).toBe('654321');
      expect(callBody['2fa_provider']).toBe('email');
    });

    it('omits 2fa_provider from request body when not specified', async () => {
      const fetchSpy = mockFetch(200, {
        display_name: 'Jane',
        extras: { jwt_token: 'tok', jwt_refresh: 'ref' },
      });
      globalThis.fetch = fetchSpy;

      await jwt.verifyTwoFactor('user', 'pass', '654321');

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(callBody['2fa_code']).toBe('654321');
      expect(callBody['2fa_provider']).toBeUndefined();
    });
  });
});
