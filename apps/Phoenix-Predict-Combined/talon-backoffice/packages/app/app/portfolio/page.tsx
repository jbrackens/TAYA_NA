"use client";

/**
 * PortfolioPage — positions, orders, settled history.
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
import { logger } from "../lib/logger";
import type {
  Position,
  PortfolioSummary,
  PredictionOrder,
  PredictionMarket,
  SettledPayout,
  OrderStatus,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import { getLoyaltyLedger } from "../lib/api/loyalty-client";
import {
  getUserStanding,
  type LeaderboardEntry,
} from "../lib/api/leaderboards-client";

const api = createPredictionClient();

type TabKey = "positions" | "orders" | "history";

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<PredictionOrder[]>([]);
  const [history, setHistory] = useState<SettledPayout[]>([]);
  const [marketsById, setMarketsById] = useState<Map<string, PredictionMarket>>(
    () => new Map(),
  );
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("positions");
  const [authError, setAuthError] = useState(false);
  // Loyalty surfaces: bestRank drives the rank chip; pointsByMarketId maps
  // settled-trade rows to their ledger accrual for the +X pts suffix.
  // Plan §1 + §8 — the two APIs are fetched in parallel with the portfolio
  // calls and joined client-side by marketId.
  const [bestRank, setBestRank] = useState<LeaderboardEntry | null>(null);
  const [pointsByMarketId, setPointsByMarketId] = useState<Map<string, number>>(
    () => new Map(),
  );

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
        getLoyaltyLedger(50).catch(() => []),
      ]);
      if (cancelled) return;

      let sawAuthError = false;
      const [posRes, sumRes, ordRes, histRes, standingRes, ledgerRes] = results;

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

      // Points suffix: ledger entries are keyed by marketId (settlement is
      // per-position, one position per market per user). Join on marketId.
      if (ledgerRes.status === "fulfilled") {
        const map = new Map<string, number>();
        for (const entry of ledgerRes.value) {
          if (entry.eventType === "accrual" && entry.marketId) {
            map.set(entry.marketId, entry.deltaPoints);
          }
        }
        setPointsByMarketId(map);
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

  const counts = useMemo(
    () => ({
      positions: positions.length,
      orders: orders.filter(
        (o) => o.status === "open" || o.status === "partial",
      ).length,
      history: history.length,
    }),
    [positions, orders, history],
  );

  if (loading) {
    return <PageState>Loading portfolio…</PageState>;
  }

  if (authError && !summary && positions.length === 0 && orders.length === 0) {
    return (
      <PageState>
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: 12, color: "var(--t2)" }}>
            Sign in to see your portfolio.
          </p>
          <Link href="/auth/login" className="pf-login-cta">
            Log in
          </Link>
        </div>
        <Styles />
      </PageState>
    );
  }

  return (
    <div className="pf-wrap">
      <Styles />

      <header className="pf-head">
        <h1 className="pf-title">Portfolio</h1>
        <p className="pf-sub">
          Open positions, active orders, settled payouts.
        </p>
      </header>

      <SummaryStrip summary={summary} bestRank={bestRank} />

      <TabBar tab={tab} setTab={setTab} counts={counts} />

      {tab === "positions" && (
        <PositionsTable positions={positions} marketsById={marketsById} />
      )}
      {tab === "orders" && (
        <OrdersTable orders={orders} marketsById={marketsById} />
      )}
      {tab === "history" && (
        <HistoryTable
          history={history}
          marketsById={marketsById}
          pointsByMarketId={pointsByMarketId}
        />
      )}
    </div>
  );
}

// ── Page-level state ────────────────────────────────────────────────────────

function PageState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        fontSize: 13,
        color: "var(--t3)",
      }}
    >
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
  const s = summary;
  const pnl = s?.realizedPnlCents ?? 0;
  const pnlUp = pnl >= 0;
  return (
    <section className="pf-summary pf-summary-5">
      <StatCard
        label="Invested"
        value={s ? formatUSD(s.totalValueCents) : "—"}
      />
      <StatCard
        label="Realized P&L"
        value={s ? `${pnlUp ? "+" : "−"}${formatUSD(Math.abs(pnl))}` : "—"}
        tone={s ? (pnlUp ? "gain" : "no") : undefined}
      />
      <StatCard
        label="Open positions"
        value={s ? String(s.openPositions) : "—"}
      />
      <StatCard
        label="Accuracy"
        value={
          s && s.totalPredictions > 0 ? `${s.accuracyPct.toFixed(1)}%` : "—"
        }
        sub={
          s && s.totalPredictions > 0
            ? `${s.correctPredictions}/${s.totalPredictions} correct`
            : "No settled predictions yet"
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
function RankChip({ entry }: { entry: LeaderboardEntry | null }) {
  const href = entry
    ? `/leaderboards?board=${encodeURIComponent(entry.boardId)}`
    : "/leaderboards";
  return (
    <Link
      href={href}
      className="pf-rank-chip"
      aria-label={rankAriaLabel(entry)}
    >
      <span className="pf-stat-label">
        {entry ? formatBoardLabel(entry.boardId) : "Rank"}
      </span>
      <span className="pf-stat-value mono">
        {entry ? `#${entry.rank}` : "Not ranked yet"}
      </span>
      <span className="pf-stat-sub">
        {entry ? formatBoardMetric(entry) : "Settle more markets to qualify"}
      </span>
    </Link>
  );
}

function rankAriaLabel(entry: LeaderboardEntry | null): string {
  if (!entry) return "Not ranked yet. Settle more markets to qualify.";
  return `Rank ${entry.rank} on ${formatBoardLabel(entry.boardId)}.`;
}

function formatBoardLabel(boardId: string): string {
  if (boardId.startsWith("category:")) {
    const slug = boardId.slice("category:".length);
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
  switch (boardId) {
    case "accuracy":
      return "Accuracy";
    case "pnl_weekly":
      return "Weekly P&L";
    case "sharpness":
      return "Sharpness";
    default:
      return boardId;
  }
}

function formatBoardMetric(entry: LeaderboardEntry): string {
  switch (entry.boardId) {
    case "accuracy":
      return `${entry.metricValue.toFixed(1)}% correct`;
    case "sharpness":
      return `${(entry.metricValue * 100).toFixed(2)}% ROI`;
    case "pnl_weekly":
    default: {
      const sign = entry.metricValue < 0 ? "−" : "+";
      return `${sign}${formatUSD(Math.abs(entry.metricValue))} P&L`;
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
  return (
    <div className={`pf-stat ${tone ? `pf-stat-${tone}` : ""}`}>
      <span className="pf-stat-label">{label}</span>
      <span className="pf-stat-value mono">{value}</span>
      {sub && <span className="pf-stat-sub">{sub}</span>}
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
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "positions", label: "Positions", count: counts.positions },
    { key: "orders", label: "Open orders", count: counts.orders },
    { key: "history", label: "History", count: counts.history },
  ];
  return (
    <nav className="pf-tabs" role="tablist" aria-label="Portfolio tabs">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={tab === t.key}
          className={`pf-tab ${tab === t.key ? "active" : ""}`}
          onClick={() => setTab(t.key)}
        >
          <span>{t.label}</span>
          {t.count > 0 && <span className="pf-tab-count mono">{t.count}</span>}
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
  if (positions.length === 0) {
    return (
      <EmptyState
        line="No open positions."
        action={
          <Link href="/predict" className="pf-inline-link">
            Browse markets →
          </Link>
        }
      />
    );
  }
  return (
    <DataTable
      columns={[
        { label: "Market", width: "minmax(200px, 2fr)" },
        { label: "Side", width: "60px", align: "center" },
        { label: "Qty", width: "60px", align: "right" },
        { label: "Avg price", width: "90px", align: "right" },
        { label: "Cost", width: "90px", align: "right" },
      ]}
      rows={positions.map((p) => {
        const m = marketsById.get(p.marketId);
        return {
          key: p.id,
          href: m ? `/market/${m.ticker}` : undefined,
          cells: [
            <MarketCell key="m" market={m} fallback={p.marketId} />,
            <SideChip key="s" side={p.side} />,
            <span key="q" className="mono">
              {p.quantity}
            </span>,
            <span key="p" className="mono">
              {p.avgPriceCents}¢
            </span>,
            <span key="c" className="mono">
              {formatUSD(p.totalCostCents)}
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
}: {
  orders: PredictionOrder[];
  marketsById: Map<string, PredictionMarket>;
}) {
  if (orders.length === 0) {
    return <EmptyState line="No orders yet." />;
  }
  return (
    <DataTable
      columns={[
        { label: "Market", width: "minmax(200px, 2fr)" },
        { label: "Side", width: "60px", align: "center" },
        { label: "Qty", width: "60px", align: "right" },
        { label: "Cost", width: "90px", align: "right" },
        { label: "Status", width: "100px", align: "center" },
        { label: "Placed", width: "100px", align: "right" },
      ]}
      rows={orders.map((o) => {
        const m = marketsById.get(o.marketId);
        return {
          key: o.id,
          href: m ? `/market/${m.ticker}` : undefined,
          cells: [
            <MarketCell key="m" market={m} fallback={o.marketId} />,
            <SideChip key="s" side={o.side} />,
            <span key="q" className="mono">
              {o.quantity}
            </span>,
            <span key="c" className="mono">
              {formatUSD(o.totalCostCents)}
            </span>,
            <StatusChip key="st" status={o.status} />,
            <span key="d" className="mono pf-dim">
              {formatDate(o.createdAt)}
            </span>,
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
  pointsByMarketId,
}: {
  history: SettledPayout[];
  marketsById: Map<string, PredictionMarket>;
  pointsByMarketId: Map<string, number>;
}) {
  if (history.length === 0) {
    return (
      <EmptyState line="Settled positions will appear here after markets resolve." />
    );
  }
  return (
    <DataTable
      columns={[
        { label: "Market", width: "minmax(200px, 2fr)" },
        { label: "Side", width: "60px", align: "center" },
        { label: "Qty", width: "60px", align: "right" },
        { label: "Entry", width: "70px", align: "right" },
        { label: "Exit", width: "70px", align: "right" },
        { label: "P&L", width: "90px", align: "right" },
        { label: "Points", width: "70px", align: "right" },
        { label: "Settled", width: "100px", align: "right" },
      ]}
      rows={history.map((h) => {
        const m = marketsById.get(h.marketId);
        const up = h.pnlCents >= 0;
        // Plan §1: trailing "+X pts" column. Hidden when earned == 0; never
        // shown as "+0 pts". Ledger stores cents-equivalent so we divide by
        // 100 for display, matching the /rewards page convention.
        const rawPoints = pointsByMarketId.get(h.marketId);
        const pointsDisplay =
          rawPoints && rawPoints > 0 ? Math.round(rawPoints / 100) : null;
        return {
          key: h.id,
          href: m ? `/market/${m.ticker}` : undefined,
          cells: [
            <MarketCell key="m" market={m} fallback={h.marketId} />,
            <SideChip key="s" side={h.side} />,
            <span key="q" className="mono">
              {h.quantity}
            </span>,
            <span key="e" className="mono">
              {h.entryPriceCents}¢
            </span>,
            <span key="x" className="mono">
              {h.exitPriceCents}¢
            </span>,
            <span key="p" className={`mono ${up ? "pf-gain" : "pf-loss"}`}>
              {up ? "+" : "−"}
              {formatUSD(Math.abs(h.pnlCents))}
            </span>,
            <span
              key="pts"
              className="mono pf-pts"
              aria-label={
                pointsDisplay !== null
                  ? `Earned ${pointsDisplay} points`
                  : undefined
              }
            >
              {pointsDisplay !== null ? `+${pointsDisplay} pts` : ""}
            </span>,
            <span key="d" className="mono pf-dim">
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
  if (!market) {
    return <span className="pf-dim mono">{fallback.slice(0, 8)}…</span>;
  }
  return (
    <div className="pf-market">
      <span className="pf-market-title">{market.title}</span>
      <span className="pf-market-ticker mono">{market.ticker}</span>
    </div>
  );
}

function SideChip({ side }: { side: "yes" | "no" }) {
  return (
    <span className={`pf-side pf-side-${side}`}>{side.toUpperCase()}</span>
  );
}

function StatusChip({ status }: { status: OrderStatus }) {
  return <span className={`pf-status pf-status-${status}`}>{status}</span>;
}

interface Column {
  label: string;
  width: string;
  align?: "left" | "right" | "center";
}

interface Row {
  key: string;
  href?: string;
  cells: React.ReactNode[];
}

function DataTable({ columns, rows }: { columns: Column[]; rows: Row[] }) {
  const template = columns.map((c) => c.width).join(" ");
  return (
    <div
      className="pf-table"
      role="table"
      style={{ ["--pf-cols" as string]: template }}
    >
      <div className="pf-thead" role="row">
        {columns.map((c) => (
          <span
            key={c.label}
            role="columnheader"
            style={{ textAlign: c.align ?? "left" }}
            className="pf-th"
          >
            {c.label}
          </span>
        ))}
      </div>
      <ul className="pf-tbody">
        {rows.map((r) => {
          const body = columns.map((c, i) => (
            <span
              key={i}
              role="cell"
              className="pf-td"
              style={{ textAlign: c.align ?? "left" }}
            >
              {r.cells[i]}
            </span>
          ));
          return (
            <li key={r.key} role="row" className="pf-tr">
              {r.href ? (
                <Link href={r.href} className="pf-tr-link">
                  {body}
                </Link>
              ) : (
                <div className="pf-tr-static">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyState({
  line,
  action,
}: {
  line: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="pf-empty">
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

function formatUSD(cents: number): string {
  if (Math.abs(cents) >= 1_000_000_00)
    return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (Math.abs(cents) >= 10_000_00) return `$${(cents / 1_000_00).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ── Styles ─────────────────────────────────────────────────────────────────

function Styles() {
  return (
    <style>{`
      .pf-wrap {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 0 60px;
      }

      .pf-head { margin-bottom: 20px; }
      .pf-title {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--t1);
        margin: 0 0 4px;
      }
      .pf-sub {
        font-size: 13px;
        color: var(--t3);
        margin: 0;
      }

      .pf-login-cta {
        display: inline-block;
        padding: 12px 22px;
        color: #04140a;
        border-radius: var(--r-md);
        font-weight: 700;
        font-size: 13px;
        text-decoration: none;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 50%),
          linear-gradient(115deg, #2be480 0%, #00ffaa 100%);
        border: 1px solid rgba(43, 228, 128, 0.6);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.5),
          0 10px 24px rgba(43, 228, 128, 0.18);
      }
      .pf-login-cta:hover { filter: brightness(1.05); }

      /* Summary strip */
      .pf-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 24px;
      }
      .pf-summary-5 { grid-template-columns: repeat(5, 1fr); }
      @media (max-width: 1024px) {
        .pf-summary-5 { grid-template-columns: repeat(3, 1fr); }
      }
      @media (max-width: 720px) {
        .pf-summary,
        .pf-summary-5 { grid-template-columns: repeat(2, 1fr); }
      }

      /* Stat card — soft warm-dark surface (Robinhood, P6). Same geometry
       * on all 5 cards, including the RankChip to keep the strip optically
       * even. */
      .pf-stat, .pf-rank-chip {
        position: relative;
        padding: 16px 18px;
        border-radius: var(--r-rh-lg);
        color: var(--t1);
        background: var(--surface-1);
        border: 1px solid var(--border-1);
        display: flex;
        flex-direction: column;
        gap: 4px;
        text-decoration: none;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .pf-rank-chip {
        background: var(--accent-soft);
        border-color: rgba(43, 228, 128, 0.3);
      }
      .pf-rank-chip:hover {
        border-color: rgba(43, 228, 128, 0.55);
        transform: translateY(-1px);
        transition: transform 120ms ease, border-color 120ms ease;
      }
      .pf-rank-chip:focus-visible {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent-soft);
      }

      .pf-pts {
        color: var(--t3);
        font-size: 12px;
        white-space: nowrap;
      }
      .pf-stat-label {
        font-size: 12px;
        font-weight: 500;
        color: var(--t3);
      }
      .pf-stat-value {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 22px;
        font-weight: 600;
        color: var(--t1);
        letter-spacing: -0.01em;
        font-variant-numeric: tabular-nums;
      }
      .pf-stat-yes .pf-stat-value { color: var(--yes); }
      .pf-stat-no .pf-stat-value { color: var(--no); }
      .pf-stat-gain .pf-stat-value { color: var(--accent); }
      .pf-stat-sub { font-size: 11px; color: var(--t3); }

      /* Tab bar — segmented pill control */
      .pf-tabs {
        display: inline-flex;
        gap: 4px;
        padding: 3px;
        margin-bottom: 18px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-1);
        border-radius: var(--r-pill);
      }
      .pf-tab {
        background: transparent;
        border: 0;
        padding: 8px 16px;
        border-radius: var(--r-pill);
        font-family: inherit;
        font-size: 12px;
        font-weight: 600;
        color: var(--t3);
        cursor: pointer;
        transition: color 120ms ease, background 120ms ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .pf-tab:hover { color: var(--t1); }
      .pf-tab.active {
        color: #061a10;
        background: var(--accent);
      }
      .pf-tab-count {
        font-size: 10px;
        padding: 1px 7px;
        border-radius: var(--r-pill);
        background: rgba(0, 0, 0, 0.18);
        color: var(--t2);
        font-variant-numeric: tabular-nums;
      }
      .pf-tab.active .pf-tab-count {
        background: rgba(0, 0, 0, 0.18);
        color: #061a10;
      }

      /* Table container — soft warm-dark card */
      .pf-table {
        position: relative;
        border-radius: var(--r-rh-lg);
        overflow: hidden;
        background: var(--surface-1);
        border: 1px solid var(--border-1);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .pf-thead, .pf-tr-link, .pf-tr-static {
        display: grid;
        grid-template-columns: var(--pf-cols);
        gap: 14px;
        padding: 12px 18px;
        align-items: center;
      }
      .pf-thead {
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid var(--border-1);
      }
      .pf-th {
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .pf-tbody {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .pf-tr {
        border-top: 1px solid var(--border-1);
      }
      .pf-tr:first-child { border-top: 0; }
      .pf-tr-link, .pf-tr-static {
        padding: 14px 18px;
        color: inherit;
        text-decoration: none;
        transition: background 120ms ease;
      }
      .pf-tr-link:hover { background: var(--surface-2); }
      .pf-td {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 13px;
        color: var(--t1);
        min-width: 0;
        font-variant-numeric: tabular-nums;
      }

      .pf-market {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .pf-market-title {
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 600;
        color: var(--t1);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pf-market-ticker {
        font-size: 10px;
        color: var(--t3);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .pf-side {
        display: inline-block;
        padding: 3px 8px;
        border-radius: var(--r-sm);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
      }
      .pf-side-yes {
        background: var(--yes-soft);
        color: var(--yes);
      }
      .pf-side-no {
        background: var(--no-soft);
        color: var(--no);
      }

      .pf-status {
        display: inline-block;
        padding: 3px 10px;
        border-radius: var(--r-pill);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: capitalize;
        background: rgba(255, 255, 255, 0.06);
        color: var(--t2);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .pf-status-filled {
        background: var(--yes-soft);
        color: var(--yes);
        border-color: var(--yes-border);
      }
      .pf-status-open, .pf-status-partial {
        background: rgba(43, 228, 128, 0.14);
        color: var(--accent);
        border-color: rgba(43, 228, 128, 0.3);
      }
      .pf-status-cancelled, .pf-status-expired {
        background: rgba(255, 255, 255, 0.04);
        color: var(--t3);
      }

      .pf-gain { color: var(--accent); font-weight: 700; text-shadow: 0 0 6px var(--accent-glow-color); }
      .pf-loss { color: var(--no); font-weight: 700; }
      .pf-dim  { color: var(--t3); }

      .pf-inline-link {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
      }
      .pf-inline-link:hover { text-decoration: underline; }

      .pf-empty {
        border-radius: var(--r-md);
        padding: 40px 20px;
        text-align: center;
        color: var(--t3);
        font-size: 13px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
        background: rgba(0, 0, 0, 0.18);
        border: 1px dashed rgba(255, 255, 255, 0.1);
      }
    `}</style>
  );
}
