"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { LoadingState } from "./Spinner";
import type { BoardEvent, UpcomingBoard } from "../lib/types/match-board";
import wsService from "../lib/websocket/websocket-service";

interface UpcomingMatchesProps {
  limit?: number;
  initialMatchesByGroup?: UpcomingBoard;
}

export const UpcomingMatches: React.FC<UpcomingMatchesProps> = ({
  limit = 50,
  initialMatchesByGroup,
}) => {
  const [matchesByGroup, setMatchesByGroup] = useState<UpcomingBoard>(
    initialMatchesByGroup || {},
  );
  const [loading, setLoading] = useState(!initialMatchesByGroup);
  const [error, setError] = useState<string | null>(null);
  const trackedFixtureIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const applyBoard = (board: UpcomingBoard) => {
      trackedFixtureIdsRef.current = new Set(
        Object.values(board)
          .flat()
          .map((match) => match.fixtureId),
      );
      setMatchesByGroup(board);
      setError(null);
    };

    if (initialMatchesByGroup) {
      applyBoard(initialMatchesByGroup);
    }

    const loadUpcomingMatches = async () => {
      try {
        if (!initialMatchesByGroup) {
          setLoading(true);
        }
        const perSportLimit = Math.min(limit, 10);
        const response = await fetch(
          `/api/bc/upcoming-board/?limit=${encodeURIComponent(String(perSportLimit))}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to load upcoming board: ${response.status}`);
        }
        const upcomingMatches = (await response.json()) as UpcomingBoard;

        if (!cancelled) {
          applyBoard(upcomingMatches);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to load upcoming matches";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (!initialMatchesByGroup) {
      loadUpcomingMatches();
    }

    // Subscribe to fixture updates — detect when a scheduled match goes live
    wsService.subscribe("fixture");
    const unsubscribe = wsService.on(
      "fixture",
      (data: Record<string, unknown>) => {
        const fixtureId = data?.fixtureId as string | undefined;
        const newStatus = data?.status as string | undefined;
        if (
          !fixtureId ||
          !newStatus ||
          !trackedFixtureIdsRef.current.has(fixtureId)
        ) {
          return;
        }

        setMatchesByGroup((prev) => {
          let changed = false;
          const updated: UpcomingBoard = {};

          for (const [sport, matches] of Object.entries(prev)) {
            const matchIndex = matches.findIndex((match) => match.fixtureId === fixtureId);
            if (matchIndex === -1) {
              updated[sport] = matches;
              continue;
            }

            if (matches[matchIndex].status === newStatus) {
              updated[sport] = matches;
              continue;
            }

            changed = true;
            const nextMatches = matches.slice();
            nextMatches[matchIndex] = { ...nextMatches[matchIndex], status: newStatus };
            updated[sport] = nextMatches;
          }

          return changed ? updated : prev;
        });
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
      wsService.unsubscribe("fixture");
    };
  }, [initialMatchesByGroup, limit]);

  const getCountdownText = (startTime: string): string => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start.getTime() - now.getTime();
    if (diff < 0) return "Starting soon";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const groupedEntries = useMemo(() => Object.entries(matchesByGroup), [matchesByGroup]);
  const totalMatches = useMemo(
    () => groupedEntries.reduce((sum, [, matches]) => sum + matches.length, 0),
    [groupedEntries],
  );

  if (loading) {
    return <LoadingState label="Loading upcoming matches" />;
  }

  if (error) {
    return <div style={{ color: "#f87171" }}>Error: {error}</div>;
  }

  if (totalMatches === 0) {
    return <div style={{ color: "#a0a0a0" }}>No upcoming matches</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {groupedEntries.map(([sport, matches]) => (
        <div
          key={sport}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#e2e8f0",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {sport}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {matches.map((match: BoardEvent) => (
              <div key={match.eventId} style={{ position: "relative" }}>
                <Link
                  href={`/match/${match.fixtureId || match.eventId}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      backgroundColor:
                        match.status === "in_play"
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(74, 126, 255, 0.2)",
                      color: match.status === "in_play" ? "#22c55e" : "#4a7eff",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      zIndex: 1,
                    }}
                  >
                    {match.status === "in_play"
                      ? "LIVE"
                      : getCountdownText(match.startTime)}
                  </div>
                  <div
                    style={{
                      backgroundColor: "#111328",
                      border: `1px solid ${match.status === "in_play" ? "#22c55e33" : "#1a1f3a"}`,
                      borderRadius: "14px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      transition: "border-color 0.3s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor:
                            match.status === "in_play" ? "#22c55e" : "#39ff14",
                          animation:
                            match.status === "in_play"
                              ? "pulse 2s infinite"
                              : undefined,
                        }}
                      />
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        {match.status === "in_play" ? "Live" : "Upcoming"}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#e2e8f0",
                            fontWeight: 600,
                          }}
                        >
                          {match.homeTeam}
                        </div>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        vs
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#e2e8f0",
                            fontWeight: 600,
                          }}
                        >
                          {match.awayTeam}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UpcomingMatches;
