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
        if (!apiClient.isAuthenticated()) {
          return;
        }

        try {
          const session = await getSession();
          if (!mounted || !session.authenticated) return;
          const restoredUser = { id: session.userId, username: session.username };
          setUser(restoredUser);
          setSessionStartTime(new Date());
          persistStoredUser(restoredUser);
        } catch (sessionErr) {
          const currentRefreshToken = apiClient.getRefreshToken();
          if (!currentRefreshToken) {
            throw sessionErr;
          }

          const refreshed = await authRefresh(currentRefreshToken);
          apiClient.setToken(refreshed.accessToken, refreshed.refreshToken);
          const session = await getSession(refreshed.accessToken);
          if (!mounted || !session.authenticated) return;
          const restoredUser = { id: session.userId, username: session.username };
          setUser(restoredUser);
          setSessionStartTime(new Date());
          persistStoredUser(restoredUser);
        }
      } catch (err) {
        logger.error("Auth", "Session check failed", err);
        apiClient.clearTokens();
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
        const response = await authLogin({ username, password });

        // Store tokens via the base client
        apiClient.setToken(response.accessToken, response.refreshToken);

        const session = await getSession(response.accessToken);
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
            apiClient.clearTokens();
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
        const loginError = err instanceof Error ? err : new Error(String(err));
        setError(loginError);
        throw loginError;
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  const logout = useCallback(() => {
    apiClient.clearTokens();
    clearStoredUser();
    setUser(null);
    setError(null);
    setSessionStartTime(null);
    toast.info("Signed out", "You have been logged out.");
  }, [toast]);

  const refreshTokenFn = useCallback(async () => {
    setError(null);
    try {
      const currentRefreshToken = apiClient.getRefreshToken();
      if (!currentRefreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await authRefresh(currentRefreshToken);
      apiClient.setToken(response.accessToken, response.refreshToken);
      const session = await getSession(response.accessToken);
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
