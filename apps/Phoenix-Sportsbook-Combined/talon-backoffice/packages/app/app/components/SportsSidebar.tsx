"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { getSports, getLeagues, Sport, League } from "../lib/api/events-client";
import { logger } from "../lib/logger";
import { SportIcon } from "./SportIcons";
import { Radio, Clock, Star } from "lucide-react";

// Extended sport with leagues loaded on expand
interface SidebarSport extends Sport {
  abbreviation: string; // derived from sportKey
  name: string; // derived from sportName
  leagues?: League[];
}

// ─── Favorites persistence via localStorage ──────────────────
const FAVORITES_KEY = "phoenix_favorite_sports";

function loadFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(favs: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
}

// Fallback data when API is unavailable (dev mode without Go backend)
const FALLBACK_SPORTS: SidebarSport[] = [
  {
    sportId: "1",
    sportKey: "soccer",
    sportName: "Soccer",
    eventCount: 142,
    abbreviation: "soccer",
    name: "Soccer",
  },
  {
    sportId: "2",
    sportKey: "basketball",
    sportName: "Basketball",
    eventCount: 87,
    abbreviation: "basketball",
    name: "Basketball",
  },
  {
    sportId: "3",
    sportKey: "tennis",
    sportName: "Tennis",
    eventCount: 64,
    abbreviation: "tennis",
    name: "Tennis",
  },
  {
    sportId: "4",
    sportKey: "american-football",
    sportName: "American Football",
    eventCount: 38,
    abbreviation: "american-football",
    name: "American Football",
  },
  {
    sportId: "5",
    sportKey: "baseball",
    sportName: "Baseball",
    eventCount: 52,
    abbreviation: "baseball",
    name: "Baseball",
  },
  {
    sportId: "6",
    sportKey: "ice-hockey",
    sportName: "Ice Hockey",
    eventCount: 41,
    abbreviation: "ice-hockey",
    name: "Ice Hockey",
  },
  {
    sportId: "7",
    sportKey: "esports",
    sportName: "Esports",
    eventCount: 96,
    abbreviation: "esports",
    name: "Esports",
  },
  {
    sportId: "8",
    sportKey: "mma",
    sportName: "MMA",
    eventCount: 24,
    abbreviation: "mma",
    name: "MMA",
  },
  {
    sportId: "9",
    sportKey: "golf",
    sportName: "Golf",
    eventCount: 18,
    abbreviation: "golf",
    name: "Golf",
  },
  {
    sportId: "10",
    sportKey: "cricket",
    sportName: "Cricket",
    eventCount: 31,
    abbreviation: "cricket",
    name: "Cricket",
  },
];

export const SportsSidebar: React.FC = () => {
  const pathname = usePathname();
  const { t } = useTranslation("sidebar");
  const [sports, setSports] = useState<SidebarSport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSport, setExpandedSport] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load favorites from localStorage on mount
  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const toggleFavorite = useCallback((sportId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(sportId)) {
        next.delete(sportId);
      } else {
        next.add(sportId);
      }
      saveFavorites(next);
      return next;
    });
  }, []);

  // Sort: favorites first, then alphabetical
  const sortedSports = [...sports].sort((a, b) => {
    const aFav = favorites.has(a.sportId) ? 0 : 1;
    const bFav = favorites.has(b.sportId) ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;
    return a.name.localeCompare(b.name);
  });

  useEffect(() => {
    const loadSports = async () => {
      try {
        const rawSports = await getSports();
        // Normalize Sport → SidebarSport
        const sidebarSports: SidebarSport[] = (
          Array.isArray(rawSports) ? rawSports : []
        ).map((s) => ({
          ...s,
          abbreviation: s.sportKey || s.sportId,
          name: s.sportName || s.sportKey || "Unknown",
        }));
        const withGames = sidebarSports.filter((s) => s.eventCount > 0);
        setSports(withGames.length > 0 ? withGames : FALLBACK_SPORTS);
      } catch (err) {
        logger.error("Sidebar", "Failed to load sports", err);
        setSports(FALLBACK_SPORTS);
      } finally {
        setLoading(false);
      }
    };
    loadSports();
  }, []);

  const activeSport = (pathname ?? "/").startsWith("/sports/")
    ? (pathname ?? "/").split("/")[2]
    : null;

  return (
    <aside className="ps-sidebar">
      {/* Brand */}
      <div className="ps-sidebar-brand">
        <div className="ps-sidebar-logo">T</div>
        <div className="ps-sidebar-title">TAYA NA!</div>
      </div>

      {/* Quick Links */}
      <div className="ps-sidebar-section">
        <a
          href="/live"
          className={`ps-sidebar-item ${pathname === "/live" ? "active" : ""}`}
        >
          <span className="ps-sidebar-item-left">
            <span className="ps-sidebar-item-icon">
              <Radio size={15} strokeWidth={2} />
            </span>
            <span>{t("IN_PLAY")}</span>
          </span>
          <span className="ps-sidebar-badge live">LIVE</span>
        </a>
        <a
          href="/"
          className={`ps-sidebar-item ${pathname === "/" ? "active" : ""}`}
        >
          <span className="ps-sidebar-item-left">
            <span className="ps-sidebar-item-icon">
              <Clock size={15} strokeWidth={2} />
            </span>
            <span>{t("UPCOMING")}</span>
          </span>
        </a>
      </div>

      {/* Sports List */}
      <div className="ps-sidebar-section">
        <div className="ps-sidebar-section-label">{t("ALL_GAMES")}</div>
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="ps-sidebar-item" style={{ opacity: 0.3 }}>
                <span className="ps-sidebar-item-left">
                  <span
                    className="ps-sidebar-item-icon"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: "#1a1f3a",
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      width: 80,
                      height: 12,
                      borderRadius: 4,
                      background: "#1a1f3a",
                      display: "inline-block",
                    }}
                  />
                </span>
              </div>
            ))}
          </>
        ) : (
          sortedSports.map((sport) => (
            <React.Fragment key={sport.sportId}>
              <a
                href={`/sports/${sport.abbreviation || sport.sportId}`}
                className={`ps-sidebar-item ${
                  activeSport === (sport.abbreviation || sport.sportId)
                    ? "active"
                    : ""
                }`}
                onClick={async (e) => {
                  e.preventDefault();
                  if (expandedSport === sport.sportId) {
                    setExpandedSport(null);
                  } else {
                    setExpandedSport(sport.sportId);
                    // Load leagues if not already loaded
                    if (!sport.leagues) {
                      try {
                        const leagues = await getLeagues(sport.abbreviation);
                        setSports((prev) =>
                          prev.map((s) =>
                            s.sportId === sport.sportId ? { ...s, leagues } : s,
                          ),
                        );
                      } catch (err) {
                        logger.error("Sidebar", "Failed to load leagues", err);
                      }
                    }
                  }
                }}
              >
                <span className="ps-sidebar-item-left">
                  <span className="ps-sidebar-item-icon">
                    <SportIcon sportKey={sport.abbreviation || sport.sportId} />
                  </span>
                  <span>{sport.name}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {sport.eventCount != null && sport.eventCount > 0 && (
                    <span className="ps-sidebar-badge">{sport.eventCount}</span>
                  )}
                  <span
                    role="button"
                    onClick={(e) => toggleFavorite(sport.sportId, e)}
                    title={
                      favorites.has(sport.sportId)
                        ? t("FAVOURITE") + " ✓"
                        : t("FAVOURITE")
                    }
                    style={{
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                      color: favorites.has(sport.sportId)
                        ? "#39ff14"
                        : "#2a3158",
                      transition: "color 0.15s",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 44,
                      height: 44,
                      margin: -12,
                    }}
                  >
                    <Star
                      size={14}
                      strokeWidth={2}
                      fill={
                        favorites.has(sport.sportId) ? "currentColor" : "none"
                      }
                    />
                  </span>
                </span>
              </a>

              {/* Expanded leagues/tournaments */}
              {expandedSport === sport.sportId && sport.leagues && (
                <div style={{ paddingLeft: 32, background: "#0b0e1c" }}>
                  {sport.leagues.map((league) => (
                    <a
                      key={league.leagueId}
                      href={`/sports/${sport.abbreviation}/${
                        league.leagueKey || league.leagueId
                      }`}
                      className="ps-sidebar-item"
                      style={{ padding: "8px 20px 8px 8px", fontSize: 12 }}
                    >
                      <span className="ps-sidebar-item-left">
                        <span>{league.leagueName}</span>
                      </span>
                      {league.eventCount != null && league.eventCount > 0 && (
                        <span
                          className="ps-sidebar-badge"
                          style={{ fontSize: 10 }}
                        >
                          {league.eventCount}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </aside>
  );
};

export default SportsSidebar;
