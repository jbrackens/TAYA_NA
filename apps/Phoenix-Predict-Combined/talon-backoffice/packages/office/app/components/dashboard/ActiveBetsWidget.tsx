"use client";

import { Card } from "../shared";

interface ActiveBetsWidgetProps {
  activeBets: number;
  settledLastHour: number;
  settlementRate: number;
  onViewBets?: () => void;
}

export function ActiveBetsWidget({
  activeBets,
  settledLastHour,
  settlementRate,
  onViewBets,
}: ActiveBetsWidgetProps) {
  const settlementRateClass =
    settlementRate > 80
      ? "text-[var(--accent-lo,#1fa65e)]"
      : settlementRate > 50
        ? "text-[var(--warn,#d97706)]"
        : "text-[var(--no-text,#a8472d)]";

  return (
    <Card>
      <p className="mb-3 text-xs font-medium uppercase text-[var(--t2,#4a4a4a)]">
        Active Bets
      </p>
      <div className="mb-4 text-[32px] font-bold text-[var(--focus-ring,#0e7a53)]">
        {activeBets.toLocaleString()}
      </div>

      <div className="mb-3 flex items-center justify-between rounded bg-[var(--border-1,#e5dfd2)] p-2">
        <span className="text-xs text-[var(--t2,#4a4a4a)]">
          Settled Last Hour
        </span>
        <span className="text-sm font-semibold text-[var(--t1,#1a1a1a)]">
          {settledLastHour}
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between rounded bg-[var(--border-1,#e5dfd2)] p-2">
        <span className="text-xs text-[var(--t2,#4a4a4a)]">
          Settlement Rate
        </span>
        <span className={`text-sm font-semibold ${settlementRateClass}`}>
          {settlementRate}%
        </span>
      </div>

      <div className="mt-4 border-t border-[var(--border-1,#e5dfd2)] pt-3">
        <button
          className="w-full cursor-pointer rounded border-0 bg-[var(--focus-ring,#0e7a53)] p-2 text-[13px] font-semibold text-[var(--bg-deep,#f7f3ed)] transition-all duration-200 hover:opacity-80 active:scale-[0.98]"
          onClick={onViewBets}
        >
          View All Bets
        </button>
      </div>
    </Card>
  );
}
