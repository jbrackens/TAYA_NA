"use client";

import React, { useEffect, useMemo, useState } from "react";
import OddsButton from "../../components/OddsButton";
import { colors, font, shadow, spacing, surface, text } from "../../lib/theme";

interface RawSelectionOdds {
  selectionId: string;
  selectionName: string;
  active?: boolean;
  displayOdds?: {
    decimal?: number;
  };
}

interface RawFixtureMarketEntry {
  fixtureId: string;
  fixtureName: string;
  startTime: string;
  isLive: boolean;
  status: string;
  sport?: {
    name?: string;
  };
  tournament?: {
    name?: string;
  };
  competitors?: {
    home?: { name?: string; score?: number };
    away?: { name?: string; score?: number };
  };
  market: {
    marketId: string;
    marketName: string;
    currentLifecycle?: {
      type?: string;
    };
    selectionOdds?: RawSelectionOdds[];
  };
}

interface FixturePageProps {
  params: {
    id: string;
  };
}

export default function FixtureDetailPage({ params }: FixturePageProps) {
  const fixtureId = params.id;
  const [entries, setEntries] = useState<RawFixtureMarketEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadFixture = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/v1/markets/?fixture_id=${encodeURIComponent(fixtureId)}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to load fixture: ${response.status}`);
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];
        const fixtureEntries = data.filter(
          (entry: RawFixtureMarketEntry) => entry.fixtureId === fixtureId,
        );

        if (!cancelled) {
          setEntries(fixtureEntries);
          setError(fixtureEntries.length === 0 ? "Fixture not found" : null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load fixture",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFixture();
    return () => {
      cancelled = true;
    };
  }, [fixtureId]);

  const fixture = entries[0];
  const groupedMarkets = useMemo(
    () =>
      entries.map((entry) => ({
        marketId: entry.market.marketId,
        marketName: entry.market.marketName,
        suspended: entry.market.currentLifecycle?.type !== "BETTABLE",
        selections: (entry.market.selectionOdds || []).map((selection) => ({
          selectionId: selection.selectionId,
          selectionName: selection.selectionName,
          active: selection.active !== false,
          odds: selection.displayOdds?.decimal ?? 0,
        })),
      })),
    [entries],
  );

  if (loading) {
    return <div style={{ color: "#D3D3D3", padding: "32px" }}>Loading fixture...</div>;
  }

  if (error || !fixture) {
    return (
      <div style={{ padding: "32px", color: "#f87171" }}>
        {error || "Fixture not found"}
      </div>
    );
  }

  const homeTeam = fixture.competitors?.home?.name || "Home";
  const awayTeam = fixture.competitors?.away?.name || "Away";
  const homeScore = fixture.competitors?.home?.score ?? 0;
  const awayScore = fixture.competitors?.away?.score ?? 0;
  const statusLabel = fixture.isLive ? "LIVE" : fixture.status.replaceAll("_", " ");
  const startDate = new Date(fixture.startTime);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing.xl,
        paddingBottom: spacing["4xl"],
      }}
    >
      <section
        style={{
          ...surface.heroPanel,
          padding: spacing["2xl"],
        }}
      >
        <div
          style={{
            ...text.eyebrow,
            marginBottom: spacing.md,
          }}
        >
          {fixture.sport?.name || "Sport"} &middot; {fixture.tournament?.name || "Competition"}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing.xl,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: font["3xl"], fontWeight: font.extrabold, color: colors.textPrimary }}>
              {homeTeam}
            </div>
            {fixture.isLive && (
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: font.extrabold,
                  color: colors.primary,
                  marginTop: spacing.sm,
                  textShadow: `0 0 18px ${colors.primaryGlow}`,
                }}
              >
                {homeScore}
              </div>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: font.sm,
                color: fixture.isLive ? colors.dangerText : colors.textSecondary,
                fontWeight: font.bold,
                marginBottom: spacing.sm,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {statusLabel}
            </div>
            <div style={{ fontSize: font.md, color: colors.textSecondary }}>
              {startDate.toLocaleDateString()}{" "}
              {startDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: font["3xl"], fontWeight: font.extrabold, color: colors.textPrimary }}>
              {awayTeam}
            </div>
            {fixture.isLive && (
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: font.extrabold,
                  color: colors.primary,
                  marginTop: spacing.sm,
                  textShadow: `0 0 18px ${colors.primaryGlow}`,
                }}
              >
                {awayScore}
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
        {groupedMarkets.map((market) => (
          <div
            key={market.marketId}
            style={{
              ...surface.panelRaised,
              padding: spacing.lg,
              boxShadow: shadow.md,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: spacing.md,
                marginBottom: spacing.md,
              }}
            >
              <div style={{ fontSize: font.lg, fontWeight: font.bold, color: colors.textPrimary }}>
                {market.marketName}
              </div>
              <div
                style={{
                  ...surface.chip,
                  padding: `${spacing.xs} ${spacing.sm}`,
                  color: colors.textSecondary,
                  fontSize: font.sm,
                  fontWeight: font.semibold,
                }}
              >
                {market.selections.length} selections
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: spacing.sm,
              }}
            >
              {market.selections.map((selection) => (
                <OddsButton
                  key={`${market.marketId}-${selection.selectionId}`}
                  fixtureId={fixtureId}
                  marketId={market.marketId}
                  selectionId={selection.selectionId}
                  odds={selection.odds}
                  matchName={fixture.fixtureName}
                  marketName={market.marketName}
                  selectionName={selection.selectionName}
                  suspended={market.suspended || !selection.active}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
