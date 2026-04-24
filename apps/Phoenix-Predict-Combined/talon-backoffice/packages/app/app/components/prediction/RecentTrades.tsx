"use client";

/**
 * RecentTrades — tape of side-badged rows inside a .glass card.
 *
 * Each row is YES/NO side · price · size · time-ago. Styling matches
 * the market-detail mockup: 4-col grid, side chip, YES-blue / NO-peach
 * price colors, alternating row tint for legibility at high density.
 */

import type { Trade } from "@phoenix-ui/api-client/src/prediction-types";

interface RecentTradesProps {
  trades: Trade[];
  limit?: number;
}

function timeAgo(iso: string, now: number = Date.now()): string {
  const delta = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (delta < 60) return `${Math.floor(delta)}s`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
  return `${Math.floor(delta / 86400)}d`;
}

export default function RecentTrades({
  trades,
  limit = 12,
}: RecentTradesProps) {
  const visible = trades.slice(0, limit);

  return (
    <>
      <style>{`
        .rt-card { padding: 18px 20px 16px; border-radius: var(--r-md); }
        .rt-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .rt-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--t2);
        }
        .rt-sub { font-size: 11px; color: var(--t3); font-family: 'IBM Plex Mono', monospace; }
        .rt-tape {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-variant-numeric: tabular-nums;
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-height: 264px;
          overflow: hidden;
        }
        .rt-row {
          display: grid;
          grid-template-columns: 56px 52px 1fr 52px;
          align-items: center;
          padding: 5px 6px;
          border-radius: 6px;
          color: var(--t1);
          gap: 8px;
        }
        .rt-row:nth-child(odd) { background: rgba(255, 255, 255, 0.02); }
        .rt-side {
          font-weight: 600;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-align: center;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .rt-side.yes { color: var(--yes); background: rgba(127, 200, 255, 0.1); }
        .rt-side.no  { color: var(--no);  background: rgba(255, 155, 107, 0.1); }
        .rt-px { font-weight: 500; }
        .rt-px.yes { color: var(--yes); }
        .rt-px.no  { color: var(--no); }
        .rt-sz { color: var(--t2); font-size: 11px; }
        .rt-t  { text-align: right; color: var(--t3); font-size: 10px; }
        .rt-empty {
          text-align: center;
          color: var(--t3);
          font-size: 12px;
          padding: 20px 0;
        }
      `}</style>
      <section className="glass rt-card" aria-label="Recent trades">
        <div className="rt-head">
          <span className="rt-title">Recent trades</span>
          <span className="rt-sub">
            {visible.length > 0 ? `Last ${visible.length}` : "Tape"}
          </span>
        </div>
        {visible.length === 0 ? (
          <div className="rt-empty">No recent trades.</div>
        ) : (
          <div className="rt-tape">
            {visible.map((t) => {
              const sideKey = t.side === "yes" ? "yes" : "no";
              const px = t.side === "yes" ? t.priceCents : 100 - t.priceCents;
              const size = (t.quantity * px) / 100;
              return (
                <div key={t.id} className="rt-row">
                  <span className={`rt-side ${sideKey}`}>
                    {t.side.toUpperCase()}
                  </span>
                  <span className={`rt-px ${sideKey}`}>{px}¢</span>
                  <span className="rt-sz">${size.toFixed(2)}</span>
                  <span className="rt-t">{timeAgo(t.tradedAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
