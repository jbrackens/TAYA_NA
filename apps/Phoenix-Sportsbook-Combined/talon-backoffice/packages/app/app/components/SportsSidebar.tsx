"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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

// Fallback data — Philippine market top sports (when API is unavailable)
const FALLBACK_SPORTS: SidebarSport[] = [
  {
    sportId: "1",
    sportKey: "basketball",
    sportName: "Basketball",
    eventCount: 149,
    abbreviation: "basketball",
    name: "Basketball",
  },
  {
    sportId: "2",
    sportKey: "boxing",
    sportName: "Boxing",
    eventCount: 83,
    abbreviation: "boxing",
    name: "Boxing",
  },
  {
    sportId: "3",
    sportKey: "soccer",
    sportName: "Football",
    eventCount: 1108,
    abbreviation: "soccer",
    name: "Football",
  },
  {
    sportId: "4",
    sportKey: "volleyball",
    sportName: "Volleyball",
    eventCount: 26,
    abbreviation: "volleyball",
    name: "Volleyball",
  },
  {
    sportId: "5",
    sportKey: "cs2",
    sportName: "Counter-Strike 2",
    eventCount: 15,
    abbreviation: "cs2",
    name: "Counter-Strike 2",
  },
  {
    sportId: "6",
    sportKey: "tennis",
    sportName: "Tennis",
    eventCount: 42,
    abbreviation: "tennis",
    name: "Tennis",
  },
  {
    sportId: "7",
    sportKey: "mma",
    sportName: "MMA",
    eventCount: 63,
    abbreviation: "mma",
    name: "MMA",
  },
  {
    sportId: "8",
    sportKey: "baseball",
    sportName: "Baseball",
    eventCount: 68,
    abbreviation: "baseball",
    name: "Baseball",
  },
  {
    sportId: "9",
    sportKey: "badminton",
    sportName: "Badminton",
    eventCount: 23,
    abbreviation: "badminton",
    name: "Badminton",
  },
  {
    sportId: "10",
    sportKey: "cricket",
    sportName: "Cricket",
    eventCount: 56,
    abbreviation: "cricket",
    name: "Cricket",
  },
];

export const SportsSidebar: React.FC = () => {
  const pathname = usePathname();
  const { t, ready } = useTranslation("sidebar");
  const [sports, setSports] = useState<SidebarSport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSport, setExpandedSport] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const tx = useCallback(
    (key: string, fallback: string) =>
      ready ? t(key, { defaultValue: fallback }) : fallback,
    [ready, t],
  );

  // Load favorites from localStorage on mount
  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const [animatingStar, setAnimatingStar] = useState<string | null>(null);

  const toggleFavorite = useCallback((sportId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAnimatingStar(sportId);
    setTimeout(() => setAnimatingStar(null), 300);
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
  const sortedSports = useMemo(() => {
    return [...sports].sort((a, b) => {
      const aFav = favorites.has(a.sportId) ? 0 : 1;
      const bFav = favorites.has(b.sportId) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name);
    });
  }, [sports, favorites]);

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
        <div className="ps-sidebar-logo" aria-label="TAYA NA logo">
          <span className="ps-sidebar-logo-mark" aria-hidden="true">
            <span className="ps-sidebar-logo-t-top" />
            <span className="ps-sidebar-logo-t-stem" />
            <span className="ps-sidebar-logo-n-left" />
            <span className="ps-sidebar-logo-n-diag" />
            <span className="ps-sidebar-logo-n-right" />
            <span className="ps-sidebar-logo-mid-slit" />
          </span>
        </div>
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
            <span>{tx("IN_PLAY", "In-Play")}</span>
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
            <span>{tx("UPCOMING", "Upcoming")}</span>
          </span>
        </a>
      </div>

      {/* Sports List */}
      <div className="ps-sidebar-section">
        <div className="ps-sidebar-section-label">
          {tx("ALL_GAMES", "All Games")}
        </div>
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
                      transition: "color 0.15s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      transform: animatingStar === sport.sportId ? "scale(1.4)" : "scale(1)",
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
