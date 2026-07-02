const API_BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080"
    : "";

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) return null;
  return decodeURIComponent(match.slice(prefix.length));
}

function syncAuthCookie(token?: string) {
  if (typeof document === "undefined") return;
  // The login route already sets an HttpOnly+Secure `authToken` cookie and all
  // gateway calls use credentials:"include", so the browser sends it
  // automatically. We deliberately no longer mint a JS-readable mirror cookie
  // (it would be exfiltratable by any XSS). The write path is therefore a
  // no-op; only the clear path runs, to tear down any legacy mirror cookie a
  // returning session may still carry.
  if (token) {
    return;
  }
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  document.cookie =
    "authToken=; path=/; Max-Age=0; SameSite=Lax" + (secure ? "; Secure" : "");
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private normalizePath(path: string): string {
    if (this.baseUrl || !path.startsWith("/")) {
      return path;
    }

    const [pathname, search = ""] = path.split("?");

    // Skip normalization for paths containing encoded IDs with colons
    // (e.g. /api/v1/leaderboards/lb:local:000001) — the trailing slash
    // breaks gateway pattern matching for these resource paths.
    const hasResourceId = /\/[a-z]+:[a-z]+:/.test(pathname);

    const shouldNormalize =
      (pathname.startsWith("/api/") || pathname.startsWith("/admin/")) &&
      !pathname.endsWith("/") &&
      !hasResourceId;

    if (!shouldNormalize) {
      return path;
    }

    return search ? `${pathname}/?${search}` : `${pathname}/`;
  }

  private getHeaders(includeCsrf = false): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("phoenix_access_token") || readCookie("authToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (includeCsrf) {
        const csrf = readCookie("csrf_token");
        if (csrf) headers["X-CSRF-Token"] = csrf;
      }
    }
    return headers;
  }

  // refreshLock dedupes concurrent refresh attempts. Without it, a page that
  // fires 5 parallel API calls and gets back 5 × 401s would attempt 5
  // refreshes, race the refresh-token's idempotency, and likely cascade-fail.
  // A single in-flight promise serves all concurrent retries.
  private refreshLock: Promise<boolean> | null = null;

  // refreshSession attempts one refresh roundtrip. Returns true on success,
  // false on failure (refresh token also expired). Failure is the trigger for
  // the calling page to redirect to /auth/login — AuthProvider listens for
  // the ApiError(401) that follows.
  //
  // Public so AuthProvider.refreshTokenFn (called by IdleActivityMonitor's
  // scheduled timer) shares the same refreshLock as fetchWithRetry's
  // post-401 path. Without the shared lock, the idle timer and an in-flight
  // 401-retry can both fire concurrent /refresh calls — the auth service
  // rotates the refresh-token cookie on every successful refresh, so the
  // second call arrives with the now-stale token and 401s. The IdleMonitor
  // path's failure then bubbles up as "refresh token is invalid or expired"
  // even though the user's session was valid moments ago.
  async refreshSession(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (this.refreshLock) return this.refreshLock;
    this.refreshLock = (async () => {
      try {
        const csrf = readCookie("csrf_token");
        const res = await fetch(`${this.baseUrl || ""}/api/v1/auth/refresh/`, {
          method: "POST",
          credentials: "include",
          headers: csrf
            ? { "Content-Type": "application/json", "X-CSRF-Token": csrf }
            : { "Content-Type": "application/json" },
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        // Always clear the lock so the next 401 can attempt a fresh refresh.
        // Setting to null in a microtask so callers awaiting this promise
        // resolve with the result before lock state changes.
        setTimeout(() => {
          this.refreshLock = null;
        }, 0);
      }
    })();
    return this.refreshLock;
  }

  // fetchWithRetry wraps a fetch call so that a 401 triggers exactly one
  // refresh-then-retry attempt before propagating the error. This closes the
  // silent-failure gap where a stale access token would leave the
  // portfolio/wallet pages showing empty data instead of refreshing the
  // session. QA report 2026-05-11.
  private async fetchWithRetry(
    input: RequestInfo,
    init: RequestInit & { _retried?: boolean },
  ): Promise<Response> {
    const res = await fetch(input, init);
    if (res.status !== 401 || init._retried) return res;
    const refreshed = await this.refreshSession();
    if (!refreshed) return res;
    // Rebuild headers — the Authorization header may have changed if the
    // refresh issued a new access token to localStorage. CSRF cookie may
    // also have rotated.
    const retryInit: RequestInit & { _retried: boolean } = {
      ...init,
      _retried: true,
      headers: this.getHeaders(
        init.method !== "GET" && init.method !== undefined,
      ),
    };
    return fetch(input, retryInit);
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const normalizedPath = this.normalizePath(path);
    const origin =
      this.baseUrl ||
      (typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080");
    const url = new URL(`${origin}${normalizedPath}`);
    if (params)
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await this.fetchWithRetry(url.toString(), {
      method: "GET",
      headers: this.getHeaders(),
      credentials: "include",
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    if (res.status === 204 || res.headers.get("content-length") === "0")
      return undefined as T;
    return res.json();
  }

  async post<T>(
    path: string,
    body?: object,
    headers?: Record<string, string>,
  ): Promise<T> {
    const normalizedPath = this.normalizePath(path);
    const url = this.baseUrl
      ? `${this.baseUrl}${normalizedPath}`
      : normalizedPath;
    const res = await this.fetchWithRetry(url, {
      method: "POST",
      headers: { ...this.getHeaders(true), ...headers },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    if (res.status === 204 || res.headers.get("content-length") === "0")
      return undefined as T;
    return res.json();
  }

  async put<T>(path: string, body?: object): Promise<T> {
    const normalizedPath = this.normalizePath(path);
    const url = this.baseUrl
      ? `${this.baseUrl}${normalizedPath}`
      : normalizedPath;
    const res = await this.fetchWithRetry(url, {
      method: "PUT",
      headers: this.getHeaders(true),
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    if (res.status === 204 || res.headers.get("content-length") === "0")
      return undefined as T;
    return res.json();
  }

  async delete<T>(path: string): Promise<T> {
    const normalizedPath = this.normalizePath(path);
    const url = this.baseUrl
      ? `${this.baseUrl}${normalizedPath}`
      : normalizedPath;
    const res = await this.fetchWithRetry(url, {
      method: "DELETE",
      headers: this.getHeaders(true),
      credentials: "include",
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    if (res.status === 204 || res.headers.get("content-length") === "0")
      return undefined as T;
    return res.json();
  }

  // Token management
  setToken(accessToken: string, refreshToken?: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("phoenix_access_token", accessToken);
      if (refreshToken)
        localStorage.setItem("phoenix_refresh_token", refreshToken);
      syncAuthCookie(accessToken);
    }
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("phoenix_access_token") || readCookie("authToken")
    );
  }

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("phoenix_refresh_token");
  }

  clearTokens() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("phoenix_access_token");
      localStorage.removeItem("phoenix_refresh_token");
      syncAuthCookie();
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, body: string) {
    let readable = body;
    try {
      const parsed: unknown = JSON.parse(body);
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        const errObj = (parsed as Record<string, unknown>).error;
        if (errObj && typeof errObj === "object" && "message" in errObj) {
          readable = String((errObj as Record<string, unknown>).message);
        }
      } else if (parsed && typeof parsed === "object" && "message" in parsed) {
        readable = String((parsed as Record<string, unknown>).message);
      }
    } catch {
      // body is not JSON, use as-is
    }
    super(readable);
    this.status = status;
    this.name = "ApiError";
  }
}

export const apiClient = new ApiClient();
export default apiClient;
