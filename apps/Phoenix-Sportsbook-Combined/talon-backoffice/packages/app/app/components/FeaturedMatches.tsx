"use client";

import React, { useEffect, useState } from "react";
import { getEvents } from "../lib/api/events-client";
import { getMarkets } from "../lib/api/markets-client";
import type { Event } from "../lib/api/events-client";
import type { Market, MarketSelection } from "../lib/api/markets-client";
import wsService from "../lib/websocket/websocket-service";
import OddsButton from "./OddsButton";

interface MatchOdds {
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  homeSelectionId: string;
  drawSelectionId: string;
  awaySelectionId: string;
  marketId: string;
}

interface FeaturedMatchesProps {
  sportKey?: string;
  leagueKey?: string;
}

export const FeaturedMatches: React.FC<FeaturedMatchesProps> = ({
  sportKey,
  leagueKey,
}) => {
  const [matches, setMatches] = useState<Event[]>([]);
  const [oddsMap, setOddsMap] = useState<Record<string, MatchOdds>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMatches = async () => {
      try {
        setLoading(true);
        const response = await getEvents({
          sport: sportKey || "football",
          league: leagueKey,
          status: "in_play",
          limit: 10,
        });
        const events = response.events.slice(0, 5);
        if (!cancelled) {
          setMatches(events);
          setError(null);
        }

        // Fetch markets/odds for each match in parallel
        const oddsResults = await Promise.allSettled(
          events.map(async (event: Event) => {
            const markets = await getMarkets(event.fixtureId);
            const matchResult = markets.find(
              (m: Market) =>
                m.marketKey === "match_result" ||
                m.marketKey === "1x2" ||
                m.marketName.toLowerCase().includes("match result") ||
                m.marketName.toLowerCase().includes("winner"),
            );
            if (!matchResult || !matchResult.selections) return null;

            const home = matchResult.selections.find(
              (s: MarketSelection) =>
                s.selectionName.toLowerCase().includes("home") ||
                s.selectionName === "1" ||
                s.selectionName.toLowerCase() === event.homeTeam.toLowerCase(),
            );
            const draw = matchResult.selections.find(
              (s: MarketSelection) =>
                s.selectionName.toLowerCase().includes("draw") ||
                s.selectionName === "X" ||
                s.selectionName.toLowerCase() === "draw",
            );
            const away = matchResult.selections.find(
              (s: MarketSelection) =>
                s.selectionName.toLowerCase().includes("away") ||
                s.selectionName === "2" ||
                s.selectionName.toLowerCase() === event.awayTeam.toLowerCase(),
            );

            return {
              fixtureId: event.fixtureId,
              odds: {
                homeOdds: home?.odds || 0,
                drawOdds: draw?.odds || 0,
                awayOdds: away?.odds || 0,
                homeSelectionId: home?.selectionId || `${event.fixtureId}-home`,
                drawSelectionId: draw?.selectionId || `${event.fixtureId}-draw`,
                awaySelectionId: away?.selectionId || `${event.fixtureId}-away`,
                marketId: matchResult.marketId,
              },
            };
          }),
        );

        if (!cancelled) {
          const newOddsMap: Record<string, MatchOdds> = {};
          for (const result of oddsResults) {
            if (result.status === "fulfilled" && result.value) {
              newOddsMap[result.value.fixtureId] = result.value.odds;
            }
          }
          setOddsMap(newOddsMap);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to load featured matches";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMatches();

    wsService.subscribe("fixture");
    const unsubscribe = wsService.on(
      "fixture",
      (data: Record<string, unknown>) => {
        const fixtureId = data?.fixtureId as string | undefined;
        if (!fixtureId) return;
        setMatches((prev) =>
          prev.map((m) =>
            m.fixtureId === fixtureId
              ? { ...m, status: (data.status as string) || m.status }
              : m,
          ),
        );
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [sportKey, leagueKey]);

  if (loading) {
    return <div style={{ color: "#a0a0a0" }}>Loading featured matches...</div>;
  }

  if (error) {
    return <div style={{ color: "#f87171" }}>Error: {error}</div>;
  }

  if (matches.length === 0) {
    return (
      <div style={{ color: "#a0a0a0" }}>No featured matches available</div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        overflowX: "auto",
        padding: "16px 0",
        scrollBehavior: "smooth",
      }}
    >
      {matches.map((match) => {
        const statusColor =
          match.status === "in_play"
            ? "#22c55e"
            : match.status === "finished"
              ? "#64748b"
              : "#39ff14";
        const displayStatus =
          match.status === "in_play"
            ? "live"
            : match.status === "finished"
              ? "finished"
              : "upcoming";
        const matchOdds = oddsMap[match.fixtureId];

        return (
          <div
            key={match.eventId}
            style={{ flexShrink: 0, width: "320px", minWidth: "320px" }}
          >
            <div
              style={{
                backgroundColor: "#111328",
                border: "1px solid #1a1f3a",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: statusColor,
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    textTransform: "capitalize",
                  }}
                >
                  {displayStatus}
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
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
                <div style={{ fontSize: "12px", color: "#64748b" }}>vs</div>
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
              <div style={{ display: "flex", gap: "8px" }}>
                {(["home", "draw", "away"] as const).map((pos) => {
                  const odds =
                    pos === "home"
                      ? matchOdds?.homeOdds
                      : pos === "draw"
                        ? matchOdds?.drawOdds
                        : matchOdds?.awayOdds;
                  const label =
                    pos === "home"
                      ? match.homeTeam.slice(0, 8)
                      : pos === "away"
                        ? match.awayTeam.slice(0, 8)
                        : "Draw";
                  const selectionId = 
                    pos === "home" ? matchOdds?.homeSelectionId :
                    pos === "draw" ? matchOdds?.drawSelectionId :
                    matchOdds?.awaySelectionId;

                  return (
                    <div key={pos} style={{ flex: 1 }}>
                      <OddsButton
                        fixtureId={match.fixtureId}
                        marketId={matchOdds?.marketId || `${match.fixtureId}-match-result`}
                        selectionId={selectionId || `${match.fixtureId}-${pos}`}
                        odds={odds || 0}
                        matchName={`${match.homeTeam} vs ${match.awayTeam}`}
                        marketName="Match Result"
                        selectionName={pos === "home" ? match.homeTeam : pos === "away" ? match.awayTeam : "Draw"}
                        label={label}
                        suspended={!odds}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FeaturedMatches;
