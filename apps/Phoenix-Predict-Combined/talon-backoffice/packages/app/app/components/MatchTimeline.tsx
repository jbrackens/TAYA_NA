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

  /** Inline Lucide-style SVG icons for match incidents — no emoji */
  const incidentIcons: Record<string, string> = {
    goal: '<circle cx="12" cy="12" r="10"/><path d="M12 2l-1.5 5.5L7 5.5M12 2l1.5 5.5L17 5.5M7 5.5L3.5 10l3.5 2M17 5.5l3.5 4.5-3.5 2M7 12l-1 5.5L10.5 19M17 12l1 5.5-4.5 1.5M10.5 19h3M12 7.5L7 12l3.5 7h3L17 12Z"/>',
    "own goal": '<circle cx="12" cy="12" r="10"/><path d="M12 2l-1.5 5.5L7 5.5M12 2l1.5 5.5L17 5.5M7 5.5L3.5 10l3.5 2M17 5.5l3.5 4.5-3.5 2M7 12l-1 5.5L10.5 19M17 12l1 5.5-4.5 1.5M10.5 19h3M12 7.5L7 12l3.5 7h3L17 12Z"/>',
    "yellow card": '<rect x="6" y="3" width="12" height="18" rx="2" fill="#fbbf24" stroke="#fbbf24"/>',
    "red card": '<rect x="6" y="3" width="12" height="18" rx="2" fill="#ef4444" stroke="#ef4444"/>',
    substitution: '<path d="M21 12a9 9 0 1 1-9-9"/><polyline points="21 3 21 9 15 9"/><path d="M3 12a9 9 0 0 1 9 9"/><polyline points="3 21 3 15 9 15"/>',
    injury: '<path d="M3 3h18v18H3Z" rx="2"/><path d="M8 12h8M12 8v8"/>',
    "var review": '<rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/><path d="M10 14l2 2 4-4"/>',
    "match start": '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14Z"/>',
    "match end": '<path d="M5 3v18"/><path d="M5 3h8l-2 4h4l-6 8 2-5H5"/>',
    "half time": '<circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>',
  };

  const getIncidentIcon = (type: string): React.ReactNode => {
    const paths = incidentIcons[type.toLowerCase()];
    if (!paths) return <span style={{ fontSize: 12, color: "#64748b" }}>{"●"}</span>;
    return (
      <svg
        width={16} height={16} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, verticalAlign: "middle" }}
        dangerouslySetInnerHTML={{ __html: paths }}
      />
    );
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
