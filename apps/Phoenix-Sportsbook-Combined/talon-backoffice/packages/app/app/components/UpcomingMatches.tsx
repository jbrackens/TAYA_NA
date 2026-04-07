"use client";

import React, { useEffect, useState } from "react";
import { getSports, getEvents } from "../lib/api/events-client";
import type { Event, Sport } from "../lib/api/events-client";
import wsService from "../lib/websocket/websocket-service";

interface UpcomingMatchesProps {
  limit?: number;
}

export const UpcomingMatches: React.FC<UpcomingMatchesProps> = ({
  limit = 50,
}) => {
  const [matchesByGroup, setMatchesByGroup] = useState<Record<string, Event[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUpcomingMatches = async () => {
      try {
        setLoading(true);
        const sportsResponse = await getSports();
        const sports = Array.isArray(sportsResponse) ? sportsResponse : [];
        const upcomingMatches: Record<string, Event[]> = {};

        if (sports.length === 0) {
          if (!cancelled) {
            setMatchesByGroup({});
            setError(null);
          }
          return;
        }

        const results = await Promise.allSettled(
          sports.map(async (sport: Sport) => {
            const response = await getEvents({
              sport: sport.sportKey,
              status: "scheduled",
              limit,
            });
            return { sport, events: response.events };
          }),
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value.events.length > 0) {
            const sorted = result.value.events
              .slice(0, 10)
              .sort(
                (a: Event, b: Event) =>
                  new Date(a.startTime).getTime() -
                  new Date(b.startTime).getTime(),
              );
            upcomingMatches[result.value.sport.sportName] = sorted;
          }
        }

        if (!cancelled) {
          setMatchesByGroup(upcomingMatches);
          setError(null);
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

    loadUpcomingMatches();

    // Subscribe to fixture updates — detect when a scheduled match goes live
    wsService.subscribe("fixture");
    const unsubscribe = wsService.on(
      "fixture",
      (data: Record<string, unknown>) => {
        const fixtureId = data?.fixtureId as string | undefined;
        const newStatus = data?.status as string | undefined;
        if (!fixtureId || !newStatus) return;

        setMatchesByGroup((prev) => {
          const updated: Record<string, Event[]> = {};
          for (const [sport, matches] of Object.entries(prev)) {
            updated[sport] = matches.map((m: Event) =>
              m.fixtureId === fixtureId ? { ...m, status: newStatus } : m,
            );
          }
          return updated;
        });
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [limit]);

  const getCountdownText = (startTime: string): string => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start.getTime() - now.getTime();
    if (diff < 0) return "Starting soon";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  if (loading) {
    return <div style={{ color: "#a0a0a0" }}>Loading upcoming matches...</div>;
  }

  if (error) {
    return <div style={{ color: "#f87171" }}>Error: {error}</div>;
  }

  const totalMatches = Object.values(matchesByGroup).reduce(
    (sum, matches) => sum + matches.length,
    0,
  );
  if (totalMatches === 0) {
    return <div style={{ color: "#a0a0a0" }}>No upcoming matches</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {Object.entries(matchesByGroup).map(([sport, matches]) => (
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
            {matches.map((match: Event) => (
              <div key={match.eventId} style={{ position: "relative" }}>
                <a
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
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UpcomingMatches;
