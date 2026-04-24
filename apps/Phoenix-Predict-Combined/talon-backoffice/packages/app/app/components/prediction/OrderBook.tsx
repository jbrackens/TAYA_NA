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
        .ob-card { padding: 18px 20px 16px; border-radius: var(--r-md); }
        .ob-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .ob-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--t2);
        }
        .ob-sub { font-size: 11px; color: var(--t3); font-family: 'IBM Plex Mono', monospace; }
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
          font-weight: 600;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--t3);
          font-family: 'Outfit', sans-serif;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .ob-table th.n, .ob-table td.n { text-align: right; }
        .ob-table td {
          padding: 7px 10px;
          color: var(--t1);
          position: relative;
        }
        .ob-table td.yes-px { color: var(--yes); font-weight: 500; }
        .ob-table td.no-px { color: var(--no); font-weight: 500; }
        .ob-table tr { position: relative; }
        .ob-table tr.bid::after, .ob-table tr.ask::after {
          content: '';
          position: absolute;
          top: 4px;
          bottom: 4px;
          right: 0;
          width: calc(var(--depth, 0) * 1%);
          border-radius: 4px;
          z-index: -1;
          pointer-events: none;
        }
        .ob-table tr.bid::after {
          background: linear-gradient(90deg, transparent, rgba(127, 200, 255, 0.12));
        }
        .ob-table tr.ask::after {
          background: linear-gradient(90deg, transparent, rgba(255, 155, 107, 0.12));
        }
        .ob-spread {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 8px 0;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--t3);
          letter-spacing: 0.06em;
          border-top: 1px dashed rgba(255, 255, 255, 0.06);
          border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
          margin: 2px 0;
        }
        .ob-empty {
          text-align: center;
          color: var(--t3);
          font-size: 12px;
          padding: 14px 0;
        }
      `}</style>
      <section className="glass ob-card" aria-label="Order book">
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
