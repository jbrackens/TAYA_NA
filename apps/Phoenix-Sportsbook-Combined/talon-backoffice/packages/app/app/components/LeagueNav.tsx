"use client";

import React, { useEffect, useState } from "react";
import { getLeagues, League } from "../lib/api/events-client";
import { Spinner } from "./Spinner";

interface LeagueNavProps {
  sportKey: string;
  onLeagueSelect?: (leagueKey: string) => void;
  activeLeague?: string;
  includeAllOption?: boolean;
}

export const LeagueNav: React.FC<LeagueNavProps> = ({
  sportKey,
  onLeagueSelect,
  activeLeague,
  includeAllOption = false,
}) => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadLeagues = async () => {
      try {
        setLoading(true);
        const data = await getLeagues(sportKey);
        const SPECIAL_PATTERNS = /outright|transfer\s*specials?|matchday\s*statistics?|player\s*specials?/i;
        if (!cancelled) {
          setLeagues(data.filter((l) => !SPECIAL_PATTERNS.test(l.leagueName)));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load leagues";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadLeagues();
    return () => {
      cancelled = true;
    };
  }, [sportKey]);

  const navContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    padding: "12px 0",
    marginBottom: "16px",
    scrollBehavior: "smooth",
  };

  const scrollbarStyle = `
    @supports selector(::-webkit-scrollbar) {
      div::-webkit-scrollbar {
        height: 4px;
      }
      div::-webkit-scrollbar-track {
        background: transparent;
      }
      div::-webkit-scrollbar-thumb {
        background: #1a1f3a;
        border-radius: 4px;
      }
    }
  `;

  if (loading) {
    return (
      <div style={{ ...navContainerStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={20} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...navContainerStyle, color: "#f87171" }}>
        Error: {error}
      </div>
    );
  }

  if (leagues.length === 0) {
    return (
      <div style={{ ...navContainerStyle, color: "#D3D3D3" }}>
        No leagues available
      </div>
    );
  }

  return (
    <>
      <style>{scrollbarStyle}</style>
      <div style={navContainerStyle}>
        {includeAllOption && (
          <button
            style={{
              padding: "8px 16px",
              backgroundColor:
                !activeLeague || activeLeague === "all" ? "#39ff14" : "#0f1225",
              color:
                !activeLeague || activeLeague === "all" ? "#000" : "#e2e8f0",
              border: `1px solid ${
                !activeLeague || activeLeague === "all" ? "#39ff14" : "#1a1f3a"
              }`,
              borderRadius: "20px",
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              fontSize: "13px",
              fontWeight: 500,
              flexShrink: 0,
            }}
            onClick={() => onLeagueSelect?.("all")}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "#39ff14";
              (e.currentTarget as HTMLButtonElement).style.color = "#000";
            }}
            onMouseLeave={(e) => {
              const isActive = !activeLeague || activeLeague === "all";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                isActive ? "#39ff14" : "#0f1225";
              (e.currentTarget as HTMLButtonElement).style.color = isActive
                ? "#000"
                : "#e2e8f0";
            }}
          >
            All
          </button>
        )}
        {leagues.map((league: League) => {
          const isActive = activeLeague === league.leagueKey;
          const pillStyle: React.CSSProperties = {
            padding: "8px 16px",
            backgroundColor: isActive ? "#39ff14" : "#0f1225",
            color: isActive ? "#000" : "#e2e8f0",
            border: `1px solid ${isActive ? "#39ff14" : "#1a1f3a"}`,
            borderRadius: "20px",
            cursor: "pointer",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
            fontSize: "13px",
            fontWeight: 500,
            flexShrink: 0,
          };

          return (
            <button
              key={league.leagueKey}
              style={pillStyle}
              onClick={() => onLeagueSelect?.(league.leagueKey)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#39ff14";
                (e.currentTarget as HTMLButtonElement).style.color = "#000";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  isActive ? "#39ff14" : "#0f1225";
                (e.currentTarget as HTMLButtonElement).style.color = isActive
                  ? "#000"
                  : "#e2e8f0";
              }}
            >
              {league.leagueName} ({league.eventCount})
            </button>
          );
        })}
      </div>
    </>
  );
};

export default LeagueNav;
