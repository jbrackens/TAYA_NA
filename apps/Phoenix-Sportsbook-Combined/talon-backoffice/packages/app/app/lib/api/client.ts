const API_BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080"
    : "";

function readAuthCookie(name: string) {
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
  if (typeof document === 'undefined') return;
  if (token) {
    document.cookie = `authToken=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
    return;
  }
  document.cookie = 'authToken=; path=/; Max-Age=0; SameSite=Lax';
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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token =
        localStorage.getItem('phoenix_access_token') || readAuthCookie('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const normalizedPath = this.normalizePath(path);
    const url = this.baseUrl
      ? new URL(`${this.baseUrl}${normalizedPath}`)
      : new URL(normalizedPath, window.location.origin);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { headers: this.getHeaders() });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  async post<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    const normalizedPath = this.normalizePath(path);
    const url = this.baseUrl ? `${this.baseUrl}${normalizedPath}` : normalizedPath;
    const res = await fetch(url, {
      method: 'POST', headers: this.getHeaders(), body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  async put<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    const normalizedPath = this.normalizePath(path);
    const url = this.baseUrl ? `${this.baseUrl}${normalizedPath}` : normalizedPath;
    const res = await fetch(url, {
      method: 'PUT', headers: this.getHeaders(), body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  async delete<T>(path: string): Promise<T> {
    const normalizedPath = this.normalizePath(path);
    const url = this.baseUrl ? `${this.baseUrl}${normalizedPath}` : normalizedPath;
    const res = await fetch(url, {
      method: 'DELETE', headers: this.getHeaders()
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  // Token management
  setToken(accessToken: string, refreshToken?: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('phoenix_access_token', accessToken);
      if (refreshToken) localStorage.setItem('phoenix_refresh_token', refreshToken);
      syncAuthCookie(accessToken);
    }
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('phoenix_access_token') || readAuthCookie('authToken');
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('phoenix_refresh_token');
  }

  clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('phoenix_access_token');
      localStorage.removeItem('phoenix_refresh_token');
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
      if (
        parsed &&
        typeof parsed === 'object' &&
        'error' in parsed
      ) {
        const errObj = (parsed as Record<string, unknown>).error;
        if (errObj && typeof errObj === 'object' && 'message' in errObj) {
          readable = String((errObj as Record<string, unknown>).message);
        }
      } else if (parsed && typeof parsed === 'object' && 'message' in parsed) {
        readable = String((parsed as Record<string, unknown>).message);
      }
    } catch {
      // body is not JSON, use as-is
    }
    super(readable);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient();
export default apiClient;
