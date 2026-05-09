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
  CreateMarketRequest,
  MarketLifecycleAction,
  SettleMarketRequest,
  SettleMarketResponse,
  DashboardVolumeStats,
  OrderBook,
  DriftAlertsResponse,
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
    // Server caps limit at 200; values above are clamped server-side.
    return this.request(`/api/v1/markets/${marketId}/trades?limit=${limit}`);
  }

  /**
   * Fetch the L2 order book for a market. Only meaningful for markets with
   * `executionMode === "order_book"`; AMM markets return an empty book.
   *
   * `depth` is the number of price levels per side (yes bids, yes asks, no
   * bids, no asks). Server clamps to [1, 100]; default 20 is good for the
   * compact ladder shown in the trade ticket. Use 50–100 for the full book
   * panel on the market detail page.
   */
  async getOrderBook(marketIdOrTicker: string, depth = 20): Promise<OrderBook> {
    return this.request(
      `/api/v1/markets/${marketIdOrTicker}/orderbook?depth=${depth}`,
    );
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

  // --- Admin: Markets ---

  async createMarket(req: CreateMarketRequest): Promise<PredictionMarket> {
    return this.request("/api/v1/admin/markets", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async transitionMarketLifecycle(
    marketId: string,
    action: MarketLifecycleAction,
    reason?: string,
  ): Promise<{ marketId: string; status: string; reason: string }> {
    return this.request(
      `/api/v1/admin/markets/${marketId}/lifecycle/${action}`,
      {
        method: "POST",
        body: JSON.stringify(reason ? { reason } : {}),
      },
    );
  }

  async settleMarket(
    marketId: string,
    req: SettleMarketRequest,
  ): Promise<SettleMarketResponse> {
    return this.request(`/api/v1/admin/settlements/${marketId}`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  // --- Admin: Dashboard ---

  // since: Go duration ("24h", "7d") — gateway capped at 30 days.
  async getDashboardVolume(
    since = "24h",
    topMovers = 5,
  ): Promise<DashboardVolumeStats> {
    return this.request(
      `/api/v1/admin/dashboard/volume?since=${encodeURIComponent(since)}&topN=${topMovers}`,
    );
  }

  /**
   * Recent collateral drift alerts. One row per market with `adjustment`
   * ledger entries since the lookback window (Go duration string, e.g.
   * "24h", "7d"). Empty `data` when nothing tripped. Gateway caps at 30d.
   */
  async getDriftAlerts(since = "24h"): Promise<DriftAlertsResponse> {
    return this.request(
      `/api/v1/admin/prediction/drift-alerts?since=${encodeURIComponent(since)}`,
    );
  }
}

/**
 * Create a PredictionApiClient with a context-appropriate base URL.
 *
 * Resolution:
 *   1. Explicit `baseUrl` argument (highest priority — caller knows best).
 *   2. Browser context: prefer NEXT_DATA runtime config, then
 *      NEXT_PUBLIC_API_URL, then **same-origin (empty string)**. Same-origin
 *      means fetches go through the Next.js rewrite proxy at /api/v1/*,
 *      which avoids CORS entirely and works on whatever port Next is
 *      serving from (3000, 3010, ephemeral preview ports, etc.).
 *   3. SSR / Node context: env var or localhost fallback (no proxy on the
 *      server side, so we need an absolute URL).
 *
 * Why this matters: the previous implementation used `||` which treats
 * empty string as "fall through to the hardcoded localhost." That meant
 * `NEXT_PUBLIC_API_URL=""` (the natural way to opt into same-origin
 * proxy mode) silently became `http://localhost:18080` on the client and
 * broke under CORS as soon as the dev server moved off port 3000.
 */
interface NextDataRuntimeConfig {
  __NEXT_DATA__?: {
    runtimeConfig?: {
      apiUrl?: string;
    };
  };
}

export function createPredictionClient(baseUrl?: string): PredictionApiClient {
  if (baseUrl !== undefined) return new PredictionApiClient(baseUrl);

  if (typeof window !== "undefined") {
    const w = window as unknown as NextDataRuntimeConfig;
    const runtimeUrl = w.__NEXT_DATA__?.runtimeConfig?.apiUrl;
    if (runtimeUrl) return new PredictionApiClient(runtimeUrl);
    // Truthy NEXT_PUBLIC_API_URL wins; empty string or undefined → same-origin.
    if (process.env.NEXT_PUBLIC_API_URL) {
      return new PredictionApiClient(process.env.NEXT_PUBLIC_API_URL);
    }
    return new PredictionApiClient("");
  }

  // SSR: no proxy, need an absolute URL.
  return new PredictionApiClient(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080",
  );
}
