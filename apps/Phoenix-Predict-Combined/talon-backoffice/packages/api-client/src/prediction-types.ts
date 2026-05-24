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
  settlementParams?: Record<string, unknown>;
  feeRateBps: number;
  closeAt: string;
  createdAt: string;
  imagePath?: string;

  // Exchange engine fields (migration 019). Markets created before
  // 019 default executionMode='amm'; new markets default 'order_book'.
  // Trade ticket UI must branch on this — order book markets support
  // limit/market/sell/IOC/FOK; AMM markets remain buy-only.
  executionMode?: ExecutionMode;
  collateralPoolCents?: number;
  settledPayoutPoolCents?: number;
  bestYesBidCents?: number;
  bestYesAskCents?: number;
  bestNoBidCents?: number;
  bestNoAskCents?: number;
  lastQuoteAt?: string;
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
  | "expired"
  | "rejected";

export type TimeInForce = "gtc" | "ioc" | "fok";

export type SelfMatchAction = "cancel_taker" | "cancel_maker" | "cancel_both";

export type ExecutionMode = "order_book" | "amm";

export type TradeKind = "secondary" | "issuance";

export type EngineKind = "order_book" | "amm";

/**
 * Failure reason values populated on `PredictionOrder.failureReason` when
 * an order is rejected or cancelled by the exchange engine. Mirrors the
 * Go-side `Failure*` constants in internal/prediction/types.go.
 */
export type OrderFailureReason =
  | "price_band_violation"
  | "post_only_would_take"
  | "self_match_rejected"
  | "closed_market"
  | "insufficient_balance"
  | "insufficient_position"
  | "notional_cap_missing"
  | "notional_cap_exceeded"
  | "fok_unavailable";

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

  // Exchange engine fields (present on order_book markets; ignored on AMM).
  timeInForce?: TimeInForce;
  reservedCashCents?: number;
  capturedCashCents?: number;
  releasedCashCents?: number;
  reservedQuantity?: number;
  averageFillPriceCents?: number;
  filledCostCents?: number;
  failureReason?: OrderFailureReason;
  postOnly?: boolean;
  clientOrderId?: string;
  selfMatchAction?: SelfMatchAction;
  notionalCapCents?: number;
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
  reservedQuantity?: number;
}

export interface Trade {
  id: string;
  marketId: string;
  buyerId: string;
  sellerId?: string;
  buyOrderId?: string;
  sellOrderId?: string;
  side: OrderSide;
  priceCents: number;
  quantity: number;
  feeCents: number;
  isAmmTrade: boolean;
  tradedAt: string;

  // Exchange engine fields. matchId links the two trade rows produced by a
  // complementary issuance fill (yes + no, prices summing to 100); equals
  // trade id for secondary transfers. UI groups the trade tape by matchId
  // for issuance and renders one row per match.
  matchId?: string;
  tradeKind?: TradeKind;
  engineKind?: EngineKind;
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

  // Exchange engine fields. Ignored on AMM-mode markets.
  // - timeInForce: gtc rests, ioc cancels remainder, fok all-or-nothing.
  // - postOnly: reject if the order would take any quantity at submission.
  // - clientOrderId: caller-supplied ID separate from idempotencyKey.
  // - selfMatchAction: how to handle same-user crossings.
  // - notionalCapCents: required for market BUY orders (slippage cap).
  timeInForce?: TimeInForce;
  postOnly?: boolean;
  clientOrderId?: string;
  selfMatchAction?: SelfMatchAction;
  notionalCapCents?: number;
}

/**
 * One price level in the L2 order book. `total` is the cumulative quantity
 * up to and including this level (used for ladder rendering).
 */
export interface OrderBookLevel {
  priceCents: number;
  quantity: number;
  total: number;
}

export interface OrderBookSide {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

/**
 * Full L2 order book for a market. Both yes and no sides; bids descending
 * price, asks ascending. `total` on each level is the cumulative quantity
 * from the top of the book.
 *
 * Populated by GET /api/v1/markets/{idOrTicker}/orderbook?depth=N.
 * Server clamps depth to [1, 100].
 */
export interface OrderBook {
  marketId: string;
  yes: OrderBookSide;
  no: OrderBookSide;
}

/**
 * WebSocket payload for `orderbook:{marketId}` channel. Hint-only; clients
 * refetch the full book via GET /orderbook on receipt.
 */
export interface OrderBookHint {
  marketId: string;
  bestYesBidCents?: number;
  bestYesAskCents?: number;
  bestNoBidCents?: number;
  bestNoAskCents?: number;
  lastQuoteAt?: string;
  ts: string;
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
  articleSourceId?: string;
}

export interface CreateEventRequest {
  seriesId?: string;
  title: string;
  description?: string;
  categoryId: string;
  featured?: boolean;
  openAt?: string;
  closeAt: string;
  metadata?: Record<string, unknown>;
}

export type MarketLifecycleAction = "open" | "halt" | "close" | "void";

export type MarketResult = "yes" | "no";

/**
 * One row in the backoffice drift-alert table — markets with
 * `prediction_collateral_ledger entry_type='adjustment'` rows in the
 * lookback window. Surfaced by the reconciliation cron after Phase 2 of
 * the two-phase check writes a forensic adjustment.
 */
export interface CollateralDriftAlert {
  marketId: string;
  ticker: string;
  adjustmentCount: number;
  maxDriftCents: number;
  totalDriftCents: number;
  latestAdjustedAt: string;
  latestReason: string;
}

export interface DriftAlertsResponse {
  data: CollateralDriftAlert[];
  sinceText: string;
}

export interface SettleMarketRequest {
  result: MarketResult;
  attestationSource: string;
  attestationId?: string;
  attestationData?: Record<string, unknown>;
  reason?: string;

  // Settlement override audit (engine plan §Settlement Plan, schema 019).
  // Required when an admin proceeds with settlement despite a collateral
  // imbalance. The gateway populates `overridden_by_user_id` and
  // `overridden_at` server-side from the session and timestamp; the admin
  // only supplies the human-readable reason here. All-or-none CHECK
  // constraint on the schema enforces consistency.
  overrideReason?: string;
}

export interface SettlementRecord_Audit {
  overrideReason?: string;
  overriddenByUserId?: string;
  overriddenAt?: string;
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

// --- Market price history (charts) ---

export interface PricePoint {
  bucketStart: string;
  yesPriceCents: number;
  tradeCount: number;
  volumeCents: number;
}

export interface MarketPriceHistory {
  marketId: string;
  range: string;
  since: string;
  until: string;
  bucketSec: number;
  points: PricePoint[];
}
