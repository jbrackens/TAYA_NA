"use client";

type CashierRailMode = "deposit" | "withdrawal";

type CashierStep = {
  readonly status: string;
  readonly label: string;
  readonly detail: string;
};

const DEPOSIT_STEPS: readonly CashierStep[] = [
  {
    status: "address_issued",
    label: "Address issued",
    detail: "Tron USDT route reserved for this user wallet.",
  },
  {
    status: "source_detected",
    label: "Source detected",
    detail: "Provider callback accepted after signature verification.",
  },
  {
    status: "bridging",
    label: "Bridge in progress",
    detail: "Funds are moving into the non-custodial settlement wallet.",
  },
  {
    status: "settled",
    label: "Settled",
    detail: "Wallet balance is ready for market orders.",
  },
];

const WITHDRAWAL_STEPS: readonly CashierStep[] = [
  {
    status: "user_authorized",
    label: "User authorized",
    detail: "The wallet signed a bounded withdrawal authorization.",
  },
  {
    status: "policy_approved",
    label: "Policy approved",
    detail: "Limits, compliance, nonce, and destination checks passed.",
  },
  {
    status: "submitted",
    label: "Submitted",
    detail: "Relayer submitted the transaction to the settlement chain.",
  },
  {
    status: "confirmed",
    label: "Confirmed",
    detail: "Withdrawal is finalized on-chain.",
  },
];

function activeIndexFor(steps: readonly CashierStep[], status: string) {
  const index = steps.findIndex((step) => step.status === status);
  return index >= 0 ? index : 0;
}

export default function NonCustodialCashierStatus({
  mode,
  status,
}: {
  readonly mode: CashierRailMode;
  readonly status?: string;
}) {
  const steps = mode === "deposit" ? DEPOSIT_STEPS : WITHDRAWAL_STEPS;
  const currentStatus =
    status ?? (mode === "deposit" ? "address_issued" : "user_authorized");
  const activeIndex = activeIndexFor(steps, currentStatus);
  const title =
    mode === "deposit" ? "Non-custodial deposit" : "Non-custodial withdrawal";

  return (
    <div className="cashier-status-panel">
      <div className="cashier-status-head">
        <span className="cashier-label">{title}</span>
        <span className="cashier-status-pill">{currentStatus}</span>
      </div>
      <div className="cashier-timeline">
        {steps.map((step, index) => {
          const state =
            index < activeIndex
              ? "done"
              : index === activeIndex
                ? "active"
                : "waiting";
          return (
            <div className={`cashier-timeline-row ${state}`} key={step.status}>
              <span className="cashier-timeline-dot" />
              <div>
                <div className="cashier-timeline-label">{step.label}</div>
                <div className="cashier-timeline-detail">{step.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="cashier-msg pending cashier-status-note">
        Recovery states are routed to operator review before any release.
      </div>
    </div>
  );
}
