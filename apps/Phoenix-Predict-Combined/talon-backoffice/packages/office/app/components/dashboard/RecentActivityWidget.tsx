"use client";

import { Card } from "../shared";

interface ActivityLog {
  id: string;
  actor: string;
  action: string;
  description: string;
  timestamp: string;
  icon?: string;
}

interface RecentActivityWidgetProps {
  activities?: ActivityLog[];
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case "suspend":
      return "🔒";
    case "settle":
      return "✓";
    case "adjust":
      return "⚙️";
    case "login":
      return "👤";
    default:
      return "📝";
  }
};

export function RecentActivityWidget({
  activities = [],
}: RecentActivityWidgetProps) {
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <Card className="col-span-1 max-[640px]:col-span-1 min-[641px]:max-[1024px]:col-span-2">
      <p className="mb-3 text-xs font-medium uppercase text-[var(--t2,#4a4a4a)]">
        Recent Activity
      </p>

      {activities.length > 0 ? (
        <div className="flex max-h-[300px] flex-col gap-3 overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 rounded border-l-[3px] [border-left-color:var(--focus-ring,#0e7a53)] bg-[var(--border-1,#e5dfd2)] p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(74,126,255,0.2)] text-sm">
                {activity.icon || getActivityIcon(activity.action)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-[13px] font-semibold text-[var(--t1,#1a1a1a)]">
                  {activity.actor} - {activity.action}
                </div>
                <p className="m-0 text-[11px] text-[var(--t2,#4a4a4a)]">
                  {activity.description}
                </p>
                <span className="text-[10px] text-[var(--t2,#4a4a4a)]">
                  {formatTime(activity.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5 text-center text-xs text-[var(--t2,#4a4a4a)]">
          No recent activity
        </div>
      )}
    </Card>
  );
}
