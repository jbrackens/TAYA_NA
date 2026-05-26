"use client";

import { Card } from "../shared";

interface RiskAlert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  timestamp: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface RiskAlertsWidgetProps {
  alerts?: RiskAlert[];
}

const severityBorderClasses: Record<RiskAlert["severity"], string> = {
  critical: "[border-left-color:var(--no-text,#a8472d)]",
  high: "[border-left-color:#fb923c]",
  medium: "[border-left-color:var(--warn,#d97706)]",
  low: "[border-left-color:var(--focus-ring,#0e7a53)]",
};

export function RiskAlertsWidget({ alerts = [] }: RiskAlertsWidgetProps) {
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return timestamp;
    }
  };

  return (
    <Card className="col-span-1 max-[640px]:col-span-1 min-[641px]:max-[1024px]:col-span-2">
      <p className="mb-3 text-xs font-medium uppercase text-[var(--t2,#4a4a4a)]">
        Risk Alerts
      </p>

      {alerts.length > 0 ? (
        <div className="flex max-h-[300px] flex-col gap-2.5 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start justify-between gap-2 rounded border-l-[3px] bg-[var(--border-1,#e5dfd2)] p-3 ${severityBorderClasses[alert.severity]}`}
            >
              <div className="flex-1">
                <div className="mb-1 text-[13px] font-semibold text-[var(--t1,#1a1a1a)]">
                  {alert.description}
                </div>
                <span className="whitespace-nowrap text-[10px] text-[var(--t2,#4a4a4a)]">
                  {formatTime(alert.timestamp)}
                </span>
              </div>
              {alert.action && (
                <button
                  className="cursor-pointer whitespace-nowrap rounded-[3px] border-0 bg-[var(--focus-ring,#0e7a53)] px-2 py-1 text-[10px] font-semibold text-[var(--bg-deep,#f7f3ed)] transition-all duration-200 hover:opacity-80"
                  onClick={alert.action.onClick}
                >
                  {alert.action.label}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5 text-center text-xs text-[var(--t2,#4a4a4a)]">
          No alerts at this time
        </div>
      )}
    </Card>
  );
}
