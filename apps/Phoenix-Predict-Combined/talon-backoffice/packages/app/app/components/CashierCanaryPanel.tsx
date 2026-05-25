"use client";

type CanaryRow = {
  readonly name: string;
  readonly status: "ok" | "warn" | "blocked";
  readonly detail: string;
};

const FIXTURE_ROWS: readonly CanaryRow[] = [
  {
    name: "Tron route",
    status: "ok",
    detail: "Address fixture resolves with 6-decimal USDT.",
  },
  {
    name: "Provider callback",
    status: "ok",
    detail: "Signed callback fixture dedupes by idempotency key.",
  },
  {
    name: "Relayer",
    status: "blocked",
    detail: "Runtime flag remains disabled without credentials.",
  },
];

export default function CashierCanaryPanel() {
  const okCount = FIXTURE_ROWS.filter((row) => row.status === "ok").length;

  return (
    <div className="cashier-canary-panel">
      <div className="cashier-canary-head">
        <span className="cashier-label">Rail canary</span>
        <span className="cashier-status-pill">{okCount}/3 ok</span>
      </div>
      {FIXTURE_ROWS.map((row) => (
        <div className="cashier-canary-row" key={row.name}>
          <span className={`cashier-canary-dot ${row.status}`} />
          <div>
            <div className="cashier-canary-name">{row.name}</div>
            <div className="cashier-canary-detail">{row.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
