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
import { getLeaderboards } from "./lib/api/leaderboards-client";

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

const METRIC_DISPLAY: Record<string, string> = {
  net_profit_cents: 'Net Profit',
  stake_cents: 'Total Stake',
  win_count: 'Wins',
  bet_count: 'Total Bets',
  qualified_referrals: 'Referrals',
  referral_count: 'Referrals',
};

function humanizeLabel(key: string): string {
  return METRIC_DISPLAY[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

function normalizeSelection(rawSelection: any, marketId: string): Selection {
  return {
    selectionId: String(rawSelection?.selectionId || rawSelection?.id || ""),
    marketId,
    name: String(rawSelection?.name || rawSelection?.selectionName || ""),
    odds:
      typeof rawSelection?.odds === "number"
        ? rawSelection.odds
        : typeof rawSelection?.displayOdds?.decimal === "number"
          ? rawSelection.displayOdds.decimal
          : 0,
    status:
      rawSelection?.status ||
      (rawSelection?.active === false ? "SUSPENDED" : "ACTIVE"),
  };
}

function normalizeMarket(rawMarket: any, fixtureId: string): Market {
  const marketId = String(rawMarket?.marketId || rawMarket?.id || "");
  const rawSelections = Array.isArray(rawMarket?.selections)
    ? rawMarket.selections
    : Array.isArray(rawMarket?.selectionOdds)
      ? rawMarket.selectionOdds
      : [];

  return {
    marketId,
    fixtureId,
    name: String(rawMarket?.name || rawMarket?.marketName || "Featured Market"),
    status:
      rawMarket?.status || rawMarket?.marketStatus?.type || "ACTIVE",
    selections: rawSelections.map((selection: any) =>
      normalizeSelection(selection, marketId),
    ),
  };
}

function normalizeFixture(rawFixture: any): Fixture {
  const fixtureId = String(rawFixture?.fixtureId || rawFixture?.id || "");
  const rawMarkets = Array.isArray(rawFixture?.markets) ? rawFixture.markets : [];

  return {
    fixtureId,
    fixtureName: String(rawFixture?.fixtureName || rawFixture?.name || ""),
    startTime: String(rawFixture?.startTime || rawFixture?.start_at || ""),
    isLive: Boolean(rawFixture?.isLive),
    sport: {
      sportId: String(rawFixture?.sport?.sportId || rawFixture?.sport?.id || ""),
      name: String(rawFixture?.sport?.name || "Featured"),
      abbreviation: String(
        rawFixture?.sport?.abbreviation ||
          rawFixture?.sport?.name?.slice(0, 3)?.toUpperCase() ||
          "",
      ),
      displayToPunters: rawFixture?.sport?.displayToPunters !== false,
    },
    tournament: {
      tournamentId: String(
        rawFixture?.tournament?.tournamentId || rawFixture?.tournament?.id || "",
      ),
      sportId: String(rawFixture?.tournament?.sportId || rawFixture?.sport?.sportId || ""),
      name: String(rawFixture?.tournament?.name || "Featured"),
      startTime: String(rawFixture?.tournament?.startTime || rawFixture?.startTime || ""),
    },
    status: String(rawFixture?.status || "NOT_STARTED"),
    markets: rawMarkets.map((market: any) => normalizeMarket(market, fixtureId)),
    marketsTotalCount:
      typeof rawFixture?.marketsTotalCount === "number"
        ? rawFixture.marketsTotalCount
        : rawMarkets.length,
    competitors: rawFixture?.competitors || {},
  };
}

function normalizeSport(rawSport: any): Sport {
  const sportId = String(
    rawSport?.sportId || rawSport?.sportKey || rawSport?.id || rawSport?.name || "",
  );
  const name = String(rawSport?.name || rawSport?.sportKey || "Featured");

  return {
    sportId,
    name,
    abbreviation: String(
      rawSport?.abbreviation || rawSport?.sportKey || name.slice(0, 3).toUpperCase(),
    ),
    displayToPunters: rawSport?.displayToPunters !== false,
  };
}

function getFixtureStatusLabel(fixture: Fixture) {
  if (fixture.isLive) return "Live";

  const start = new Date(fixture.startTime).getTime();
  if (!Number.isNaN(start) && start - Date.now() < 1000 * 60 * 90) {
    return "Starting Soon";
  }

  return "Upcoming";
}

function getEditorialAngle(
  fixture: Fixture,
  index: number,
  leaderboardsActive: boolean,
) {
  const start = new Date(fixture.startTime).getTime();
  const minutesToStart = Number.isNaN(start)
    ? null
    : Math.round((start - Date.now()) / 60000);

  if (fixture.isLive) {
    return {
      tag: "Live Heat",
      line: "Live prices are moving now. Step in before the board flips again.",
    };
  }

  if (minutesToStart !== null && minutesToStart > 0 && minutesToStart <= 30) {
    return {
      tag: "Kickoff Window",
      line: `Kickoff is roughly ${minutesToStart} minutes away. Catch the price before it tightens.`,
    };
  }

  if (leaderboardsActive && index < 2) {
    return {
      tag: "Board Booster",
      line: "A clean entry if you want action that also keeps your competition week alive.",
    };
  }

  return {
    tag: "Sharp Angle",
    line: "A curated lane worth hitting before you drift into the deeper board.",
  };
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
  const [leaderboards, setLeaderboards] = useState<LeaderboardSummary[]>([]);
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
        const [fixturesRes, sportsRes, leaderboardItems] = await Promise.all([
          fetch("/api/v1/fixtures/"),
          fetch("/api/v1/sports/"),
          getLeaderboards().catch(() => []),
        ]);
        if (fixturesRes.ok) {
          const data = await fixturesRes.json();
          const list = data.data || data.fixtures || data;
          setFixtures(Array.isArray(list) ? list.map(normalizeFixture) : []);
        }
        if (sportsRes.ok) {
          const data = await sportsRes.json();
          const list = data.data || data.sports || data.items || data;
          setSports(Array.isArray(list) ? list.map(normalizeSport) : []);
        }
        setLeaderboards(
          Array.isArray(leaderboardItems) ? leaderboardItems.slice(0, 3) : [],
        );
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

  const renderFeatureSpotlight = useCallback(
    (fixture: Fixture, index: number, lead = false) => {
      const teams = getTeams(fixture.competitors);
      const market = getPrimaryMarket(fixture);
      const angle = getEditorialAngle(fixture, index, leaderboards.length > 0);

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
                {fixture.tournament?.name || fixture.sport?.name || "Hot Pick"}
              </div>
            </div>
            <div
              className={`feature-spotlight-status ${
                fixture.isLive ? "live" : "soon"
              }`}
            >
              {fixture.isLive ? "Live" : formatDate(fixture.startTime)}
            </div>
          </div>

          <div className="feature-spotlight-matchup">
            <div className="feature-spotlight-team">{teams.home}</div>
            <div className="feature-spotlight-versus">vs</div>
            <div className="feature-spotlight-team">{teams.away}</div>
          </div>

          <div className="feature-spotlight-market">
            {market.name || "Match Result"}
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
                ? "Live board active"
                : `${fixture.marketsTotalCount || market.selections.length} market angles open`}
            </span>
            <Link href={`/match/${fixture.fixtureId}`}>Open full market</Link>
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
            <div className="home-hero-kicker">Featured Betting Lane</div>
            <h1>
              Hit the <span className="accent">live edge</span> before it moves.
            </h1>
            <p>
              Jump straight into the sharpest picks, ride the live pressure, and
              let rewards and rank climb with every strong ticket.
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
                Play Hot Picks
              </button>
              <Link className="home-hero-secondary" href="/live">
                Open Live Board
              </Link>
            </div>

            <div className="home-hero-stats">
              <div className="home-hero-chip">
                <span className="home-hero-chip-value">{liveNowCount || "—"}</span>
                <span className="home-hero-chip-label">Live Now</span>
              </div>
              <div className="home-hero-chip">
                <span className="home-hero-chip-value">{topPicks.length || "—"}</span>
                <span className="home-hero-chip-label">Hot Picks</span>
              </div>
              <div className="home-hero-chip">
                <span className="home-hero-chip-value">
                  {leaderboards.length || "—"}
                </span>
                <span className="home-hero-chip-label">Live Races</span>
              </div>
            </div>
          </div>

          <div className="home-hero-feature">
            {featuredMoment ? (
              <>
                <div className="home-hero-feature-top">
                  <div>
                    <div className="home-hero-feature-kicker">Featured Right Now</div>
                    <div className="home-hero-feature-league">
                      {featuredMoment.tournament?.name ||
                        featuredMoment.sport?.name ||
                        "Featured Board"}
                    </div>
                  </div>
                  <div
                    className={`home-hero-feature-status ${
                      featuredMoment.isLive ? "live" : "soon"
                    }`}
                  >
                    {featuredMoment.isLive
                      ? "Live Pressure"
                      : getFixtureStatusLabel(featuredMoment)}
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
                  {getPrimaryMarket(featuredMoment)?.name || "Match Result"} ·{" "}
                  {featuredMoment.isLive
                    ? "prices moving on the live board"
                    : "quick-entry angle before kickoff"}
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
                  <span>{formatDate(featuredMoment.startTime)}</span>
                  <Link href={`/match/${featuredMoment.fixtureId}`}>
                    Open full market
                  </Link>
                </div>
              </>
            ) : (
              <div className="home-hero-feature-empty">
                Featured action is loading. The board will fill with the sharpest
                plays available right now.
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
                  <span>{fixture.sport?.name || "Board"}</span>
                  <span>{fixture.isLive ? "Live" : formatDate(fixture.startTime)}</span>
                </div>
                <div className="home-hero-rail-title">
                  {getTeams(fixture.competitors).home} vs{" "}
                  {getTeams(fixture.competitors).away}
                </div>
                <div className="home-hero-rail-meta">
                  {getPrimaryMarket(fixture)?.name || "Featured market"} ·{" "}
                  {getPrimaryMarket(fixture)?.selections?.[0]
                    ? formatOdds(
                        getPrimaryMarket(fixture)!.selections[0].odds,
                        oddsFormat,
                      )
                    : "Open board"}
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
            placeholder="Search events, teams, or leagues..."
          />
          <span className="discovery-shortcut">/</span>
        </label>

        <div className="discovery-context">
          <div>
            <div className="discovery-kicker">Board Control</div>
            <div className="discovery-context-copy">
              <strong>{filteredFixtures.length}</strong> matches ready to scan once
              you clear the featured lane.
            </div>
          </div>
          <div className="discovery-context-copy">
            Start with <strong>Hot Picks</strong>, then branch into sports, races,
            and the full board.
          </div>
        </div>

        {leaderboards.length > 0 && (
          <div className="leaderboard-strip">
            <div className="leaderboard-strip-head">
              <div>
                <div className="discovery-kicker">Competition Pulse</div>
                <div className="leaderboard-strip-title">
                  Chase live leaderboard races while the board is hot
                </div>
              </div>
              <Link className="leaderboard-strip-link" href="/leaderboards">
                View all
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
                    {humanizeLabel(board.metricKey)}
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
                Quick-entry plays pulled from the sharpest live and almost-live boards
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
