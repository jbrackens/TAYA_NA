"use client";

import Link from "next/link";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LoadingState } from "./Spinner";
import wsService from "../lib/websocket/websocket-service";
import type { WsMessage } from "../lib/websocket/websocket-service";
import type { LiveBoard, LiveBoardMatch } from "../lib/types/match-board";

interface MatchCardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "live" | "finished" | "upcoming" | "cancelled";
  homeOdds?: number;
  drawOdds?: number;
  awayOdds?: number;
  onBetHome?: () => void;
  onBetDraw?: () => void;
  onBetAway?: () => void;
}

const InlineMatchCardComponent: React.FC<MatchCardProps> = ({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  homeOdds,
  drawOdds,
  awayOdds,
  onBetHome,
  onBetDraw,
  onBetAway,
}) => {
  const { t } = useTranslation(["home", "common"]);
  const statusColors: Record<string, string> = {
    live: "#22c55e",
    finished: "#64748b",
    upcoming: "#39ff14",
    cancelled: "#ef4444",
  };

  return (
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
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: statusColors[status] || "#64748b",
          }}
        />
        <span
          style={{
            fontSize: "12px",
            color: "#64748b",
            textTransform: "capitalize",
          }}
        >
          {status}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>
            {homeTeam}
          </div>
          <div
            style={{
              fontSize: "20px",
              color: "#e2e8f0",
              fontWeight: 700,
              marginTop: "4px",
            }}
          >
            {homeScore}
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>{t("common:VS")}</div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>
            {awayTeam}
          </div>
          <div
            style={{
              fontSize: "20px",
              color: "#e2e8f0",
              fontWeight: 700,
              marginTop: "4px",
            }}
          >
            {awayScore}
          </div>
        </div>
      </div>

      {status !== "cancelled" && (homeOdds || drawOdds || awayOdds) && (
        <div style={{ display: "flex", gap: "8px" }}>
          {homeOdds && (
            <button
              onClick={onBetHome}
              style={{
                flex: 1,
                padding: "8px 12px",
                backgroundColor: "#1a1f3a",
                color: "#e2e8f0",
                border: "1px solid #2d3748",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("common:HOME_LABEL")} {homeOdds.toFixed(2)}
            </button>
          )}
          {drawOdds && (
            <button
              onClick={onBetDraw}
              style={{
                flex: 1,
                padding: "8px 12px",
                backgroundColor: "#1a1f3a",
                color: "#e2e8f0",
                border: "1px solid #2d3748",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("common:DRAW_LABEL")} {drawOdds.toFixed(2)}
            </button>
          )}
          {awayOdds && (
            <button
              onClick={onBetAway}
              style={{
                flex: 1,
                padding: "8px 12px",
                backgroundColor: "#1a1f3a",
                color: "#e2e8f0",
                border: "1px solid #2d3748",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("common:AWAY_LABEL")} {awayOdds.toFixed(2)}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const InlineMatchCard = React.memo(InlineMatchCardComponent);

interface LiveNowProps {
  limit?: number;
  initialMatchesByGroup?: LiveBoard;
}

export const LiveNow: React.FC<LiveNowProps> = ({
  limit = 50,
  initialMatchesByGroup,
}) => {
  const [matchesByGroup, setMatchesByGroup] = useState<LiveBoard>(
    initialMatchesByGroup || {},
  );
  const [loading, setLoading] = useState(!initialMatchesByGroup);
  const [error, setError] = useState<string | null>(null);
  const trackedFixtureIdsRef = useRef<Set<string>>(new Set());
  const { t } = useTranslation(["home", "common"]);

  // Handle WebSocket fixture updates
  const handleFixtureUpdate = useCallback((message: WsMessage) => {
    if (message.event !== "update") return;
    const data = message.data;
    const fixtureId = data?.fixtureId as string | undefined;
    const status = data?.status as string | undefined;
    const score = data?.score as
      | { home?: number; away?: number }
      | undefined;
    if (!fixtureId || !trackedFixtureIdsRef.current.has(fixtureId)) {
      return;
    }

    setMatchesByGroup((prev) => {
      let changed = false;
      const updated: LiveBoard = {};

      for (const [sport, matches] of Object.entries(prev)) {
        const matchIndex = matches.findIndex((match) => match.fixtureId === fixtureId);
        if (matchIndex === -1) {
          updated[sport] = matches;
          continue;
        }

        const currentMatch = matches[matchIndex];
        const nextHomeScore = score?.home ?? currentMatch.homeScore;
        const nextAwayScore = score?.away ?? currentMatch.awayScore;
        const nextStatus = status ?? currentMatch.status;

        if (
          currentMatch.homeScore === nextHomeScore &&
          currentMatch.awayScore === nextAwayScore &&
          currentMatch.status === nextStatus
        ) {
          updated[sport] = matches;
          continue;
        }

        changed = true;
        const nextMatches = matches.slice();
        nextMatches[matchIndex] = {
          ...currentMatch,
          homeScore: nextHomeScore,
          awayScore: nextAwayScore,
          status: nextStatus,
        };
        updated[sport] = nextMatches;
      }

      return changed ? updated : prev;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applyBoard = (board: LiveBoard) => {
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

    const loadLiveMatches = async () => {
      try {
        if (!initialMatchesByGroup) {
          setLoading(true);
        }
        const response = await fetch(
          `/api/bc/live-board/?limit=${encodeURIComponent(String(limit))}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to load live board: ${response.status}`);
        }
        const liveMatches = (await response.json()) as LiveBoard;

        if (!cancelled) {
          applyBoard(liveMatches);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load live matches";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (!initialMatchesByGroup) {
      loadLiveMatches();
    }

    // Subscribe to real-time fixture updates via the existing WebSocket singleton
    wsService.subscribe("fixture");
    const unsubscribe = wsService.on("fixture", handleFixtureUpdate);

    return () => {
      cancelled = true;
      unsubscribe();
      wsService.unsubscribe("fixture");
    };
  }, [handleFixtureUpdate, initialMatchesByGroup, limit]);

  const groupedEntries = useMemo(() => Object.entries(matchesByGroup), [matchesByGroup]);
  const totalMatches = useMemo(
    () => groupedEntries.reduce((sum, [, matches]) => sum + matches.length, 0),
    [groupedEntries],
  );

  if (loading) {
    return <LoadingState label={t("home:LOADING_LIVE_MATCHES")} />;
  }

  if (error) {
    return <div style={{ color: "#f87171" }}>{t("common:ERROR_MESSAGE", { message: error })}</div>;
  }

  if (totalMatches === 0) {
    return (
      <div style={{ color: "#64748b" }}>{t("home:NO_LIVE_MATCHES")}</div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {groupedEntries.map(([sport, matches]) => (
        <div
          key={sport}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
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
            {matches.map((match) => (
              <Link
                key={match.eventId}
                href={`/match/${match.fixtureId || match.eventId}`}
                style={{ textDecoration: "none" }}
              >
                <InlineMatchCard
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                  homeScore={match.homeScore}
                  awayScore={match.awayScore}
                  status="live"
                />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LiveNow;
