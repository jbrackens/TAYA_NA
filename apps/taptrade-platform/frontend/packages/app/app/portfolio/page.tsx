"use client";

/**
 * PortfolioPage — positions, orders, settled results.
 *
 * Layout (matches DESIGN.md tokens):
 *   [summary strip — 4 stat cards]
 *   [tab bar — Positions · Orders · History]
 *   [table for the active tab]
 *
 * Positions and orders reference markets by UUID; we hydrate the
 * distinct set of IDs once per load so the table shows ticker + title
 * instead of a truncated hex string.
 *
 * Any of the four fetches may 401 on a fresh session (the gateway
 * protects portfolio/orders). We surface a single friendly empty
 * state rather than cascading errors.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { logger } from "../lib/logger";
import type {
  Position,
  PortfolioSummary,
  PredictionOrder,
  PredictionMarket,
  SettledPositionResult,
  OrderStatus,
} from "@taptrade-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import {
  getUserStanding,
  type LeaderboardEntry,
} from "../lib/api/leaderboards-client";
import { useToast } from "../components/ToastProvider";
import { localizedMarket } from "../components/prediction/market-content";
import { formatWholePoints } from "../components/prediction/market-display";

const api = createPredictionClient();

type TabKey = "positions" | "orders" | "history";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const MONO =
  "[font-family:'IBM_Plex_Mono',monospace] [font-variant-numeric:tabular-nums]";
const STAT_CARD =
  "relative flex flex-col gap-1 rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-[18px] py-4 text-[var(--t1)] no-underline [font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif]";
const STAT_LABEL = "text-xs font-medium text-[var(--t3)]";
const STAT_VALUE = cx(
  MONO,
  "text-[22px] font-semibold tracking-normal text-[var(--t1)]",
);
const STAT_SUB = "text-[11px] text-[var(--t3)]";
const TABLE_GRID_ROW = "grid items-center gap-[14px] px-[18px]";
const TABLE_CELL = cx(MONO, "min-w-0 text-[13px] text-[var(--t1)]");
const DIM_TEXT = "text-[var(--t3)]";
const LOGIN_CTA =
  "inline-block rounded-[var(--r-md)] border border-[rgba(43,228,128,0.6)] bg-[linear-gradient(180deg,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_50%),linear-gradient(115deg,#2be480_0%,#00ffaa_100%)] px-[22px] py-3 text-[13px] font-bold text-[#04140a] no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_24px_rgba(43,228,128,0.18)] hover:brightness-105";

export default function PortfolioPage() {
  const { t } = useTranslation("portfolio");
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<PredictionOrder[]>([]);
  const [history, setHistory] = useState<SettledPositionResult[]>([]);
  const [marketsById, setMarketsById] = useState<Map<string, PredictionMarket>>(
    () => new Map(),
  );
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("positions");
  const [authError, setAuthError] = useState(false);
  // Loyalty surfaces: bestRank drives the rank chip. Settlement-history point
  // totals come from the portfolio history settlement row itself.
  const [bestRank, setBestRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results = await Promise.allSettled([
        api.getPositions(),
        api.getPortfolioSummary(),
        api.getOrders({ page: 1, pageSize: 50 }),
        api.getSettledPositions(1, 20),
        // Loyalty surfaces are ambient: failures never block the portfolio.
        getUserStanding().catch(() => [] as LeaderboardEntry[]),
      ]);
      if (cancelled) return;

      let sawAuthError = false;
      const [posRes, sumRes, ordRes, histRes, standingRes] = results;

      if (posRes.status === "fulfilled") setPositions(posRes.value);
      else if (is401(posRes.reason)) sawAuthError = true;
      else logger.warn("Portfolio", "positions fetch failed", posRes.reason);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value);
      else if (is401(sumRes.reason)) sawAuthError = true;
      else logger.warn("Portfolio", "summary fetch failed", sumRes.reason);

      if (ordRes.status === "fulfilled") setOrders(ordRes.value.data);
      else if (is401(ordRes.reason)) sawAuthError = true;
      else logger.warn("Portfolio", "orders fetch failed", ordRes.reason);

      if (histRes.status === "fulfilled") setHistory(histRes.value.data);
      else if (is401(histRes.reason)) sawAuthError = true;
      else logger.warn("Portfolio", "history fetch failed", histRes.reason);

      // Rank chip: plan §1 says "user's best board rank". Entries are
      // already sorted rank-ascending by the server.
      if (standingRes.status === "fulfilled" && standingRes.value.length > 0) {
        setBestRank(standingRes.value[0]);
      }

      if (sawAuthError) setAuthError(true);

      // Hydrate distinct market IDs so the tables can render titles.
      const ids = new Set<string>();
      if (posRes.status === "fulfilled")
        posRes.value.forEach((p) => ids.add(p.marketId));
      if (ordRes.status === "fulfilled")
        ordRes.value.data.forEach((o) => ids.add(o.marketId));
      if (histRes.status === "fulfilled")
        histRes.value.data.forEach((h) => ids.add(h.marketId));

      if (ids.size > 0) {
        const markets = await Promise.all(
          [...ids].map((id) =>
            api.getMarket(id).catch((err: unknown) => {
              logger.warn("Portfolio", "market hydrate failed", err);
              return null;
            }),
          ),
        );
        if (cancelled) return;
        const map = new Map<string, PredictionMarket>();
        for (const m of markets) if (m) map.set(m.id, m);
        setMarketsById(map);
      }

      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status === "open" || o.status === "partial"),
    [orders],
  );

  const counts = useMemo(
    () => ({
      positions: positions.length,
      orders: activeOrders.length,
      history: history.length,
    }),
    [positions, activeOrders.length, history],
  );

  if (loading) {
    return <PageState>{t("state.loading", "Loading portfolio…")}</PageState>;
  }

  if (authError && !summary && positions.length === 0 && orders.length === 0) {
    return (
      <PageState>
        <div className="text-center">
          <p className="mb-3 text-[var(--t2)]">
            {t("state.signIn", "Sign in to see your portfolio.")}
          </p>
          <Link href="/auth/login" className={LOGIN_CTA}>
            {t("state.login", "Log in")}
          </Link>
        </div>
      </PageState>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] pb-[60px]">
      <header className="mb-5">
        <h1 className="m-0 mb-1 text-[28px] font-extrabold tracking-normal text-[var(--t1)]">
          {t("title", "Portfolio")}
        </h1>
        <p className="m-0 text-[13px] text-[var(--t3)]">
          {t("subtitle", "Open positions, active orders, settled results.")}
        </p>
      </header>

      <SummaryStrip summary={summary} bestRank={bestRank} />

      <TabBar tab={tab} setTab={setTab} counts={counts} />

      {tab === "positions" && (
        <PositionsTable positions={positions} marketsById={marketsById} />
      )}
      {tab === "orders" && (
        <OrdersTable
          orders={activeOrders}
          marketsById={marketsById}
          onCancelled={(orderID) =>
            setOrders((prev) =>
              prev.map((o) =>
                o.id === orderID
                  ? { ...o, status: "cancelled" as OrderStatus }
                  : o,
              ),
            )
          }
        />
      )}
      {tab === "history" && (
        <HistoryTable history={history} marketsById={marketsById} />
      )}
    </div>
  );
}

// ── Page-level state ────────────────────────────────────────────────────────

function PageState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-[13px] text-[var(--t3)]">
      {children}
    </div>
  );
}

// ── Summary strip ───────────────────────────────────────────────────────────

function SummaryStrip({
  summary,
  bestRank,
}: {
  summary: PortfolioSummary | null;
  bestRank: LeaderboardEntry | null;
}) {
  const { t } = useTranslation("portfolio");
  const s = summary;
  const pnl = s?.realizedPoints ?? 0;
  const pnlUp = pnl >= 0;
  return (
    <section className="mb-6 grid grid-cols-5 gap-[14px] max-lg:grid-cols-3 max-[720px]:grid-cols-2">
      <StatCard
        label={t("summary.invested", "Invested")}
        value={s ? formatWholePoints(s.totalValuePoints) : "—"}
      />
      <StatCard
        label={t("summary.realizedPnl", "Realized point result")}
        value={
          s ? `${pnlUp ? "+" : "−"}${formatWholePoints(Math.abs(pnl))}` : "—"
        }
        tone={s ? (pnlUp ? "gain" : "no") : undefined}
      />
      <StatCard
        label={t("summary.openPositions", "Open positions")}
        value={s ? String(s.openPositions) : "—"}
      />
      <StatCard
        label={t("summary.accuracy", "Accuracy")}
        value={
          s && s.totalPredictions > 0 ? `${s.accuracyPct.toFixed(1)}%` : "—"
        }
        sub={
          s && s.totalPredictions > 0
            ? t("summary.correctCount", "{{correct}}/{{total}} correct", {
                correct: s.correctPredictions,
                total: s.totalPredictions,
              })
            : t("summary.noSettledPredictions", "No settled predictions yet")
        }
        tone={s && s.accuracyPct >= 50 ? "gain" : undefined}
      />
      <RankChip entry={bestRank} />
    </section>
  );
}

// RankChip — 5th stat slot in the portfolio summary strip. Plan §1: user's
// best-board rank, linking to /leaderboards pre-opened on that board. Plan §3
// "pre-qualified" state shows a muted "Not ranked yet" card rather than
// omitting the slot (keeps the grid stable across users).
//
// P10 (2026-07-12): the card VALUE is the board metric itself (e.g. weekly
// net point result "+51 pts") — previously it showed the rank, a label/value
// mismatch against titles like "Weekly point result". The rank now lives on
// a labeled sub-line ("Leaderboard rank #1").
function RankChip({ entry }: { entry: LeaderboardEntry | null }) {
  const { t } = useTranslation("portfolio");
  const href = entry
    ? `/leaderboards?board=${encodeURIComponent(entry.boardId)}`
    : "/leaderboards";
  return (
    <Link
      href={href}
      className={cx(
        STAT_CARD,
        "border-[rgba(43,228,128,0.3)] bg-[var(--accent-soft)] transition-[transform,border-color] duration-150 hover:-translate-y-px hover:border-[rgba(43,228,128,0.55)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]",
      )}
      aria-label={rankAriaLabel(entry)}
    >
      <span className={STAT_LABEL}>
        {entry ? formatBoardLabel(entry.boardId, t) : t("rank.label", "Rank")}
      </span>
      <span className={STAT_VALUE}>
        {entry
          ? formatBoardValue(entry)
          : t("rank.notRanked", "Not ranked yet")}
      </span>
      <span className={STAT_SUB}>
        {entry
          ? t("rank.leaderboardRank", "Leaderboard rank #{{rank}}", {
              rank: entry.rank,
            })
          : t("rank.qualify", "Settle more markets to qualify")}
      </span>
    </Link>
  );
}

function rankAriaLabel(entry: LeaderboardEntry | null): string {
  if (!entry) return "Not ranked yet. Settle more markets to qualify.";
  return `${formatBoardValue(entry)}. Leaderboard rank ${entry.rank}.`;
}

function formatBoardLabel(
  boardId: string,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (boardId.startsWith("category:")) {
    const slug = boardId.slice("category:".length);
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
  switch (boardId) {
    case "accuracy":
      return t("boards.accuracy", "Accuracy");
    case "pnl_weekly":
      return t("boards.pnlWeekly", "Weekly point result");
    case "sharpness":
      return t("boards.sharpness", "Sharpness");
    default:
      return boardId;
  }
}

// Board metric rendered as the stat-card value. Point metrics are WHOLE
// points, sign included (unit model: 1 Point = 1¢ of play value, never
// fractional); percentage boards keep one decimal of precision.
function formatBoardValue(entry: LeaderboardEntry): string {
  switch (entry.boardId) {
    case "accuracy":
      return `${entry.metricValue.toFixed(1)}%`;
    case "sharpness":
      return `${(entry.metricValue * 100).toFixed(1)}%`;
    case "pnl_weekly":
    default: {
      const sign = entry.metricValue < 0 ? "−" : "+";
      return `${sign}${formatWholePoints(Math.abs(entry.metricValue))}`;
    }
  }
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "yes" | "no" | "gain";
}) {
  const valueTone =
    tone === "yes"
      ? "text-[var(--yes-text)]"
      : tone === "no"
        ? "text-[var(--no-text)]"
        : tone === "gain"
          ? "text-[var(--accent)]"
          : undefined;
  return (
    <div className={STAT_CARD}>
      <span className={STAT_LABEL}>{label}</span>
      <span className={cx(STAT_VALUE, valueTone)}>{value}</span>
      {sub && <span className={STAT_SUB}>{sub}</span>}
    </div>
  );
}

// ── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar({
  tab,
  setTab,
  counts,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  counts: { positions: number; orders: number; history: number };
}) {
  const { t } = useTranslation("portfolio");
  const tabs: { key: TabKey; label: string; count: number }[] = [
    {
      key: "positions",
      label: t("tabs.positions", "Positions"),
      count: counts.positions,
    },
    {
      key: "orders",
      label: t("tabs.orders", "Open orders"),
      count: counts.orders,
    },
    {
      key: "history",
      label: t("tabs.history", "History"),
      count: counts.history,
    },
  ];
  return (
    <nav
      className="mb-[18px] inline-flex gap-1 rounded-[var(--r-pill)] border border-[var(--border-1)] bg-white/[0.04] p-[3px]"
      role="tablist"
      aria-label="Portfolio tabs"
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={tab === t.key}
          className={cx(
            "inline-flex cursor-pointer items-center gap-2 rounded-[var(--r-pill)] border-0 bg-transparent px-4 py-2 text-xs font-semibold text-[var(--t3)] transition-colors duration-150 hover:text-[var(--t1)]",
            tab === t.key && "bg-[var(--accent)] text-[#061a10]",
          )}
          onClick={() => setTab(t.key)}
        >
          <span>{t.label}</span>
          {t.count > 0 && (
            <span
              className={cx(
                MONO,
                "rounded-[var(--r-pill)] bg-black/20 px-[7px] py-px text-[10px] text-[var(--t2)]",
                tab === t.key && "text-[#061a10]",
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

// ── Positions table ────────────────────────────────────────────────────────

function PositionsTable({
  positions,
  marketsById,
}: {
  positions: Position[];
  marketsById: Map<string, PredictionMarket>;
}) {
  const { t } = useTranslation("portfolio");
  if (positions.length === 0) {
    return (
      <EmptyState
        line={t("positions.empty", "No open positions.")}
        action={
          <Link
            href="/predict"
            className="inline-block rounded-[var(--r-rh-md)] bg-[var(--action)] px-[18px] py-[10px] text-[13px] font-semibold text-[var(--action-fg)] no-underline transition-colors duration-150 hover:bg-[var(--action-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-soft)]"
          >
            {t("positions.browse", "Browse markets")}
          </Link>
        }
      />
    );
  }
  return (
    <DataTable
      gridClass="grid-cols-[minmax(200px,2fr)_60px_60px_80px_90px_90px]"
      columns={[
        { label: t("table.market", "Market") },
        { label: t("table.side", "Side"), align: "center" },
        { label: t("table.qty", "Qty"), align: "right" },
        { label: t("table.available", "Available"), align: "right" },
        { label: t("table.avgPrice", "Avg price"), align: "right" },
        { label: t("table.cost", "Cost"), align: "right" },
      ]}
      rows={positions.map((p) => {
        const m = marketsById.get(p.marketId);
        // available = quantity - reservedQuantity. reservedQuantity is the
        // share lock count from resting sell orders the user has placed
        // (engine plan §Sell NO/YES). Older AMM positions don't carry the
        // field — treat undefined as zero so available == quantity for
        // back-compat.
        const reserved = p.reservedQuantity ?? 0;
        const available = Math.max(0, p.quantity - reserved);
        return {
          key: p.id,
          href: m ? `/market/${m.ticker}` : undefined,
          cells: [
            <MarketCell key="m" market={m} fallback={p.marketId} />,
            <SideChip key="s" side={p.side} />,
            <span key="q" className={MONO}>
              {p.quantity}
            </span>,
            <span
              key="av"
              className={cx(MONO, reserved > 0 && "text-[var(--accent)]")}
              title={
                reserved > 0
                  ? `${reserved} share${reserved === 1 ? "" : "s"} locked by resting sell orders`
                  : undefined
              }
            >
              {available}
            </span>,
            <span key="p" className={MONO}>
              {formatWholePoints(p.avgPricePoints)}
            </span>,
            <span key="c" className={MONO}>
              {formatWholePoints(p.totalCostPoints)}
            </span>,
          ],
        };
      })}
    />
  );
}

// ── Orders table ───────────────────────────────────────────────────────────

function OrdersTable({
  orders,
  marketsById,
  onCancelled,
}: {
  orders: PredictionOrder[];
  marketsById: Map<string, PredictionMarket>;
  onCancelled: (orderID: string) => void;
}) {
  const { t } = useTranslation("portfolio");
  const toast = useToast();
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);

  if (orders.length === 0) {
    return <EmptyState line={t("orders.empty", "No open orders.")} />;
  }

  const handleCancel = async (orderID: string, marketTicker: string) => {
    setPendingCancel(orderID);
    try {
      await api.cancelOrder(orderID);
      onCancelled(orderID);
      toast.success(
        t("orders.cancelled", "Order cancelled"),
        t("orders.released", "Reserved points unlocked on {{ticker}}", {
          ticker: marketTicker,
        }),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t("orders.cancelFailed", "Cancel failed");
      logger.warn("Portfolio", "cancel order failed", message);
      toast.error(t("orders.cancelFailed", "Cancel failed"), message);
    } finally {
      setPendingCancel(null);
    }
  };

  return (
    <DataTable
      gridClass="grid-cols-[minmax(180px,2fr)_60px_60px_90px_100px_100px_90px]"
      columns={[
        { label: t("table.market", "Market") },
        { label: t("table.side", "Side"), align: "center" },
        { label: t("table.qty", "Qty"), align: "right" },
        { label: t("table.cost", "Cost"), align: "right" },
        { label: t("table.status", "Status"), align: "center" },
        { label: t("table.placed", "Placed"), align: "right" },
        { label: "", align: "right" },
      ]}
      rows={orders.map((o) => {
        const m = marketsById.get(o.marketId);
        const isCancelling = pendingCancel === o.id;
        const ticker = m?.ticker ?? o.marketId;
        return {
          key: o.id,
          href: m ? `/market/${m.ticker}` : undefined,
          cells: [
            <MarketCell key="m" market={m} fallback={o.marketId} />,
            <SideChip key="s" side={o.side} />,
            <span key="q" className={MONO}>
              {o.quantity}
            </span>,
            <span key="c" className={MONO}>
              {formatWholePoints(o.totalCostPoints)}
            </span>,
            <StatusChip
              key="st"
              status={o.status}
              failureReason={o.failureReason}
            />,
            <span key="d" className={cx(MONO, DIM_TEXT)}>
              {formatDate(o.createdAt)}
            </span>,
            // Per-row Cancel. e.stopPropagation + preventDefault keep the
            // click from triggering the row-level navigation `href`. The
            // server's cancelOrder is idempotent on already-cancelled
            // orders, but the button hides itself optimistically via
            // onCancelled so users don't double-tap.
            <button
              key="cx"
              type="button"
              className="cursor-pointer rounded-[var(--r-sm)] border border-[var(--border-1)] bg-transparent px-[10px] py-1 text-[11px] font-semibold tracking-normal text-[var(--t2)] transition-colors duration-150 hover:border-[var(--no-text)] hover:bg-[var(--no-soft)] hover:text-[var(--no-text)] disabled:cursor-default disabled:opacity-50"
              disabled={isCancelling}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                void handleCancel(o.id, ticker);
              }}
            >
              {isCancelling ? "…" : t("orders.cancel", "Cancel")}
            </button>,
          ],
        };
      })}
    />
  );
}

// ── History table ──────────────────────────────────────────────────────────

function HistoryTable({
  history,
  marketsById,
}: {
  history: SettledPositionResult[];
  marketsById: Map<string, PredictionMarket>;
}) {
  const { t } = useTranslation("portfolio");
  if (history.length === 0) {
    return (
      <EmptyState
        line={t(
          "history.empty",
          "Settled positions will appear here after markets resolve.",
        )}
      />
    );
  }
  return (
    <DataTable
      gridClass="grid-cols-[minmax(200px,2fr)_60px_60px_70px_70px_90px_70px_100px]"
      columns={[
        { label: t("table.market", "Market") },
        { label: t("table.side", "Side"), align: "center" },
        { label: t("table.qty", "Qty"), align: "right" },
        { label: t("table.entry", "Entry"), align: "right" },
        { label: t("table.exit", "Exit"), align: "right" },
        { label: t("table.pnl", "Point result"), align: "right" },
        { label: t("table.points", "Points"), align: "right" },
        { label: t("table.settled", "Settled"), align: "right" },
      ]}
      rows={history.map((h) => {
        const m = marketsById.get(h.marketId);
        const up = h.realizedPoints >= 0;
        // Settlement points are the actual point disbursement for this settled
        // position. Show the exact settlement credit, not loyalty/XP accrual.
        const rawPoints = h.settlementPoints;
        const pointsDisplay =
          rawPoints && rawPoints > 0 ? formatWholePoints(rawPoints) : null;
        return {
          key: h.id,
          href: m ? `/market/${m.ticker}` : undefined,
          cells: [
            <MarketCell key="m" market={m} fallback={h.marketId} />,
            <SideChip key="s" side={h.side} />,
            <span key="q" className={MONO}>
              {h.quantity}
            </span>,
            <span key="e" className={MONO}>
              {formatWholePoints(h.entryPricePoints)}
            </span>,
            <span key="x" className={MONO}>
              {formatWholePoints(h.exitPricePoints)}
            </span>,
            <span
              key="p"
              className={cx(
                MONO,
                "font-bold",
                up
                  ? "text-[var(--accent)] [text-shadow:0_0_6px_var(--accent-glow-color)]"
                  : "text-[var(--no-text)]",
              )}
            >
              {up ? "+" : "−"}
              {formatWholePoints(Math.abs(h.realizedPoints))}
            </span>,
            <span
              key="pts"
              className={cx(MONO, "whitespace-nowrap text-xs text-[var(--t3)]")}
              aria-label={
                pointsDisplay !== null
                  ? t("history.earnedPoints", "Settlement {{points}}", {
                      points: pointsDisplay,
                    })
                  : undefined
              }
            >
              {pointsDisplay !== null
                ? t("history.pointsShort", "+{{points}}", {
                    points: pointsDisplay,
                  })
                : ""}
            </span>,
            <span key="d" className={cx(MONO, DIM_TEXT)}>
              {formatDate(h.paidAt)}
            </span>,
          ],
        };
      })}
    />
  );
}

// ── Shared bits ────────────────────────────────────────────────────────────

function MarketCell({
  market,
  fallback,
}: {
  market: PredictionMarket | undefined;
  fallback: string;
}) {
  const { t } = useTranslation("market-content");
  if (!market) {
    return <span className={cx(MONO, DIM_TEXT)}>{fallback.slice(0, 8)}…</span>;
  }
  const displayMarket = localizedMarket(t, market);
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-[13px] font-semibold text-[var(--t1)] [font-family:'Inter',sans-serif]">
        {displayMarket.title}
      </span>
      <span
        className={cx(
          MONO,
          "text-[10px] uppercase tracking-normal text-[var(--t3)]",
        )}
      >
        {displayMarket.ticker}
      </span>
    </div>
  );
}

function SideChip({ side }: { side: "yes" | "no" }) {
  const { t } = useTranslation("portfolio");
  return (
    <span
      className={cx(
        "inline-block rounded-[var(--r-sm)] px-2 py-[3px] text-[10px] font-bold tracking-normal",
        side === "yes"
          ? "bg-[var(--yes-soft)] text-[var(--yes-text)]"
          : "bg-[var(--no-soft)] text-[var(--no-text)]",
      )}
    >
      {side === "yes" ? t("side.yes", "YES") : t("side.no", "NO")}
    </span>
  );
}

/**
 * Map raw failure_reason enum values from the gateway into short
 * user-readable phrases. Mirrors the Go-side `Failure*` constants in
 * internal/prediction/types.go. Unknown reasons fall through as-is so
 * future additions don't render blank.
 */
const FAILURE_REASON_TEXT: Record<string, string> = {
  price_band_violation: "price out of bounds (1¢–99¢)",
  post_only_would_take: "post-only would have crossed the book",
  self_match_rejected: "blocked: would have crossed your own order",
  closed_market: "market is no longer open",
  insufficient_balance: "insufficient balance",
  insufficient_position: "not enough shares to sell",
  notional_cap_missing: "market order needs a notional cap",
  notional_cap_exceeded: "notional cap exceeded",
  fok_unavailable: "fill-or-kill couldn't fully fill",
};

function StatusChip({
  status,
  failureReason,
}: {
  status: OrderStatus;
  failureReason?: string;
}) {
  const phrase = failureReason
    ? FAILURE_REASON_TEXT[failureReason] || failureReason
    : undefined;
  const statusTone =
    status === "filled"
      ? "border-[var(--yes-border)] bg-[var(--yes-soft)] text-[var(--yes-text)]"
      : status === "open" || status === "partial"
        ? "border-[rgba(43,228,128,0.3)] bg-[rgba(43,228,128,0.14)] text-[var(--accent)]"
        : status === "cancelled" || status === "expired"
          ? "border-white/10 bg-white/[0.04] text-[var(--t3)]"
          : "border-white/10 bg-white/[0.06] text-[var(--t2)]";
  return (
    <span
      className={cx(
        "inline-block rounded-[var(--r-pill)] border px-[10px] py-[3px] text-[10px] font-semibold capitalize tracking-normal",
        statusTone,
        phrase && "cursor-help",
      )}
      title={phrase}
    >
      {status}
    </span>
  );
}

interface Column {
  label: string;
  align?: "left" | "right" | "center";
}

interface Row {
  key: string;
  href?: string;
  cells: React.ReactNode[];
}

function alignClass(align?: Column["align"]) {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function DataTable({
  columns,
  rows,
  gridClass,
}: {
  columns: Column[];
  rows: Row[];
  gridClass: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] [font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif]"
      role="table"
    >
      <div
        className={cx(
          TABLE_GRID_ROW,
          gridClass,
          "border-b border-[var(--border-1)] bg-white/[0.02] py-3",
        )}
        role="row"
      >
        {columns.map((c) => (
          <span
            key={c.label}
            role="columnheader"
            className={cx(
              "text-[11px] font-medium uppercase tracking-normal text-[var(--t3)]",
              alignClass(c.align),
            )}
          >
            {c.label}
          </span>
        ))}
      </div>
      <ul className="m-0 list-none p-0">
        {rows.map((r) => {
          const body = columns.map((c, i) => (
            <span
              key={i}
              role="cell"
              className={cx(TABLE_CELL, alignClass(c.align))}
            >
              {r.cells[i]}
            </span>
          ));
          return (
            <li
              key={r.key}
              role="row"
              className="border-t border-[var(--border-1)] first:border-t-0"
            >
              {r.href ? (
                <Link
                  href={r.href}
                  className={cx(
                    TABLE_GRID_ROW,
                    gridClass,
                    "py-[14px] text-inherit no-underline transition-colors duration-150 hover:bg-[var(--surface-2)]",
                  )}
                >
                  {body}
                </Link>
              ) : (
                <div className={cx(TABLE_GRID_ROW, gridClass, "py-[14px]")}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// P10 (2026-07-12): empty states are gallery-white system cards, not flat
// gray slabs — surface-1 on border-1 with the card shadow.
function EmptyState({
  line,
  action,
}: {
  line: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-6 py-12 text-center text-[13px] text-[var(--t2)] shadow-[var(--shadow-card)]">
      <span>{line}</span>
      {action}
    </div>
  );
}

// ── Utilities ──────────────────────────────────────────────────────────────

function is401(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("401") ||
    msg.includes("unauthorized") ||
    msg.includes("authentication required")
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
