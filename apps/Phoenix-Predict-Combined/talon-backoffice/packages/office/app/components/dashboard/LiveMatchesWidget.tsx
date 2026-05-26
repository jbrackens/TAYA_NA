"use client";

import { Card } from "../shared";
import { useState, useEffect } from "react";
import { useTradingWebSocket } from "../../hooks/useTradingWebSocket";

interface SportMatch {
  sport: string;
  count: number;
}

interface LiveMatchesWidgetProps {
  matches?: SportMatch[];
  onSportClick?: (sport: string) => void;
}

export function LiveMatchesWidget({
  matches: initialMatches = [],
  onSportClick,
}: LiveMatchesWidgetProps) {
  const [matches, setMatches] = useState<SportMatch[]>(initialMatches);
  const { isConnected, subscribe } = useTradingWebSocket({
    autoConnect: false, // Don't auto-connect, manage manually
  });

  useEffect(() => {
    if (initialMatches.length > 0) {
      setMatches(initialMatches);
    }
  }, [initialMatches]);

  useEffect(() => {
    const unsubscribe = subscribe("liveMatches", (data) => {
      if (Array.isArray(data)) {
        setMatches(data);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [subscribe]);

  const totalMatches = matches.reduce((sum, m) => sum + m.count, 0);
  const connectionClass = isConnected
    ? "text-[var(--accent-lo,#1fa65e)] before:bg-[var(--accent-lo,#1fa65e)]"
    : "text-[var(--no-text,#a8472d)] before:bg-[var(--no-text,#a8472d)]";

  return (
    <Card>
      <p className="mb-3 text-xs font-medium uppercase text-[var(--t2,#4a4a4a)]">
        Live Matches
      </p>
      <div className="mb-4 text-2xl font-bold text-[var(--focus-ring,#0e7a53)]">
        {totalMatches} Total
      </div>

      <div className="flex flex-col gap-2.5">
        {matches.length > 0 ? (
          matches.map((match) => (
            <div
              key={match.sport}
              className="flex cursor-pointer items-center justify-between rounded border border-transparent bg-[var(--border-1,#e5dfd2)] p-2.5 transition-all duration-200 hover:border-[var(--focus-ring,#0e7a53)] hover:bg-[rgba(74,126,255,0.1)]"
              onClick={() => onSportClick?.(match.sport)}
            >
              <span className="text-[13px] font-medium text-[var(--t1,#1a1a1a)]">
                {match.sport}
              </span>
              <span className="rounded-[3px] bg-[rgba(74,126,255,0.2)] px-2 py-0.5 text-sm font-bold text-[var(--focus-ring,#0e7a53)]">
                {match.count}
              </span>
            </div>
          ))
        ) : (
          <div className="py-5 text-center text-xs text-[var(--t2,#4a4a4a)]">
            No live matches
          </div>
        )}
      </div>

      <div
        className={`mt-3 flex items-center gap-1.5 border-t border-[var(--border-1,#e5dfd2)] pt-3 text-[11px] before:h-1.5 before:w-1.5 before:rounded-full before:content-[''] ${connectionClass}`}
      >
        {isConnected ? "Live" : "Offline"} Updates
      </div>
    </Card>
  );
}
