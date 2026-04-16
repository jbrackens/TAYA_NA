"use client";

import React, { useEffect, useState, useCallback } from "react";
import wsService from "../lib/websocket/websocket-service";
import type { WsMessage } from "../lib/websocket/websocket-service";

const Badge: React.FC<{
  variant?: "live" | "finished" | "upcoming" | "cancelled";
  children: React.ReactNode;
}> = ({ variant = "upcoming", children }) => {
  const colors: Record<string, { bg: string; color: string }> = {
    live: { bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
    finished: { bg: "rgba(100,116,139,0.15)", color: "#D3D3D3" },
    upcoming: { bg: "rgba(57,255,20,0.15)", color: "#39ff14" },
    cancelled: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  };
  const c = colors[variant] || colors.upcoming;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        background: c.bg,
        color: c.color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

interface MatchTrackerTimeline {
  score?: {
    home: number;
    away: number;
  };
  period?: string | number;
  clockSeconds?: number;
}

interface MatchHeaderProps {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  status: "live" | "upcoming" | "finished";
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({
  fixtureId,
  homeTeam,
  awayTeam,
  status,
}) => {
  const [tracker, setTracker] = useState<MatchTrackerTimeline | null>(null);

  const handleFixtureUpdate = useCallback(
    (message: WsMessage) => {
      if (message.event !== "update") return;
      const data = message.data;
      // Only handle updates for this fixture
      if (data?.fixtureId !== fixtureId) return;

      setTracker((prev) => ({
        score: data.score ?? prev?.score,
        period: data.period ?? prev?.period,
        clockSeconds: data.clockSeconds ?? prev?.clockSeconds,
      }));
    },
    [fixtureId],
  );

  useEffect(() => {
    if (status !== "live") return;

    // Subscribe to fixture channel for real-time updates
    wsService.subscribe("fixture");
    const unsubscribe = wsService.on("fixture", handleFixtureUpdate);

    return () => {
      unsubscribe();
      wsService.unsubscribe("fixture");
    };
  }, [fixtureId, status, handleFixtureUpdate]);

  const homeScore = tracker?.score?.home ?? 0;
  const awayScore = tracker?.score?.away ?? 0;
  const period = tracker?.period ?? "-";
  const clock = tracker?.clockSeconds
    ? `${Math.floor(tracker.clockSeconds / 60)}'`
    : "-";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "24px",
        backgroundColor: "#0f1225",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "24px",
            fontWeight: 700,
            color: "#e2e8f0",
          }}
        >
          {homeTeam} vs {awayTeam}
        </h1>
        <Badge
          variant={
            status === "live"
              ? "live"
              : status === "finished"
                ? "finished"
                : "upcoming"
          }
        >
          {status === "live" ? "LIVE" : status.toUpperCase()}
        </Badge>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <div
          style={{
            flex: 1,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#e2e8f0",
              marginBottom: "12px",
            }}
          >
            {homeTeam}
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#39ff14",
              lineHeight: 1,
            }}
          >
            {homeScore}
          </div>
        </div>
        <div
          style={{
            flex: "0 0 auto",
            fontSize: "32px",
            color: "#64748b",
          }}
        >
          -
        </div>
        <div
          style={{
            flex: 1,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#e2e8f0",
              marginBottom: "12px",
            }}
          >
            {awayTeam}
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#39ff14",
              lineHeight: 1,
            }}
          >
            {awayScore}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "16px",
          borderTop: "1px solid #1a1f3a",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            Period:
          </span>
          <span
            style={{
              fontSize: "13px",
              color: "#e2e8f0",
            }}
          >
            {period}
          </span>
        </div>
        {status === "live" && (
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              Clock:
            </span>
            <span
              style={{
                fontSize: "13px",
                color: "#e2e8f0",
              }}
            >
              {clock}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchHeader;
