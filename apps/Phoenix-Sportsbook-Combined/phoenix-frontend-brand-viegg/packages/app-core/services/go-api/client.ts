import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { GoErrorResponse } from "./types";
import { transformGoError } from "./errors";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const AUTH_ROUTES = ["/auth/login", "/auth/refresh", "/auth/logout"];

function isAuthRoute(url?: string): boolean {
  if (!url) return false;
  return AUTH_ROUTES.some((route) => url.includes(route));
}

/**
 * Resolve the Go gateway base URL.
 *
 * Priority:
 *   1. Next.js publicRuntimeConfig.GO_GATEWAY_ENDPOINT
 *   2. Next.js publicRuntimeConfig.API_GLOBAL_ENDPOINT
 *   3. Empty string (relative URLs — works behind a reverse proxy)
 */
function getGoGatewayUrl(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { publicRuntimeConfig } = require("next/config").default() || {};
    return (
      publicRuntimeConfig?.GO_GATEWAY_ENDPOINT ||
      publicRuntimeConfig?.API_GLOBAL_ENDPOINT ||
      ""
    );
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Token helpers (plain localStorage — no React hooks)
// ---------------------------------------------------------------------------

const TOKEN_KEY = "JdaToken";
const REFRESH_TOKEN_KEY = "RefreshToken";
const TOKEN_EXP_KEY = "JdaTokenExpDate";
const USER_ID_KEY = "UserId";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function saveTokens(
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number,
  userId?: string,
  refreshExpiresIn?: number,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  if (expiresIn) {
    localStorage.setItem(
      TOKEN_EXP_KEY,
      JSON.stringify(Date.now() + expiresIn * 1000),
    );
  }
  if (refreshExpiresIn) {
    localStorage.setItem(
      "RefreshTokenExpDate",
      JSON.stringify(Date.now() + refreshExpiresIn * 1000),
    );
  }
  if (userId) {
    localStorage.setItem(USER_ID_KEY, userId);
  }
}

function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
  localStorage.removeItem("RefreshTokenExpDate");
  localStorage.removeItem(USER_ID_KEY);
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const goApi = axios.create({
  baseURL: typeof window !== "undefined" ? getGoGatewayUrl() : "",
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token
// ---------------------------------------------------------------------------

goApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token && !isAuthRoute(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — 401 → refresh → retry or clear
// ---------------------------------------------------------------------------

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeToRefresh(cb: (token: string) => void): void {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

goApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<GoErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh for 401s on non-auth routes
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthRoute(originalRequest.url)
    ) {
      throw transformGoError(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeToRefresh((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(goApi(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshTokenValue = getRefreshToken();
    if (!refreshTokenValue) {
      isRefreshing = false;
      clearAuth();
      throw transformGoError(error);
    }

    try {
      const { data } = await axios.post(
        `${getGoGatewayUrl()}/auth/refresh`,
        { refresh_token: refreshTokenValue },
        { headers: { "Content-Type": "application/json" } },
      );

      const newToken = (data.access_token || data.token?.token) as string;
      saveTokens(
        newToken,
        data.refresh_token || data.token?.refreshToken,
        data.expires_in ?? data.token?.expiresIn,
        undefined,
        data.refresh_expires_in ?? data.token?.refreshExpiresIn,
      );

      isRefreshing = false;
      onRefreshed(newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return goApi(originalRequest);
    } catch {
      isRefreshing = false;
      refreshSubscribers = [];
      clearAuth();
      throw transformGoError(error);
    }
  },
);

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { goApi, getToken, getRefreshToken, saveTokens, clearAuth };
export default goApi;
