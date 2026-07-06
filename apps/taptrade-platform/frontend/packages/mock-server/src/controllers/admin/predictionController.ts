import { auditLogs } from "../../mocked_data/audit-logs";

type PredictionOutcome = {
  outcomeId: string;
  label: string;
  priceCents: number;
  change1d: number;
};

type PredictionMarket = {
  marketId: string;
  slug: string;
  title: string;
  shortTitle: string;
  categoryKey: string;
  categoryLabel: string;
  status: "open" | "live" | "suspended" | "resolved" | "cancelled";
  featured: boolean;
  live: boolean;
  closesAt: string;
  resolvesAt: string;
  volumeUsd: number;
  liquidityUsd: number;
  participants: number;
  summary: string;
  insight: string;
  rules: string[];
  tags: string[];
  resolutionSource: string;
  heroMetricLabel: string;
  heroMetricValue: string;
  probabilityPercent: number;
  priceChangePercent: number;
  outcomes: PredictionOutcome[];
  relatedMarketIds: string[];
};

type PredictionOrder = {
  orderId: string;
  punterId: string;
  marketId: string;
  marketTitle: string;
  categoryKey: string;
  categoryLabel: string;
  outcomeId: string;
  outcomeLabel: string;
  priceCents: number;
  stakeUsd: number;
  shares: number;
  maxPayoutUsd: number;
  maxProfitUsd: number;
  status: "open" | "cancelled" | "won" | "lost" | "resettled";
  createdAt: string;
  updatedAt: string;
  marketStatus?: string;
  winningOutcomeLabel?: string;
  settledAt?: string;
  settlementReason?: string;
  settlementActor?: string;
  previousSettledAt?: string;
  previousSettledAmountUsd?: number;
  previousSettlementStatus?: string;
};

type PredictionLifecycleEvent = {
  id: string;
  marketId: string;
  action: "open" | "suspend" | "cancel" | "resolve" | "resettle";
  marketStatusBefore: string;
  marketStatusAfter: string;
  outcomeId?: string;
  outcomeLabel?: string;
  performedBy: string;
  reason: string;
  performedAt: string;
};

const buildMarketDetail = (market: PredictionMarket) => ({
  market,
  relatedMarkets: markets.filter((item) => market.relatedMarketIds.includes(item.marketId)),
});

const canSettle = (status?: string): boolean => {
  const normalized = normalize(status);
  return normalized === "open" || normalized === "live" || normalized === "suspended";
};

const canTransition = (currentStatus?: string, nextStatus?: string): boolean => {
  const current = normalize(currentStatus);
  const next = normalize(nextStatus);
  if (current === next) {
    return true;
  }
  if ((current === "open" || current === "live") && next === "suspended") {
    return true;
  }
  if (current === "suspended" && next === "open") {
    return true;
  }
  return false;
};

const markets: PredictionMarket[] = [
  {
    marketId: "pm-btc-120k-2026",
    slug: "bitcoin-120k-before-2026-close",
    title: "Will Bitcoin trade above $120k before December 31, 2026?",
    shortTitle: "BTC above $120k in 2026",
    categoryKey: "crypto",
    categoryLabel: "Crypto",
    status: "live",
    featured: true,
    live: true,
    closesAt: "2026-12-31T23:00:00Z",
    resolvesAt: "2026-12-31T23:59:00Z",
    volumeUsd: 4825000,
    liquidityUsd: 965000,
    participants: 1842,
    summary: "A flagship crypto prediction market.",
    insight: "ETF inflows and macro easing kept YES in control.",
    rules: ["Resolves YES if BTC trades above 120k before market close."],
    tags: ["Featured", "Live"],
    resolutionSource: "Composite BTC/USD reference basket",
    heroMetricLabel: "Implied YES",
    heroMetricValue: "62%",
    probabilityPercent: 62,
    priceChangePercent: 8.4,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 62, change1d: 4.2 },
      { outcomeId: "no", label: "No", priceCents: 38, change1d: -4.2 },
    ],
    relatedMarketIds: ["pm-solana-etf-2026"],
  },
  {
    marketId: "pm-solana-etf-2026",
    slug: "solana-spot-etf-approved-before-2026-close",
    title: "Will a U.S. spot Solana ETF be approved before December 31, 2026?",
    shortTitle: "Spot SOL ETF in 2026",
    categoryKey: "crypto",
    categoryLabel: "Crypto",
    status: "open",
    featured: true,
    live: false,
    closesAt: "2026-12-31T23:00:00Z",
    resolvesAt: "2026-12-31T23:59:00Z",
    volumeUsd: 1395000,
    liquidityUsd: 355000,
    participants: 792,
    summary: "Tracks ETF approval timing.",
    insight: "Approval odds improved after renewed filing momentum.",
    rules: ["Resolves YES on formal approval before market close."],
    tags: ["Featured"],
    resolutionSource: "SEC filing / issuer announcement",
    heroMetricLabel: "Approval odds",
    heroMetricValue: "54%",
    probabilityPercent: 54,
    priceChangePercent: 3.1,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 54, change1d: 1.5 },
      { outcomeId: "no", label: "No", priceCents: 46, change1d: -1.5 },
    ],
    relatedMarketIds: ["pm-btc-120k-2026"],
  },
  {
    marketId: "pm-fed-cut-july-2026",
    slug: "fed-cuts-rates-before-july-2026-meeting",
    title: "Will the Fed cut rates before the July 2026 meeting?",
    shortTitle: "Fed cut before July 2026",
    categoryKey: "macro",
    categoryLabel: "Macro",
    status: "open",
    featured: true,
    live: false,
    closesAt: "2026-07-28T18:00:00Z",
    resolvesAt: "2026-07-29T00:00:00Z",
    volumeUsd: 3280000,
    liquidityUsd: 610000,
    participants: 1368,
    summary: "A macro flagship market that prices the next pivot.",
    insight: "Softening payroll revisions pulled YES into the lead.",
    rules: ["Resolves YES if the target range is lowered before the meeting concludes."],
    tags: ["Featured"],
    resolutionSource: "FOMC statement",
    heroMetricLabel: "Cut probability",
    heroMetricValue: "58%",
    probabilityPercent: 58,
    priceChangePercent: 2.6,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 58, change1d: 1.3 },
      { outcomeId: "no", label: "No", priceCents: 42, change1d: -1.3 },
    ],
    relatedMarketIds: ["pm-us-shutdown-q3-2026"],
  },
  {
    marketId: "pm-us-shutdown-q3-2026",
    slug: "us-government-shutdown-before-q3-2026-end",
    title: "Will the U.S. government enter a shutdown before September 30, 2026?",
    shortTitle: "U.S. shutdown before Q3 end",
    categoryKey: "politics",
    categoryLabel: "Politics",
    status: "live",
    featured: false,
    live: true,
    closesAt: "2026-09-30T23:00:00Z",
    resolvesAt: "2026-09-30T23:59:00Z",
    volumeUsd: 2130000,
    liquidityUsd: 442000,
    participants: 1114,
    summary: "A live policy-risk market following budget negotiations.",
    insight: "Shutdown odds widened after the latest continuing-resolution failure.",
    rules: ["Resolves YES if a federal government shutdown begins before market close."],
    tags: ["Live"],
    resolutionSource: "Official federal operations notices",
    heroMetricLabel: "Shutdown risk",
    heroMetricValue: "47%",
    probabilityPercent: 47,
    priceChangePercent: 5.8,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 47, change1d: 2.9 },
      { outcomeId: "no", label: "No", priceCents: 53, change1d: -2.9 },
    ],
    relatedMarketIds: ["pm-fed-cut-july-2026"],
  },
];

const orders: PredictionOrder[] = [
  {
    orderId: "po-1001",
    punterId: "punter-001",
    marketId: "pm-btc-120k-2026",
    marketTitle: "BTC above $120k in 2026",
    categoryKey: "crypto",
    categoryLabel: "Crypto",
    outcomeId: "yes",
    outcomeLabel: "Yes",
    priceCents: 62,
    stakeUsd: 125,
    shares: 201.61,
    maxPayoutUsd: 201.61,
    maxProfitUsd: 76.61,
    status: "open",
    createdAt: "2026-03-06T14:18:00Z",
    updatedAt: "2026-03-06T14:18:00Z",
  },
  {
    orderId: "po-1002",
    punterId: "punter-002",
    marketId: "pm-us-shutdown-q3-2026",
    marketTitle: "U.S. shutdown before Q3 end",
    categoryKey: "politics",
    categoryLabel: "Politics",
    outcomeId: "no",
    outcomeLabel: "No",
    priceCents: 53,
    stakeUsd: 80,
    shares: 150.94,
    maxPayoutUsd: 150.94,
    maxProfitUsd: 70.94,
    status: "open",
    createdAt: "2026-03-06T17:46:00Z",
    updatedAt: "2026-03-06T17:46:00Z",
  },
  {
    orderId: "po-1003",
    punterId: "punter-001",
    marketId: "pm-solana-etf-2026",
    marketTitle: "Spot SOL ETF in 2026",
    categoryKey: "crypto",
    categoryLabel: "Crypto",
    outcomeId: "yes",
    outcomeLabel: "Yes",
    priceCents: 54,
    stakeUsd: 60,
    shares: 111.11,
    maxPayoutUsd: 111.11,
    maxProfitUsd: 51.11,
    status: "cancelled",
    createdAt: "2026-03-05T10:12:00Z",
    updatedAt: "2026-03-05T13:05:00Z",
    marketStatus: "cancelled",
    settledAt: "2026-03-05T13:05:00Z",
    settlementReason: "market cancelled by trading desk",
    settlementActor: "mock-admin",
    previousSettlementStatus: "open",
  },
  {
    orderId: "po-1004",
    punterId: "punter-003",
    marketId: "pm-fed-cut-july-2026",
    marketTitle: "Fed cut before July 2026",
    categoryKey: "macro",
    categoryLabel: "Macro",
    outcomeId: "yes",
    outcomeLabel: "Yes",
    priceCents: 58,
    stakeUsd: 140,
    shares: 241.38,
    maxPayoutUsd: 241.38,
    maxProfitUsd: 101.38,
    status: "resettled",
    createdAt: "2026-03-04T08:15:00Z",
    updatedAt: "2026-03-06T11:20:00Z",
    marketStatus: "resolved",
    winningOutcomeLabel: "No",
    settledAt: "2026-03-06T11:20:00Z",
    settlementReason: "resolution source corrected",
    settlementActor: "mock-admin",
    previousSettledAt: "2026-03-05T16:45:00Z",
    previousSettledAmountUsd: 241.38,
    previousSettlementStatus: "won",
  },
];

const lifecycleHistory: PredictionLifecycleEvent[] = [
  {
    id: "plh-1001",
    marketId: "pm-btc-120k-2026",
    action: "open",
    marketStatusBefore: "open",
    marketStatusAfter: "open",
    performedBy: "seed-system",
    reason: "seed market bootstrap",
    performedAt: "2026-03-01T09:00:00Z",
  },
];

const normalize = (value?: string): string => `${value || ""}`.trim().toLowerCase();

const filterMarkets = (query: any): PredictionMarket[] => {
  const category = normalize(query?.category);
  const status = normalize(query?.status);
  return markets.filter((market) => {
    if (category && market.categoryKey !== category) {
      return false;
    }
    if (status && market.status !== status) {
      return false;
    }
    return true;
  });
};

const filterOrders = (query: any): PredictionOrder[] => {
  const status = normalize(query?.status);
  const category = normalize(query?.category);
  const punterId = normalize(query?.punterId);
  const marketId = normalize(query?.marketId);
  return orders.filter((order) => {
    if (status && order.status !== status) {
      return false;
    }
    if (category && order.categoryKey !== category) {
      return false;
    }
    if (punterId && order.punterId !== punterId) {
      return false;
    }
    if (marketId && order.marketId !== marketId) {
      return false;
    }
    return true;
  });
};

const historyForMarket = (marketId: string): PredictionLifecycleEvent[] =>
  lifecycleHistory
    .filter((item) => item.marketId === marketId)
    .sort((left, right) => `${right.performedAt}`.localeCompare(`${left.performedAt}`));

const appendAuditLog = ({
  action,
  marketId,
  occurredAt,
  details,
  actorId = "mock-admin",
}: {
  action: string;
  marketId: string;
  occurredAt: string;
  details: string;
  actorId?: string;
}) => {
  auditLogs.unshift({
    id: `${marketId}:${occurredAt}:${action}`,
    action,
    actorId,
    targetId: marketId,
    userId: actorId,
    product: "prediction",
    occurredAt,
    createdAt: occurredAt,
    details,
  });
};

export default {
  async summary(_req: any, res: any) {
    const categories = Array.from(
      markets.reduce((acc, market) => {
        const existing = acc.get(market.categoryKey) || {
          key: market.categoryKey,
          label: market.categoryLabel,
          marketCount: 0,
          liveMarketCount: 0,
          openMarketCount: 0,
          resolvedMarketCount: 0,
        };
        existing.marketCount += 1;
        if (market.live) existing.liveMarketCount += 1;
        if (market.status === "open") existing.openMarketCount += 1;
        if (market.status === "resolved") existing.resolvedMarketCount += 1;
        acc.set(market.categoryKey, existing);
        return acc;
      }, new Map<string, any>()),
    ).map(([, value]) => value);

    return res.status(200).send({
      totalMarkets: markets.length,
      liveMarkets: markets.filter((market) => market.live).length,
      featuredMarkets: markets.filter((market) => market.featured).length,
      resolvedMarkets: markets.filter((market) => market.status === "resolved").length,
      totalVolumeUsd: markets.reduce((acc, market) => acc + market.volumeUsd, 0),
      totalLiquidityUsd: markets.reduce((acc, market) => acc + market.liquidityUsd, 0),
      totalOrders: orders.length,
      openOrders: orders.filter((order) => order.status === "open").length,
      cancelledOrders: orders.filter((order) => order.status === "cancelled").length,
      categories,
      topMarkets: [...markets].sort((left, right) => right.volumeUsd - left.volumeUsd).slice(0, 5),
    });
  },

  async markets(req: any, res: any) {
    const items = filterMarkets(req.query || {});
    return res.status(200).send({
      totalCount: items.length,
      markets: items,
    });
  },

  async details(req: any, res: any) {
    const { id } = req.params || {};
    const market = markets.find((item) => item.marketId === id || item.slug === id);
    if (!market) {
      return res.status(404).send({ error: "Prediction market not found" });
    }
    return res.status(200).send(buildMarketDetail(market));
  },

  async orders(req: any, res: any) {
    const items = filterOrders(req.query || {});
    return res.status(200).send({
      totalCount: items.length,
      orders: items,
    });
  },

  async orderDetails(req: any, res: any) {
    const { id } = req.params || {};
    const order = orders.find((item) => item.orderId === id);
    if (!order) {
      return res.status(404).send({ error: "Prediction order not found" });
    }
    return res.status(200).send(order);
  },

  async lifecycleHistory(req: any, res: any) {
    const { id } = req.params || {};
    const market = markets.find((item) => item.marketId === id || item.slug === id);
    if (!market) {
      return res.status(404).send({ error: "Prediction market not found" });
    }
    const items = historyForMarket(market.marketId);
    return res.status(200).send({
      marketId: market.marketId,
      totalCount: items.length,
      items,
    });
  },

  async lifecycle(req: any, res: any) {
    const { id, action } = req.params || {};
    const market = markets.find((item) => item.marketId === id || item.slug === id);
    if (!market) {
      return res.status(404).send({ error: "Prediction market not found" });
    }

    const normalizedAction = normalize(action);
    const reason = `${req.body?.reason || ""}`.trim();
    const now = new Date().toISOString();
    const pushHistory = (
      actionName: PredictionLifecycleEvent["action"],
      marketStatusBefore: string,
      marketStatusAfter: string,
      winningOutcome?: PredictionOutcome,
    ) => {
      lifecycleHistory.unshift({
        id: `${market.marketId}:${now}:${actionName}`,
        marketId: market.marketId,
        action: actionName,
        marketStatusBefore,
        marketStatusAfter,
        outcomeId: winningOutcome?.outcomeId,
        outcomeLabel: winningOutcome?.label,
        performedBy: "mock-admin",
        reason: reason || `mock ${actionName}`,
        performedAt: now,
      });
    };
    const pushAudit = (
      actionName: string,
      marketStatusBefore: string,
      marketStatusAfter: string,
      winningOutcome?: PredictionOutcome,
    ) => {
      const resolutionDetails = winningOutcome
        ? ` Winning outcome: ${winningOutcome.label}.`
        : "";
      appendAuditLog({
        action: actionName,
        marketId: market.marketId,
        occurredAt: now,
        details:
          `Prediction market ${market.shortTitle} transitioned from ${marketStatusBefore} to ${marketStatusAfter}. ` +
          `Reason: ${reason || `mock ${normalizedAction}`}.${resolutionDetails}`,
      });
    };

    switch (normalizedAction) {
      case "suspend":
        if (!canTransition(market.status, "suspended")) {
          return res.status(400).send({ error: "Prediction market cannot be suspended" });
        }
        pushHistory("suspend", market.status, "suspended");
        pushAudit("prediction.market.suspended", market.status, "suspended");
        market.status = "suspended";
        market.live = false;
        return res.status(200).send(buildMarketDetail(market));

      case "open":
        if (!canTransition(market.status, "open")) {
          return res.status(400).send({ error: "Prediction market cannot be reopened" });
        }
        pushHistory("open", market.status, "open");
        pushAudit("prediction.market.reopened", market.status, "open");
        market.status = "open";
        market.live = false;
        return res.status(200).send(buildMarketDetail(market));

      case "cancel":
        if (!canSettle(market.status)) {
          return res.status(400).send({ error: "Prediction market cannot be cancelled" });
        }
        pushHistory("cancel", market.status, "cancelled");
        pushAudit("prediction.market.cancelled", market.status, "cancelled");
        market.status = "cancelled";
        market.live = false;
        orders.forEach((order) => {
          if (order.marketId === market.marketId && order.status === "open") {
            order.status = "cancelled";
            order.updatedAt = now;
          }
        });
        return res.status(200).send(buildMarketDetail(market));

      case "resolve": {
        const outcomeId = normalize(req.body?.outcomeId);
        const winningOutcome = market.outcomes.find((outcome) => normalize(outcome.outcomeId) === outcomeId);
        if (!canSettle(market.status)) {
          return res.status(400).send({ error: "Prediction market cannot be resolved" });
        }
        if (!winningOutcome) {
          return res.status(400).send({ error: "Prediction outcome not found" });
        }
        pushHistory("resolve", market.status, "resolved", winningOutcome);
        pushAudit("prediction.market.resolved", market.status, "resolved", winningOutcome);
        market.status = "resolved";
        market.live = false;
        orders.forEach((order) => {
          if (order.marketId === market.marketId && order.status === "open") {
            order.status = normalize(order.outcomeId) === outcomeId ? "won" : "lost";
            order.updatedAt = now;
          }
        });
        return res.status(200).send(buildMarketDetail(market));
      }

      case "resettle": {
        const outcomeId = normalize(req.body?.outcomeId);
        const winningOutcome = market.outcomes.find((outcome) => normalize(outcome.outcomeId) === outcomeId);
        if (normalize(market.status) !== "resolved") {
          return res.status(400).send({ error: "Prediction market cannot be resettled" });
        }
        if (!winningOutcome) {
          return res.status(400).send({ error: "Prediction outcome not found" });
        }
        pushHistory("resettle", market.status, "resolved", winningOutcome);
        pushAudit("prediction.market.resettled", market.status, "resolved", winningOutcome);
        market.status = "resolved";
        market.live = false;
        orders.forEach((order) => {
          if (
            order.marketId === market.marketId &&
            (order.status === "won" || order.status === "lost")
          ) {
            order.status = "resettled";
            order.updatedAt = now;
          }
        });
        return res.status(200).send(buildMarketDetail(market));
      }

      default:
        return res.status(400).send({
          error: `Unsupported prediction lifecycle action: ${normalizedAction || "unknown"}`,
          reason,
        });
    }
  },
};
