import { useCallback, useEffect, useMemo, useState } from 'react';
import { SessionManager } from '@cocartheadless/sdk';
import { useCoCart } from './useCoCart.js';

export interface AuthUser {
  userId: string;
  displayName: string;
  email: string;
  role: string;
}

export interface UseAuthResult {
  /** The signed-in user's profile, or `null` when signed out. */
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True while the initial session restore or a login/logout call is in flight. */
  isLoading: boolean;
  /** The most recent login error, if any. Cleared on the next `login()` call. */
  error: Error | null;
  /** Acquire JWT tokens and merge the guest cart into the now-authenticated user's cart. */
  login: (username: string, password: string) => Promise<void>;
  /** Clear JWT tokens server- and client-side, and start a fresh guest session. */
  logout: () => Promise<void>;
}

function userFromResponseData(data: Record<string, unknown>): AuthUser {
  return {
    userId: String(data['user_id'] ?? ''),
    displayName: String(data['display_name'] ?? ''),
    email: String(data['email'] ?? ''),
    role: String(data['role'] ?? ''),
  };
}

/**
 * Reactive authentication state bound to the nearest `<CoCartProvider>`'s
 * client.
 *
 * This is a thin binding, not a reimplementation — the actual token
 * lifecycle (acquisition, refresh, guest-cart merge) lives in
 * `SessionManager`/`JwtManager`. `useAuth()` only makes that state
 * observable to React, so a `login()` call in one component (e.g. a modal)
 * is reflected everywhere `useAuth()` is read (e.g. the nav bar) without
 * manual prop plumbing.
 */
export function useAuth(): UseAuthResult {
  const client = useCoCart();
  const sessionManager = useMemo(() => new SessionManager(client, client.getStorage()), [client]);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!client.isAuthenticated()) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const response = await client.post('login', {});
        if (!cancelled) setUser(userFromResponseData(response.toObject() as Record<string, unknown>));
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, [client]);

  const login = useCallback(
    async (username: string, password: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const response = await sessionManager.loginWithJwt(username, password);
        setUser(userFromResponseData(response.toObject() as Record<string, unknown>));
      } catch (e) {
        setUser(null);
        setError(e instanceof Error ? e : new Error(String(e)));
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionManager],
  );

  const logout = useCallback(async () => {
    await sessionManager.logout();
    setUser(null);
  }, [sessionManager]);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    login,
    logout,
  };
}
