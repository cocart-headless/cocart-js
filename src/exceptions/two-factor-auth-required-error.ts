import { AuthenticationError } from './authentication-error.js';

/**
 * Thrown when the server requires a Two Factor Authentication code to complete login.
 *
 * This is thrown by `JwtManager.login()` when the CoCart 2FA plugin is installed and
 * the user has 2FA enabled. Catch this error to prompt for the verification code, then
 * call `JwtManager.verifyTwoFactor()` to complete the login.
 */
export class TwoFactorAuthRequiredError extends AuthenticationError {
  /** Providers available for verification (e.g. 'totp', 'email', 'backup'). */
  readonly availableProviders: string[];
  /** The default provider the server will use if none is specified. */
  readonly defaultProvider: string | null;
  /** Whether the server has already sent a code via email. */
  readonly emailSent: boolean;

  constructor(
    message: string,
    data: {
      available_providers?: string[];
      default_provider?: string | null;
      email_sent?: boolean;
      [key: string]: unknown;
    } = {},
  ) {
    super(message, 401, 'cocart_2fa_required', data as Record<string, unknown>);
    this.name = 'TwoFactorAuthRequiredError';
    this.availableProviders = data.available_providers ?? [];
    this.defaultProvider = data.default_provider ?? null;
    this.emailSent = data.email_sent ?? false;
  }
}
