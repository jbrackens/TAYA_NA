"use client";

import styled from "styled-components";
import { Card } from "../shared";
import { useState, useEffect } from "react";
import { useTradingWebSocket } from "../../hooks/useTradingWebSocket";

const WidgetCard = styled(Card)`
  padding: 20px;
`;

const Label = styled.p`
  margin: 0 0 12px 0;
  font-size: 12px;
  color: var(--t2, #4a4a4a);
  text-transform: uppercase;
  font-weight: 500;
`;

const SportsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SportRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: var(--border-1, #e5dfd2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &:hover {
    border-color: var(--focus-ring, #0e7a53);
    background-color: rgba(74, 126, 255, 0.1);
  }
`;

const SportName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: var(--t1, #1a1a1a);
`;

const MatchCount = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: var(--focus-ring, #0e7a53);
  padding: 2px 8px;
  background-color: rgba(74, 126, 255, 0.2);
  border-radius: 3px;
`;

const ConnectionStatus = styled.div<{ $connected?: boolean }>`
  font-size: 11px;
  color: ${(props) =>
    props.$connected ? "var(--accent-lo, #1fa65e)" : "var(--no-text, #a8472d)"};
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-1, #e5dfd2);
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: ${(props) =>
      props.$connected
        ? "var(--accent-lo, #1fa65e)"
        : "var(--no-text, #a8472d)"};
  }
`;

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

    return () => unsubscribe?.();
  }, [subscribe]);

  const totalMatches = matches.reduce((sum, m) => sum + m.count, 0);

  return (
    <WidgetCard>
      <Label>Live Matches</Label>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "700",
          color: "var(--focus-ring, #0e7a53)",
          marginBottom: "16px",
        }}
      >
        {totalMatches} Total
      </div>

      <SportsList>
        {matches.length > 0 ? (
          matches.map((match) => (
            <SportRow
              key={match.sport}
              onClick={() => onSportClick?.(match.sport)}
            >
              <SportName>{match.sport}</SportName>
              <MatchCount>{match.count}</MatchCount>
            </SportRow>
          ))
        ) : (
          <div
            style={{
              fontSize: "12px",
              color: "var(--t2, #4a4a4a)",
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            No live matches
          </div>
        )}
      </SportsList>

      <ConnectionStatus $connected={isConnected}>
        {isConnected ? "Live" : "Offline"} Updates
      </ConnectionStatus>
    </WidgetCard>
  );
}
