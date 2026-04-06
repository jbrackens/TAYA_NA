const API_BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080"
    : "";

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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('phoenix_access_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.baseUrl
      ? new URL(`${this.baseUrl}${path}`)
      : new URL(path, window.location.origin);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { headers: this.getHeaders() });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  async post<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    const url = this.baseUrl ? `${this.baseUrl}${path}` : path;
    const res = await fetch(url, {
      method: 'POST', headers: this.getHeaders(), body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  async put<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    const url = this.baseUrl ? `${this.baseUrl}${path}` : path;
    const res = await fetch(url, {
      method: 'PUT', headers: this.getHeaders(), body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  async delete<T>(path: string): Promise<T> {
    const url = this.baseUrl ? `${this.baseUrl}${path}` : path;
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
    return localStorage.getItem('phoenix_access_token');
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
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient();
export default apiClient;
