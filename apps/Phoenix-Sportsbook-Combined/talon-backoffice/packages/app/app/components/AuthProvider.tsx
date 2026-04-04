"use client";

import React, { createContext, useState, useCallback, useEffect } from "react";
import { apiClient } from "../lib/api/client";
import {
  login as authLogin,
  refresh as authRefresh,
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const toast = useToast();

  // Check for existing session on mount
  useEffect(() => {
    try {
      if (apiClient.isAuthenticated()) {
        // We have a token — restore user from localStorage
        const userId =
          typeof window !== "undefined"
            ? localStorage.getItem("phoenix_user_id")
            : null;
        const username =
          typeof window !== "undefined"
            ? localStorage.getItem("phoenix_username")
            : null;
        if (userId && username) {
          setUser({ id: userId, username });
          setSessionStartTime(new Date());
        }
      }
    } catch (err) {
      logger.error("Auth", "Session check failed", err);
      apiClient.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authLogin({ username, password });

        // Store tokens via the base client
        apiClient.setToken(response.accessToken, response.refreshToken);

        // Persist user info for session restore
        if (typeof window !== "undefined") {
          localStorage.setItem("phoenix_user_id", response.userId);
          localStorage.setItem("phoenix_username", response.username);
        }

        // Check cool-off status before completing login
        const coolOff = await getCoolOffStatus(response.userId);
        if (coolOff.status === "active" && coolOff.coolOffUntil) {
          const coolOffEnd = new Date(coolOff.coolOffUntil);
          if (coolOffEnd > new Date()) {
            logger.warn("Auth", "Login blocked due to active cool-off period", {
              userId: response.userId,
              coolOffUntil: coolOff.coolOffUntil,
            });
            apiClient.clearTokens();
            if (typeof window !== "undefined") {
              localStorage.removeItem("phoenix_user_id");
              localStorage.removeItem("phoenix_username");
            }
            throw new Error(
              `Your account is under a cool-off period until ${coolOffEnd.toLocaleDateString()}. Please try again later.`,
            );
          }
        }

        setUser({
          id: response.userId,
          username: response.username,
        });
        setSessionStartTime(new Date());
        toast.success("Welcome back!", response.username);
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("phoenix_user_id");
      localStorage.removeItem("phoenix_username");
    }
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
    } catch (err) {
      const refreshError = err instanceof Error ? err : new Error(String(err));
      setError(refreshError);
      logout();
      throw refreshError;
    }
  }, [logout]);

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
    refreshToken: refreshTokenFn,
    error,
    sessionStartTime,
  };

  return (
    <AuthContext.Provider value={value}>
      <IdleActivityMonitor
        onLogout={logout}
        onRefreshToken={refreshTokenFn}
        isAuthenticated={user !== null}
        sessionTimeoutSeconds={840}
        warningSeconds={60}
      />
      {children}
    </AuthContext.Provider>
  );
};
