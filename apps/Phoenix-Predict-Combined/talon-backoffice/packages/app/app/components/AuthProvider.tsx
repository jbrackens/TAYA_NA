"use client";

import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { apiClient } from "../lib/api/client";
import {
  login as authLogin,
  refresh as authRefresh,
  getSession,
} from "../lib/api/auth-client";
import { getCoolOffStatus } from "../lib/api/compliance-client";
import { IdleActivityMonitor } from "./IdleActivityMonitor";
import { useToast } from "./ToastProvider";
import { logger } from "../lib/logger";

function getCSRFHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("csrf_token="));
  if (!match) return {};
  const token = decodeURIComponent(match.slice("csrf_token=".length));
  return token ? { "X-CSRF-Token": token } : {};
}

export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  error: Error | null;
  sessionStartTime: Date | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: React.ReactNode;
}

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem("phoenix_user_id");
  const username = localStorage.getItem("phoenix_username");
  if (!id || !username) return null;
  return { id, username };
}

function persistStoredUser(user: User) {
  if (typeof window === "undefined") return;
  localStorage.setItem("phoenix_user_id", user.id);
  localStorage.setItem("phoenix_username", user.username);
}

function clearStoredUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("phoenix_user_id");
  localStorage.removeItem("phoenix_username");
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() =>
    apiClient.isAuthenticated() ? readStoredUser() : null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const toast = useToast();

  // Check for existing session on mount
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        // Hint the server has a session even if localStorage was cleared:
        // csrf_token is set alongside access_token on every successful login
        // and is readable from JS (access_token itself is HttpOnly). If either
        // signal is present we check the session; otherwise skip the round-trip
        // so anonymous page loads stay fast.
        const storedUser = readStoredUser();
        const hasCsrfCookie =
          typeof document !== "undefined" &&
          /(^|;\s*)csrf_token=/.test(document.cookie);
        if (!storedUser && !hasCsrfCookie) {
          return;
        }

        try {
          // Session validation uses HttpOnly cookie automatically
          const session = await getSession();
          if (!mounted) return;
          if (!session.authenticated) {
            // Cookie exists but session is invalid (expired, revoked) —
            // clear any stale stored user and drop out of auth state.
            clearStoredUser();
            setUser(null);
            return;
          }
          const restoredUser = {
            id: session.userId,
            username: session.username,
          };
          setUser(restoredUser);
          setSessionStartTime(new Date());
          persistStoredUser(restoredUser);
        } catch (sessionErr) {
          // Issue #4: Distinguish network errors from auth failures
          const isNetworkError = !(
            sessionErr instanceof Error && "status" in sessionErr
          );
          if (isNetworkError && storedUser) {
            // Network issue, keep user logged in with stale data
            logger.warn(
              "Auth",
              "Session check failed, possible network issue",
              sessionErr,
            );
            if (mounted) {
              setUser(storedUser);
              setSessionStartTime(new Date());
            }
            return;
          }

          // Auth failure, try refresh (cookie-based, no token param needed)
          try {
            await authRefresh();
            const session = await getSession();
            if (!mounted || !session.authenticated) return;
            const restoredUser = {
              id: session.userId,
              username: session.username,
            };
            setUser(restoredUser);
            setSessionStartTime(new Date());
            persistStoredUser(restoredUser);
          } catch {
            throw sessionErr;
          }
        }
      } catch (err) {
        logger.error("Auth", "Session check failed", err);
        clearStoredUser();
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        // Login sets HttpOnly cookies server-side, no client token handling needed
        await authLogin({ username, password });

        // Validate session via cookie-authenticated endpoint
        const session = await getSession();
        if (!session.authenticated) {
          throw new Error("Authenticated session could not be restored");
        }

        // Check cool-off status before completing login
        const coolOff = await getCoolOffStatus(session.userId);
        if (coolOff.status === "active" && coolOff.coolOffUntil) {
          const coolOffEnd = new Date(coolOff.coolOffUntil);
          if (coolOffEnd > new Date()) {
            logger.warn("Auth", "Login blocked due to active cool-off period", {
              userId: session.userId,
              coolOffUntil: coolOff.coolOffUntil,
            });
            // Clear server-side cookies via logout endpoint
            await fetch("/api/v1/auth/logout/", {
              method: "POST",
              credentials: "include",
              headers: getCSRFHeaders(),
            }).catch(() => {});
            clearStoredUser();
            throw new Error(
              `Your account is under a cool-off period until ${coolOffEnd.toLocaleDateString()}. Please try again later.`,
            );
          }
        }

        const authenticatedUser = {
          id: session.userId,
          username: session.username,
        };
        persistStoredUser(authenticatedUser);
        setUser(authenticatedUser);
        setSessionStartTime(new Date());
        toast.success("Welcome back!", session.username);
      } catch (err) {
        // Issue #5 fix: clear cookies on any login failure to prevent half-auth
        await fetch("/api/v1/auth/logout/", {
          method: "POST",
          credentials: "include",
          headers: getCSRFHeaders(),
        }).catch(() => {});
        clearStoredUser();
        setUser(null);
        const loginError = err instanceof Error ? err : new Error(String(err));
        setError(loginError);
        throw loginError;
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  const logout = useCallback(async () => {
    // Clear server-side HttpOnly cookies
    await fetch("/api/v1/auth/logout/", {
      method: "POST",
      credentials: "include",
      headers: getCSRFHeaders(),
    }).catch(() => {});
    clearStoredUser();
    setUser(null);
    setError(null);
    setSessionStartTime(null);
    toast.info("Signed out", "You have been logged out.");
  }, [toast]);

  const refreshTokenFn = useCallback(async () => {
    setError(null);
    try {
      // Refresh uses HttpOnly cookie, no client token needed
      await authRefresh();
      const session = await getSession();
      const refreshedUser = { id: session.userId, username: session.username };
      persistStoredUser(refreshedUser);
      setUser(refreshedUser);
    } catch (err) {
      const refreshError = err instanceof Error ? err : new Error(String(err));
      setError(refreshError);
      logout();
      throw refreshError;
    }
  }, [logout]);

  const isAuthenticated = user !== null;

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshToken: refreshTokenFn,
      error,
      sessionStartTime,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshTokenFn,
      error,
      sessionStartTime,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {isAuthenticated && (
        <IdleActivityMonitor
          onLogout={logout}
          onRefreshToken={refreshTokenFn}
          isAuthenticated={isAuthenticated}
          sessionTimeoutSeconds={840}
          warningSeconds={60}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
};
