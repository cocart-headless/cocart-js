import type { StorageInterface } from './storage.interface.js';

export interface CookieStorageOptions {
  /** Prefix added to every cookie name. Default: none, so the cart key cookie is named after `storageKey` (`cocart_cart_key`). */
  prefix?: string;
  /** Cookie path. Default: `/`. */
  path?: string;
  /** Lifetime in seconds. Default: 30 days. */
  maxAge?: number;
  /** Default: `Lax`. */
  sameSite?: 'Lax' | 'Strict' | 'None';
  /** Default: `true` unless the page is served from `http://localhost`. */
  secure?: boolean;
  /** Cookie domain, e.g. `.example.com` to share across subdomains. Default: the current host. */
  domain?: string;
}

/**
 * Browser cookie storage, for server-rendered frontends.
 *
 * Keeps values (above all the cart key) in first-party cookies, so the
 * browser sends them on every page request and a server render can read
 * the same cart — see `createServerClient()` in the framework adapters,
 * which reads the cart key cookie from the request. LocalStorage can't do
 * this: it never leaves the browser.
 *
 * Cookies are readable by page scripts. Anything else the client stores
 * goes here too, including JWT tokens when authenticating; if you log
 * customers in, keep tokens server-side instead.
 */
export class CookieStorage implements StorageInterface {
  private readonly prefix: string;
  private readonly attributes: string;

  constructor(options: CookieStorageOptions = {}) {
    this.prefix = options.prefix ?? '';
    const isLocalhost = typeof location !== 'undefined' && location.hostname === 'localhost';
    const secure = options.secure ?? !isLocalhost;
    this.attributes = [
      `Path=${options.path ?? '/'}`,
      `Max-Age=${options.maxAge ?? 60 * 60 * 24 * 30}`,
      `SameSite=${options.sameSite ?? 'Lax'}`,
      options.domain ? `Domain=${options.domain}` : '',
      secure ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');
  }

  get(key: string): string | null {
    if (typeof document === 'undefined') return null;
    return readCookie(document.cookie, this.prefix + key);
  }

  set(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${encodeURIComponent(this.prefix + key)}=${encodeURIComponent(value)}; ${this.attributes}`;
  }

  delete(key: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${encodeURIComponent(this.prefix + key)}=; ${this.attributes.replace(/Max-Age=\d+/, 'Max-Age=0')}`;
  }
}

/** Reads one cookie from a `Cookie` header / `document.cookie` string. */
export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const wanted = encodeURIComponent(name);
  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === wanted) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return rest.join('=');
      }
    }
  }
  return null;
}
