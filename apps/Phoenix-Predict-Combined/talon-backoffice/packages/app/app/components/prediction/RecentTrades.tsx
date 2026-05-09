"use client";

/**
 * RecentTrades — tape of side-badged rows inside a .glass card.
 *
 * Each row is YES/NO side · price · size · time-ago. Styling matches
 * the market-detail mockup: 4-col grid, side chip, seafoam YES / coral NO
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

/**
 * Render row for the trade tape. Either a single secondary trade or a
 * collapsed issuance pair (two rows from the gateway sharing matchId).
 */
type TapeRow =
  | { kind: "secondary"; trade: Trade }
  | {
      kind: "issuance";
      matchId: string;
      yesTrade: Trade;
      noTrade: Trade;
    };

/**
 * Collapse trades into tape rows. Issuance trades arrive as two trade
 * rows from /trades sharing a matchId — group them so the tape shows
 * one line per match (with both YES and NO prices) instead of two
 * apparently-duplicate lines. Secondary trades pass through 1:1.
 *
 * Order is preserved by first-occurrence timestamp.
 */
function collapseTrades(trades: Trade[]): TapeRow[] {
  const seen = new Map<string, TapeRow>();
  const order: string[] = [];
  for (const t of trades) {
    if (t.tradeKind === "issuance" && t.matchId) {
      const existing = seen.get(t.matchId);
      if (!existing) {
        const row: TapeRow = {
          kind: "issuance",
          matchId: t.matchId,
          yesTrade: t.side === "yes" ? t : t,
          noTrade: t.side === "no" ? t : t,
        };
        // Initial fill: one side known, other will arrive next.
        seen.set(t.matchId, row);
        order.push(t.matchId);
      } else if (existing.kind === "issuance") {
        if (t.side === "yes") existing.yesTrade = t;
        else existing.noTrade = t;
      }
    } else {
      // Secondary or untagged (legacy AMM trades have no matchId/tradeKind).
      const key = t.id;
      seen.set(key, { kind: "secondary", trade: t });
      order.push(key);
    }
  }
  return order.map((k) => seen.get(k)!).filter(Boolean);
}

export default function RecentTrades({
  trades,
  limit = 12,
}: RecentTradesProps) {
  const collapsed = collapseTrades(trades);
  const visible = collapsed.slice(0, limit);

  return (
    <>
      <style>{`
        .rt-card {
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          padding: 20px;
          border-radius: var(--r-rh-lg);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .rt-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-1);
        }
        .rt-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--t1);
          letter-spacing: -0.01em;
        }
        .rt-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--t3);
        }
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
          padding: 6px 8px;
          border-radius: var(--r-rh-sm);
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
          border-radius: var(--r-pill);
        }
        .rt-side.yes { color: var(--yes-text); background: var(--yes-soft); }
        .rt-side.no  { color: var(--no-text);  background: var(--no-soft); }
        .rt-px { font-weight: 600; }
        .rt-px.yes { color: var(--yes-text); }
        .rt-px.no  { color: var(--no-text); }
        .rt-sz { color: var(--t2); font-size: 11px; }
        .rt-t  { text-align: right; color: var(--t3); font-size: 10px; }
        .rt-empty {
          text-align: center;
          color: var(--t3);
          font-size: 12px;
          padding: 20px 0;
        }
      `}</style>
      <section className="rt-card" aria-label="Recent trades">
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
            {visible.map((row) => {
              if (row.kind === "issuance") {
                // Both sides minted in one match. Show a "MINT" pill and
                // both prices side-by-side. Notional = qty * 100¢ ($1/contract).
                const yPx = row.yesTrade.priceCents;
                const nPx = row.noTrade.priceCents;
                const qty = row.yesTrade.quantity;
                const size = qty; // $1/contract on issuance
                return (
                  <div key={row.matchId} className="rt-row">
                    <span
                      className="rt-side"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                      title="Complementary issuance — both sides minted from collateral"
                    >
                      MINT
                    </span>
                    <span className="rt-px">
                      <span className="rt-px yes">{yPx}¢</span>
                      <span style={{ color: "var(--t3)", margin: "0 4px" }}>
                        /
                      </span>
                      <span className="rt-px no">{nPx}¢</span>
                    </span>
                    <span className="rt-sz">${size.toFixed(2)}</span>
                    <span className="rt-t">
                      {timeAgo(row.yesTrade.tradedAt)}
                    </span>
                  </div>
                );
              }
              const t = row.trade;
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
