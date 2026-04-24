"use client";

import React, { useEffect, useState, useCallback } from "react";
import BetCard from "./BetCard";
import {
  getUserBetsPage,
  getCashoutOffer,
  cashoutBet,
  CashoutOffer,
} from "../lib/api/betting-client";
import { getLoyaltyLedger } from "../lib/api/loyalty-client";
import { useToast } from "./ToastProvider";
import { ShareWinButton } from "./ShareWinButton";
import { logger } from "../lib/logger";

interface Bet {
  betId: string;
  createdAt: string;
  status: string;
  stakeCents: number;
  odds: number;
  marketId: string;
  selectionId: string;
  selectionName?: string;
  settledAt?: string;
  freebetId?: string;
  bonusFundedCents?: number;
}

type BetStatus = "all" | "open" | "won" | "lost" | "cashed_out";

interface BetHistoryListProps {
  userId: string;
  pageSize?: number;
}

function normalizeBetStatus(status: string): string {
  switch (status) {
    case "placed":
      return "open";
    case "settled_won":
      return "won";
    case "settled_lost":
      return "lost";
    default:
      return status;
  }
}

export const BetHistoryList: React.FC<BetHistoryListProps> = ({
  userId,
  pageSize = 10,
}) => {
  const [filteredBets, setFilteredBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<BetStatus>("all");
  const [cashoutOffers, setCashoutOffers] = useState<
    Record<string, CashoutOffer>
  >({});
  const [pointsByBetId, setPointsByBetId] = useState<Record<string, number>>(
    {},
  );
  const [cashingOut, setCashingOut] = useState<string | null>(null);
  const toast = useToast();

  const loadBets = useCallback(
    async (signal: { cancelled: boolean }) => {
      try {
        setLoading(true);
        const [result, loyaltyLedger] = await Promise.all([
          getUserBetsPage(userId, {
            page: currentPage,
            pageSize,
            status: filterStatus,
          }),
          getLoyaltyLedger(50).catch(() => []),
        ]);
        if (signal.cancelled) return;

        const normalized: Bet[] = (result.data || []).map((ub) => ({
          betId: ub.betId,
          createdAt: ub.createdAt,
          status: normalizeBetStatus(ub.status),
          stakeCents: Math.round(ub.stake * 100),
          odds: ub.selection?.odds ?? 0,
          marketId: ub.marketId ?? "",
          selectionId: ub.selection?.selectionId ?? "",
          selectionName: ub.selection?.selectionName ?? "",
          settledAt:
            ub.status === "settled_won" || ub.status === "settled_lost"
              ? ub.updatedAt
              : undefined,
        }));
        setFilteredBets(normalized);
        setTotalPages(Math.max(1, Math.ceil(result.totalCount / pageSize)));
        setError(null);
        // Predict-native loyalty ledger rows map to market IDs (settlement is
        // per-position, one position per market per user). BetHistoryList is
        // an orphaned sportsbook component — map by marketId for parity until
        // it's either rewired to prediction data or removed.
        const loyaltyMap = (loyaltyLedger || []).reduce<Record<string, number>>(
          (acc, entry) => {
            if (entry.eventType === "accrual" && entry.marketId) {
              acc[entry.marketId] = entry.deltaPoints;
            }
            return acc;
          },
          {},
        );
        setPointsByBetId(loyaltyMap);

        // Fetch cashout offers for open/pending bets
        const cashable = normalized.filter((b) => b.status === "open");
        const offers: Record<string, CashoutOffer> = {};
        const offerResults = await Promise.all(
          cashable.map(async (bet) => {
            try {
              const offer = await getCashoutOffer(bet.betId);
              return { betId: bet.betId, offer };
            } catch {
              return null;
            }
          }),
        );
        offerResults.forEach((result) => {
          if (result?.offer.available) {
            offers[result.betId] = result.offer;
          }
        });
        if (!signal.cancelled) {
          setCashoutOffers(offers);
        }
      } catch (err) {
        if (!signal.cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load bet history";
          logger.error("BetHistory", "Failed to load bets", message);
          setError(message);
        }
      } finally {
        if (!signal.cancelled) {
          setLoading(false);
        }
      }
    },
    [userId, currentPage, pageSize, filterStatus],
  );

  useEffect(() => {
    if (!userId) return;
    const signal = { cancelled: false };
    loadBets(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [userId, loadBets]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const handleCashout = async (betId: string) => {
    setCashingOut(betId);
    try {
      await cashoutBet(betId);
      toast.success("Cashout Successful!", "Your bet has been cashed out.");
      logger.info("BetHistory", "Bet cashed out", betId);

      // Remove the cashout offer and refresh bets
      setCashoutOffers((prev) => {
        const next = { ...prev };
        delete next[betId];
        return next;
      });
      const signal = { cancelled: false };
      await loadBets(signal);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cashout failed";
      logger.error("BetHistory", "Cashout failed", message);
      toast.error("Cashout Failed", message);
    } finally {
      setCashingOut(null);
    }
  };

  const paginatedBets = filteredBets;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          color: "#64748b",
        }}
      >
        Loading bet history...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          padding: "16px 18px",
          borderRadius: "12px",
          border: "1px solid #1a1f3a",
          background: "#0f1225",
          color: "#D3D3D3",
        }}
      >
        <div style={{ fontWeight: 700, color: "#f8fafc" }}>
          Failed to load bet history
        </div>
        <div
          style={{
            fontSize: "13px",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {error}
        </div>
        <button
          onClick={() => {
            const signal = { cancelled: false };
            void loadBets(signal);
          }}
          style={{
            alignSelf: "flex-start",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #1a1f3a",
            background: "#11162c",
            color: "#f8fafc",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {(() => {
        const totalPoints = Object.values(pointsByBetId).reduce(
          (sum, pts) => sum + pts,
          0,
        );
        return totalPoints > 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "14px",
              flexWrap: "wrap",
              padding: "14px 16px",
              borderRadius: "14px",
              border: "1px solid rgba(43, 228, 128,0.18)",
              background:
                "linear-gradient(135deg, rgba(43, 228, 128,0.1), rgba(9,18,12,0.94))",
            }}
          >
            <div>
              <div
                style={{
                  color: "var(--accent)",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                Rewards Posted
              </div>
              <div
                style={{ color: "#D3D3D3", fontSize: "12px", lineHeight: 1.5 }}
              >
                Settled tickets on this page already pushed points into your
                TAYA NA! climb.
              </div>
            </div>
            <div
              style={{
                color: "#f8fafc",
                fontSize: "22px",
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              +{totalPoints} pts
            </div>
          </div>
        ) : null;
      })()}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {(["all", "open", "won", "lost", "cashed_out"] as BetStatus[]).map(
          (status) => (
            <button
              key={status}
              style={{
                padding: "8px 16px",
                backgroundColor:
                  filterStatus === status ? "var(--accent)" : "#0f1225",
                color: filterStatus === status ? "#000" : "#ffffff",
                border: `1px solid ${
                  filterStatus === status ? "var(--accent)" : "#1a1f3a"
                }`,
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
              onClick={() => setFilterStatus(status)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--accent)";
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  filterStatus === status ? "var(--accent)" : "#0f1225";
                e.currentTarget.style.color =
                  filterStatus === status ? "#000" : "#ffffff";
              }}
            >
              {status === "cashed_out"
                ? "Cashed Out"
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ),
        )}
      </div>

      {paginatedBets.length > 0 ? (
        <>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {paginatedBets.map((bet) => {
              const offer = cashoutOffers[bet.betId];
              return (
                <div
                  key={bet.betId}
                  style={{ display: "flex", flexDirection: "column", gap: "0" }}
                >
                  <BetCard bet={bet} />
                  {(bet.status === "won" || bet.status === "lost") &&
                  pointsByBetId[bet.betId] ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 14px",
                        background:
                          "linear-gradient(135deg, rgba(43, 228, 128,0.12), rgba(8,18,11,0.92))",
                        borderLeft: "1px solid rgba(43, 228, 128,0.24)",
                        borderRight: "1px solid rgba(43, 228, 128,0.24)",
                        borderBottom: offer
                          ? "none"
                          : "1px solid rgba(43, 228, 128,0.24)",
                        marginTop: "-8px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "var(--accent)",
                            fontSize: "11px",
                            fontWeight: 800,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            marginBottom: "4px",
                          }}
                        >
                          Points Earned
                        </div>
                        <div
                          style={{
                            color: "#D3D3D3",
                            fontSize: "12px",
                            lineHeight: 1.5,
                          }}
                        >
                          This settled ticket already pushed your loyalty
                          balance forward.
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          justifyItems: "end",
                          gap: "4px",
                        }}
                      >
                        <div
                          style={{
                            color: "var(--accent)",
                            fontSize: "18px",
                            fontWeight: 800,
                          }}
                        >
                          +{pointsByBetId[bet.betId]}
                        </div>
                        <div
                          style={{
                            color: "#a7f3d0",
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          Rewards climb
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {bet.status === "won" && (
                    <ShareWinButton
                      selectionName={bet.selectionName || ""}
                      odds={bet.odds}
                      stakeCents={bet.stakeCents}
                      payoutCents={Math.round(bet.stakeCents * bet.odds)}
                      betId={bet.betId}
                    />
                  )}
                  {offer && (
                    <button
                      disabled={cashingOut === bet.betId}
                      onClick={() => handleCashout(bet.betId)}
                      style={{
                        padding: "10px 16px",
                        backgroundColor:
                          cashingOut === bet.betId ? "#166534" : "#22c55e",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "0 0 8px 8px",
                        cursor:
                          cashingOut === bet.betId ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: 700,
                        marginTop: "-8px",
                        transition: "background-color 0.2s",
                        opacity: cashingOut === bet.betId ? 0.7 : 1,
                      }}
                    >
                      {cashingOut === bet.betId
                        ? "Cashing Out..."
                        : `Cash Out $${offer.cashoutValue.toFixed(2)}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

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
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                style={{
                  padding: "8px 12px",
                  backgroundColor: currentPage === 1 ? "#0f1225" : "#0f1225",
                  color: "#ffffff",
                  border: `1px solid #1a1f3a`,
                  borderRadius: "4px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  transition: "all 0.2s",
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span
                style={{
                  color: "#64748b",
                  alignSelf: "center",
                  fontSize: "13px",
                }}
              >
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                style={{
                  padding: "8px 12px",
                  backgroundColor:
                    currentPage === totalPages ? "#0f1225" : "#0f1225",
                  color: "#ffffff",
                  border: `1px solid #1a1f3a`,
                  borderRadius: "4px",
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  transition: "all 0.2s",
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          {filterStatus === "all"
            ? "No bets yet. Start betting to see your bet history here."
            : `No ${filterStatus} bets`}
        </div>
      )}
    </div>
  );
};

export default BetHistoryList;
