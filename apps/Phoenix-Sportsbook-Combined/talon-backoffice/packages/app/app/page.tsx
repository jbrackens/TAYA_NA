"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useDeferredValue,
} from "react";
import { Search } from "lucide-react";
import { useBetslip } from "./hooks/useBetslip";
import { BetSelection } from "./components/BetslipProvider";
import { useAppSelector, useAppDispatch } from "./lib/store/hooks";
import { selectMovements, clearMovement } from "./lib/store/marketSlice";
import { selectOddsFormat } from "./lib/store/settingsSlice";
import { formatOdds } from "./lib/utils/odds";
import { useAuth } from "./hooks/useAuth";
import LandingPage from "./components/LandingPage";

interface Selection {
  selectionId: string;
  marketId: string;
  name: string;
  odds: number;
  status: string;
}

interface Market {
  marketId: string;
  fixtureId: string;
  name: string;
  status: string;
  selections: Selection[];
}

interface Competitor {
  competitorId: string;
  name: string;
  score: number;
  qualifier: string;
}

interface Fixture {
  fixtureId: string;
  fixtureName: string;
  startTime: string;
  isLive: boolean;
  sport: {
    sportId: string;
    name: string;
    abbreviation: string;
    displayToPunters: boolean;
  };
  tournament: {
    tournamentId: string;
    sportId: string;
    name: string;
    startTime: string;
  };
  status: string;
  markets: Market[];
  marketsTotalCount: number;
  competitors: Record<string, Competitor>;
}

interface Sport {
  sportId: string;
  name: string;
  abbreviation: string;
  displayToPunters: boolean;
}

const SPORT_EMOJIS: Record<string, string> = {
  soccer: "⚽",
  football: "🏈",
  basketball: "🏀",
  tennis: "🎾",
  baseball: "⚾",
  esports: "🎮",
  volleyball: "🏐",
  boxing: "🥊",
  mma: "🥋",
};

function getTeams(competitors: Record<string, Competitor> | undefined) {
  if (!competitors) return { home: "TBD", away: "TBD" };
  const home = competitors["home"] || Object.values(competitors)[0];
  const away = competitors["away"] || Object.values(competitors)[1];
  return { home: home?.name || "TBD", away: away?.name || "TBD" };
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (d.toDateString() === now.toDateString()) return `Today, ${timeStr}`;
    if (d.toDateString() === tomorrow.toDateString())
      return `Tomorrow, ${timeStr}`;
    return (
      d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      `, ${timeStr}`
    );
  } catch {
    return dateStr;
  }
}

function getSportAccent(sport?: Sport | Fixture["sport"]) {
  const key = sport?.abbreviation?.toLowerCase() || sport?.name?.toLowerCase();
  return (key && SPORT_EMOJIS[key]) || SPORT_EMOJIS[sport?.sportId || ""] || "🎯";
}

function getSearchText(fixture: Fixture) {
  const teams = getTeams(fixture.competitors);
  return [
    fixture.fixtureName,
    teams.home,
    teams.away,
    fixture.sport?.name,
    fixture.tournament?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getPrimaryMarket(fixture: Fixture) {
  return fixture.markets?.find((market) => market.selections?.length >= 3) || fixture.markets?.[0];
}

function getFixtureStatusLabel(fixture: Fixture) {
  if (fixture.isLive) return "Live";

  const start = new Date(fixture.startTime).getTime();
  if (!Number.isNaN(start) && start - Date.now() < 1000 * 60 * 90) {
    return "Starting Soon";
  }

  return "Upcoming";
}

export default function HomePage() {
  // Show marketing landing page for unauthenticated visitors
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <div style={{ padding: "40px", color: "#D3D3D3" }}>Loading...</div>;
  }
  if (!isAuthenticated) return <LandingPage />;
  return <AuthenticatedHome />;
}

function AuthenticatedHome() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSport, setActiveSport] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const topPicksRef = useRef<HTMLDivElement | null>(null);

  // Betslip integration — providers are always mounted in layout.tsx
  const betslip = useBetslip();

  // Odds movement tracking from WebSocket market updates
  const movements = useAppSelector(selectMovements);
  const oddsFormat = useAppSelector(selectOddsFormat);
  const reduxDispatch = useAppDispatch();

  // Auto-clear movement indicators after 2s
  useEffect(() => {
    const keys = Object.keys(movements);
    if (keys.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const key of keys) {
      const age = Date.now() - movements[key].timestamp;
      const remaining = Math.max(0, 2000 - age);
      timers.push(
        setTimeout(() => {
          reduxDispatch(clearMovement(key));
        }, remaining),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [movements, reduxDispatch]);

  const handleOddsClick = useCallback(
    (fixture: Fixture, market: Market, selection: Selection) => {
      if (!betslip || selection.status === "SUSPENDED") return;

      const sel: BetSelection = {
        id: `${market.marketId}-${selection.selectionId}`,
        fixtureId: fixture.fixtureId,
        marketId: market.marketId,
        selectionId: selection.selectionId,
        matchName:
          fixture.fixtureName ||
          `${getTeams(fixture.competitors).home} vs ${
            getTeams(fixture.competitors).away
          }`,
        marketName: market.name || "Match Result",
        selectionName: selection.name,
        odds: selection.odds,
        initialOdds: selection.odds,
      };

      // Toggle: if already in betslip, remove it; otherwise add
      const existing = betslip.selections.find(
        (s: BetSelection) =>
          s.selectionId === selection.selectionId &&
          s.marketId === market.marketId,
      );
      if (existing) {
        betslip.removeSelection(existing.id);
      } else {
        betslip.addSelection(sel);
      }
    },
    [betslip],
  );

  useEffect(() => {
    async function loadData() {
      try {
        const [fixturesRes, sportsRes] = await Promise.all([
          fetch("/api/v1/fixtures"),
          fetch("/api/v1/sports"),
        ]);
        if (fixturesRes.ok) {
          const data = await fixturesRes.json();
          const list = data.data || data.fixtures || data;
          setFixtures(Array.isArray(list) ? list : []);
        }
        if (sportsRes.ok) {
          const data = await sportsRes.json();
          const list = data.data || data.sports || data;
          setSports(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        setError("Could not connect to API. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const discoveryData = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
    const sportCounts = new Map<string, number>();
    const filteredFixtures: Fixture[] = [];

    for (const fixture of fixtures) {
      const sportId = fixture.sport?.sportId;
      if (sportId) {
        sportCounts.set(sportId, (sportCounts.get(sportId) || 0) + 1);
      }

      if (activeSport !== "all" && sportId !== activeSport) {
        continue;
      }

      if (normalizedQuery && !getSearchText(fixture).includes(normalizedQuery)) {
        continue;
      }

      filteredFixtures.push(fixture);
    }

    const topSports = sports
      .filter((sport) => sportCounts.has(sport.sportId))
      .sort(
        (left, right) =>
          (sportCounts.get(right.sportId) || 0) -
          (sportCounts.get(left.sportId) || 0),
      )
      .slice(0, 8);

    const topPicks = filteredFixtures
      .filter((fixture) => getPrimaryMarket(fixture)?.selections?.length)
      .toSorted((left, right) => {
        if (left.isLive !== right.isLive) {
          return left.isLive ? -1 : 1;
        }
        return (
          new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
        );
      })
      .slice(0, 10);

    const grouped = new Map<string, { sport: Sport; fixtures: Fixture[] }>();
    for (const fixture of filteredFixtures) {
      const sport = fixture.sport;
      if (!sport?.sportId) continue;
      const existing = grouped.get(sport.sportId);
      if (existing) {
        if (existing.fixtures.length < 5) {
          existing.fixtures.push(fixture);
        }
        continue;
      }

      grouped.set(sport.sportId, { sport, fixtures: [fixture] });
    }

    return {
      topSports,
      filteredFixtures,
      topPicks,
      popularRows: [...grouped.values()].slice(0, 3),
    };
  }, [fixtures, sports, activeSport, deferredSearchQuery]);

  const { topSports, filteredFixtures, topPicks, popularRows } = discoveryData;

  const scrollTopPicks = useCallback((direction: "left" | "right") => {
    if (!topPicksRef.current) return;
    const cardWidth = 304;
    topPicksRef.current.scrollBy({
      left: direction === "right" ? cardWidth : -cardWidth,
      behavior: "smooth",
    });
  }, []);

  const renderDiscoveryCard = useCallback(
    (fixture: Fixture, compact = false) => {
      const teams = getTeams(fixture.competitors);
      const market = getPrimaryMarket(fixture);
      if (!market || !market.selections?.length) return null;

      return (
        <article
          key={fixture.fixtureId}
          className={`discovery-card ${compact ? "compact" : ""}`}
        >
          <div className="discovery-card-top">
            <span className="discovery-card-league">
              {fixture.tournament?.name || fixture.sport?.name || "Featured"}
            </span>
            <span
              className={`discovery-card-badge ${
                fixture.isLive ? "live" : "soon"
              }`}
            >
              {fixture.isLive ? "Live" : getFixtureStatusLabel(fixture)}
            </span>
          </div>

          <div className="discovery-card-matchup">
            <div className="discovery-card-team">{teams.home}</div>
            <div className="discovery-card-versus">vs</div>
            <div className="discovery-card-team">{teams.away}</div>
          </div>

          <div className="discovery-card-odds">
            {market.selections.slice(0, 3).map((sel) => {
              const isSelected = betslip?.selections?.some(
                (s: BetSelection) =>
                  s.selectionId === sel.selectionId &&
                  s.marketId === market.marketId,
              );
              return (
                <button
                  key={`${fixture.fixtureId}-${sel.selectionId}`}
                  className={`discovery-odds-btn ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => handleOddsClick(fixture, market, sel)}
                  disabled={sel.status === "SUSPENDED"}
                >
                  <span className="discovery-odds-label">{sel.name}</span>
                  <span className="discovery-odds-value">
                    {sel.status === "SUSPENDED"
                      ? "-"
                      : formatOdds(sel.odds, oddsFormat)}
                  </span>
                </button>
              );
            })}
          </div>
        </article>
      );
    },
    [betslip?.selections, handleOddsClick, oddsFormat],
  );

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .home-hero {
          background: linear-gradient(135deg, #1a1040 0%, #0f1225 50%, #0c1a2e 100%);
          border-radius: 18px; padding: 24px 28px; margin-bottom: 22px;
          border: 1px solid #1e2243; position: relative; overflow: hidden;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
        }
        .home-hero::before {
          content: ''; position: absolute; top: -50%; right: -20%; width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(57,255,20,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .home-hero-copy { position: relative; z-index: 1; max-width: 560px; }
        .home-hero h1 { font-size: 24px; font-weight: 800; color: #f8fafc; margin-bottom: 6px; letter-spacing: -0.02em; }
        .home-hero p { font-size: 14px; color: #D3D3D3; font-weight: 400; }
        .home-hero .accent { color: #39ff14; }
        .home-hero-stats {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .home-hero-chip {
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(9,15,31,0.62);
          border: 1px solid rgba(57,255,20,0.12);
          min-width: 104px;
        }
        .home-hero-chip-value {
          display: block;
          color: #f8fafc;
          font-size: 17px;
          font-weight: 800;
          line-height: 1.1;
        }
        .home-hero-chip-label {
          display: block;
          margin-top: 4px;
          color: #D3D3D3;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .discovery-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 18px;
        }
        .discovery-search {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          border-radius: 16px;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(148,163,184,0.14);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .discovery-search svg {
          color: #D3D3D3;
          flex-shrink: 0;
        }
        .discovery-search input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          color: #f8fafc;
          font-size: 16px;
          outline: none;
        }
        .discovery-search input::placeholder { color: #D3D3D3; }
        .discovery-shortcut {
          padding: 5px 9px;
          border-radius: 9px;
          border: 1px solid rgba(148,163,184,0.12);
          background: rgba(15,23,42,0.72);
          color: #D3D3D3;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
        }
        .discovery-context {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: -2px;
        }
        .discovery-kicker {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #39ff14;
        }
        .discovery-context-copy {
          font-size: 13px;
          color: #D3D3D3;
        }
        .discovery-context-copy strong {
          color: #f8fafc;
        }

        .sport-pills-shell {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 4px;
        }
        .sport-pills-shell::-webkit-scrollbar { display: none; }
        .sport-pills {
          display: flex; gap: 10px; min-width: max-content;
        }
        .sport-pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 999px; font-size: 13px; font-weight: 700;
          border: 1px solid rgba(42,49,80,0.9); background: #0f1630; color: #D3D3D3;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .sport-pill:hover { border-color: #435079; color: #dbeafe; transform: translateY(-1px); }
        .sport-pill.active {
          border-color: rgba(173,255,47,0.28);
          color: #ADFF2F;
          background: rgba(173,255,47,0.1);
          box-shadow: 0 0 24px rgba(173,255,47,0.12);
        }
        .sport-pill-icon { font-size: 15px; line-height: 1; }

        .discovery-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .discovery-board {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 20px;
          border-radius: 18px;
          border: 1px solid #1f2940;
          background: linear-gradient(180deg, rgba(16,20,35,0.96) 0%, rgba(10,14,26,0.98) 100%);
          box-shadow: 0 22px 40px rgba(0,0,0,0.18);
          margin-bottom: 28px;
        }
        .discovery-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .discovery-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .discovery-title-icon {
          font-size: 18px;
          line-height: 1;
        }
        .discovery-title {
          font-size: 18px;
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: -0.02em;
        }
        .discovery-subtitle {
          color: #D3D3D3;
          font-size: 13px;
          font-weight: 600;
        }
        .carousel-controls {
          display: flex;
          gap: 8px;
        }
        .carousel-arrow {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(148,163,184,0.14);
          background: #10192f;
          color: #dbeafe;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.15s;
        }
        .carousel-arrow:hover {
          border-color: rgba(173,255,47,0.28);
          color: #ADFF2F;
        }

        .top-picks-track,
        .sport-ribbon-track {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-snap-type: x mandatory;
          padding-bottom: 4px;
        }
        .top-picks-track::-webkit-scrollbar,
        .sport-ribbon-track::-webkit-scrollbar { display: none; }

        .discovery-card {
          flex: 0 0 280px;
          min-height: 144px;
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(31,41,74,0.94);
          background:
            linear-gradient(180deg, rgba(18,26,51,0.96) 0%, rgba(10,14,31,0.98) 100%);
          scroll-snap-align: start;
          box-shadow: 0 16px 32px rgba(0,0,0,0.18);
        }
        .discovery-card.compact {
          flex-basis: 250px;
          min-height: 136px;
        }
        .discovery-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }
        .discovery-card-league {
          font-size: 11px;
          color: #D3D3D3;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .discovery-card-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }
        .discovery-card-badge.live {
          background: rgba(34,197,94,0.12);
          color: #4ade80;
        }
        .discovery-card-badge.soon {
          background: rgba(173,255,47,0.1);
          color: #c9ff68;
        }
        .discovery-card-matchup {
          display: grid;
          gap: 6px;
          margin-bottom: 16px;
        }
        .discovery-card-team {
          color: #f8fafc;
          font-size: 18px;
          font-weight: 800;
          line-height: 1.1;
        }
        .discovery-card-versus {
          color: #D3D3D3;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-weight: 700;
        }
        .discovery-card-odds {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .discovery-odds-btn {
          border: 1px solid rgba(42,49,80,0.95);
          border-radius: 12px;
          background: rgba(9,15,31,0.85);
          padding: 10px 8px;
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .discovery-odds-btn:hover {
          border-color: rgba(173,255,47,0.2);
          background: rgba(18,28,47,0.95);
        }
        .discovery-odds-btn:disabled {
          opacity: 0.45;
          cursor: default;
        }
        .discovery-odds-btn.selected {
          border-color: rgba(173,255,47,0.45);
          background: rgba(173,255,47,0.1);
        }
        .discovery-odds-label {
          display: block;
          color: #D3D3D3;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }
        .discovery-odds-value {
          display: block;
          color: #ADFF2F;
          font-size: 15px;
          font-weight: 800;
        }

        .popular-sport-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .popular-sport-block {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .popular-sport-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }
        .popular-sport-title {
          font-size: 17px;
          font-weight: 800;
          color: #f8fafc;
        }
        .popular-sport-meta {
          color: #D3D3D3;
          font-size: 12px;
          font-weight: 700;
        }

        /* Section */
        .fixtures-board {
          border: 1px solid #1b2336;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(15,18,33,0.98) 0%, rgba(10,13,25,0.98) 100%);
          padding: 20px;
        }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .section-title { font-size: 17px; font-weight: 700; color: #f1f5f9; }
        .section-count {
          font-size: 12px; font-weight: 600; color: #D3D3D3; background: #161a35;
          padding: 4px 10px; border-radius: 6px;
        }
        .section-subtitle {
          margin-top: 6px;
          color: #D3D3D3;
          font-size: 13px;
        }

        /* Fixture card */
        .fixture-card {
          background: #111328; border: 1px solid #1a1f3a; border-radius: 14px;
          padding: 0; margin-bottom: 12px; overflow: hidden; transition: border-color 0.15s;
        }
        .fixture-card:hover { border-color: #2a3158; }
        .fixture-meta {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 20px 0;
        }
        .fixture-league { font-size: 12px; font-weight: 600; color: #D3D3D3; text-transform: uppercase; letter-spacing: 0.05em; }
        .fixture-time { font-size: 12px; font-weight: 600; }
        .fixture-time.upcoming { color: #D3D3D3; }
        .fixture-time.live { color: #22c55e; display: flex; align-items: center; gap: 6px; }
        .fixture-time.live::before {
          content: ''; width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
          animation: pulse-live 1.5s ease-in-out infinite;
        }
        @keyframes pulse-live { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        .fixture-teams {
          display: flex; align-items: center; justify-content: center; gap: 16px;
          padding: 16px 20px;
        }
        .team-name { font-size: 16px; font-weight: 700; color: #f1f5f9; flex: 1; }
        .team-name.home { text-align: right; }
        .team-name.away { text-align: left; }
        .vs-badge {
          font-size: 11px; font-weight: 700; color: #D3D3D3;
          background: #1a1f3a; padding: 4px 10px; border-radius: 6px;
          text-transform: uppercase; letter-spacing: 0.1em; flex-shrink: 0;
        }

        /* Odds row */
        .odds-row {
          display: flex; gap: 0; border-top: 1px solid #1a1f3a;
        }
        .odds-btn {
          flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 14px 12px; background: transparent; border: none; border-right: 1px solid #1a1f3a;
          cursor: pointer; transition: all 0.12s; color: #e2e8f0;
        }
        .odds-btn:last-child { border-right: none; }
        .odds-btn:hover { background: rgba(57,255,20,0.06); }
        .odds-btn:disabled { cursor: default; opacity: 0.5; }
        .odds-btn:disabled:hover { background: transparent; }
        .odds-btn.selected { background: rgba(57,255,20,0.12); border-bottom: 2px solid #39ff14; }
        .odds-btn.selected .odds-label { color: #39ff14; }
        .odds-btn .odds-label { font-size: 10px; font-weight: 600; color: #D3D3D3; text-transform: uppercase; letter-spacing: 0.05em; }
        .odds-btn .odds-value { font-size: 15px; font-weight: 700; color: #39ff14; }
        .odds-btn .odds-value.suspended { color: #374163; }

        /* Odds movement flash indicators */
        .odds-btn.odds-flash-up {
          animation: flashGreen 2s ease-out;
        }
        .odds-btn.odds-flash-down {
          animation: flashRed 2s ease-out;
        }
        @keyframes flashGreen {
          0% { background: rgba(34,197,94,0.25); }
          30% { background: rgba(34,197,94,0.12); }
          100% { background: transparent; }
        }
        @keyframes flashRed {
          0% { background: rgba(239,68,68,0.25); }
          30% { background: rgba(239,68,68,0.12); }
          100% { background: transparent; }
        }
        .odds-arrow { font-size: 9px; margin-left: 3px; vertical-align: middle; }
        .odds-arrow.up { color: #22c55e; }
        .odds-arrow.down { color: #ef4444; }
        .odds-btn.odds-flash-up .odds-value { color: #22c55e; transition: color 2s; }
        .odds-btn.odds-flash-down .odds-value { color: #ef4444; transition: color 2s; }

        /* More markets link */
        .more-markets {
          display: block; text-align: center; padding: 10px; font-size: 12px;
          font-weight: 600; color: #D3D3D3; border-top: 1px solid #1a1f3a; transition: color 0.15s;
        }
        .more-markets:hover { color: #39ff14; }

        /* Empty / error */
        .empty-state {
          text-align: center; padding: 60px 20px; color: #D3D3D3;
        }
        .empty-state .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
        .empty-state .empty-title { font-size: 16px; font-weight: 600; color: #D3D3D3; margin-bottom: 6px; }
        .empty-state .empty-sub { font-size: 13px; color: #D3D3D3; }

        .error-banner {
          padding: 14px 18px; background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15);
          border-radius: 12px; color: #f87171; font-size: 13px; font-weight: 500; margin-bottom: 20px;
        }

        .skeleton { background: linear-gradient(90deg, #161a35 25%, #1e2243 50%, #161a35 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 10px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        @media (max-width: 768px) {
          .home-hero {
            padding: 20px;
            flex-direction: column;
            align-items: flex-start;
          }
          .home-hero-stats {
            width: 100%;
            justify-content: flex-start;
          }
          .discovery-search {
            padding: 14px 14px;
          }
          .discovery-shortcut {
            display: none;
          }
          .discovery-card,
          .discovery-card.compact {
            flex-basis: 86vw;
          }
        }
      `,
        }}
      />

      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero-copy">
          <h1>
            Welcome to <span className="accent">TAYA NA!</span>
          </h1>
          <p>Search fast, grab a top pick, or scan the board sport by sport.</p>
        </div>
        <div className="home-hero-stats">
          <div className="home-hero-chip">
            <span className="home-hero-chip-value">{topPicks.length || "—"}</span>
            <span className="home-hero-chip-label">Hot Picks</span>
          </div>
          <div className="home-hero-chip">
            <span className="home-hero-chip-value">{popularRows.length || "—"}</span>
            <span className="home-hero-chip-label">Sport Rows</span>
          </div>
          <div className="home-hero-chip">
            <span className="home-hero-chip-value">{filteredFixtures.length || "—"}</span>
            <span className="home-hero-chip-label">Visible Matches</span>
          </div>
        </div>
      </div>

      <div className="discovery-stack">
        <label className="discovery-search" htmlFor="discovery-search">
          <Search size={20} strokeWidth={2.2} />
          <input
            id="discovery-search"
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search events, teams, or leagues..."
          />
          <span className="discovery-shortcut">/</span>
        </label>

        <div className="discovery-context">
          <div>
            <div className="discovery-kicker">Discovery Engine</div>
            <div className="discovery-context-copy">
              <strong>{filteredFixtures.length}</strong> matches filtered for your current board.
            </div>
          </div>
          <div className="discovery-context-copy">
            Start with <strong>Hot Picks</strong>, then scan sport ribbons before the full board.
          </div>
        </div>

        <div className="sport-pills-shell">
          <div className="sport-pills">
            <button
              className={`sport-pill ${activeSport === "all" ? "active" : ""}`}
              onClick={() => setActiveSport("all")}
            >
              <span className="sport-pill-icon">✨</span>
              All Sports
            </button>
            {topSports.map((sport) => (
              <button
                key={sport.sportId}
                className={`sport-pill ${
                  activeSport === sport.sportId ? "active" : ""
                }`}
                onClick={() => setActiveSport(sport.sportId)}
              >
                <span className="sport-pill-icon">{getSportAccent(sport)}</span>
                {sport.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="discovery-board">
        <section className="discovery-section">
          <div className="discovery-section-head">
            <div>
              <div className="discovery-title-wrap">
                <span className="discovery-title-icon">🔥</span>
                <span className="discovery-title">Hot Picks</span>
              </div>
              <div className="discovery-subtitle">
                Quick-entry plays pulled from live and about-to-start boards
              </div>
            </div>

            <div className="carousel-controls">
              <button
                type="button"
                className="carousel-arrow"
                onClick={() => scrollTopPicks("left")}
                aria-label="Scroll top picks left"
              >
                ‹
              </button>
              <button
                type="button"
                className="carousel-arrow"
                onClick={() => scrollTopPicks("right")}
                aria-label="Scroll top picks right"
              >
                ›
              </button>
            </div>
          </div>

          <div className="top-picks-track" ref={topPicksRef}>
            {topPicks.length > 0 ? (
              topPicks.map((fixture) => renderDiscoveryCard(fixture))
            ) : (
              <div className="empty-state" style={{ width: "100%" }}>
                <div className="empty-title">No top picks right now</div>
                <div className="empty-sub">
                  Open up the board with another sport or a wider search.
                </div>
              </div>
            )}
          </div>
        </section>

        {popularRows.length > 0 && (
          <div className="popular-sport-grid">
            {popularRows.map(({ sport, fixtures }) => (
              <section key={`popular-${sport.sportId}`} className="popular-sport-block">
                <div className="popular-sport-head">
                  <div className="popular-sport-title">
                    {getSportAccent(sport)} Popular in {sport.name}
                  </div>
                  <div className="popular-sport-meta">{fixtures.length} featured events</div>
                </div>

                <div className="sport-ribbon-track">
                  {fixtures.map((fixture) => renderDiscoveryCard(fixture, true))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Fixtures */}
      <div className="fixtures-board">
        <div className="section-header">
          <div>
            <span className="section-title">
              {loading
                ? "Loading..."
                : searchQuery
                  ? "Full Match Board"
                  : activeSport === "all"
                    ? "Full Match Board"
                    : `${topSports.find((sport) => sport.sportId === activeSport)?.name || "Selected Sport"} Board`}
            </span>
            <div className="section-subtitle">
              Every available fixture after your search and sport filters.
            </div>
          </div>
          {!loading && (
            <span className="section-count">
              {filteredFixtures.length} matches
            </span>
          )}
        </div>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={`skeleton-${i}`}
                className="skeleton"
                style={{ height: 140 }}
              />
            ))}
          </div>
        )}

        {!loading &&
          filteredFixtures.map((fixture) => {
            const teams = getTeams(fixture.competitors);
            const mainMarket = fixture.markets?.[0];
            return (
              <div key={fixture.fixtureId} className="fixture-card">
                <div className="fixture-meta">
                  <span className="fixture-league">
                    {fixture.sport?.name} &middot; {fixture.tournament?.name}
                  </span>
                  <span
                    className={`fixture-time ${
                      fixture.isLive ? "live" : "upcoming"
                    }`}
                  >
                    {fixture.isLive ? "LIVE" : formatDate(fixture.startTime)}
                  </span>
                </div>

                <div className="fixture-teams">
                  <span className="team-name home">{teams.home}</span>
                  <span className="vs-badge">vs</span>
                  <span className="team-name away">{teams.away}</span>
                </div>

                {mainMarket && mainMarket.selections?.length > 0 && (
                  <div className="odds-row">
                    {mainMarket.selections.map((sel) => {
                      const isSelected = betslip?.selections?.some(
                        (s: BetSelection) =>
                          s.selectionId === sel.selectionId &&
                          s.marketId === mainMarket.marketId,
                      );
                      const moveKey = `${mainMarket.marketId}:${sel.selectionId}`;
                      const movement = movements[moveKey];
                      const moveClass = movement
                        ? movement.direction === "up"
                          ? "odds-flash-up"
                          : "odds-flash-down"
                        : "";
                      return (
                        <button
                          key={sel.selectionId}
                          className={`odds-btn ${
                            isSelected ? "selected" : ""
                          } ${moveClass}`}
                          onClick={() =>
                            handleOddsClick(fixture, mainMarket, sel)
                          }
                          disabled={sel.status === "SUSPENDED"}
                        >
                          <span className="odds-label">{sel.name}</span>
                          <span
                            className={`odds-value ${
                              sel.status === "SUSPENDED" ? "suspended" : ""
                            }`}
                          >
                            {sel.status === "SUSPENDED"
                              ? "-"
                              : formatOdds(sel.odds, oddsFormat)}
                            {movement && movement.direction === "up" && (
                              <span className="odds-arrow up">&#9650;</span>
                            )}
                            {movement && movement.direction === "down" && (
                              <span className="odds-arrow down">&#9660;</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {fixture.marketsTotalCount > 1 && (
                  <a
                    href={`/fixtures/${fixture.fixtureId}`}
                    className="more-markets"
                  >
                    +{fixture.marketsTotalCount - 1} more markets
                  </a>
                )}
              </div>
            );
          })}

        {!loading && filteredFixtures.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">⚽</div>
            <div className="empty-title">No matches available</div>
            <div className="empty-sub">
              Check back soon for upcoming fixtures and live odds.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
