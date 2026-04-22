"use client";

/**
 * MarketDetailPage — broadcast-fintech market view.
 *
 * Layout (matches DESIGN.md tokens):
 *   [breadcrumb]
 *   ┌────────────────────────────┐ ┌────────────┐
 *   │ HERO: eyebrow, title,      │ │ TRADE      │
 *   │ chart, price tiles, stats  │ │ TICKET     │
 *   ├────────────────────────────┤ │ (sticky)   │
 *   │ OUTCOME LADDER             │ │            │
 *   ├────────────────────────────┤ │            │
 *   │ RECENT TRADES              │ │            │
 *   ├────────────────────────────┤ │            │
 *   │ RESOLUTION                 │ │            │
 *   └────────────────────────────┘ └────────────┘
 *
 * The chart is a deterministic SVG line derived from the ticker — same
 * approach as MarketCard but richer (area fill, grid ticks, current
 * price marker). When the backend exposes historical prices we'll swap
 * this for real data.
 *
 * Recent trades are best-effort: the /trades endpoint is not yet wired
 * on the gateway so we catch errors and show an empty state.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TradeTicket } from "../../components/prediction/TradeTicket";
import { logger } from "../../lib/logger";
import type {
  PredictionMarket,
  PredictionEvent,
  Trade,
  OrderSide,
  OrderPreview,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

export default function MarketDetailPage() {
  const params = useParams() ?? {};
  const ticker = (params.ticker as string | undefined) ?? "";

  const [market, setMarket] = useState<PredictionMarket | null>(null);
  const [event, setEvent] = useState<PredictionEvent | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarket = useCallback(async () => {
    const m = await api.getMarket(ticker);
    setMarket(m);
    return m;
  }, [ticker]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const m = await loadMarket();
        if (cancelled) return;
        // Sibling-outcome fetch — fail quietly, the page still renders.
        try {
          const ev = await api.getEvent(m.eventId);
          if (!cancelled) setEvent(ev);
        } catch (err: unknown) {
          logger.warn("MarketDetail", "event fetch failed", err);
        }
        // Trades endpoint not wired on gateway — don't fail the page.
        try {
          const t = await api.getMarketTrades(m.id, 20);
          if (!cancelled) setTrades(t);
        } catch (err: unknown) {
          logger.warn("MarketDetail", "trades fetch failed", err);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load market",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [loadMarket]);

  const handlePreview = useCallback(
    async (side: OrderSide, quantity: number): Promise<OrderPreview | null> => {
      if (!market) return null;
      try {
        return await api.previewOrder({
          marketId: market.id,
          side,
          action: "buy",
          orderType: "market",
          quantity,
        });
      } catch (err: unknown) {
        logger.warn("MarketDetail", "preview failed", err);
        return null;
      }
    },
    [market],
  );

  const handleSubmit = useCallback(
    async (side: OrderSide, quantity: number) => {
      if (!market) return;
      await api.placeOrder({
        marketId: market.id,
        side,
        action: "buy",
        orderType: "market",
        quantity,
      });
      // Refresh market + trades after a fill.
      try {
        const updated = await loadMarket();
        try {
          const t = await api.getMarketTrades(updated.id, 20);
          setTrades(t);
        } catch (err: unknown) {
          logger.warn("MarketDetail", "post-trade trades refresh failed", err);
        }
      } catch (err: unknown) {
        logger.error("MarketDetail", "post-trade market refresh failed", err);
      }
    },
    [market, loadMarket],
  );

  if (loading) {
    return <PageState>Loading market…</PageState>;
  }

  if (error || !market) {
    return <PageState tone="error">{error || "Market not found"}</PageState>;
  }

  return (
    <div className="md-wrap">
      <Styles />
      <MarketBreadcrumb market={market} event={event} />

      <div className="md-grid">
        <div className="md-main">
          <MarketHero market={market} />
          <OutcomeLadder market={market} event={event} />
          <RecentTrades trades={trades} />
          <ResolutionCard market={market} />
        </div>

        <aside className="md-side">
          <TradeTicket
            market={market}
            onPreview={handlePreview}
            onSubmit={handleSubmit}
          />
        </aside>
      </div>
    </div>
  );
}

// ── Page-level state ────────────────────────────────────────────────────────

function PageState({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "error";
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        fontSize: 13,
        color: tone === "error" ? "var(--no)" : "var(--t3)",
      }}
    >
      {children}
    </div>
  );
}

// ── Breadcrumb ──────────────────────────────────────────────────────────────

function MarketBreadcrumb({
  market,
  event,
}: {
  market: PredictionMarket;
  event: PredictionEvent | null;
}) {
  const category = market.ticker.split("-")[0].toUpperCase();
  return (
    <nav className="md-crumb" aria-label="Breadcrumb">
      <Link href="/predict" className="md-crumb-link">
        All markets
      </Link>
      <span className="md-crumb-sep">/</span>
      <span className="md-crumb-cat">{category}</span>
      {event && event.title !== market.title && (
        <>
          <span className="md-crumb-sep">/</span>
          <span className="md-crumb-event">{event.title}</span>
        </>
      )}
    </nav>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

function MarketHero({ market }: { market: PredictionMarket }) {
  const isSettled = market.status === "settled";
  const isOpen = market.status === "open";
  const timeLeft = formatTimeLeft(market.closeAt);

  // Status pill: live-cyan for open, amber for halted, gray for closed.
  const statusLabel =
    market.status === "halted"
      ? "HALTED"
      : market.status === "closed"
        ? "CLOSED"
        : market.status === "settled"
          ? `SETTLED · ${market.result?.toUpperCase() ?? ""}`
          : "LIVE";

  // Deterministic chart — 60 points across an imagined 24h window.
  const chartPoints = useMemo(
    () => seededPricePath(market.ticker, market.yesPriceCents),
    [market.ticker, market.yesPriceCents],
  );

  return (
    <section className="md-hero" aria-label="Market summary">
      <div className="md-hero-glow" />
      <div className="md-hero-inner">
        <div className="md-hero-meta">
          <span className={`md-hero-status ${isOpen ? "live" : "off"}`}>
            {isOpen && <span className="live-dot" />}
            {statusLabel}
          </span>
          <span className="md-hero-dot">·</span>
          <span className="mono md-hero-ticker">{market.ticker}</span>
          {!isSettled && (
            <>
              <span className="md-hero-dot">·</span>
              <span>Closes {timeLeft}</span>
            </>
          )}
        </div>

        <h1 className="md-hero-title">{market.title}</h1>

        <MarketChart
          points={chartPoints}
          yesPriceCents={market.yesPriceCents}
        />

        <div className="md-price-row">
          <PriceTile side="yes" priceCents={market.yesPriceCents} label="YES" />
          <PriceTile side="no" priceCents={market.noPriceCents} label="NO" />
        </div>

        <div className="md-stat-row">
          <StatCell label="Volume" value={formatUSD(market.volumeCents)} />
          <StatCell
            label="Open interest"
            value={formatUSD(market.openInterestCents)}
          />
          <StatCell
            label="Last trade"
            value={
              market.lastTradePriceCents != null
                ? `${market.lastTradePriceCents}¢`
                : "—"
            }
          />
          <StatCell label="Closes" value={formatCloseDate(market.closeAt)} />
        </div>
      </div>
    </section>
  );
}

function PriceTile({
  side,
  priceCents,
  label,
}: {
  side: OrderSide;
  priceCents: number;
  label: string;
}) {
  // Placeholder delta, same scheme as MarketCard. Real 24h deltas land
  // when the backend exposes price snapshots.
  const delta = priceCents % 7 === 0 ? 3 : (priceCents % 5) - 2;
  const yesDirUp = side === "yes" ? delta > 0 : delta < 0;
  const sign = delta === 0 ? "" : yesDirUp ? "+" : "−";
  return (
    <div className={`md-price ${side}`}>
      <span className="md-price-label">{label}</span>
      <div className="md-price-value">
        <strong className="mono">{priceCents}¢</strong>
        {delta !== 0 && (
          <span className={`md-price-delta ${yesDirUp ? "up" : "dn"} mono`}>
            {sign}
            {Math.abs(delta)}¢
          </span>
        )}
      </div>
      <span className="md-price-implied mono">{priceCents}% implied</span>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="md-stat">
      <span className="md-stat-label">{label}</span>
      <span className="md-stat-value mono">{value}</span>
    </div>
  );
}

// ── Chart ───────────────────────────────────────────────────────────────────

interface ChartPoint {
  x: number;
  y: number;
}

function MarketChart({
  points,
  yesPriceCents,
}: {
  points: ChartPoint[];
  yesPriceCents: number;
}) {
  // Viewbox: 600 x 140. y=0 is top, y=140 is bottom. Prices 0-100 map to
  // the drawable band (14–126) so the line never touches the edges.
  const W = 600;
  const H = 140;
  const top = 14;
  const bottom = 126;
  const yForCents = (c: number) => bottom - (c / 100) * (bottom - top);

  const trendingUp = yesPriceCents >= 50;
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  const lastX = points[points.length - 1]?.x ?? W;
  const lastY = points[points.length - 1]?.y ?? yForCents(yesPriceCents);
  const stroke = trendingUp ? "var(--yes)" : "var(--no)";
  const fillId = trendingUp ? "chart-fill-yes" : "chart-fill-no";

  return (
    <div className="md-chart" aria-hidden="true">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="md-chart-svg"
      >
        <defs>
          <linearGradient id="chart-fill-yes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="chart-fill-no" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines — 25¢, 50¢, 75¢ */}
        {[25, 50, 75].map((c) => (
          <line
            key={c}
            x1={0}
            y1={yForCents(c)}
            x2={W}
            y2={yForCents(c)}
            stroke="var(--b1)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        ))}

        {/* Area fill */}
        <polygon points={area} fill={`url(#${fillId})`} />

        {/* Main line */}
        <polyline
          points={line}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Current-price dot + 50% reference dashed */}
        <circle
          cx={lastX}
          cy={lastY}
          r={4}
          fill={stroke}
          stroke="var(--s1)"
          strokeWidth={2}
        />
      </svg>

      {/* Y-axis tick labels overlay (outside svg to keep them crisp) */}
      <div className="md-chart-yaxis">
        <span>75¢</span>
        <span>50¢</span>
        <span>25¢</span>
      </div>
    </div>
  );
}

// ── Outcome Ladder ──────────────────────────────────────────────────────────

function OutcomeLadder({
  market,
  event,
}: {
  market: PredictionMarket;
  event: PredictionEvent | null;
}) {
  const siblings = (event?.markets ?? []).filter((m) => m.status !== "voided");
  // Multi-outcome event → show all sibling markets as a ranked ladder.
  const isMultiOutcome = siblings.length > 1;

  if (isMultiOutcome) {
    const ranked = [...siblings].sort(
      (a, b) => b.yesPriceCents - a.yesPriceCents,
    );
    return (
      <section className="md-card md-ladder" aria-label="Outcome ladder">
        <header className="md-card-head">
          <h2 className="md-card-title">All outcomes</h2>
          <span className="md-card-sub">{ranked.length} markets</span>
        </header>
        <ul className="md-ladder-list">
          {ranked.map((m) => (
            <LadderRow key={m.id} sibling={m} active={m.id === market.id} />
          ))}
        </ul>
      </section>
    );
  }

  // Solo binary market → show a single probability split visualization.
  return (
    <section className="md-card md-split" aria-label="Probability split">
      <header className="md-card-head">
        <h2 className="md-card-title">Probability</h2>
        <span className="md-card-sub">
          Binary · resolves at{" "}
          <span className="mono">{formatCloseDate(market.closeAt)}</span>
        </span>
      </header>
      <div className="md-splitbar">
        <div
          className="md-splitbar-yes"
          style={{ width: `${market.yesPriceCents}%` }}
        >
          <span className="md-splitbar-label">
            YES <span className="mono">{market.yesPriceCents}%</span>
          </span>
        </div>
        <div className="md-splitbar-no">
          <span className="md-splitbar-label">
            <span className="mono">{market.noPriceCents}%</span> NO
          </span>
        </div>
      </div>
    </section>
  );
}

function LadderRow({
  sibling,
  active,
}: {
  sibling: PredictionMarket;
  active: boolean;
}) {
  const pct = sibling.yesPriceCents;
  return (
    <li className={`md-ladder-row ${active ? "active" : ""}`}>
      <Link href={`/market/${sibling.ticker}`} className="md-ladder-link">
        <span className="md-ladder-name">{sibling.title}</span>
        <div className="md-ladder-bar">
          <div className="md-ladder-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="md-ladder-price mono">{pct}¢</span>
      </Link>
    </li>
  );
}

// ── Recent Trades ───────────────────────────────────────────────────────────

function RecentTrades({ trades }: { trades: Trade[] }) {
  return (
    <section className="md-card md-trades" aria-label="Recent trades">
      <header className="md-card-head">
        <h2 className="md-card-title">Recent trades</h2>
        <span className="md-card-sub">
          {trades.length > 0 ? `${trades.length} fills` : "Last 20 fills"}
        </span>
      </header>
      {trades.length === 0 ? (
        <div className="md-trades-empty">No trades yet.</div>
      ) : (
        <div className="md-trades-table">
          <div className="md-trades-head">
            <span>Side</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Time</span>
          </div>
          <ul className="md-trades-body">
            {trades.slice(0, 20).map((t) => (
              <li key={t.id} className="md-trades-row">
                <span className={`md-trade-side ${t.side}`}>
                  {t.side.toUpperCase()}
                </span>
                <span className="mono md-trade-qty">×{t.quantity}</span>
                <span className="mono md-trade-price">{t.priceCents}¢</span>
                <span className="md-trade-time mono">
                  {formatTime(t.tradedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Resolution ──────────────────────────────────────────────────────────────

function ResolutionCard({ market }: { market: PredictionMarket }) {
  return (
    <section className="md-card md-resolve" aria-label="Resolution">
      <header className="md-card-head">
        <h2 className="md-card-title">Resolution</h2>
      </header>
      {market.description && (
        <p className="md-resolve-desc">{market.description}</p>
      )}
      <dl className="md-resolve-grid">
        <div>
          <dt>Source</dt>
          <dd className="mono">{market.settlementSourceKey}</dd>
        </div>
        <div>
          <dt>Rule</dt>
          <dd className="mono">{market.settlementRule}</dd>
        </div>
        <div>
          <dt>Close date</dt>
          <dd className="mono">{formatCloseDate(market.closeAt)}</dd>
        </div>
        <div>
          <dt>Fee</dt>
          <dd className="mono">{(market.feeRateBps / 100).toFixed(2)}%</dd>
        </div>
      </dl>
    </section>
  );
}

// ── Utilities ───────────────────────────────────────────────────────────────

/** Deterministic price path from a seed. Matches MarketCard's approach so
 * the chart on the hero tells the same story as the card that got clicked. */
function seededPricePath(seed: string, endCents: number): ChartPoint[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const W = 600;
  const H = 140;
  const top = 14;
  const bottom = 126;
  const n = 60;
  const yForCents = (c: number) => bottom - (c / 100) * (bottom - top);
  // Start somewhere plausible around end price; random-walk toward endCents.
  let c = Math.max(8, Math.min(92, endCents + ((hash % 30) - 15)));
  const pts: ChartPoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * W;
    hash = (hash * 1103515245 + 12345) >>> 0;
    const noise = ((hash >>> 16) % 10) - 5;
    const pull = (endCents - c) * 0.08;
    c = Math.max(3, Math.min(97, c + pull + noise * 0.6));
    pts.push({ x, y: yForCents(c) });
  }
  // Pin the last point exactly to endCents so the dot aligns with the price tile.
  pts[pts.length - 1] = { x: W, y: yForCents(endCents) };
  return pts;
}

function formatUSD(cents: number): string {
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(0)}`;
}

function formatTimeLeft(closeAt: string): string {
  const diff = new Date(closeAt).getTime() - Date.now();
  if (diff <= 0) return "now";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return `in ${Math.floor(diff / 60000)}m`;
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `in ${days}d`;
  return `on ${formatCloseDate(closeAt)}`;
}

function formatCloseDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Styles ──────────────────────────────────────────────────────────────────

function Styles() {
  return (
    <style>{`
      .md-wrap {
        max-width: 1440px;
        margin: 0 auto;
        padding: 24px 24px 60px;
      }

      .md-crumb {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--t3);
        margin-bottom: 16px;
      }
      .md-crumb-link { color: var(--t3); transition: color 0.15s; }
      .md-crumb-link:hover { color: var(--accent); }
      .md-crumb-sep { color: var(--t4); }
      .md-crumb-cat { color: var(--t2); font-weight: 700; }
      .md-crumb-event { color: var(--t2); text-transform: none; letter-spacing: normal; font-weight: 500; }

      .md-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 20px;
        align-items: start;
      }
      @media (max-width: 1024px) {
        .md-grid { grid-template-columns: 1fr; }
      }

      .md-main {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
      }

      .md-side {
        position: sticky;
        top: 124px;
      }
      @media (max-width: 1024px) {
        .md-side { position: static; }
      }

      /* ── Hero ── */
      .md-hero {
        position: relative;
        overflow: hidden;
        border-radius: var(--r-lg);
        border: 1px solid var(--b1);
        background:
          linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        padding: 28px;
      }
      .md-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(ellipse at top right, rgba(57,255,20,0.18), transparent 45%),
          radial-gradient(ellipse at bottom left, rgba(239,68,68,0.08), transparent 55%);
        pointer-events: none;
      }
      .md-hero-glow {
        position: absolute;
        right: -6%;
        top: -20%;
        width: 55%;
        height: 160%;
        background: linear-gradient(135deg, var(--accent), #0b5e0a);
        border-radius: 50%;
        filter: blur(90px);
        opacity: 0.14;
        pointer-events: none;
      }
      .md-hero-inner { position: relative; z-index: 1; }

      .md-hero-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        color: var(--t3);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin-bottom: 14px;
      }
      .md-hero-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-weight: 700;
        letter-spacing: 0.08em;
      }
      .md-hero-status.live {
        background: rgba(239,68,68,0.14);
        border: 1px solid rgba(239,68,68,0.4);
        color: var(--live);
      }
      .md-hero-status.off {
        background: rgba(148,163,184,0.14);
        border: 1px solid var(--b2);
        color: var(--t2);
      }
      .md-hero-dot { color: var(--t4); }
      .md-hero-ticker { color: var(--t2); font-weight: 600; text-transform: none; letter-spacing: 0; }

      .md-hero-title {
        font-size: 32px;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1.15;
        color: var(--t1);
        margin: 0 0 20px;
      }
      @media (max-width: 640px) {
        .md-hero-title { font-size: 24px; }
      }

      /* ── Chart ── */
      .md-chart {
        position: relative;
        margin-bottom: 20px;
      }
      .md-chart-svg {
        display: block;
        width: 100%;
        height: 140px;
      }
      .md-chart-yaxis {
        position: absolute;
        inset: 0 auto 0 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 8px 0;
        pointer-events: none;
        font-family: 'IBM Plex Mono', monospace;
        font-variant-numeric: tabular-nums;
        font-size: 10px;
        color: var(--t4);
      }
      .md-chart-yaxis span {
        background: rgba(15,22,35,0.6);
        padding: 1px 5px;
        border-radius: 3px;
        align-self: flex-start;
      }

      /* ── Price tiles ── */
      .md-price-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 18px;
      }
      .md-price {
        padding: 16px 18px;
        border-radius: var(--r-md);
        background: var(--s2);
        border: 1px solid var(--b1);
        transition: border-color 0.15s, background 0.15s;
      }
      .md-price.yes:hover { border-color: var(--yes); background: rgba(52,211,153,0.06); }
      .md-price.no:hover { border-color: var(--no); background: rgba(248,113,113,0.06); }
      .md-price-label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: var(--t3);
        margin-bottom: 4px;
      }
      .md-price-value {
        display: flex;
        align-items: baseline;
        gap: 10px;
      }
      .md-price-value strong {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .md-price.yes strong { color: var(--yes); }
      .md-price.no strong { color: var(--no); }
      .md-price-delta { font-size: 13px; font-weight: 600; }
      .md-price-delta.up { color: var(--yes); }
      .md-price-delta.dn { color: var(--no); }
      .md-price-implied {
        display: block;
        font-size: 11px;
        color: var(--t3);
        margin-top: 2px;
      }

      /* ── Stats row ── */
      .md-stat-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid var(--b1);
      }
      @media (max-width: 640px) {
        .md-stat-row { grid-template-columns: repeat(2, 1fr); }
      }
      .md-stat { display: flex; flex-direction: column; gap: 4px; }
      .md-stat-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .md-stat-value {
        font-size: 15px;
        font-weight: 600;
        color: var(--t1);
      }

      /* ── Card shell (ladder / trades / resolve share this) ── */
      .md-card {
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-md);
        padding: 20px;
      }
      .md-card-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 14px;
      }
      .md-card-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--t1);
        margin: 0;
        letter-spacing: -0.01em;
      }
      .md-card-sub {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--t3);
      }

      /* ── Outcome ladder (multi-outcome) ── */
      .md-ladder-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .md-ladder-row {
        border-radius: var(--r-sm);
        background: var(--s2);
        border: 1px solid transparent;
        transition: border-color 0.15s, background 0.15s;
      }
      .md-ladder-row.active {
        border-color: var(--accent);
        background: var(--accent-soft);
      }
      .md-ladder-row:hover { border-color: var(--b2); }
      .md-ladder-row.active:hover { border-color: var(--accent); }
      .md-ladder-link {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(140px, 2fr) 56px;
        gap: 14px;
        align-items: center;
        padding: 10px 14px;
        color: inherit;
        text-decoration: none;
      }
      .md-ladder-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--t1);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .md-ladder-bar {
        position: relative;
        height: 8px;
        background: var(--s0);
        border-radius: 999px;
        overflow: hidden;
      }
      .md-ladder-bar-fill {
        position: absolute;
        inset: 0 auto 0 0;
        background: linear-gradient(90deg, var(--yes), #10b981);
        border-radius: 999px;
        transition: width 0.4s ease-out;
      }
      .md-ladder-price {
        font-size: 14px;
        font-weight: 700;
        color: var(--yes);
        text-align: right;
      }

      /* ── Split bar (solo binary) ── */
      .md-splitbar {
        display: flex;
        height: 48px;
        border-radius: var(--r-sm);
        overflow: hidden;
        background: var(--s2);
      }
      .md-splitbar-yes {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 0 14px;
        background: linear-gradient(90deg, rgba(52,211,153,0.25), rgba(52,211,153,0.4));
        border-right: 1px solid var(--s1);
        min-width: 56px;
        transition: width 0.4s ease-out;
      }
      .md-splitbar-no {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 0 14px;
        background: linear-gradient(90deg, rgba(248,113,113,0.25), rgba(248,113,113,0.4));
      }
      .md-splitbar-label {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--t1);
        text-transform: uppercase;
      }
      .md-splitbar-yes .md-splitbar-label { color: var(--yes); }
      .md-splitbar-no .md-splitbar-label { color: var(--no); }

      /* ── Recent trades ── */
      .md-trades-empty {
        padding: 20px 0;
        text-align: center;
        font-size: 12px;
        color: var(--t3);
      }
      .md-trades-table {
        display: flex;
        flex-direction: column;
      }
      .md-trades-head, .md-trades-row {
        display: grid;
        grid-template-columns: 80px 60px 1fr 80px;
        gap: 12px;
        padding: 8px 0;
        font-size: 12px;
        align-items: center;
      }
      .md-trades-head {
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
        border-bottom: 1px solid var(--b1);
        font-size: 10px;
      }
      .md-trades-body {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .md-trades-row {
        border-bottom: 1px solid var(--b1);
      }
      .md-trades-row:last-child { border-bottom: 0; }
      .md-trade-side {
        font-weight: 700;
        letter-spacing: 0.08em;
        font-size: 11px;
      }
      .md-trade-side.yes { color: var(--yes); }
      .md-trade-side.no { color: var(--no); }
      .md-trade-qty { color: var(--t2); font-size: 13px; }
      .md-trade-price { color: var(--t1); font-weight: 700; font-size: 13px; }
      .md-trade-time { color: var(--t3); text-align: right; }

      /* ── Resolution ── */
      .md-resolve-desc {
        font-size: 13px;
        line-height: 1.55;
        color: var(--t2);
        margin: 0 0 14px;
      }
      .md-resolve-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px 20px;
        margin: 0;
      }
      @media (max-width: 640px) {
        .md-resolve-grid { grid-template-columns: 1fr; }
      }
      .md-resolve-grid > div {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .md-resolve-grid dt {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .md-resolve-grid dd {
        font-size: 13px;
        color: var(--t1);
        margin: 0;
      }
    `}</style>
  );
}
