"use client";

import React, { useEffect, useState, useMemo } from "react";
import { logger } from "../../lib/logger";
import MarketGroup from "../../components/MarketGroup";
import MarketDetailLoading from "../../components/MarketDetailLoading";

// ─── Gateway response types ────────────────────────────────────
interface GatewayDisplayOdds {
  american: string;
  decimal: number;
  fractional: string;
}

interface GatewaySelectionOdds {
  selectionId: string;
  selectionName: string;
  active: boolean;
  displayOdds?: GatewayDisplayOdds;
}

interface GatewayMarketStatus {
  type: string;
  changeReason: unknown;
}

interface GatewayMarket {
  marketId: string;
  marketName: string;
  marketType: string;
  marketCategory: string;
  marketStatus: GatewayMarketStatus;
  selectionOdds: GatewaySelectionOdds[];
  specifiers: Record<string, string>;
}

interface GatewaySport {
  sportId: string;
  name: string;
  abbreviation: string;
}

interface GatewayTournament {
  tournamentId: string;
  sportId: string;
  name: string;
  startTime: string;
}

interface GatewayCompetitor {
  competitorId: string;
  name: string;
  qualifier: string;
  score: number;
}

interface GatewayFixtureDetail {
  fixtureId: string;
  fixtureName: string;
  startTime: string;
  isLive: boolean;
  sport: GatewaySport;
  tournament: GatewayTournament;
  status: string;
  markets: GatewayMarket[];
  marketsTotalCount: number;
  competitors: Record<string, GatewayCompetitor>;
}

// ─── Market selection (mapped for MarketGroup) ──────────────────
interface MappedSelection {
  id: string;
  name: string;
  price: number;
  odds: number;
}

interface MappedMarket {
  id: string;
  name: string;
  status: string;
  type: string;
  displayKey: string;
  selections: MappedSelection[];
}

// ─── Match page props ───────────────────────────────────────────
interface MatchPageProps {
  params: Promise<{
    id: string;
  }>;
}

type MarketTab = "Popular" | "Game Lines" | "Player Props" | "All";

function matchesAny(value: string | undefined, needles: string[]) {
  const normalized = (value || "").toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function isMoneylineMarket(market: MappedMarket) {
  return matchesAny(market.type, [
    "match_winner", "moneyline", "winner", "p1xp2", "p1p2", "1x2",
  ]) || matchesAny(market.name, [
    "match result", "moneyline", "winner", "match winner", "to win",
  ]);
}

function isHandicapMarket(market: MappedMarket) {
  return matchesAny(market.type, [
    "handicap", "spread", "run_line", "puck_line", "point_spread",
  ]) || matchesAny(market.name, [
    "handicap", "spread", "run line", "puck line", "point spread",
  ]);
}

function isTotalMarket(market: MappedMarket) {
  return matchesAny(market.type, [
    "total", "over_under", "overunder", "total_runs", "total_points",
    "total_goals", "total_rounds",
  ]) || matchesAny(market.name, [
    "total", "over/under", "over under", "total runs", "total points",
    "total goals", "total rounds",
  ]);
}

function isPlayerPropMarket(market: MappedMarket) {
  return matchesAny(market.type, ["player"]) ||
    matchesAny(market.name, ["player"]);
}

/** Normalize gateway market status to open/suspended/closed */
function normalizeMarketStatus(raw: string): string {
  const upper = (raw || "").toUpperCase();
  if (upper === "BETTABLE" || upper === "ACTIVE" || upper === "OPEN") return "open";
  if (upper === "SUSPENDED" || upper === "HALTED") return "suspended";
  if (upper === "CLOSED" || upper === "RESULTED" || upper === "SETTLED") return "closed";
  return raw.toLowerCase();
}

/** Map a gateway market to the shape MarketGroup/MarketRow expects */
function mapGatewayMarket(gm: GatewayMarket): MappedMarket {
  return {
    id: gm.marketId,
    name: gm.marketName,
    status: normalizeMarketStatus(gm.marketStatus?.type || "open"),
    type: gm.marketType,
    displayKey: gm.marketCategory,
    selections: (gm.selectionOdds || [])
      .filter((s) => s.active)
      .map((s) => ({
        id: s.selectionId,
        name: s.selectionName,
        price: s.displayOdds?.decimal || 0,
        odds: s.displayOdds?.decimal || 0,
      })),
  };
}

export default function MatchPage({ params }: MatchPageProps) {
  const { id: matchId } = React.use(params);
  const [fixture, setFixture] = useState<GatewayFixtureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MarketTab>("Popular");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);

        // Try Go gateway first
        const res = await fetch(`/api/v1/fixtures/${encodeURIComponent(matchId)}`, {
          credentials: "include",
        });

        if (res.ok) {
          const data: GatewayFixtureDetail = await res.json();
          if (!cancelled) {
            setFixture(data);
            setError(null);
          }
          return;
        }

        // Go gateway failed — try BetConstruct game endpoint
        const bcRes = await fetch(`/api/bc/game/?id=${encodeURIComponent(matchId)}`);
        if (bcRes.ok) {
          const bcData = await bcRes.json();
          if (bcData && !bcData.error) {
            // Map BetConstruct game (camelCase) to GatewayFixtureDetail shape
            const bcTeam1 = bcData.team1 || bcData.team1_name || "TBD";
            const bcTeam2 = bcData.team2 || bcData.team2_name || "TBD";
            const bcStartTs = bcData.startTs || bcData.start_ts || 0;
            const mapped: GatewayFixtureDetail = {
              fixtureId: String(bcData.id),
              fixtureName: `${bcTeam1} vs ${bcTeam2}`,
              startTime: new Date(bcStartTs * 1000).toISOString(),
              isLive: bcData.type === 1,
              sport: {
                sportId: String(bcData.sportAlias || bcData.sport?.id || ""),
                name: bcData.sportName || bcData.sport?.name || "",
                abbreviation: "",
                displayToPunters: true,
              },
              tournament: {
                tournamentId: String(bcData.competitionName || bcData.competition?.id || ""),
                sportId: String(bcData.sportAlias || bcData.sport?.id || ""),
                name: bcData.competitionName || bcData.competition?.name || "",
                startTime: new Date(bcStartTs * 1000).toISOString(),
              },
              status: bcData.type === 1 ? "LIVE" : "NOT_STARTED",
              competitors: {
                home: { name: bcTeam1 },
                away: { name: bcTeam2 },
              },
              markets: Array.isArray(bcData.markets)
                ? bcData.markets.map((m: Record<string, unknown>) => ({
                    marketId: String(m.id || ""),
                    marketName: String(m.name || ""),
                    marketType: String(m.type || ""),
                    marketCategory: String(m.type || ""),
                    marketStatus: { type: "OPEN", changeReason: null },
                    specifiers: {},
                    selectionOdds: Array.isArray(m.selections || m.events)
                      ? ((m.selections || m.events) as Record<string, unknown>[]).map(
                          (ev: Record<string, unknown>) => ({
                            selectionId: String(ev.id || ""),
                            selectionName: String(ev.name || ""),
                            active: true,
                            displayOdds: {
                              decimal: Number(ev.price || 0),
                              american: "",
                              fractional: "",
                            },
                          }),
                        )
                      : [],
                  }))
                : [],
            };
            if (!cancelled) {
              setFixture(mapped);
              setError(null);
            }
            return;
          }
        }

        // Both sources failed
        const body = await res.json().catch(() => null);
        const errField = (body as Record<string, unknown> | null)?.error;
        const msg =
          typeof errField === "string"
            ? errField
            : typeof errField === "object" && errField !== null
              ? (errField as Record<string, string>).message || `HTTP ${res.status}`
              : `HTTP ${res.status}`;
        throw new Error(msg);
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load match";
          logger.error("MatchPage", `Failed to load fixture: ${message}`);
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  // Map gateway markets → component format
  const allMarkets = useMemo(() => {
    if (!fixture?.markets) return [];
    return fixture.markets.map(mapGatewayMarket);
  }, [fixture]);

  const deduplicatedMarkets = useMemo(() => {
    const seen = new Set<string>();
    return allMarkets.filter((m) => {
      const key = `${m.name}-${m.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allMarkets]);

  const filteredMarkets = useMemo(() => {
    if (activeTab === "Popular") {
      const moneyline = deduplicatedMarkets.filter((m) => isMoneylineMarket(m));
      const totals = deduplicatedMarkets.filter((m) => isTotalMarket(m) && !isMoneylineMarket(m));
      const handicaps = deduplicatedMarkets.filter((m) => isHandicapMarket(m) && !isTotalMarket(m) && !isMoneylineMarket(m));
      const popular = [...moneyline, ...totals, ...handicaps].slice(0, 10);
      return popular.length > 0 ? popular : deduplicatedMarkets.slice(0, 10);
    }
    if (activeTab === "Game Lines") {
      return deduplicatedMarkets.filter((m) => isHandicapMarket(m) || isTotalMarket(m));
    }
    if (activeTab === "Player Props") {
      return deduplicatedMarkets.filter((m) => isPlayerPropMarket(m));
    }
    return deduplicatedMarkets;
  }, [deduplicatedMarkets, activeTab]);

  if (loading) {
    return (
      <MarketDetailLoading
        eyebrow="Match board"
        subtitle="Loading markets and prices..."
      />
    );
  }

  if (error || !fixture) {
    return (
      <div style={{ padding: "40px" }}>
        <div style={{ color: "#f87171", fontSize: "16px", marginBottom: "16px" }}>
          {error || "Match not found"}
        </div>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "1px solid #39ff14",
            background: "transparent",
            color: "#39ff14",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const fixtureName = fixture.fixtureName;
  const homeTeam = fixture.competitors?.home?.name || fixtureName.split(" vs ")[0] || "Home";
  const awayTeam = fixture.competitors?.away?.name || fixtureName.split(" vs ")[1] || "Away";
  const startDate = new Date(fixture.startTime);
  const sportLabel = fixture.sport?.name || "";
  const tournamentLabel = fixture.tournament?.name || "";

  const tabs: MarketTab[] = ["Popular", "Game Lines", "Player Props", "All"];
  const tabDescription: Record<MarketTab, string> = {
    Popular: "Core sides, totals, and the most bettable lines first.",
    "Game Lines": "Main handicaps and totals grouped for quick scanning.",
    "Player Props": "Player-led specials and prop markets when available.",
    All: "Every market currently available for this fixture.",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", paddingBottom: "40px" }}>
      {/* Match Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a0a30 0%, #0f1225 50%, #0a1628 100%)",
          border: "1px solid #22304a",
          borderRadius: "18px",
          padding: "28px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: "#D3D3D3", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
            {sportLabel}
            {tournamentLabel ? ` \u00B7 ${tournamentLabel}` : ""}
          </span>
          {fixture.isLive && (
            <span
              style={{
                padding: "4px 9px",
                borderRadius: "999px",
                background: "rgba(239,68,68,0.16)",
                color: "#fca5a5",
                border: "1px solid rgba(239,68,68,0.22)",
                fontSize: "10px",
                fontWeight: "700",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              LIVE
            </span>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#f8fafc", margin: 0, letterSpacing: "-0.02em" }}>
              {homeTeam}
            </h2>
          </div>
          {fixture.isLive && fixture.competitors?.home?.score != null ? (
            <div style={{ fontSize: "24px", color: "#39ff14", fontWeight: "800", padding: "8px 16px", background: "rgba(11,14,28,0.75)", borderRadius: "999px", border: "1px solid #1a1f3a", letterSpacing: "0.04em", minWidth: "80px", textAlign: "center" }}>
              {fixture.competitors.home.score} - {fixture.competitors.away?.score ?? 0}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#D3D3D3", fontWeight: "700", padding: "8px 12px", background: "rgba(11,14,28,0.75)", borderRadius: "999px", border: "1px solid #1a1f3a", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              vs
            </div>
          )}
          <div style={{ flex: 1, textAlign: "right" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#f8fafc", margin: 0, letterSpacing: "-0.02em" }}>
              {awayTeam}
            </h2>
          </div>
        </div>

        <div style={{ fontSize: "12px", color: "#D3D3D3", marginTop: "14px" }}>
          {!fixture.isLive && startDate.toLocaleDateString() + " " + startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {fixture.isLive && "In Progress"}
          {" "}&middot; {fixture.marketsTotalCount} markets
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "6px",
          scrollbarWidth: "none",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 18px",
              borderRadius: "20px",
              border: activeTab === tab ? "1px solid rgba(57,255,20,0.32)" : "1px solid #283248",
              background: activeTab === tab ? "rgba(57,255,20,0.12)" : "#141a2a",
              color: activeTab === tab ? "#39ff14" : "#D3D3D3",
              fontSize: "13px",
              fontWeight: "700",
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ marginTop: "-4px", fontSize: "13px", color: "#D3D3D3" }}>
        {tabDescription[activeTab]}
      </div>

      {/* Market Groups */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {filteredMarkets.map((m) => (
          <MarketGroup
            key={m.id}
            name={m.name}
            markets={[m]}
            fixtureId={fixture.fixtureId}
            fixtureName={fixtureName}
          />
        ))}
      </div>

      {filteredMarkets.length === 0 && (
        <div
          style={{
            padding: "32px",
            textAlign: "center",
            color: "#D3D3D3",
            background: "#0f1225",
            border: "1px solid #1a1f3a",
            borderRadius: "16px",
          }}
        >
          No markets found in this category
        </div>
      )}
    </div>
  );
}
