"use client";

/**
 * WhaleActivityCard — amber-tinted side card listing recent large trades.
 *
 * First pass uses stub data to land the UI. A follow-up wires this to a
 * backend endpoint (same source as WhaleTicker — likely a single endpoint
 * that both subscribe to).
 */

const WHALES = [
  { addr: "0x4f…a2", size: "$88K", detail: "BTC new ATH @ 64¢" },
  { addr: "0xc1…9e", size: "$42K", detail: "Fed cuts June @ 57¢" },
  { addr: "0x82…b3", size: "$31K", detail: "GOP margin @ 49¢" },
  { addr: "0x00…7c", size: "$26K", detail: "F1 champion @ 72¢" },
];

export function WhaleActivityCard() {
  return (
    <>
      <style>{`
        .wac {
          background: linear-gradient(180deg, rgba(251,191,36,0.06), rgba(251,191,36,0.02));
          border: 1px solid rgba(251,191,36,0.22);
          border-radius: var(--r-md);
          padding: 16px;
        }
        .wac-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .wac-head-icon {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--whale-soft);
          color: var(--whale);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        }
        .wac-head-title { font-weight: 700; font-size: 14px; color: var(--t1); }
        .wac-chip {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
          background: var(--s2);
          color: var(--t2);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .wac-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          font-size: 12px;
          border-top: 1px dashed var(--b1);
        }
        .wac-row:first-of-type { border-top: 0; }
        .wac-addr {
          color: var(--whale);
          font-weight: 600;
        }
        .wac-size {
          color: var(--t1);
          font-weight: 700;
        }
        .wac-detail {
          color: var(--t3);
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
      <div className="wac" aria-label="Recent whale activity">
        <div className="wac-head">
          <span className="wac-head-icon" aria-hidden>🐋</span>
          <span className="wac-head-title">Whale activity</span>
          <span className="wac-chip">24H</span>
        </div>
        {WHALES.map((w, i) => (
          <div key={i} className="wac-row">
            <span className="wac-addr mono">{w.addr}</span>
            <span className="wac-size mono">{w.size}</span>
            <span className="wac-detail">{w.detail}</span>
          </div>
        ))}
      </div>
    </>
  );
}
