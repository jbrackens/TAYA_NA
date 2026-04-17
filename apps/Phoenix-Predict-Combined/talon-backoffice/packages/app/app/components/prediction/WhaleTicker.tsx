"use client";

/**
 * WhaleTicker — auto-scrolling band of recent large trades.
 *
 * The original preview hard-codes sample data; this first pass does the same
 * so the UI lands correctly. A follow-up will hook this to a backend endpoint
 * (e.g. `/api/v1/trades/whales?minStake=25000`) via SWR or WebSocket push.
 *
 * The items list is rendered twice back-to-back and translated -50% so the
 * loop appears seamless. Keyframes live in globals.css:not — they're defined
 * inline in the style tag here to keep the component self-contained.
 */

const WHALES = [
  { addr: "0x4f…a2", size: "$88K", detail: "BTC new ATH @ 64¢" },
  { addr: "0xc1…9e", size: "$42K", detail: "Fed cuts June @ 57¢" },
  { addr: "0x82…b3", size: "$31K", detail: "GOP margin @ 49¢" },
  { addr: "0x00…7c", size: "$26K", detail: "F1 champion @ 72¢" },
  { addr: "0x9d…14", size: "$120K", detail: "GPT-5 by July @ 38¢" },
  { addr: "0xa8…42", size: "$65K", detail: "Real Madrid UCL @ 22¢" },
];

export function WhaleTicker() {
  return (
    <>
      <style>{`
        @keyframes predict-ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .predict-ticker {
          background: var(--s3);
          border-bottom: 1px solid var(--b1);
          overflow: hidden;
        }
        .predict-ticker-inner {
          display: flex;
          gap: 24px;
          padding: 8px 0;
          font-size: 12px;
          white-space: nowrap;
          animation: predict-ticker-scroll 60s linear infinite;
          width: max-content;
        }
        .predict-ticker:hover .predict-ticker-inner {
          animation-play-state: paused;
        }
        .predict-ticker-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--t2);
        }
        .predict-ticker-item strong {
          color: var(--whale);
          font-family: 'IBM Plex Mono', ui-monospace, monospace;
          font-variant-numeric: tabular-nums;
          font-weight: 700;
        }
        .predict-ticker-sep { color: var(--t4); }
      `}</style>
      <div className="predict-ticker" aria-label="Recent large trades">
        <div className="predict-ticker-inner">
          {[...WHALES, ...WHALES].map((w, i) => (
            <span key={i}>
              <span className="predict-ticker-item">
                <span className="live-dot" />
                <span
                  style={{
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: "var(--t3)",
                    fontSize: 11,
                  }}
                >
                  WHALE
                </span>
                <strong>{w.size}</strong>
                <span>{w.detail}</span>
              </span>
              {i < WHALES.length * 2 - 1 && (
                <span className="predict-ticker-sep" style={{ margin: "0 12px" }}>
                  ·
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
