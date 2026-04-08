"use client";

import React, { useEffect, useState, useMemo } from "react";
import { logger } from "../../lib/logger";
import MarketGroup from "../../components/MarketGroup";
import {
  bcGetGame,
  type BCGameDetail,
  type BCGameMarket,
} from "../../lib/api/betconstruct-client";

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

function isMoneylineMarket(market: BCGameMarket) {
  return (
    matchesAny(market.type, ["p1xp2", "p1p2", "winner", "moneyline", "match result"]) ||
    matchesAny(market.displayKey, ["winner", "moneyline", "match_result", "1x2"]) ||
    matchesAny(market.name, ["match result", "moneyline", "winner"])
  );
}

function isHandicapMarket(market: BCGameMarket) {
  return (
    matchesAny(market.type, ["handicap", "spread", "run line", "puck line"]) ||
    matchesAny(market.displayKey, ["handicap", "spread"]) ||
    matchesAny(market.name, ["handicap", "spread", "run line", "puck line"])
  );
}

function isTotalMarket(market: BCGameMarket) {
  return (
    matchesAny(market.type, ["total", "overunder", "over/under"]) ||
    matchesAny(market.displayKey, ["total", "totals", "over_under"]) ||
    matchesAny(market.name, ["total", "over/under"])
  );
}

function isPlayerPropMarket(market: BCGameMarket) {
  return (
    matchesAny(market.type, ["player"]) ||
    matchesAny(market.displayKey, ["player"]) ||
    matchesAny(market.name, ["player"])
  );
}

export default function MatchPage({ params }: MatchPageProps) {
  const { id: matchId } = React.use(params);
  const [game, setGame] = useState<BCGameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MarketTab>("Popular");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await bcGetGame(matchId);
        if (!cancelled) {
          setGame(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load match";
          logger.error("MatchPage", "Failed to load game", message);
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

  const filteredMarketGroups = useMemo(() => {
    if (!game) return [];

    const markets = game.markets;
    let filtered = markets;

    if (activeTab === "Popular") {
      filtered = markets
        .filter((m) => isMoneylineMarket(m) || isHandicapMarket(m) || isTotalMarket(m))
        .slice(0, 10);
      if (filtered.length === 0) {
        filtered = markets.slice(0, 10);
      }
    } else if (activeTab === "Game Lines") {
      filtered = markets.filter((m) => isHandicapMarket(m) || isTotalMarket(m));
    } else if (activeTab === "Player Props") {
      filtered = markets.filter((m) => isPlayerPropMarket(m));
    }

    return filtered;
  }, [game, activeTab]);

  if (loading) {
    return (
      <div style={{ padding: "40px", color: "#D3D3D3" }}>
        Loading match data...
      </div>
    );
  }

  if (error || !game) {
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

  const isLive = game.type === 1;
  const startDate = new Date(game.startTs * 1000);
  const fixtureName = `${game.team1} vs ${game.team2}`;

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
            {game.sportName} &middot; {game.competitionName}
          </span>
          {isLive && (
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
              {game.team1}
            </h2>
          </div>
          <div style={{ fontSize: "12px", color: "#D3D3D3", fontWeight: "700", padding: "8px 12px", background: "rgba(11,14,28,0.75)", borderRadius: "999px", border: "1px solid #1a1f3a", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            vs
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#f8fafc", margin: 0, letterSpacing: "-0.02em" }}>
              {game.team2}
            </h2>
          </div>
        </div>

        <div style={{ fontSize: "12px", color: "#D3D3D3", marginTop: "14px" }}>
          {!isLive && startDate.toLocaleDateString() + " " + startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {isLive && "In Progress"}
          {" "}&middot; {game.marketsCount} markets
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
        {filteredMarketGroups.map((m) => (
          <MarketGroup
            key={m.id}
            name={m.name + (m.base ? ` (${m.base})` : "")}
            markets={[{ ...m, status: "open" }]}
            fixtureId={String(game.id)}
            fixtureName={fixtureName}
          />
        ))}
      </div>

      {filteredMarketGroups.length === 0 && (
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
