/**
 * Taya NA Predict — Prediction Platform API Client
 * Extends PhoenixApiClient with prediction-specific methods
 */

import type {
  Category,
  PredictionEvent,
  PredictionMarket,
  PredictionOrder,
  Position,
  Trade,
  OrderPreview,
  PortfolioSummary,
  SettledPayout,
  DiscoveryResponse,
  PlaceOrderRequest,
  PlaceOrderResponse,
  PaginatedResponse,
} from "./prediction-types";

export class PredictionApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...this.getCSRFHeaders(),
        ...(options?.headers || {}),
      },
      ...options,
    });

    if (!res.ok) {
      const errorBody = await res
        .json()
        .catch(() => ({ error: res.statusText }));
      throw new Error(
        errorBody.error?.message ||
          errorBody.message ||
          `API error: ${res.status}`,
      );
    }

    return res.json();
  }

  private getCSRFHeaders(): Record<string, string> {
    if (typeof document === "undefined") return {};
    const match = document.cookie.match(/csrf_token=([^;]+)/);
    return match ? { "X-CSRF-Token": match[1] } : {};
  }

  // --- Discovery ---

  async getDiscovery(): Promise<DiscoveryResponse> {
    return this.request("/api/v1/discovery");
  }

  // --- Categories ---

  async getCategories(): Promise<Category[]> {
    return this.request("/api/v1/categories");
  }

  async getCategory(slug: string): Promise<Category> {
    return this.request(`/api/v1/categories/${slug}`);
  }

  // --- Events ---

  async getEvents(params?: {
    categoryId?: string;
    status?: string;
    featured?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<PredictionEvent>> {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set("categoryId", params.categoryId);
    if (params?.status) query.set("status", params.status);
    if (params?.featured) query.set("featured", "true");
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return this.request(`/api/v1/events${qs ? "?" + qs : ""}`);
  }

  async getEvent(id: string): Promise<PredictionEvent> {
    return this.request(`/api/v1/events/${id}`);
  }

  // --- Markets ---

  async getMarkets(params?: {
    eventId?: string;
    categoryId?: string;
    status?: string;
    ticker?: string;
    closeBefore?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<PredictionMarket>> {
    const query = new URLSearchParams();
    if (params?.eventId) query.set("eventId", params.eventId);
    if (params?.categoryId) query.set("categoryId", params.categoryId);
    if (params?.status) query.set("status", params.status);
    if (params?.ticker) query.set("ticker", params.ticker);
    if (params?.closeBefore) query.set("closeBefore", params.closeBefore);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return this.request(`/api/v1/markets${qs ? "?" + qs : ""}`);
  }

  async getMarket(tickerOrId: string): Promise<PredictionMarket> {
    return this.request(`/api/v1/markets/${tickerOrId}`);
  }

  async getMarketTrades(marketId: string, limit = 50): Promise<Trade[]> {
    return this.request(`/api/v1/markets/${marketId}/trades?limit=${limit}`);
  }

  // --- Trading ---

  async previewOrder(req: PlaceOrderRequest): Promise<OrderPreview> {
    return this.request("/api/v1/orders/preview", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async placeOrder(req: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    return this.request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request(`/api/v1/orders/${orderId}/cancel`, {
      method: "POST",
    });
  }

  async getOrders(params?: {
    marketId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<PredictionOrder>> {
    const query = new URLSearchParams();
    if (params?.marketId) query.set("marketId", params.marketId);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return this.request(`/api/v1/orders${qs ? "?" + qs : ""}`);
  }

  // --- Portfolio ---

  async getPositions(): Promise<Position[]> {
    return this.request("/api/v1/portfolio");
  }

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    return this.request("/api/v1/portfolio/summary");
  }

  async getSettledPositions(
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResponse<SettledPayout>> {
    return this.request(
      `/api/v1/portfolio/history?page=${page}&pageSize=${pageSize}`,
    );
  }
}

/**
 * Create a PredictionApiClient with the default API URL.
 *
 * Resolution order:
 *   1. explicit `baseUrl` argument
 *   2. Next.js runtime config (publicRuntimeConfig.apiUrl injected at build
 *      time and surfaced via window.__NEXT_DATA__)
 *   3. NEXT_PUBLIC_API_URL (build-time env var, inlined by webpack)
 *   4. localhost fallback for dev
 */
interface NextDataRuntimeConfig {
  __NEXT_DATA__?: {
    runtimeConfig?: {
      apiUrl?: string;
    };
  };
}

export function createPredictionClient(baseUrl?: string): PredictionApiClient {
  let runtimeUrl: string | undefined;
  if (typeof window !== "undefined") {
    const w = window as unknown as NextDataRuntimeConfig;
    runtimeUrl = w.__NEXT_DATA__?.runtimeConfig?.apiUrl;
  }
  const url =
    baseUrl ||
    runtimeUrl ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:18080";
  return new PredictionApiClient(url);
}
