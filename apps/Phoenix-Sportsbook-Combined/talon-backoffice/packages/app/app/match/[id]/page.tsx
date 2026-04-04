"use client";

import React, { useEffect, useState } from "react";
import { logger } from "../../lib/logger";

interface Selection {
  id: string;
  name: string;
  price: number;
  type: string;
  order: number;
}

interface BCMarket {
  id: string;
  type: string;
  name: string;
  displayKey: string;
  base: number | null;
  colCount: number;
  selections: Selection[];
}

interface BCGameDetail {
  id: number;
  startTs: number;
  team1: string;
  team2: string;
  type: number;
  marketsCount: number;
  info: Record<string, unknown> | null;
  sportName: string;
  sportAlias: string;
  regionName: string;
  competitionName: string;
  markets: BCMarket[];
}

interface MatchPageProps {
  params: {
    id: string;
  };
}

function OddButton({
  selection,
  onSelect,
}: {
  selection: Selection;
  onSelect: (s: Selection) => void;
}) {
  return (
    <button
      onClick={() => onSelect(selection)}
      style={{
        flex: 1,
        padding: "10px 8px",
        borderRadius: "6px",
        border: "1px solid #1a1f3a",
        background: "#0b0e1c",
        color: "#e2e8f0",
        cursor: "pointer",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#39ff14";
        e.currentTarget.style.background = "rgba(57,255,20,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#1a1f3a";
        e.currentTarget.style.background = "#0b0e1c";
      }}
    >
      <span
        style={{
          fontSize: "11px",
          color: "#64748b",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100%",
        }}
      >
        {selection.name}
      </span>
      <span style={{ fontSize: "15px", fontWeight: "700", color: "#39ff14" }}>
        {selection.price.toFixed(2)}
      </span>
    </button>
  );
}

function MarketCard({
  market,
  onSelect,
}: {
  market: BCMarket;
  onSelect: (s: Selection) => void;
}) {
  const displayName = market.name + (market.base ? ` (${market.base})` : "");

  return (
    <div
      style={{
        background: "#0f1225",
        border: "1px solid #1a1f3a",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1a1f3a",
          fontSize: "13px",
          fontWeight: "600",
          color: "#94a3b8",
        }}
      >
        {displayName}
      </div>
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {market.selections.map((s) => (
          <OddButton key={s.id} selection={s} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

export default function MatchPage({ params }: MatchPageProps) {
  const matchId = params.id;
  const [game, setGame] = useState<BCGameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/bc/game/?id=${encodeURIComponent(matchId)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
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

  const handleSelectOdd = (selection: Selection) => {
    logger.info("Betslip", "Selection added", {
      matchId,
      selection: selection.name,
      price: selection.price,
    });
    // TODO: dispatch to betslip store
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", color: "#64748b" }}>
        Loading match data...
      </div>
    );
  }

  if (error || !game) {
    return (
      <div style={{ padding: "40px" }}>
        <div
          style={{ color: "#f87171", fontSize: "16px", marginBottom: "16px" }}
        >
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

  // Group markets: main (P1XP2, P1P2, WINNER) first, then rest
  const mainTypes = new Set(["P1XP2", "P1P2"]);
  const mainKeys = new Set(["WINNER"]);
  const mainMarkets = game.markets.filter(
    (m) => mainTypes.has(m.type) || mainKeys.has(m.displayKey),
  );
  const otherMarkets = game.markets.filter(
    (m) => !mainTypes.has(m.type) && !mainKeys.has(m.displayKey),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Match Header */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #1a0a30 0%, #0f1225 50%, #0a1628 100%)",
          border: "1px solid #1e2243",
          borderRadius: "14px",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            {game.sportName} &middot; {game.competitionName} &middot;{" "}
            {game.regionName}
          </span>
          {isLive && (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: "4px",
                background: "#7f1d1d",
                color: "#f87171",
                fontSize: "11px",
                fontWeight: "600",
              }}
            >
              LIVE
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "800",
                color: "#f8fafc",
                margin: 0,
              }}
            >
              {game.team1}
            </h2>
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#4a5580",
              fontWeight: "600",
              padding: "6px 12px",
              background: "#0b0e1c",
              borderRadius: "6px",
            }}
          >
            vs
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "800",
                color: "#f8fafc",
                margin: 0,
              }}
            >
              {game.team2}
            </h2>
          </div>
        </div>

        <div style={{ fontSize: "12px", color: "#4a5580", marginTop: "12px" }}>
          {isLive
            ? "In Progress"
            : startDate.toLocaleDateString() +
              " " +
              startDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
          &middot; {game.marketsCount} markets
        </div>
      </div>

      {/* Main Markets */}
      {mainMarkets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {mainMarkets.map((m) => (
            <MarketCard key={m.id} market={m} onSelect={handleSelectOdd} />
          ))}
        </div>
      )}

      {/* Other Markets */}
      {otherMarkets.length > 0 && (
        <>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#94a3b8",
              marginTop: "8px",
            }}
          >
            All Markets ({otherMarkets.length})
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {otherMarkets.map((m) => (
              <MarketCard key={m.id} market={m} onSelect={handleSelectOdd} />
            ))}
          </div>
        </>
      )}

      {game.markets.length === 0 && (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#64748b",
            background: "#0f1225",
            borderRadius: "8px",
            fontSize: "14px",
          }}
        >
          No markets available for this match
        </div>
      )}
    </div>
  );
}
