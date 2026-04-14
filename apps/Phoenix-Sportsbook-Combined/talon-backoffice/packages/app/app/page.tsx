"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
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
import { useTranslation } from "react-i18next";
import { logger } from "./lib/logger";
import { useSports, useFixtures, useLeaderboards } from "./lib/query/hooks";

const LandingPage = dynamic(() => import("./components/LandingPage"));

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

interface LeaderboardSummary {
  leaderboardId: string;
  name: string;
  description?: string;
  metricKey: string;
  rankingMode: "sum" | "min" | "max";
  order: "asc" | "desc";
  status: "draft" | "active" | "closed";
}

const METRIC_KEYS: Record<string, string> = {
  net_profit_cents: 'NET_PROFIT',
  stake_cents: 'TOTAL_STAKE',
  win_count: 'WINS',
  bet_count: 'TOTAL_BETS',
  qualified_referrals: 'REFERRALS',
  referral_count: 'REFERRALS',
};

function humanizeLabel(key: string, t: (k: string) => string): string {
  const i18nKey = METRIC_KEYS[key];
  if (i18nKey) return t(i18nKey);
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* Inline SVG paths for sport pill icons — replace emoji with real sport artwork */
const SPORT_SVG_PATHS: Record<string, string> = {
  soccer: '<circle cx="12" cy="12" r="10"/><path d="M12 2l-1.5 5.5L7 5.5M12 2l1.5 5.5L17 5.5M7 5.5L3.5 10l3.5 2M17 5.5l3.5 4.5-3.5 2M7 12l-1 5.5L10.5 19M17 12l1 5.5-4.5 1.5M10.5 19h3M12 7.5L7 12l3.5 7h3L17 12Z"/>',
  football: '<path d="M6.5 3.5C9 2 15 2 17.5 3.5 20 5 22 9 22 12s-2 7-4.5 8.5C15 22 9 22 6.5 20.5 4 19 2 15 2 12s2-7 4.5-8.5Z"/><path d="M9 12h6M12 8v8"/>',
  basketball: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2v20"/><path d="M5.2 5.2c3.9 1.8 5.8 5.8 5.8 5.8M18.8 5.2c-3.9 1.8-5.8 5.8-5.8 5.8M5.2 18.8c3.9-1.8 5.8-5.8 5.8-5.8M18.8 18.8c-3.9-1.8-5.8-5.8-5.8-5.8"/>',
  tennis: '<circle cx="12" cy="12" r="10"/><path d="M18.5 5.5C16 8 16 12 18.5 18.5M5.5 5.5C8 8 8 12 5.5 18.5"/>',
  baseball: '<circle cx="12" cy="12" r="10"/><path d="M7 4c1 3 1 6 0 9M17 4c-1 3-1 6 0 9"/>',
  esports: '<path d="M6 11h4M8 9v4"/><path d="M15 12h.01M18 10h.01"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5Z"/>',
  volleyball: '<circle cx="12" cy="12" r="10"/><path d="M12 2C8 6 8 12 12 16s4 2 6 6M12 2c4 4 4 10 0 14s-4 2-6 6M2 12h20"/>',
  boxing: '<path d="M9 3c-2 0-4 2-4 4v4c0 3 2 6 5 7l2 1v2h6v-2l1-1c2-2 3-4 3-6V8c0-3-2-5-5-5H9Z"/><path d="M9 8h6"/>',
  mma: '<path d="M9 3c-2 0-4 2-4 4v4c0 3 2 6 5 7l2 1v2h6v-2l1-1c2-2 3-4 3-6V8c0-3-2-5-5-5H9Z"/><path d="M9 8h6"/>',
};

function SportPillIcon({ sportKey }: { sportKey: string }) {
  const key = sportKey?.toLowerCase();
  const paths = SPORT_SVG_PATHS[key];
  if (!paths) {
    // Fallback — generic sport icon
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    );
  }
  return (
    <svg
      width={14} height={14} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}

function getTeams(competitors: Record<string, Competitor> | undefined, tbd = "TBD") {
  if (!competitors) return { home: tbd, away: tbd };
  const home = competitors["home"] || Object.values(competitors)[0];
  const away = competitors["away"] || Object.values(competitors)[1];
  return { home: home?.name || tbd, away: away?.name || tbd };
}

function formatDate(dateStr: string, t?: (k: string) => string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const todayLabel = t ? t("TODAY") : "Today";
    const tomorrowLabel = t ? t("TOMORROW") : "Tomorrow";
    if (d.toDateString() === now.toDateString()) return `${todayLabel}, ${timeStr}`;
    if (d.toDateString() === tomorrow.toDateString())
      return `${tomorrowLabel}, ${timeStr}`;
    return (
      d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      `, ${timeStr}`
    );
  } catch {
    return dateStr;
  }
}

function getSportAccent(sport?: Sport | Fixture["sport"]): React.ReactNode {
  const key = sport?.abbreviation?.toLowerCase() || sport?.name?.toLowerCase() || "";
  return <SportPillIcon sportKey={key} />;
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

function normalizeSelection(rawSelection: Record<string, unknown>, marketId: string): Selection {
  const displayOdds = rawSelection?.displayOdds as Record<string, unknown> | undefined;
  return {
    selectionId: String(rawSelection?.selectionId || rawSelection?.id || ""),
    marketId,
    name: String(rawSelection?.name || rawSelection?.selectionName || ""),
    odds:
      typeof rawSelection?.odds === "number"
        ? rawSelection.odds
        : typeof displayOdds?.decimal === "number"
          ? displayOdds.decimal
          : 0,
    status:
      (rawSelection?.status as string) ||
      (rawSelection?.active === false ? "SUSPENDED" : "ACTIVE"),
  };
}

function normalizeMarket(rawMarket: Record<string, unknown>, fixtureId: string): Market {
  const marketId = String(rawMarket?.marketId || rawMarket?.id || "");
  const rawSelections = Array.isArray(rawMarket?.selections)
    ? rawMarket.selections
    : Array.isArray(rawMarket?.selectionOdds)
      ? rawMarket.selectionOdds
      : [];
  const marketStatus = rawMarket?.marketStatus as Record<string, unknown> | undefined;

  return {
    marketId,
    fixtureId,
    name: String(rawMarket?.name || rawMarket?.marketName || "Featured Market"),
    status:
      (rawMarket?.status as string) || (marketStatus?.type as string) || "ACTIVE",
    selections: rawSelections.map((selection: Record<string, unknown>) =>
      normalizeSelection(selection, marketId),
    ),
  };
}

function normalizeFixture(rawFixture: Record<string, unknown>): Fixture {
  const fixtureId = String(rawFixture?.fixtureId || rawFixture?.id || "");
  const rawMarkets = Array.isArray(rawFixture?.markets) ? rawFixture.markets : [];
  const sport = rawFixture?.sport as Record<string, unknown> | undefined;
  const tournament = rawFixture?.tournament as Record<string, unknown> | undefined;

  return {
    fixtureId,
    fixtureName: String(rawFixture?.fixtureName || rawFixture?.name || ""),
    startTime: String(rawFixture?.startTime || rawFixture?.start_at || ""),
    isLive: Boolean(rawFixture?.isLive),
    sport: {
      sportId: String(sport?.sportId || sport?.id || ""),
      name: String(sport?.name || "Featured"),
      abbreviation: String(
        sport?.abbreviation ||
          (typeof sport?.name === "string" ? sport.name.slice(0, 3).toUpperCase() : ""),
      ),
      displayToPunters: sport?.displayToPunters !== false,
    },
    tournament: {
      tournamentId: String(tournament?.tournamentId || tournament?.id || ""),
      sportId: String(tournament?.sportId || sport?.sportId || ""),
      name: String(tournament?.name || "Featured"),
      startTime: String(tournament?.startTime || rawFixture?.startTime || ""),
    },
    status: String(rawFixture?.status || "NOT_STARTED"),
    markets: rawMarkets.map((market: Record<string, unknown>) => normalizeMarket(market, fixtureId)),
    marketsTotalCount:
      typeof rawFixture?.marketsTotalCount === "number"
        ? rawFixture.marketsTotalCount
        : rawMarkets.length,
    competitors: (rawFixture?.competitors as Record<string, Competitor>) || {},
  };
}

/** Issue #9: Validate fixtures have real data before displaying */
function isValidFixture(fixture: Fixture): boolean {
  const teams = getTeams(fixture.competitors);
  if (teams.home === 'TBD' && teams.away === 'TBD') {
    logger.warn('Home', 'Filtered out fixture with missing teams', fixture.fixtureId);
    return false;
  }
  if (!fixture.startTime) {
    logger.warn('Home', 'Filtered out fixture with no start time', fixture.fixtureId);
    return false;
  }
  return true;
}



function getFixtureStatusLabel(fixture: Fixture, t: (k: string) => string) {
  if (fixture.isLive) return t("LIVE");

  const start = new Date(fixture.startTime).getTime();
  if (!Number.isNaN(start) && start - Date.now() < 1000 * 60 * 90) {
    return t("STARTING_SOON");
  }

  return t("UPCOMING");
}

function getEditorialAngle(
  fixture: Fixture,
  index: number,
  leaderboardsActive: boolean,
  t: (k: string, opts?: Record<string, unknown>) => string,
) {
  const start = new Date(fixture.startTime).getTime();
  const minutesToStart = Number.isNaN(start)
    ? null
    : Math.round((start - Date.now()) / 60000);

  if (fixture.isLive) {
    return {
      tag: t("LIVE_HEAT"),
      line: t("LIVE_HEAT_LINE"),
    };
  }

  if (minutesToStart !== null && minutesToStart > 0 && minutesToStart <= 30) {
    return {
      tag: t("KICKOFF_WINDOW"),
      line: t("KICKOFF_WINDOW_LINE", { minutes: minutesToStart }),
    };
  }

  if (leaderboardsActive && index < 2) {
    return {
      tag: t("BOARD_BOOSTER"),
      line: t("BOARD_BOOSTER_LINE"),
    };
  }

  return {
    tag: t("SHARP_ANGLE"),
    line: t("SHARP_ANGLE_LINE"),
  };
}

export default function HomePage() {
  // Show marketing landing page only when auth definitively says "not logged in".
  // During the auth check, render the authenticated shell with skeleton states
  // so the user never sees a blank loading page — the app feels instant.
  const { isAuthenticated, isLoading } = useAuth();
  if (!isLoading && !isAuthenticated) return <LandingPage />;
  return <AuthenticatedHome />;
}

function AuthenticatedHome() {
  const { t } = useTranslation("home");

  // React Query — cached data survives navigation, no re-fetch on return visits
  const { data: rawFixtures = [], isLoading: fixturesLoading, error: fixturesError } = useFixtures();
  const { data: rawSportsData = [] } = useSports();
  const { data: rawLeaderboards = [] } = useLeaderboards();

  const fixtures = useMemo(() => {
    const normalized = rawFixtures.map((f) => normalizeFixture(f as Record<string, unknown>));
    return normalized.filter(isValidFixture);
  }, [rawFixtures]);

  const sports = useMemo((): Sport[] => {
    return rawSportsData.map((s) => ({
      sportId: s.sportId || s.sportKey || "",
      name: s.sportName || s.sportKey || "",
      abbreviation: s.sportKey || (s.sportName || "").slice(0, 3).toUpperCase(),
      displayToPunters: true,
    }));
  }, [rawSportsData]);

  const leaderboards = useMemo((): LeaderboardSummary[] => {
    return rawLeaderboards.slice(0, 3).map((lb) => ({
      leaderboardId: lb.leaderboardId,
      name: lb.name,
      description: lb.description,
      metricKey: lb.metricKey,
      rankingMode: lb.rankingMode,
      order: lb.order,
      status: lb.status,
    }));
  }, [rawLeaderboards]);

  const loading = fixturesLoading;
  const error = fixturesError ? "CONNECT_ERROR" : "";
  const [activeSport, setActiveSport] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [searchResults, setSearchResults] = useState<Fixture[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);
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
        marketName: market.name || t("MATCH_RESULT"),
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

  // Data fetching handled by React Query hooks above — cached across navigations

  // Issue #11: Debounced search API query
  useEffect(() => {
    if (deferredSearchQuery.length < 3) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setShowSearchDropdown(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search/events?q=${encodeURIComponent(deferredSearchQuery)}`, {
          credentials: "include",
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          const list = data.data || data.results || data.fixtures || data;
          setSearchResults(Array.isArray(list) ? list.map(normalizeFixture).filter(isValidFixture).slice(0, 10) : []);
        }
      } catch {
        // Search API may not exist yet, silently fall back to local filtering
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [deferredSearchQuery]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

    const topPicks = [...filteredFixtures]
      .filter((fixture) => getPrimaryMarket(fixture)?.selections?.length)
      .sort((left: Fixture, right: Fixture) => {
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
  const featuredMoment = topPicks[0];
  const secondaryMoments = topPicks.slice(1, 4);
  const liveNowCount = filteredFixtures.filter((fixture) => fixture.isLive).length;

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
              {fixture.tournament?.name || fixture.sport?.name || t("FEATURED")}
            </span>
            <span
              className={`discovery-card-badge ${
                fixture.isLive ? "live" : "soon"
              }`}
            >
              {fixture.isLive ? t("LIVE") : getFixtureStatusLabel(fixture, t)}
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

  const renderFeatureSpotlight = useCallback(
    (fixture: Fixture, index: number, lead = false) => {
      const teams = getTeams(fixture.competitors);
      const market = getPrimaryMarket(fixture);
      const angle = getEditorialAngle(fixture, index, leaderboards.length > 0, t);

      if (!market || !market.selections?.length) return null;

      return (
        <article
          key={`feature-${fixture.fixtureId}`}
          className={`feature-spotlight ${lead ? "lead" : ""}`}
        >
          <div className="feature-spotlight-top">
            <div>
              <div className="feature-spotlight-tag">{angle.tag}</div>
              <div className="feature-spotlight-league">
                {fixture.tournament?.name || fixture.sport?.name || t("HOT_PICK")}
              </div>
            </div>
            <div
              className={`feature-spotlight-status ${
                fixture.isLive ? "live" : "soon"
              }`}
            >
              {fixture.isLive ? t("LIVE") : formatDate(fixture.startTime, t)}
            </div>
          </div>

          <div className="feature-spotlight-matchup">
            <div className="feature-spotlight-team">{teams.home}</div>
            <div className="feature-spotlight-versus">vs</div>
            <div className="feature-spotlight-team">{teams.away}</div>
          </div>

          <div className="feature-spotlight-market">
            {market.name || t("MATCH_RESULT")}
          </div>
          <p className="feature-spotlight-copy">{angle.line}</p>

          <div className="feature-spotlight-prices">
            {market.selections.slice(0, 3).map((selection) => {
              const isSelected = betslip?.selections?.some(
                (entry: BetSelection) =>
                  entry.selectionId === selection.selectionId &&
                  entry.marketId === market.marketId,
              );

              return (
                <button
                  key={`${fixture.fixtureId}-${selection.selectionId}`}
                  className={`feature-spotlight-price ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => handleOddsClick(fixture, market, selection)}
                  disabled={selection.status === "SUSPENDED"}
                >
                  <span>{selection.name}</span>
                  <strong>
                    {selection.status === "SUSPENDED"
                      ? "-"
                      : formatOdds(selection.odds, oddsFormat)}
                  </strong>
                </button>
              );
            })}
          </div>

          <div className="feature-spotlight-footer">
            <span>
              {fixture.isLive
                ? t("LIVE_BOARD_ACTIVE")
                : t("MARKET_ANGLES_COUNT", { count: fixture.marketsTotalCount || market.selections.length })}
            </span>
            <Link href={`/match/${fixture.fixtureId}`}>{t("OPEN_FULL_MARKET_LINK")}</Link>
          </div>
        </article>
      );
    },
    [betslip?.selections, handleOddsClick, leaderboards.length, oddsFormat],
  );

  return (
    <>
      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero-main">
          <div className="home-hero-copy">
            <div className="home-hero-kicker">{t("HERO_KICKER")}</div>
            <h1>
              {t("HERO_TITLE_PREFIX")}<span className="accent">{t("HERO_TITLE_ACCENT")}</span>{t("HERO_TITLE_SUFFIX")}
            </h1>
            <p>
              {t("HERO_SUBTITLE")}
            </p>

            <div className="home-hero-actions">
              <button
                type="button"
                className="home-hero-primary"
                onClick={() =>
                  topPicksRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                    inline: "nearest",
                  })
                }
              >
                {t("CTA_HOT_PICKS")}
              </button>
              <Link className="home-hero-secondary" href="/live">
                {t("CTA_LIVE_BOARD")}
              </Link>
            </div>

            <div className="home-hero-stats">
              <div className="home-hero-chip">
                <span className="home-hero-chip-value">{liveNowCount || "—"}</span>
                <span className="home-hero-chip-label">{t("LIVE_NOW")}</span>
              </div>
              <div className="home-hero-chip">
                <span className="home-hero-chip-value">{topPicks.length || "—"}</span>
                <span className="home-hero-chip-label">{t("HOT_PICKS")}</span>
              </div>
              <div className="home-hero-chip">
                <span className="home-hero-chip-value">
                  {leaderboards.length || "—"}
                </span>
                <span className="home-hero-chip-label">{t("LIVE_RACES")}</span>
              </div>
            </div>
          </div>

          <div className="home-hero-feature">
            {featuredMoment ? (
              <>
                <div className="home-hero-feature-top">
                  <div>
                    <div className="home-hero-feature-kicker">{t("FEATURED_RIGHT_NOW")}</div>
                    <div className="home-hero-feature-league">
                      {featuredMoment.tournament?.name ||
                        featuredMoment.sport?.name ||
                        t("FEATURED_BOARD")}
                    </div>
                  </div>
                  <div
                    className={`home-hero-feature-status ${
                      featuredMoment.isLive ? "live" : "soon"
                    }`}
                  >
                    {featuredMoment.isLive
                      ? t("LIVE_PRESSURE")
                      : getFixtureStatusLabel(featuredMoment, t)}
                  </div>
                </div>

                <div className="home-hero-feature-matchup">
                  <div className="home-hero-feature-team">
                    {getTeams(featuredMoment.competitors).home}
                  </div>
                  <div className="home-hero-feature-vs">vs</div>
                  <div className="home-hero-feature-team">
                    {getTeams(featuredMoment.competitors).away}
                  </div>
                </div>

                <div className="home-hero-feature-note">
                  {getPrimaryMarket(featuredMoment)?.name || t("MATCH_RESULT")} ·{" "}
                  {featuredMoment.isLive
                    ? t("PRICES_MOVING")
                    : t("QUICK_ENTRY_ANGLE")}
                </div>

                <div className="home-hero-feature-odds">
                  {getPrimaryMarket(featuredMoment)
                    ?.selections?.slice(0, 3)
                    .map((selection) => {
                      const market = getPrimaryMarket(featuredMoment);
                      if (!market) return null;
                      const isSelected = betslip?.selections?.some(
                        (entry: BetSelection) =>
                          entry.selectionId === selection.selectionId &&
                          entry.marketId === market.marketId,
                      );

                      return (
                        <button
                          key={`${featuredMoment.fixtureId}-${selection.selectionId}`}
                          className={`home-hero-feature-price ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() =>
                            handleOddsClick(featuredMoment, market, selection)
                          }
                          disabled={selection.status === "SUSPENDED"}
                        >
                          <span>{selection.name}</span>
                          <strong>
                            {selection.status === "SUSPENDED"
                              ? "-"
                              : formatOdds(selection.odds, oddsFormat)}
                          </strong>
                        </button>
                      );
                    })}
                </div>

                <div className="home-hero-feature-footer">
                  <span>{formatDate(featuredMoment.startTime, t)}</span>
                  <Link href={`/match/${featuredMoment.fixtureId}`}>
                    {t("OPEN_FULL_MARKET_LINK")}
                  </Link>
                </div>
              </>
            ) : (
              <div className="home-hero-feature-empty">
                {t("FEATURED_LOADING")}
              </div>
            )}
          </div>
        </div>

        {secondaryMoments.length > 0 && (
          <div className="home-hero-rail">
            {secondaryMoments.map((fixture) => (
              <Link
                key={`hero-rail-${fixture.fixtureId}`}
                href={`/match/${fixture.fixtureId}`}
                className="home-hero-rail-card"
              >
                <div className="home-hero-rail-top">
                  <span>{fixture.sport?.name || t("BOARD")}</span>
                  <span>{fixture.isLive ? t("LIVE") : formatDate(fixture.startTime, t)}</span>
                </div>
                <div className="home-hero-rail-title">
                  {getTeams(fixture.competitors).home} vs{" "}
                  {getTeams(fixture.competitors).away}
                </div>
                <div className="home-hero-rail-meta">
                  {getPrimaryMarket(fixture)?.name || t("FEATURED_MARKET")} ·{" "}
                  {getPrimaryMarket(fixture)?.selections?.[0]
                    ? formatOdds(
                        getPrimaryMarket(fixture)!.selections[0].odds,
                        oddsFormat,
                      )
                    : t("OPEN_BOARD")}
                </div>
              </Link>
            ))}
          </div>
        )}
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
            placeholder={t("SEARCH_PLACEHOLDER")}
          />
          <span className="discovery-shortcut">/</span>
        </label>

        {/* Issue #11: Search API results dropdown */}
        {showSearchDropdown && deferredSearchQuery.length >= 3 && (
          <div ref={searchDropdownRef} className="search-results-dropdown" style={{
            position: "relative",
            zIndex: 20,
            background: "rgba(15, 18, 37, 0.98)",
            border: "1px solid rgba(57, 255, 20, 0.18)",
            borderRadius: "12px",
            marginTop: "-4px",
            padding: "8px 0",
            maxHeight: "320px",
            overflowY: "auto",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}>
            {searchLoading ? (
              <div style={{ padding: "16px 20px", color: "#94a3b8", fontSize: "13px" }}>
                {t("SEARCHING")}
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((fixture) => {
                const teams = getTeams(fixture.competitors);
                return (
                  <div
                    key={fixture.fixtureId}
                    style={{
                      padding: "10px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(57,255,20,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#f8fafc" }}>
                        {teams.home} vs {teams.away}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        {fixture.sport.name?.toUpperCase()} {fixture.tournament.name ? `· ${fixture.tournament.name}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                      {formatDate(fixture.startTime, t)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "16px 20px", color: "#64748b", fontSize: "13px" }}>
                {t("NO_EVENTS_FOUND", { query: deferredSearchQuery })}
              </div>
            )}
          </div>
        )}

        <div className="discovery-context">
          <div>
            <div className="discovery-kicker">{t("BOARD_CONTROL")}</div>
            <div className="discovery-context-copy" dangerouslySetInnerHTML={{ __html: t("MATCHES_READY", { count: filteredFixtures.length }) }} />
          </div>
          <div className="discovery-context-copy" dangerouslySetInnerHTML={{ __html: t("BOARD_CONTROL_HINT") }} />
        </div>

        {leaderboards.length > 0 && (
          <div className="leaderboard-strip">
            <div className="leaderboard-strip-head">
              <div>
                <div className="discovery-kicker">{t("COMPETITION_PULSE_KICKER")}</div>
                <div className="leaderboard-strip-title">
                  {t("COMPETITION_PULSE_TITLE")}
                </div>
              </div>
              <Link className="leaderboard-strip-link" href="/leaderboards">
                {t("VIEW_ALL")}
              </Link>
            </div>
            <div className="leaderboard-strip-list">
              {leaderboards.map((board) => (
                <Link
                  key={board.leaderboardId}
                  href={`/leaderboards/${board.leaderboardId}`}
                  className="leaderboard-pill"
                >
                  <div className="leaderboard-pill-title">{board.name}</div>
                  <div className="leaderboard-pill-meta">
                    {humanizeLabel(board.metricKey, t)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="sport-pills-shell">
          <div className="sport-pills">
            <button
              className={`sport-pill ${activeSport === "all" ? "active" : ""}`}
              onClick={() => setActiveSport("all")}
            >
              <span className="sport-pill-icon"><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg></span>
              {t("ALL_SPORTS")}
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
                <span className="discovery-title-icon"><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg></span>
                <span className="discovery-title">{t("HOT_PICKS_TITLE")}</span>
              </div>
              <div className="discovery-subtitle">
                {t("HOT_PICKS_SUBTITLE")}
              </div>
            </div>
          </div>

          <div className="featured-picks-grid" ref={topPicksRef}>
            {topPicks.length > 0 ? (
              <>
                {renderFeatureSpotlight(topPicks[0], 0, true)}
                <div className="featured-picks-stack">
                  {topPicks.slice(1, 5).map((fixture, index) =>
                    renderFeatureSpotlight(fixture, index + 1),
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ width: "100%" }}>
                <div className="empty-title">{t("NO_TOP_PICKS")}</div>
                <div className="empty-sub">
                  {t("NO_TOP_PICKS_SUB")}
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
                    {getSportAccent(sport)} {t("POPULAR_IN", { sport: sport.name })}
                  </div>
                  <div className="popular-sport-meta">{t("FEATURED_EVENTS", { count: fixtures.length })}</div>
                </div>

                <div className="sport-ribbon-track">
                  {fixtures.map((fixture) => renderDiscoveryCard(fixture, true))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error-banner">{t(error)}</div>}

      {/* Fixtures */}
      <div className="fixtures-board">
        <div className="section-header">
          <div>
            <span className="section-title">
              {loading
                ? t("LOADING")
                : searchQuery
                  ? t("FULL_BOARD_TITLE")
                  : activeSport === "all"
                    ? t("FULL_BOARD_TITLE")
                    : t("SELECTED_SPORT_BOARD", { sport: topSports.find((sport) => sport.sportId === activeSport)?.name || "" })}
            </span>
            <div className="section-subtitle">
              {t("FULL_BOARD_SUBTITLE")}
            </div>
          </div>
          {!loading && (
            <span className="section-count">
              {t("MATCHES", { count: filteredFixtures.length })}
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
          filteredFixtures.map((fixture: Fixture) => {
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
                    {fixture.isLive ? t("LIVE_LABEL") : formatDate(fixture.startTime, t)}
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
                    {t("MORE_MARKETS_LINK", { count: fixture.marketsTotalCount - 1 })}
                  </a>
                )}
              </div>
            );
          })}

        {!loading && filteredFixtures.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon"><svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2l-1.5 5.5L7 5.5M12 2l1.5 5.5L17 5.5M7 5.5L3.5 10l3.5 2M17 5.5l3.5 4.5-3.5 2M7 12l-1 5.5L10.5 19M17 12l1 5.5-4.5 1.5M10.5 19h3M12 7.5L7 12l3.5 7h3L17 12Z"/></svg></div>
            <div className="empty-title">{t("NO_MATCHES")}</div>
            <div className="empty-sub">
              {t("EMPTY_SUB")}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
