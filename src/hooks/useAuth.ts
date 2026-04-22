/**
 * useAuth — React hook that exposes authentication state.
 *
 * Lifecycle:
 *   1. On mount: read stored account from localStorage → optimistic UI
 *   2. Immediately verify with /me (ensures token still valid server-side)
 *   3. If /me fails: clear storage, expose account=null
 *
 * Exposed API:
 *   account   — LoginResponse | null
 *   loading   — true during initial hydration
 *   error     — string | null (user-facing)
 *   login(body)      — wraps institutionalApi.login, updates state
 *   register(body)   — wraps institutionalApi.register, updates state
 *   logout()         — clears state + localStorage
 *   refresh()        — re-hits /me and updates expires_at
 */

import { useCallback, useEffect, useState } from "react";
import {
  clearStoredAuth,
  getStoredAccount,
  getStoredToken,
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  register as apiRegister,
} from "../api/institutionalApi";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from "../types/institutional";
import { InstitutionalApiError } from "../types/institutional";

export interface UseAuthResult {
  account: LoginResponse | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isPersonal: boolean;
  isInstitutional: boolean;
  hasRole: (role: string) => boolean;
  login: (body: LoginRequest) => Promise<LoginResponse>;
  register: (body: RegisterRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthResult {
  const [account, setAccount] = useState<LoginResponse | null>(
    () => getStoredAccount(),
  );
  const [loading, setLoading] = useState<boolean>(() => !!getStoredToken());
  const [error, setError] = useState<string | null>(null);

  // Verify token on mount (only if we have one)
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    apiMe()
      .then(() => {
        if (cancelled) return;
        // Token is valid — keep stored account as-is
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // Expired or revoked — purge
        clearStoredAuth();
        setAccount(null);
        if (e instanceof InstitutionalApiError && e.status === 401) {
          // Silent: user simply has an expired session
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (body: LoginRequest) => {
    setError(null);
    try {
      const data = await apiLogin(body);
      setAccount(data);
      return data;
    } catch (e: unknown) {
      const msg =
        e instanceof InstitutionalApiError
          ? e.message
          : "حدث خطأ أثناء تسجيل الدخول.";
      setError(msg);
      throw e;
    }
  }, []);

  const register = useCallback(async (body: RegisterRequest) => {
    setError(null);
    try {
      const data = await apiRegister(body);
      setAccount(data);
      return data;
    } catch (e: unknown) {
      const msg =
        e instanceof InstitutionalApiError
          ? e.message
          : "حدث خطأ أثناء إنشاء الحساب.";
      setError(msg);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    await apiLogout();
    setAccount(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      await apiMe();
    } catch {
      clearStoredAuth();
      setAccount(null);
    }
  }, []);

  const hasRole = useCallback(
    (role: string) => (account?.roles || []).includes(role as never),
    [account],
  );

  return {
    account,
    loading,
    error,
    isAuthenticated: account !== null,
    isPersonal: account?.account_type === "personal",
    isInstitutional: account?.account_type === "institutional",
    hasRole,
    login,
    register,
    logout,
    refresh,
    clearError,
  };
}
