"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
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
import { colors, shadow, transition } from "../lib/theme";

const QUICK_STAKES = [5, 10, 25, 50, 100];

type BetState = "idle" | "confirming" | "placing" | "success" | "error";

interface OddsChange {
  id: string;
  name: string;
  oldOdds: number;
  newOdds: number;
}

export const BetslipPanel: React.FC = () => {
  const { t, ready } = useTranslation("betslip");
  const [activeTab, setActiveTab] = useState<"betslip" | "open">("betslip");
  const [betState, setBetState] = useState<BetState>("idle");
  const [betError, setBetError] = useState<string>("");
  const [oddsChanged, setOddsChanged] = useState(false);
  const [changedSelections, setChangedSelections] = useState<OddsChange[]>([]);

  // Providers are always mounted in layout.tsx
  const betslip = useBetslip();
  const oddsFormat = useAppSelector(selectOddsFormat);
  const toast = useToast();
  const { user } = useAuth();

  const {
    selections,
    stakePerLeg,
    parlayMode,
    totalStake,
    potentialReturn,
    isOpen,
    closeBetslip,
    toggleBetslip,
  } = betslip;

  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = ready ? t(key) : key;
      return value === key ? fallback : value;
    },
    [ready, t],
  );

  // Close on Escape key (unless placing bet)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && betState !== "placing") {
        closeBetslip();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, betState, closeBetslip]);

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
        setBetError(tx("LOG_IN_TO_BET", "Log in to place a bet"));
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
      toast.success(
        tx("PLACE_BET", "Lock In Bet"),
        tx("BET_CONFIRMED", "Your ticket is locked in."),
      );
      // Clear betslip after successful placement
      setTimeout(() => {
        betslip?.clearAll();
        setBetState("idle");
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const errorMsg =
        message || tx("PLACE_BET_FAILED", "Bet placement failed");
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

  const renderedSelections = useMemo(
    () =>
      selections.map((sel: BetSelection) => (
        <div key={sel.id} className="ps-betslip-selection">
          <div className="ps-betslip-selection-header">
            <div>
              <div className="ps-betslip-selection-name">{sel.selectionName}</div>
              <div className="ps-betslip-selection-market">{sel.marketName}</div>
              <div className="ps-betslip-selection-match">{sel.matchName}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          <div className="ps-betslip-selection-meta">
            <span className="ps-betslip-selection-meta-label">Potential</span>
            <span className="ps-betslip-selection-meta-value">
              ${(stakePerLeg * sel.odds).toFixed(2)}
            </span>
          </div>
        </div>
      )),
    [betslip, oddsFormat, selections, stakePerLeg],
  );

  // Helper function to render the betslip content (used by both desktop and mobile)
  const renderBetslipContent = () => (
    <>
      {selections.length === 0 ? (
        <div className="ps-betslip-empty">
          <div className="ps-betslip-empty-icon">
            <Ticket size={48} strokeWidth={1.5} style={{ opacity: 0.4 }} />
          </div>
          <div className="ps-betslip-empty-text">
            {tx("NO_BETS_MESSAGE", "Your slip is empty. Add a market to get started.")}
          </div>
        </div>
      ) : (
        <>
          {/* Single/Parlay Toggle */}
          {selections.length > 1 && (
            <div className="ps-betslip-mode-toggle">
              <button
                className={`ps-betslip-tab ${!parlayMode ? "active" : ""}`}
                onClick={() => betslip?.setParlayMode(false)}
                style={{ flex: 1, borderBottom: "none", padding: "8px 0" }}
              >
                {tx("SINGLE", "Single")}
              </button>
              <button
                className={`ps-betslip-tab ${parlayMode ? "active" : ""}`}
                onClick={() => betslip?.setParlayMode(true)}
                style={{ flex: 1, borderBottom: "none", padding: "8px 0" }}
              >
                {tx("MULTI", "Multi")}
              </button>
            </div>
          )}

          {/* Selections */}
          <div className="ps-betslip-list">{renderedSelections}</div>

          {/* Odds Change Warning Banner */}
          {oddsChanged && changedSelections.length > 0 && (
            <div
              className="ps-betslip-state-card ps-betslip-state-card-warning"
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: colors.warning,
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
                    color: colors.textPrimary,
                    padding: "4px 0",
                  }}
                >
                  <span style={{ flex: 1 }}>{change.name}</span>
                  <span
                    style={{
                      color: colors.textSecondary,
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

          {/* Footer: Stake + Summary + Lock-In action */}
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
            <div className="ps-betslip-panel-block">
              <div className="ps-betslip-stake-row">
              <span className="ps-betslip-stake-label">
                {parlayMode
                  ? tx("TOTAL_STAKE", "Total Stake")
                  : tx("STAKE", "Stake")}
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
            </div>

            {/* Summary */}
            <div className="ps-betslip-summary ps-betslip-panel-block">
              <div className="ps-betslip-summary-row">
                <span className="ps-betslip-summary-label">
                  {tx("TOTAL_STAKE", "Total Stake")}
                </span>
                <span className="ps-betslip-summary-value">
                  ${totalStake.toFixed(2)}
                </span>
              </div>
              <div className="ps-betslip-summary-row">
                <span className="ps-betslip-summary-label">
                  {tx("POSSIBLE_RETURN", "Possible Return")}
                </span>
                <span className="ps-betslip-summary-value green">
                  ${potentialReturn.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Bet Error */}
            {betState === "error" && betError && (
              <div className="ps-betslip-state-card ps-betslip-state-card-error">
                {betError}
              </div>
            )}

            {/* Bet Success */}
            {betState === "success" && (
              <div className="ps-betslip-state-card ps-betslip-state-card-success">
                {tx("PLACE_BET", "Locked In Bet")}
              </div>
            )}

            {/* Confirmation bar */}
            {betState === "confirming" && (
              <div className="ps-betslip-state-card ps-betslip-state-card-confirm">
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

            {/* Lock-In / Confirm actions */}
            {betState === "confirming" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="ps-btn-clear"
                  onClick={cancelConfirmation}
                  style={{ flex: 1 }}
                >
                  {tx("CLEAR_ALL", "Clear All")}
                </button>
                <button
                  className="ps-btn-place-bet"
                  onClick={handlePlaceBet}
                  style={{ flex: 2 }}
                >
                  {tx("PLACE_BET", "Lock In Bet")}
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
                  ? tx("PLACING", "Placing...")
                  : betState === "success"
                    ? tx("PLACED", "Placed")
                    : `${tx("PLACE_BET", "Lock In Bet")}${
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
                {tx("CLEAR_ALL", "Clear All")}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`ps-betslip-backdrop ${isOpen ? "visible" : ""}`}
        onClick={() => {
          if (betState !== "placing") closeBetslip();
        }}
      />

      {/* Side-sheet */}
      <div
        className={`ps-betslip-overlay ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-label="Betslip"
        aria-modal="true"
      >
        {/* Header */}
        <div className="ps-betslip-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="ps-betslip-title">{tx("BETSLIP", "Betslip")}</span>
              <span className="ps-betslip-count">{selections.length}</span>
            </div>
            <div className="ps-betslip-subtitle">
              {selections.length > 0
                ? `${tx("POSSIBLE_RETURN", "Possible Return")}: $${potentialReturn.toFixed(2)}`
                : tx("NO_BETS_MESSAGE", "Your slip is empty. Add a market to get started.")}
            </div>
          </div>
          <button
            onClick={closeBetslip}
            style={{
              background: "none",
              border: "none",
              color: colors.textSecondary,
              cursor: "pointer",
              padding: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 8,
              transition: transition.fast,
            }}
            aria-label="Close betslip"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Tabs: Betslip / Open Bets */}
        <div className="ps-betslip-tabs">
          <button
            className={`ps-betslip-tab ${
              activeTab === "betslip" ? "active" : ""
            }`}
            onClick={() => setActiveTab("betslip")}
          >
            {tx("BETSLIP", "Betslip")} ({selections.length})
          </button>
          <button
            className={`ps-betslip-tab ${activeTab === "open" ? "active" : ""}`}
            onClick={() => setActiveTab("open")}
          >
            {tx("OPEN_BETS", "Open Bets")}
          </button>
        </div>

        {activeTab === "betslip" ? (
          renderBetslipContent()
        ) : (
          <OpenBetsTab oddsFormat={oddsFormat} />
        )}
      </div>

      {/* FAB trigger — shown when closed and has selections */}
      {!isOpen && selections.length > 0 && (
        <button
          onClick={toggleBetslip}
          className="ps-betslip-fab"
          aria-label={`Open betslip (${selections.length} selections)`}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M13 5v2" />
            <path d="M13 17v2" />
            <path d="M13 11v2" />
          </svg>
          <span className="ps-betslip-fab-count">{selections.length}</span>
        </button>
      )}

      {/* Embedded Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .ps-betslip-fab {
          position: fixed; bottom: 24px; right: 24px; z-index: 28;
          width: 56px; height: 56px; border-radius: 50%;
          background: ${colors.gradient}; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: ${colors.bgSurface}; font-weight: 700;
          box-shadow: ${shadow.glowLg};
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ps-betslip-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(57,255,20,0.5);
        }
        .ps-betslip-fab-count {
          position: absolute; top: -4px; right: -4px;
          min-width: 20px; height: 20px; border-radius: 10px;
          background: ${colors.danger}; color: #fff; font-size: 11px;
          font-weight: 700; display: flex; align-items: center;
          justify-content: center; padding: 0 5px;
        }
      `,
        }}
      />
    </>
  );
};

// ─── Open Bets Sub-Component ────────────────────────────────

const OpenBetsTab: React.FC<{ oddsFormat: string }> = ({ oddsFormat }) => {
  const { t, ready } = useTranslation("betslip");
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
  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = ready ? t(key) : key;
      return value === key ? fallback : value;
    },
    [ready, t],
  );

  // Fetch open bets on mount
  React.useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const bets = await getUserBets(user.id);
        const active = (bets || []).filter(
          (b) => b.status === "OPENED" || b.status === "PENDING",
        );
        if (cancelled) {
          return;
        }
        setOpenBets(active);

        const offerResults = await Promise.all(
          active.map(async (bet) => {
            try {
              const offer = await getCashoutOffer(bet.betId);
              return offer.available ? [bet.betId, offer] : null;
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) {
          return;
        }
        const offers: Record<string, CashoutOffer> = {};
        for (const result of offerResults) {
          if (result) {
            const [betId, offer] = result;
            offers[betId] = offer;
          }
        }
        setCashoutOffers(offers);
      } catch {
        // API not reachable
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const renderedOpenBets = useMemo(
    () =>
      openBets.map((bet) => {
        const offer = cashoutOffers[bet.betId];
        const msg = cashoutMsg?.betId === bet.betId ? cashoutMsg : null;
        return (
          <div key={bet.betId} className="ps-open-bet-card">
            <div className="ps-open-bet-card-top">
              <span className="ps-open-bet-selection">
                {bet.selection?.selectionName || "Selection"}
              </span>
              <span className="ps-open-bet-odds">
                {bet.selection?.odds
                  ? formatOdds(bet.selection.odds, oddsFormat)
                  : "-"}
              </span>
            </div>
            <div className="ps-open-bet-meta-row">
              <span>
                {tx("STAKE_LABEL", "Stake")} ${bet.stake.toFixed(2)}
              </span>
              <span>
                {tx("RETURN_LABEL", "Return")} ${bet.potentialReturn.toFixed(2)}
              </span>
            </div>
            <div className="ps-open-bet-status-row">
              {bet.status} &middot; {new Date(bet.createdAt).toLocaleString()}
            </div>

            {offer && (
              <button
                onClick={() => handleCashout(bet.betId)}
                disabled={cashingOut === bet.betId}
                className="ps-open-bet-cashout"
              >
                {cashingOut === bet.betId
                  ? tx("CASHING_OUT", "Cashing out...")
                  : `${tx("CASH_OUT", "Cash Out")} $${offer.cashoutValue.toFixed(2)}`}
              </button>
            )}

            {msg && (
              <div
                className={`ps-open-bet-message ${
                  msg.type === "success"
                    ? "ps-open-bet-message-success"
                    : "ps-open-bet-message-error"
                }`}
              >
                {msg.msg}
              </div>
            )}
          </div>
        );
      }),
    [cashingOut, cashoutMsg, cashoutOffers, handleCashout, oddsFormat, openBets, tx],
  );

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
        {tx("LOADING", "Loading...")}
      </div>
    );
  }

  if (openBets.length === 0) {
    return (
      <div className="ps-betslip-empty">
        <div className="ps-betslip-empty-icon">
          <Clock size={48} strokeWidth={1.5} style={{ opacity: 0.4 }} />
        </div>
        <div className="ps-betslip-empty-text">
          {tx("NO_OPEN_BETS", "No open bets at the moment")}
        </div>
      </div>
    );
  }

  return (
    <div className="ps-betslip-list">{renderedOpenBets}</div>
  );
};

export default BetslipPanel;
