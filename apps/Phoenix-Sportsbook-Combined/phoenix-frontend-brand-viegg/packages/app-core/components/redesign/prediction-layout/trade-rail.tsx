import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { CurrentBalanceComponent } from "../../current-balance";
import { showAuthModal, selectIsLoggedIn } from "../../../lib/slices/authSlice";
import { usePlacePredictionOrder, usePredictionOrders } from "../../../services/go-api";
import { buildPredictionActivityPath } from "../../../lib/product-routing";
import {
  clearPredictionSelection,
  selectPredictionRecentMarketIds,
  selectPredictionSelection,
  selectPredictionStake,
  setPredictionStake,
} from "../../../lib/slices/predictionSlice";
import { findPredictionMarket } from "../../../lib/prediction-market-seed";
import {
  PredictionActionBody,
  PredictionActionButton,
  PredictionActionCard,
  PredictionActionCardHeader,
  PredictionActionEyebrow,
  PredictionActionPanel,
  PredictionActionTitle,
  PredictionBalanceStrip,
  PredictionMutedCard,
  PredictionPreviewCard,
  PredictionPreviewGrid,
  PredictionPreviewLabel,
  PredictionPreviewValue,
  PredictionSelectionBadge,
  PredictionSelectionMeta,
  PredictionSelectionTitle,
  PredictionStakeInput,
  PredictionStakeQuickButton,
  PredictionStakeQuickRow,
} from "./index.styled";

type PreviewResponse = {
  shares: number;
  maxPayoutUsd: number;
  maxProfitUsd: number;
  priceCents: number;
};

const quickStakeOptions = [10, 25, 50, 100];

const resolvePredictionTradeError = (error?: {
  payload?: { errors?: Array<{ errorCode?: string }> };
}) => {
  const errorCode = error?.payload?.errors?.[0]?.errorCode;
  switch (errorCode) {
    case "predictionStakeInvalid":
      return "Enter a valid stake before placing the trade.";
    case "predictionMarketNotOpen":
      return "This prediction market is no longer open for new orders.";
    case "marketNotFound":
      return "That prediction market could not be found.";
    case "selectionNotFound":
      return "That prediction outcome is no longer available.";
    default:
      return "Unable to place the prediction trade.";
  }
};

export const PredictionTradeRail: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const selection = useSelector(selectPredictionSelection);
  const stakeUsd = useSelector(selectPredictionStake);
  const recentMarketIds = useSelector(selectPredictionRecentMarketIds);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const placeOrderMutation = usePlacePredictionOrder();
  const { data: ordersData, refetch: refetchOrders } = usePredictionOrders("open", isLoggedIn);

  const selectedMarket = useMemo(
    () => (selection ? findPredictionMarket(selection.marketId) : undefined),
    [selection],
  );
  const selectedOutcome = selectedMarket?.outcomes.find(
    (outcome) => outcome.outcomeId === selection?.outcomeId,
  );
  const recentMarkets = recentMarketIds
    .map((marketId) => findPredictionMarket(marketId))
    .filter(Boolean)
    .slice(0, 3);
  const recentOrders = (ordersData?.orders || []).slice(0, 3);

  useEffect(() => {
    if (!selection || !selectedOutcome) {
      setPreview(null);
      return;
    }

    const stakeValue = Number(stakeUsd || 0);
    if (!Number.isFinite(stakeValue) || stakeValue <= 0) {
      setPreview(null);
      return;
    }

    let isMounted = true;
    setIsLoadingPreview(true);
    fetch("/api/prediction/ticket/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketId: selection.marketId,
        outcomeId: selection.outcomeId,
        stakeUsd: stakeValue,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to preview prediction ticket");
        }
        return response.json();
      })
      .then((payload) => {
        if (isMounted) {
          setPreview(payload);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPreview(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingPreview(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selection, selectedOutcome, stakeUsd]);

  useEffect(() => {
    if (!placeOrderMutation.isSuccess || !placeOrderMutation.data) {
      return;
    }
    message.success("Prediction trade submitted.");
    dispatch(clearPredictionSelection());
    refetchOrders();
  }, [dispatch, placeOrderMutation.isSuccess, placeOrderMutation.data, refetchOrders]);

  useEffect(() => {
    if (!placeOrderMutation.error) {
      return;
    }
    message.error(resolvePredictionTradeError(placeOrderMutation.error as any));
  }, [placeOrderMutation.error]);

  return (
    <PredictionActionPanel>
      <PredictionActionCard>
        <PredictionActionCardHeader>
          <PredictionActionEyebrow>Shared Wallet</PredictionActionEyebrow>
          <PredictionActionTitle>Trade Ticket</PredictionActionTitle>
        </PredictionActionCardHeader>
        <PredictionActionBody>
          <PredictionBalanceStrip>
            <span>Available balance</span>
            <CurrentBalanceComponent />
          </PredictionBalanceStrip>

          {!selection || !selectedMarket || !selectedOutcome ? (
            <PredictionMutedCard>
              Select a market outcome to open the prediction ticket. The ticket stays separate from the sportsbook betslip and keeps its own state as you browse.
            </PredictionMutedCard>
          ) : (
            <>
              <PredictionSelectionBadge>
                {selectedOutcome.label} at {selectedOutcome.priceCents}c
              </PredictionSelectionBadge>
              <PredictionSelectionTitle>
                {selectedMarket.shortTitle}
              </PredictionSelectionTitle>
              <PredictionSelectionMeta>
                {selectedMarket.categoryLabel} · closes {new Date(selectedMarket.closesAt).toLocaleString()}
              </PredictionSelectionMeta>
              <PredictionStakeInput
                type="number"
                min="1"
                step="1"
                value={stakeUsd}
                onChange={(event) => dispatch(setPredictionStake(event.target.value))}
                aria-label="Prediction stake"
                placeholder="Stake in USD"
              />
              <PredictionStakeQuickRow>
                {quickStakeOptions.map((amount) => (
                  <PredictionStakeQuickButton
                    key={amount}
                    type="button"
                    onClick={() => dispatch(setPredictionStake(`${amount}`))}
                  >
                    +${amount}
                  </PredictionStakeQuickButton>
                ))}
                <PredictionStakeQuickButton
                  type="button"
                  onClick={() => dispatch(clearPredictionSelection())}
                >
                  Clear
                </PredictionStakeQuickButton>
              </PredictionStakeQuickRow>
              {preview ? (
                <PredictionPreviewGrid>
                  <PredictionPreviewCard>
                    <PredictionPreviewLabel>Shares</PredictionPreviewLabel>
                    <PredictionPreviewValue>{preview.shares.toFixed(2)}</PredictionPreviewValue>
                  </PredictionPreviewCard>
                  <PredictionPreviewCard>
                    <PredictionPreviewLabel>Max payout</PredictionPreviewLabel>
                    <PredictionPreviewValue>${preview.maxPayoutUsd.toFixed(2)}</PredictionPreviewValue>
                  </PredictionPreviewCard>
                  <PredictionPreviewCard>
                    <PredictionPreviewLabel>Max profit</PredictionPreviewLabel>
                    <PredictionPreviewValue $positive>
                      ${preview.maxProfitUsd.toFixed(2)}
                    </PredictionPreviewValue>
                  </PredictionPreviewCard>
                  <PredictionPreviewCard>
                    <PredictionPreviewLabel>Avg price</PredictionPreviewLabel>
                    <PredictionPreviewValue>{preview.priceCents}c</PredictionPreviewValue>
                  </PredictionPreviewCard>
                </PredictionPreviewGrid>
              ) : (
                <PredictionMutedCard>
                  {isLoadingPreview
                    ? "Refreshing trade preview..."
                    : "Enter a stake to calculate a live trade preview."}
                </PredictionMutedCard>
              )}
              <PredictionActionButton
                type="button"
                onClick={() => {
                  if (!isLoggedIn) {
                    dispatch(showAuthModal());
                    return;
                  }
                  if (!selection || !selectedOutcome) {
                    return;
                  }
                  const stakeValue = Number(stakeUsd || 0);
                  if (!Number.isFinite(stakeValue) || stakeValue <= 0) {
                    message.error("Enter a valid stake before placing the trade.");
                    return;
                  }
                  placeOrderMutation.mutate({
                    marketId: selection.marketId,
                    outcomeId: selection.outcomeId,
                    stakeUsd: stakeValue,
                  });
                }}
                disabled={Boolean(isLoggedIn && (!preview || isLoadingPreview || placeOrderMutation.isLoading))}
              >
                {isLoggedIn
                  ? placeOrderMutation.isLoading
                    ? "Submitting Trade..."
                    : "Place Trade"
                  : "Login to Trade"}
              </PredictionActionButton>
              {isLoggedIn ? (
                <PredictionStakeQuickRow>
                  <PredictionStakeQuickButton
                    type="button"
                    onClick={() => router.push(buildPredictionActivityPath())}
                  >
                    View Activity
                  </PredictionStakeQuickButton>
                </PredictionStakeQuickRow>
              ) : null}
            </>
          )}
        </PredictionActionBody>
      </PredictionActionCard>

      {recentOrders.length > 0 || recentMarkets.length > 0 ? (
        <PredictionActionCard>
          <PredictionActionCardHeader>
            <PredictionActionEyebrow>Module Activity</PredictionActionEyebrow>
            <PredictionActionTitle>
              {recentOrders.length > 0 ? "Open Orders" : "Recently Viewed"}
            </PredictionActionTitle>
          </PredictionActionCardHeader>
          <PredictionActionBody>
            {recentOrders.length > 0
              ? recentOrders.map((order) => (
                  <PredictionMutedCard key={order.orderId}>
                    <strong style={{ color: "#fff" }}>{order.marketTitle}</strong>
                    <br />
                    {order.outcomeLabel} · ${Number(order.stakeUsd || 0).toFixed(2)} · {order.status}
                  </PredictionMutedCard>
                ))
              : recentMarkets.map((market) => (
                  <PredictionMutedCard key={market!.marketId}>
                    <strong style={{ color: "#fff" }}>{market!.shortTitle}</strong>
                    <br />
                    {market!.categoryLabel} · {market!.probabilityPercent}% implied YES
                  </PredictionMutedCard>
                ))}
          </PredictionActionBody>
        </PredictionActionCard>
      ) : null}
    </PredictionActionPanel>
  );
};
