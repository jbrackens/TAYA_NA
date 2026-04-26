"use client";

/**
 * OrderBook — solid-fill table inside a .glass card.
 *
 * Shows the top N ask levels (NO side) descending, a spread strip, then
 * the top N bid levels (YES side) descending. Depth bars render as
 * row ::after gradients (CSS lives here; data sets --depth per row).
 *
 * Real level data isn't wired to the gateway yet. Until /orderbook lands,
 * callers can pass a synthesized book derived from the current
 * yes/noPrice + liquidity for shape-only rendering. When real levels
 * arrive the shape won't change.
 */

interface BookLevel {
  priceCents: number;
  size: number;
  total: number;
}

interface OrderBookProps {
  bids: BookLevel[];
  asks: BookLevel[];
  maxDepth?: number;
}

export default function OrderBook({ bids, asks, maxDepth }: OrderBookProps) {
  const bestBid = bids[0]?.priceCents ?? 0;
  const bestAsk = asks[asks.length - 1]?.priceCents ?? 0;
  const mid =
    bestBid && bestAsk ? Math.round((bestBid + (100 - bestAsk)) / 2) : 0;
  const spread = bestBid && bestAsk ? Math.abs(100 - bestAsk - bestBid) : 0;
  const maxSize = Math.max(
    maxDepth ?? 0,
    ...bids.map((l) => l.size),
    ...asks.map((l) => l.size),
    1,
  );

  return (
    <>
      <style>{`
        .ob-card {
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          padding: 20px;
          border-radius: var(--r-rh-lg);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .ob-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-1);
        }
        .ob-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--t1);
          letter-spacing: -0.01em;
        }
        .ob-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--t3);
        }
        .ob-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          position: relative;
          isolation: isolate;
        }
        .ob-table th {
          text-align: left;
          font-weight: 500;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--t3);
          font-family: 'Inter', sans-serif;
          padding: 6px 10px;
          border-bottom: 1px solid var(--border-1);
        }
        .ob-table th.n, .ob-table td.n { text-align: right; }
        .ob-table td {
          padding: 7px 10px;
          color: var(--t1);
          position: relative;
        }
        .ob-table td.yes-px { color: var(--yes); font-weight: 600; }
        .ob-table td.no-px { color: var(--no); font-weight: 600; }
        .ob-table tr { position: relative; }
        .ob-table tr.bid::after, .ob-table tr.ask::after {
          content: '';
          position: absolute;
          top: 3px;
          bottom: 3px;
          right: 0;
          width: calc(var(--depth, 0) * 1%);
          border-radius: 3px;
          z-index: -1;
          pointer-events: none;
        }
        .ob-table tr.bid::after {
          background: linear-gradient(90deg, transparent, var(--yes-soft));
        }
        .ob-table tr.ask::after {
          background: linear-gradient(90deg, transparent, var(--no-soft));
        }
        .ob-spread {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 10px 0;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--t3);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border-top: 1px solid var(--border-1);
          border-bottom: 1px solid var(--border-1);
          margin: 4px 0;
        }
        .ob-empty {
          text-align: center;
          color: var(--t3);
          font-size: 12px;
          padding: 16px 0;
        }
      `}</style>
      <section className="ob-card" aria-label="Order book">
        <div className="ob-head">
          <span className="ob-title">Order book</span>
          <span className="ob-sub">
            Aggregated · {asks.length + bids.length} levels
          </span>
        </div>

        {asks.length + bids.length === 0 ? (
          <div className="ob-empty">No orders resting yet.</div>
        ) : (
          <>
            {asks.length > 0 && (
              <table className="ob-table">
                <thead>
                  <tr>
                    <th>Side</th>
                    <th className="n">Price</th>
                    <th className="n">Size</th>
                    <th className="n">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {asks.map((l) => (
                    <tr
                      key={`ask-${l.priceCents}`}
                      className="ask"
                      style={{
                        ["--depth" as string]: Math.min(
                          100,
                          (l.size / maxSize) * 100,
                        ),
                      }}
                    >
                      <td className="no-px">NO {100 - l.priceCents}¢</td>
                      <td className="n">{l.size}</td>
                      <td className="n">
                        {((l.size * (100 - l.priceCents)) / 100).toFixed(2)}
                      </td>
                      <td className="n">
                        {((l.total * (100 - l.priceCents)) / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {bestBid > 0 && bestAsk > 0 && (
              <div className="ob-spread">
                SPREAD · {spread}¢ · MID {mid}¢
              </div>
            )}

            {bids.length > 0 && (
              <table className="ob-table">
                <tbody>
                  {bids.map((l) => (
                    <tr
                      key={`bid-${l.priceCents}`}
                      className="bid"
                      style={{
                        ["--depth" as string]: Math.min(
                          100,
                          (l.size / maxSize) * 100,
                        ),
                      }}
                    >
                      <td className="yes-px">YES {l.priceCents}¢</td>
                      <td className="n">{l.size}</td>
                      <td className="n">
                        {((l.size * l.priceCents) / 100).toFixed(2)}
                      </td>
                      <td className="n">
                        {((l.total * l.priceCents) / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </>
  );
}

export type { BookLevel };
