"use client";

import React, { useEffect, useMemo, useState } from "react";
import OddsButton from "../../components/OddsButton";
import { getEvent, type EventDetail } from "../../lib/api/events-client";
import { getMarkets, type Market } from "../../lib/api/markets-client";
import { colors, font, shadow, spacing, surface, text } from "../../lib/theme";

interface FixturePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function FixtureDetailPage({ params }: FixturePageProps) {
  const { id: fixtureId } = React.use(params);
  const [fixture, setFixture] = useState<EventDetail | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadFixture = async () => {
      try {
        setLoading(true);
        const [eventDetail, marketList] = await Promise.all([
          getEvent(fixtureId),
          getMarkets(fixtureId),
        ]);

        if (!cancelled) {
          setFixture(eventDetail);
          setMarkets(marketList);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load fixture",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadFixture();
    return () => {
      cancelled = true;
    };
  }, [fixtureId]);

  const groupedMarkets = useMemo(
    () =>
      markets.map((market) => ({
        marketId: market.marketId,
        marketName: market.marketName,
        suspended: (market.status || "").toLowerCase() !== "open",
        selections: (market.selections || []).map((selection) => ({
          selectionId: selection.selectionId,
          selectionName: selection.selectionName,
          active: true,
          odds: selection.odds ?? 0,
        })),
      })),
    [markets],
  );

  if (loading) {
    return (
      <div style={{ color: "#D3D3D3", padding: "32px" }}>Loading fixture...</div>
    );
  }

  if (error || !fixture) {
    return (
      <div style={{ padding: "32px", color: "#f87171" }}>
        {error || "Fixture not found"}
      </div>
    );
  }

  const homeTeam = fixture.homeTeam || "Home";
  const awayTeam = fixture.awayTeam || "Away";
  const fixtureName = `${homeTeam} vs ${awayTeam}`;
  const statusLabel =
    fixture.status === "in_play"
      ? "LIVE"
      : fixture.status.replaceAll("_", " ");
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
          {fixture.sportKey || "Sport"} &middot; {fixture.leagueKey || "Competition"}
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
            <div
              style={{
                fontSize: font["3xl"],
                fontWeight: font.extrabold,
                color: colors.textPrimary,
              }}
            >
              {homeTeam}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: font.sm,
                color:
                  fixture.status === "in_play"
                    ? colors.dangerText
                    : colors.textSecondary,
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
            <div
              style={{
                fontSize: font["3xl"],
                fontWeight: font.extrabold,
                color: colors.textPrimary,
              }}
            >
              {awayTeam}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{ display: "flex", flexDirection: "column", gap: spacing.md }}
      >
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
              <div
                style={{
                  fontSize: font.lg,
                  fontWeight: font.bold,
                  color: colors.textPrimary,
                }}
              >
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
                  matchName={fixtureName}
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
