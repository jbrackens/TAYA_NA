"use client";

import React, { useEffect, useState, useCallback } from "react";
import wsService from "../lib/websocket/websocket-service";
import type { WsMessage } from "../lib/websocket/websocket-service";

interface MatchTrackerIncident {
  incidentId: string;
  type: string;
  clockSeconds?: number;
  details?: Record<string, unknown>;
}

interface MatchTimelineProps {
  fixtureId: string;
  maxIncidents?: number;
}

export const MatchTimeline: React.FC<MatchTimelineProps> = ({
  fixtureId,
  maxIncidents = 20,
}) => {
  const [incidents, setIncidents] = useState<MatchTrackerIncident[]>([]);

  const handleFixtureUpdate = useCallback(
    (message: WsMessage) => {
      if (message.event !== "update") return;
      const data = message.data;
      // Only handle incident updates for this fixture
      if (data?.fixtureId !== fixtureId || !data?.incidents) return;

      setIncidents((prev) => {
        // Merge new incidents, deduplicate by incidentId, keep most recent first
        const newIncidents = data.incidents as MatchTrackerIncident[];
        const existingIds = new Set(
          prev.map((i: MatchTrackerIncident) => i.incidentId),
        );
        const merged = [
          ...newIncidents.filter(
            (i: MatchTrackerIncident) => !existingIds.has(i.incidentId),
          ),
          ...prev,
        ];
        return merged.slice(0, maxIncidents);
      });
    },
    [fixtureId, maxIncidents],
  );

  useEffect(() => {
    // Subscribe to fixture channel for real-time incident updates
    wsService.subscribe("fixture");
    const unsubscribe = wsService.on("fixture", handleFixtureUpdate);

    return () => {
      unsubscribe();
      wsService.unsubscribe("fixture");
    };
  }, [fixtureId, maxIncidents, handleFixtureUpdate]);

  const getIncidentIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      goal: "⚽",
      "own goal": "⚽",
      "yellow card": "🟨",
      "red card": "🟥",
      substitution: "🔄",
      injury: "🏥",
      "var review": "📺",
      "match start": "🚀",
      "match end": "🏁",
      "half time": "⏸️",
    };
    return iconMap[type.toLowerCase()] || "●";
  };

  const getTimeString = (clockSeconds?: number): string => {
    if (!clockSeconds) return "-";
    const minutes = Math.floor(clockSeconds / 60);
    const seconds = clockSeconds % 60;
    return `${minutes}'${seconds > 0 ? `${seconds}` : ""}`;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        padding: "24px",
        backgroundColor: "#0f1225",
        borderRadius: "8px",
      }}
    >
      <h3
        style={{
          margin: "0 0 20px 0",
          fontSize: "16px",
          fontWeight: 600,
          color: "#e2e8f0",
        }}
      >
        Match Timeline
      </h3>

      {incidents.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {incidents.map((incident) => (
            <div
              key={incident.incidentId}
              style={{
                display: "flex",
                gap: "16px",
                padding: "12px",
                backgroundColor: "rgba(57, 255, 20, 0.05)",
                borderLeft: "3px solid #39ff14",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  flex: "0 0 50px",
                  fontWeight: 700,
                  color: "#39ff14",
                  fontSize: "14px",
                }}
              >
                {getTimeString(incident.clockSeconds)}
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#e2e8f0",
                    textTransform: "capitalize",
                  }}
                >
                  {getIncidentIcon(incident.type)} {incident.type}
                </div>
                {incident.details && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    {Object.entries(incident.details)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(", ")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            color: "#64748b",
            fontSize: "13px",
            textAlign: "center",
            padding: "20px",
          }}
        >
          No incidents recorded yet
        </div>
      )}
    </div>
  );
};

export default MatchTimeline;
