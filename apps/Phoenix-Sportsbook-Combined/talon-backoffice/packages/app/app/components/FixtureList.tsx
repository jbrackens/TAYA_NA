"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getEvents, Event } from "../lib/api/events-client";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { toggleBetElement, selectBets } from "../lib/store/betSlice";

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
  const dispatch = useAppDispatch();
  const betslipSelections = useAppSelector(selectBets);

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

  const handleBet = (match: Event, position: "home" | "draw" | "away") => {
    dispatch(
      toggleBetElement({
        selectionId: `${match.fixtureId}-${position}`,
        brandMarketId: `${match.fixtureId}-match-result`,
        selectionName:
          position === "home"
            ? match.homeTeam
            : position === "away"
              ? match.awayTeam
              : "Draw",
        marketName: "Match Result",
        fixtureName: `${match.homeTeam} vs ${match.awayTeam}`,
        fixtureId: match.fixtureId,
        odds: { decimal: 0, american: "0", fractional: "0/0" },
      }),
    );
  };

  const isSelected = (fixtureId: string, position: string) =>
    betslipSelections.some((b) => b.selectionId === `${fixtureId}-${position}`);

  if (loading) {
    return <div style={{ color: "#D3D3D3" }}>Loading fixtures...</div>;
  }

  if (error) {
    return <div style={{ color: "#f87171" }}>Error: {error}</div>;
  }

  if (fixtures.length === 0) {
    return <div style={{ color: "#D3D3D3" }}>No fixtures available</div>;
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
              {status.charAt(0).toUpperCase() + status.slice(1)}
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
                  <div style={{ fontSize: "12px", color: "#D3D3D3" }}>vs</div>
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
                  {(["home", "draw", "away"] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => handleBet(fixture, pos)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        backgroundColor: isSelected(fixture.fixtureId, pos)
                          ? "#4f46e5"
                          : "#1a1f3a",
                        color: "#e2e8f0",
                        border: `1px solid ${
                          isSelected(fixture.fixtureId, pos)
                            ? "#4f46e5"
                            : "#2d3748"
                        }`,
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {pos === "home"
                        ? fixture.homeTeam.slice(0, 8)
                        : pos === "away"
                          ? fixture.awayTeam.slice(0, 8)
                          : "Draw"}
                    </button>
                  ))}
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
            Previous
          </button>
          <span
            style={{ color: "#D3D3D3", alignSelf: "center", fontSize: "13px" }}
          >
            Page {currentPage} of {totalPages}
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
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default FixtureList;
