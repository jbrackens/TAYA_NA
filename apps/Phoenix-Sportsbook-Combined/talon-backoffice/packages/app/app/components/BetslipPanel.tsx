"use client";

import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, Ticket, Clock } from "lucide-react";
import { useBetslip } from "../hooks/useBetslip";
import {
  placeBet,
  placeParlay,
  getUserBets,
  getCashoutOffer,
  cashoutBet,
  precheckBets,
} from "../lib/api/betting-client";
import {
  PlaceBetRequest,
  PlaceParlayRequest,
  PrecheckBetsRequest,
  UserBet,
  CashoutOffer,
} from "../lib/api/betting-client";
import { BetSelection } from "./BetslipProvider";
import { useAppSelector } from "../lib/store/hooks";
import { selectOddsFormat } from "../lib/store/settingsSlice";
import { formatOdds } from "../lib/utils/odds";
import { useToast } from "./ToastProvider";
import { useAuth } from "../hooks/useAuth";
import { geoComplianceService } from "../lib/services/geocomply";
import { logger } from "../lib/logger";

const QUICK_STAKES = [5, 10, 25, 50, 100];

type BetState = "idle" | "confirming" | "placing" | "success" | "error";

interface OddsChange {
  id: string;
  name: string;
  oldOdds: number;
  newOdds: number;
}

export const BetslipPanel: React.FC = () => {
  const { t } = useTranslation("betslip");
  const [activeTab, setActiveTab] = useState<"betslip" | "open">("betslip");
  const [betState, setBetState] = useState<BetState>("idle");
  const [betError, setBetError] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [oddsChanged, setOddsChanged] = useState(false);
  const [changedSelections, setChangedSelections] = useState<OddsChange[]>([]);

  // Providers are always mounted in layout.tsx
  const betslip = useBetslip();
  const oddsFormat = useAppSelector(selectOddsFormat);
  const toast = useToast();
  const { user } = useAuth();

  const { selections, stakePerLeg, parlayMode, totalStake, potentialReturn } =
    betslip;

  const handlePlaceBet = useCallback(async () => {
    if (betState === "idle") {
      // First click → show confirmation
      setBetState("confirming");
      return;
    }

    if (betState !== "confirming") return;

    setBetState("placing");
    setBetError("");

    try {
      const userId = user?.id;
      if (!userId) {
        setBetError(t("LOG_IN_TO_BET"));
        setBetState("error");
        setTimeout(() => setBetState("idle"), 3000);
        return;
      }

      // Geolocation compliance check
      const geoResult = await geoComplianceService.checkLocation();
      if (!geoResult.allowed) {
        const geoMsg =
          geoResult.errorMessage ||
          "Betting is not available in your current location.";
        logger.warn("Betslip", "Geo check failed", geoResult);
        setBetError(geoMsg);
        setBetState("error");
        setTimeout(() => setBetState("idle"), 4000);
        return;
      }

      // Bet precheck validation
      try {
        const precheckRequest: PrecheckBetsRequest = {
          user_id: userId,
          bets: selections.map((sel: BetSelection) => ({
            fixture_id: sel.fixtureId,
            market_id: sel.marketId,
            selection_id: sel.selectionId,
            stake: stakePerLeg,
            odds: sel.odds,
          })),
        };
        const precheckResult = await precheckBets(precheckRequest);
        if (precheckResult.valid === false) {
          const issueMessages = precheckResult.issues
            .map((issue) => issue.error)
            .join("; ");
          logger.warn("Betslip", "Precheck failed", precheckResult);
          setBetError(issueMessages);
          setBetState("error");
          setTimeout(() => setBetState("idle"), 4000);
          return;
        }
      } catch (err) {
        // Fail-open: if precheck API is unreachable, proceed with bet placement
        logger.warn(
          "Betslip",
          "Precheck API call failed, proceeding with bet",
          err instanceof Error ? err.message : String(err),
        );
      }

      // Odds change detection
      if (!oddsChanged) {
        const changes: OddsChange[] = [];
        for (const sel of selections) {
          if (sel.odds !== sel.initialOdds) {
            changes.push({
              id: sel.id,
              name: sel.selectionName,
              oldOdds: sel.initialOdds,
              newOdds: sel.odds,
            });
          }
        }
        if (changes.length > 0) {
          logger.info("Betslip", "Odds changed since selection", changes);
          setChangedSelections(changes);
          setOddsChanged(true);
          setBetState("confirming");
          return;
        }
      }

      if (parlayMode) {
        const request: PlaceParlayRequest = {
          user_id: userId,
          bets: selections.map((s: BetSelection) => ({
            fixture_id: s.fixtureId,
            market_id: s.marketId,
            selection_id: s.selectionId,
            odds: s.odds,
          })),
          stake: totalStake,
        };
        await placeParlay(request);
      } else {
        // Place each single bet
        for (const sel of selections) {
          const request: PlaceBetRequest = {
            user_id: userId,
            fixture_id: sel.fixtureId,
            market_id: sel.marketId,
            selection_id: sel.selectionId,
            stake: stakePerLeg,
            odds: sel.odds,
          };
          await placeBet(request);
        }
      }

      setBetState("success");
      toast.success(t("PLACE_BET"), t("BET_CONFIRMED"));
      // Clear betslip after successful placement
      setTimeout(() => {
        betslip?.clearAll();
        setBetState("idle");
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const errorMsg = message || t("PLACE_BET_FAILED");
      setBetError(errorMsg);
      setBetState("error");
      toast.error("Bet Failed", errorMsg);
      // Reset to idle after showing error
      setTimeout(() => setBetState("idle"), 3000);
    }
  }, [
    betState,
    parlayMode,
    selections,
    totalStake,
    stakePerLeg,
    betslip,
    oddsChanged,
    user,
    t,
    toast,
  ]);

  const cancelConfirmation = useCallback(() => {
    setBetState("idle");
    setBetError("");
    setOddsChanged(false);
    setChangedSelections([]);
  }, []);

  const acceptOddsChanges = useCallback(() => {
    betslip?.syncInitialOdds();
    setOddsChanged(false);
    setChangedSelections([]);
    // Re-trigger placement flow — already in confirming state, call handlePlaceBet
  }, [betslip]);

  // Helper function to render the betslip content (used by both desktop and mobile)
  const renderBetslipContent = () => (
    <>
      {selections.length === 0 ? (
        <div className="ps-betslip-empty">
          <div className="ps-betslip-empty-icon">
            <Ticket size={48} strokeWidth={1.5} style={{ opacity: 0.4 }} />
          </div>
          <div className="ps-betslip-empty-text">{t("NO_BETS_MESSAGE")}</div>
        </div>
      ) : (
        <>
          {/* Single/Parlay Toggle */}
          {selections.length > 1 && (
            <div
              style={{
                display: "flex",
                padding: "8px 12px",
                gap: 4,
                borderBottom: "1px solid #1a1f3a",
              }}
            >
              <button
                className={`ps-betslip-tab ${!parlayMode ? "active" : ""}`}
                onClick={() => betslip?.setParlayMode(false)}
                style={{ flex: 1, borderBottom: "none", padding: "8px 0" }}
              >
                {t("SINGLE")}
              </button>
              <button
                className={`ps-betslip-tab ${parlayMode ? "active" : ""}`}
                onClick={() => betslip?.setParlayMode(true)}
                style={{ flex: 1, borderBottom: "none", padding: "8px 0" }}
              >
                {t("MULTI")}
              </button>
            </div>
          )}

          {/* Selections */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {selections.map((sel: BetSelection) => (
              <div key={sel.id} className="ps-betslip-selection">
                <div className="ps-betslip-selection-header">
                  <div>
                    <div className="ps-betslip-selection-name">
                      {sel.selectionName}
                    </div>
                    <div className="ps-betslip-selection-market">
                      {sel.marketName}
                    </div>
                    <div className="ps-betslip-selection-match">
                      {sel.matchName}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span className="ps-betslip-selection-odds">
                      {typeof sel.odds === "number"
                        ? formatOdds(sel.odds, oddsFormat)
                        : sel.odds}
                    </span>
                    <button
                      className="ps-betslip-remove"
                      onClick={() => betslip?.removeSelection(sel.id)}
                      title="Remove"
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Odds Change Warning Banner */}
          {oddsChanged && changedSelections.length > 0 && (
            <div
              style={{
                margin: "8px 12px",
                padding: "12px",
                borderRadius: 8,
                background: "rgba(251, 191, 36, 0.1)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fbbf24",
                  marginBottom: 8,
                }}
              >
                Odds have changed
              </div>
              {changedSelections.map((change) => (
                <div
                  key={change.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    color: "#f1f5f9",
                    padding: "4px 0",
                  }}
                >
                  <span style={{ flex: 1 }}>{change.name}</span>
                  <span
                    style={{
                      color: "#94a3b8",
                      textDecoration: "line-through",
                      marginRight: 6,
                    }}
                  >
                    {formatOdds(change.oldOdds, oddsFormat)}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {formatOdds(change.newOdds, oddsFormat)}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  className="ps-btn-clear"
                  onClick={cancelConfirmation}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="ps-btn-place-bet"
                  onClick={() => {
                    acceptOddsChanges();
                    handlePlaceBet();
                  }}
                  style={{ flex: 2 }}
                >
                  Accept &amp; Place
                </button>
              </div>
            </div>
          )}

          {/* Footer: Stake + Summary + Place Bet */}
          <div className="ps-betslip-footer">
            {/* Quick Stakes */}
            <div className="ps-betslip-quick-stakes">
              {QUICK_STAKES.map((amount) => (
                <button
                  key={amount}
                  className="ps-betslip-quick-stake"
                  onClick={() => betslip?.setStakePerLeg(amount)}
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Stake Input */}
            <div className="ps-betslip-stake-row">
              <span className="ps-betslip-stake-label">
                {parlayMode ? t("TOTAL_STAKE") : t("STAKE")}
              </span>
              <input
                type="number"
                className="ps-betslip-stake-input"
                value={stakePerLeg}
                onChange={(e) =>
                  betslip?.setStakePerLeg(
                    Math.max(0, parseFloat(e.target.value) || 0),
                  )
                }
                min="0"
                step="0.01"
              />
            </div>

            {/* Summary */}
            <div className="ps-betslip-summary">
              <div className="ps-betslip-summary-row">
                <span className="ps-betslip-summary-label">
                  {t("TOTAL_STAKE")}
                </span>
                <span className="ps-betslip-summary-value">
                  ${totalStake.toFixed(2)}
                </span>
              </div>
              <div className="ps-betslip-summary-row">
                <span className="ps-betslip-summary-label">
                  {t("POSSIBLE_RETURN")}
                </span>
                <span className="ps-betslip-summary-value green">
                  ${potentialReturn.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Bet Error */}
            {betState === "error" && betError && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  marginBottom: 8,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {betError}
              </div>
            )}

            {/* Bet Success */}
            {betState === "success" && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  marginBottom: 8,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  color: "#22c55e",
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                {t("PLACE_BET")}
              </div>
            )}

            {/* Confirmation bar */}
            {betState === "confirming" && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 8,
                  background: "rgba(57,255,20,0.08)",
                  border: "1px solid rgba(57,255,20,0.2)",
                  fontSize: 12,
                  color: "#39ff14",
                  fontWeight: 500,
                  textAlign: "center",
                }}
              >
                {t("CONFIRM_BET", {
                  type: parlayMode
                    ? "parlay"
                    : selections.length > 1
                      ? `${selections.length} bets`
                      : "bet",
                  amount: totalStake.toFixed(2),
                })}
              </div>
            )}

            {/* Place Bet / Confirm */}
            {betState === "confirming" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="ps-btn-clear"
                  onClick={cancelConfirmation}
                  style={{ flex: 1 }}
                >
                  {t("CLEAR_ALL")}
                </button>
                <button
                  className="ps-btn-place-bet"
                  onClick={handlePlaceBet}
                  style={{ flex: 2 }}
                >
                  {t("PLACE_BET")}
                </button>
              </div>
            ) : (
              <button
                className="ps-btn-place-bet"
                disabled={
                  totalStake <= 0 ||
                  betState === "placing" ||
                  betState === "success"
                }
                onClick={handlePlaceBet}
              >
                {betState === "placing"
                  ? t("PLACING")
                  : betState === "success"
                    ? t("PLACED")
                    : `${t("PLACE_BET")}${
                        selections.length > 1 && !parlayMode
                          ? ` (${selections.length} bets)`
                          : ""
                      }`}
              </button>
            )}

            {/* Clear */}
            {betState !== "confirming" && (
              <button
                className="ps-btn-clear"
                onClick={() => {
                  betslip?.clearAll();
                  setBetState("idle");
                  setBetError("");
                }}
              >
                {t("CLEAR_ALL")}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Betslip Panel */}
      <aside className="ps-betslip">
        {/* Header */}
        <div className="ps-betslip-header">
          <span className="ps-betslip-title">{t("BETSLIP")}</span>
          <span className="ps-betslip-count">{selections.length}</span>
        </div>

        {/* Tabs: Betslip / Open Bets */}
        <div className="ps-betslip-tabs">
          <button
            className={`ps-betslip-tab ${
              activeTab === "betslip" ? "active" : ""
            }`}
            onClick={() => setActiveTab("betslip")}
          >
            {t("BETSLIP")} ({selections.length})
          </button>
          <button
            className={`ps-betslip-tab ${activeTab === "open" ? "active" : ""}`}
            onClick={() => setActiveTab("open")}
          >
            {t("OPEN_BETS")}
          </button>
        </div>

        {activeTab === "betslip" ? (
          renderBetslipContent()
        ) : (
          <OpenBetsTab oddsFormat={oddsFormat} />
        )}
      </aside>

      {/* Mobile Floating Action Button */}
      <button
        className="ps-betslip-fab"
        onClick={() => setMobileOpen(true)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #39ff14 0%, #ea580c 100%)",
          color: "white",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(57,255,20,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 40,
          transition: "all 0.3s ease",
        }}
        title={t("OPEN_BETSLIP")}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ticket size={28} strokeWidth={2} />
          {selections.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                background: "#ef4444",
                color: "white",
                borderRadius: "50%",
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                border: "2px solid #39ff14",
              }}
            >
              {selections.length}
            </span>
          )}
        </div>
      </button>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="ps-betslip-drawer-backdrop"
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 50,
            animation: "fadeIn 0.3s ease",
          }}
        />
      )}

      {/* Mobile Slide-up Drawer */}
      <div
        className="ps-betslip-drawer"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "80vh",
          background: "#0f1225",
          borderTop: "1px solid #1a1f3a",
          borderRadius: "16px 16px 0 0",
          zIndex: 51,
          display: "flex",
          flexDirection: "column",
          transform: mobileOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s ease",
          boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Drag Handle Bar */}
        <div
          style={{
            padding: "12px 0",
            display: "flex",
            justifyContent: "center",
            borderBottom: "1px solid #1a1f3a",
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "#374163",
            }}
          />
        </div>

        {/* Header with Close Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid #1a1f3a",
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#f1f5f9",
            }}
          >
            {t("BETSLIP")} ({selections.length})
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: "#4a5580",
              fontSize: 20,
              cursor: "pointer",
              padding: "4px 8px",
            }}
            title="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Betslip Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {renderBetslipContent()}
        </div>
      </div>

      {/* Embedded Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (min-width: 1200px) {
          .ps-betslip-fab {
            display: none !important;
          }
          .ps-betslip-drawer {
            display: none !important;
          }
          .ps-betslip-drawer-backdrop {
            display: none !important;
          }
        }

        @media (max-width: 1199px) {
          .ps-betslip {
            display: none !important;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .ps-betslip-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 12px 32px rgba(57, 255, 20, 0.4);
        }

        .ps-betslip-fab:active {
          transform: scale(0.95);
        }
      `,
        }}
      />
    </>
  );
};

// ─── Open Bets Sub-Component ────────────────────────────────

const OpenBetsTab: React.FC<{ oddsFormat: string }> = ({ oddsFormat }) => {
  const { t } = useTranslation("betslip");
  const [openBets, setOpenBets] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [cashoutOffers, setCashoutOffers] = useState<
    Record<string, CashoutOffer>
  >({});
  const [cashingOut, setCashingOut] = useState<string | null>(null);
  const [cashoutMsg, setCashoutMsg] = useState<{
    betId: string;
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const toast = useToast();
  const { user } = useAuth();

  // Fetch open bets on mount
  React.useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const bets = await getUserBets(user.id);
        const active = (bets || []).filter(
          (b) => b.status === "OPENED" || b.status === "PENDING",
        );
        setOpenBets(active);

        // Fetch cashout offers for each bet
        const offers: Record<string, CashoutOffer> = {};
        for (const bet of active) {
          try {
            const offer = await getCashoutOffer(bet.betId);
            if (offer.available) offers[bet.betId] = offer;
          } catch {
            /* no cashout available */
          }
        }
        setCashoutOffers(offers);
      } catch {
        // API not reachable
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const handleCashout = async (betId: string) => {
    setCashingOut(betId);
    setCashoutMsg(null);
    try {
      await cashoutBet(betId);
      setCashoutMsg({ betId, msg: "Cashed out!", type: "success" });
      toast.success("Cashout Successful!", "Your bet has been cashed out.");
      // Remove from open bets
      setOpenBets((prev) => prev.filter((b) => b.betId !== betId));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const errorMsg = message || "Cashout failed";
      setCashoutMsg({ betId, msg: errorMsg, type: "error" });
      toast.error("Cashout Failed", errorMsg);
    } finally {
      setCashingOut(null);
      setTimeout(() => setCashoutMsg(null), 3000);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: "center",
          color: "#4a5580",
          fontSize: 13,
        }}
      >
        {t("LOADING")}
      </div>
    );
  }

  if (openBets.length === 0) {
    return (
      <div className="ps-betslip-empty">
        <div className="ps-betslip-empty-icon">
          <Clock size={48} strokeWidth={1.5} style={{ opacity: 0.4 }} />
        </div>
        <div className="ps-betslip-empty-text">{t("NO_BETS_MESSAGE")}</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {openBets.map((bet) => {
        const offer = cashoutOffers[bet.betId];
        const msg = cashoutMsg?.betId === bet.betId ? cashoutMsg : null;
        return (
          <div
            key={bet.betId}
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #1a1f3a",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                {bet.selection?.selectionName || "Selection"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#39ff14" }}>
                {bet.selection?.odds
                  ? formatOdds(bet.selection.odds, oddsFormat)
                  : "-"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#4a5580",
              }}
            >
              <span>
                {t("STAKE_LABEL")} ${bet.stake.toFixed(2)}
              </span>
              <span>
                {t("RETURN_LABEL")} ${bet.potentialReturn.toFixed(2)}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#374163", marginTop: 4 }}>
              {bet.status} &middot; {new Date(bet.createdAt).toLocaleString()}
            </div>

            {/* Cashout button */}
            {offer && (
              <button
                onClick={() => handleCashout(bet.betId)}
                disabled={cashingOut === bet.betId}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "8px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  color: "#22c55e",
                  transition: "all 0.15s",
                }}
              >
                {cashingOut === bet.betId
                  ? t("CASHING_OUT")
                  : `${t("CASH_OUT")} $${offer.cashoutValue.toFixed(2)}`}
              </button>
            )}

            {/* Cashout result message */}
            {msg && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  textAlign: "center",
                  color: msg.type === "success" ? "#22c55e" : "#f87171",
                }}
              >
                {msg.msg}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BetslipPanel;
