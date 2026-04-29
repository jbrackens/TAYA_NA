/**
 * Taya NA Predict — Prediction Platform API Types
 */

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  sortOrder: number;
  active: boolean;
}

export interface Series {
  id: string;
  slug: string;
  title: string;
  description?: string;
  categoryId: string;
  frequency?: string;
  tags: string[];
  active: boolean;
}

export interface PredictionEvent {
  id: string;
  seriesId?: string;
  title: string;
  description?: string;
  categoryId: string;
  status: EventStatus;
  featured: boolean;
  openAt?: string;
  closeAt: string;
  settleAt?: string;
  settledAt?: string;
  metadata?: Record<string, unknown>;
  markets?: PredictionMarket[];
}

export type EventStatus =
  | "draft"
  | "open"
  | "trading_halt"
  | "closed"
  | "settling"
  | "settled"
  | "voided";

export interface PredictionMarket {
  id: string;
  eventId: string;
  ticker: string;
  title: string;
  description?: string;
  status: MarketStatus;
  result?: "yes" | "no";
  yesPriceCents: number;
  noPriceCents: number;
  lastTradePriceCents?: number;
  volumeCents: number;
  openInterestCents: number;
  liquidityCents: number;
  settlementSourceKey: string;
  settlementRule: string;
  feeRateBps: number;
  closeAt: string;
  createdAt: string;
  imagePath?: string;
}

export type MarketStatus =
  | "unopened"
  | "open"
  | "halted"
  | "closed"
  | "settled"
  | "voided";

export type OrderSide = "yes" | "no";
export type OrderAction = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus =
  | "pending"
  | "open"
  | "partial"
  | "filled"
  | "cancelled"
  | "expired";

export interface PredictionOrder {
  id: string;
  userId: string;
  marketId: string;
  side: OrderSide;
  action: OrderAction;
  orderType: OrderType;
  priceCents?: number;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  totalCostCents: number;
  status: OrderStatus;
  filledAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface Position {
  id: string;
  userId: string;
  marketId: string;
  side: OrderSide;
  quantity: number;
  avgPriceCents: number;
  totalCostCents: number;
  realizedPnlCents: number;
}

export interface Trade {
  id: string;
  marketId: string;
  buyerId: string;
  side: OrderSide;
  priceCents: number;
  quantity: number;
  feeCents: number;
  isAmmTrade: boolean;
  tradedAt: string;
}

export interface OrderPreview {
  side: OrderSide;
  action: OrderAction;
  quantity: number;
  priceCents: number;
  totalCostCents: number;
  feeCents: number;
  maxProfitCents: number;
  maxLossCents: number;
  newYesPriceCents: number;
  newNoPriceCents: number;
}

export interface PortfolioSummary {
  totalValueCents: number;
  unrealizedPnlCents: number;
  realizedPnlCents: number;
  openPositions: number;
  totalPredictions: number;
  correctPredictions: number;
  accuracyPct: number;
}

export interface SettledPayout {
  id: string;
  marketId: string;
  side: OrderSide;
  quantity: number;
  entryPriceCents: number;
  exitPriceCents: number;
  pnlCents: number;
  payoutCents: number;
  paidAt: string;
}

export interface DiscoveryResponse {
  featured: PredictionMarket[];
  trending: PredictionMarket[];
  closingSoon: PredictionMarket[];
  recent: PredictionMarket[];
}

export interface PlaceOrderRequest {
  marketId: string;
  side: OrderSide;
  action: OrderAction;
  orderType: OrderType;
  priceCents?: number;
  quantity: number;
  idempotencyKey?: string;
}

export interface PlaceOrderResponse {
  order: PredictionOrder;
  trade?: Trade;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PageMeta;
}

// --- Admin ---

export interface CreateMarketRequest {
  eventId: string;
  ticker: string;
  title: string;
  description?: string;
  settlementSourceKey: string;
  settlementRule: string;
  settlementParams?: Record<string, unknown>;
  fallbackSourceKey?: string;
  closeAt: string;
  settlementCutoffAt?: string;
  feeRateBps?: number;
  ammLiquidityParam?: number;
  ammSubsidyCents?: number;
}

export type MarketLifecycleAction = "open" | "halt" | "close" | "void";

export type MarketResult = "yes" | "no";

export interface SettleMarketRequest {
  result: MarketResult;
  attestationSource: string;
  attestationId?: string;
  attestationData?: Record<string, unknown>;
  reason?: string;
}

export interface SettlementRecord {
  id: string;
  marketId: string;
  result: MarketResult;
  attestationSource: string;
  attestationId?: string;
  attestationData?: Record<string, unknown>;
  settledBy?: string;
  settledAt: string;
}

export interface SettlementPayout {
  id: string;
  settlementId: string;
  positionId: string;
  userId: string;
  payoutCents: number;
}

export interface SettleMarketResponse {
  settlement: SettlementRecord;
  payouts: SettlementPayout[];
}

// --- Admin: Dashboard ---

export interface DashboardMover {
  marketId: string;
  ticker: string;
  title: string;
  yesPriceCentsStart: number;
  yesPriceCentsNow: number;
  volumeCents: number;
}

export interface DashboardVolumeStats {
  since: string;
  windowSeconds: number;
  totalVolumeCents: number;
  tradeCount: number;
  topMovers: DashboardMover[];
}
