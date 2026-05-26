"use client";

import { Card } from "../shared";

interface RevenueWidgetProps {
  todayRevenue: number;
  weekRevenue: number;
  mtdRevenue: number;
  changePercent?: number;
  sparklineData?: number[];
}

export function RevenueWidget({
  todayRevenue,
  weekRevenue,
  mtdRevenue,
  changePercent = 12,
  sparklineData = [10, 15, 12, 18, 14, 20, 16],
}: RevenueWidgetProps) {
  // Generate sparkline path
  const generateSparklinePath = (data: number[]) => {
    if (data.length === 0) return "";

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 100 / (data.length - 1 || 1);

    let path = `M 0 ${30 - ((data[0] - min) / range) * 30}`;

    for (let i = 1; i < data.length; i++) {
      const x = i * width;
      const y = 30 - ((data[i] - min) / range) * 30;
      path += ` L ${x} ${y}`;
    }

    return path;
  };

  const changeClass =
    changePercent >= 0
      ? "text-[var(--accent-lo,#1fa65e)]"
      : "text-[var(--no-text,#a8472d)]";

  return (
    <Card>
      <p className="mb-3 text-xs font-medium uppercase text-[var(--t2,#4a4a4a)]">
        Revenue
      </p>
      <div className="mb-4 text-[32px] font-bold text-[var(--focus-ring,#0e7a53)]">
        ${mtdRevenue.toLocaleString()}
      </div>

      <svg
        className="my-3 h-10 w-full stroke-2"
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
      >
        <path
          d={generateSparklinePath(sparklineData)}
          stroke="var(--focus-ring, #0e7a53)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between rounded bg-[var(--border-1,#e5dfd2)] p-2">
          <span className="text-xs text-[var(--t2,#4a4a4a)]">Today</span>
          <span className="text-sm font-semibold text-[var(--t1,#1a1a1a)]">
            ${todayRevenue.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between rounded bg-[var(--border-1,#e5dfd2)] p-2">
          <span className="text-xs text-[var(--t2,#4a4a4a)]">This Week</span>
          <span className="text-sm font-semibold text-[var(--t1,#1a1a1a)]">
            ${weekRevenue.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between rounded bg-[var(--border-1,#e5dfd2)] p-2">
          <span className="text-xs text-[var(--t2,#4a4a4a)]">
            Month to Date
          </span>
          <span className="text-sm font-semibold text-[var(--t1,#1a1a1a)]">
            ${mtdRevenue.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--border-1,#e5dfd2)] pt-3">
        <span className="text-xs text-[var(--t2,#4a4a4a)]">
          vs previous period
        </span>
        <span className={`text-sm font-semibold ${changeClass}`}>
          {changePercent >= 0 ? "+" : ""}
          {changePercent}%
        </span>
      </div>
    </Card>
  );
}
