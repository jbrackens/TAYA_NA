"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { getEvents, Event } from "../lib/api/events-client";
import { useBetslip } from "../hooks/useBetslip";
import { BetSelection } from "./BetslipProvider";
import { useAppSelector } from "../lib/store/hooks";
import { selectOddsFormat } from "../lib/store/settingsSlice";
import { formatOdds } from "../lib/utils/odds";

interface FixtureListProps {
  sportKey: string;
  leagueKey?: string;
  pageSize?: number;
}

type FilterStatus = "all" | "live" | "upcoming" | "finished";

export const FixtureList: React.FC<FixtureListProps> = ({
  sportKey,
  leagueKey,
  pageSize = 12,
}) => {
  const [fixtures, setFixtures] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const betslip = useBetslip();
  const oddsFormat = useAppSelector(selectOddsFormat);
  const { t } = useTranslation(["fixture-list", "common"]);

  const loadFixtures = useCallback(
    async (page: number) => {
      try {
        setLoading(true);
        const statusMap: Record<FilterStatus, string | undefined> = {
          all: undefined,
          live: "in_play",
          upcoming: "scheduled",
          finished: "finished",
        };
        const response = await getEvents({
          sport: sportKey,
          league: leagueKey,
          status: statusMap[filterStatus],
          page,
          limit: pageSize,
        });
        setFixtures(response.events);
        setTotalPages(response.totalPages || 1);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load fixtures";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [sportKey, leagueKey, pageSize, filterStatus],
  );

  useEffect(() => {
    loadFixtures(currentPage);
  }, [currentPage, loadFixtures]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const getOddsForPosition = (match: Event, position: "home" | "draw" | "away"): number => {
    if (position === "home") return match.homeOdds || 0;
    if (position === "away") return match.awayOdds || 0;
    return match.drawOdds || 0;
  };

  const handleBet = (match: Event, position: "home" | "draw" | "away") => {
    const odds = getOddsForPosition(match, position);
    if (odds <= 0) return; // No odds available — can't bet

    const selectionId = `${match.fixtureId}-${position}`;
    const marketId = `${match.fixtureId}-match-result`;
    const selectionName =
      position === "home"
        ? match.homeTeam
        : position === "away"
          ? match.awayTeam
          : t("common:DRAW_LABEL", { defaultValue: "Draw" });

    const existing = betslip.selections.find(
      (s) => s.selectionId === selectionId && s.marketId === marketId,
    );

    if (existing) {
      betslip.removeSelection(existing.id);
    } else {
      const selection: BetSelection = {
        id: `${marketId}-${selectionId}`,
        fixtureId: match.fixtureId,
        marketId,
        selectionId,
        matchName: `${match.homeTeam} ${t("common:VS", { defaultValue: "vs" })} ${match.awayTeam}`,
        marketName: t("common:MATCH_RESULT", { defaultValue: "Match Result" }),
        selectionName,
        odds,
        initialOdds: odds,
      };
      betslip.addSelection(selection);
    }
  };

  const isSelected = (fixtureId: string, position: string) =>
    betslip.selections.some(
      (s) =>
        s.selectionId === `${fixtureId}-${position}` &&
        s.marketId === `${fixtureId}-match-result`,
    );

  if (loading) {
    return <div style={{ color: "#D3D3D3" }}>{t("fixture-list:LOADING")}</div>;
  }

  if (error) {
    return <div style={{ color: "#f87171" }}>{t("common:ERROR_MESSAGE", { message: error })}</div>;
  }

  if (fixtures.length === 0) {
    return <div style={{ color: "#D3D3D3" }}>{t("fixture-list:NO_FIXTURES")}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {(["all", "live", "upcoming", "finished"] as FilterStatus[]).map(
          (status) => (
            <button
              key={status}
              style={{
                padding: "8px 16px",
                backgroundColor:
                  filterStatus === status ? "#39ff14" : "#0f1225",
                color: filterStatus === status ? "#000" : "#e2e8f0",
                border: `1px solid ${
                  filterStatus === status ? "#39ff14" : "#1a1f3a"
                }`,
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
              onClick={() => setFilterStatus(status)}
            >
              {t(`fixture-list:FILTER_${status.toUpperCase()}`)}
            </button>
          ),
        )}
      </div>

      {/* Fixtures grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px",
        }}
      >
        {fixtures.map((fixture) => {
          const statusColor =
            fixture.status === "in_play"
              ? "#22c55e"
              : fixture.status === "finished"
                ? "#D3D3D3"
                : "#39ff14";
          const displayStatus =
            fixture.status === "in_play"
              ? "live"
              : fixture.status === "finished"
                ? "finished"
                : "upcoming";

          return (
            <div
              key={fixture.eventId}
              style={{
                backgroundColor: "#111328",
                border: "1px solid #1a1f3a",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                cursor: "pointer",
              }}
            >
              <Link
                href={`/match/${fixture.fixtureId}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: statusColor,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#D3D3D3",
                      textTransform: "capitalize",
                    }}
                  >
                    {displayStatus}
                  </span>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#e2e8f0",
                        fontWeight: 600,
                      }}
                    >
                      {fixture.homeTeam}
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", color: "#D3D3D3" }}>{t("common:VS")}</div>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#e2e8f0",
                        fontWeight: 600,
                      }}
                    >
                      {fixture.awayTeam}
                    </div>
                  </div>
                </div>
              </Link>
              {fixture.status !== "finished" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["home", "draw", "away"] as const).map((pos) => {
                    const posOdds = getOddsForPosition(fixture, pos);
                    const hasOdds = posOdds > 0;
                    const selected = isSelected(fixture.fixtureId, pos);
                    return (
                      <button
                        key={pos}
                        onClick={() => handleBet(fixture, pos)}
                        disabled={!hasOdds}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          backgroundColor: selected
                            ? "rgba(57,255,20,0.15)"
                            : "#1a1f3a",
                          color: selected
                            ? "#39ff14"
                            : "#e2e8f0",
                          border: `1px solid ${
                            selected
                              ? "rgba(57,255,20,0.5)"
                              : "#2d3748"
                          }`,
                          borderRadius: "6px",
                          fontSize: "11px",
                          cursor: hasOdds ? "pointer" : "default",
                          opacity: hasOdds ? 1 : 0.4,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "100%",
                        }}>
                          {pos === "home"
                            ? fixture.homeTeam.slice(0, 8)
                            : pos === "away"
                              ? fixture.awayTeam.slice(0, 8)
                              : t("common:DRAW_LABEL")}
                        </span>
                        <span style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          color: selected ? "#39ff14" : hasOdds ? "#39ff14" : "#D3D3D3",
                        }}>
                          {hasOdds ? formatOdds(posOdds, oddsFormat) : "-"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginTop: "24px",
          }}
        >
          <button
            style={{
              padding: "8px 12px",
              backgroundColor: "#0f1225",
              color: "#e2e8f0",
              border: "1px solid #1a1f3a",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              opacity: currentPage === 1 ? 0.5 : 1,
            }}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            {t("common:PREVIOUS")}
          </button>
          <span
            style={{ color: "#D3D3D3", alignSelf: "center", fontSize: "13px" }}
          >
            {t("common:PAGE_OF", { current: currentPage, total: totalPages })}
          </span>
          <button
            style={{
              padding: "8px 12px",
              backgroundColor: "#0f1225",
              color: "#e2e8f0",
              border: "1px solid #1a1f3a",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            {t("common:NEXT")}
          </button>
        </div>
      )}
    </div>
  );
};

export default FixtureList;
