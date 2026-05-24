import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "i18n";
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

const resolvePredictionTradeErrorKey = (error?: {
  payload?: { errors?: Array<{ errorCode?: string }> };
}) => {
  const errorCode = error?.payload?.errors?.[0]?.errorCode;
  switch (errorCode) {
    case "predictionStakeInvalid":
      return "TRADE_ERROR_INVALID_STAKE";
    case "predictionMarketNotOpen":
      return "TRADE_ERROR_MARKET_CLOSED";
    case "marketNotFound":
      return "TRADE_ERROR_MARKET_NOT_FOUND";
    case "selectionNotFound":
      return "TRADE_ERROR_SELECTION_NOT_FOUND";
    default:
      return "TRADE_ERROR_GENERIC";
  }
};

export const PredictionTradeRail: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation(["prediction"]);
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
          throw new Error(t("TRADE_ERROR_PREVIEW"));
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
    message.success(t("TRADE_SUBMITTED_TOAST"));
    dispatch(clearPredictionSelection());
    refetchOrders();
  }, [dispatch, placeOrderMutation.isSuccess, placeOrderMutation.data, refetchOrders, t]);

  useEffect(() => {
    if (!placeOrderMutation.error) {
      return;
    }
    message.error(t(resolvePredictionTradeErrorKey(placeOrderMutation.error as any)));
  }, [placeOrderMutation.error, t]);

  return (
    <PredictionActionPanel>
      <PredictionActionCard>
        <PredictionActionCardHeader>
          <PredictionActionEyebrow>{t("SHARED_WALLET")}</PredictionActionEyebrow>
          <PredictionActionTitle>{t("TRADE_TICKET")}</PredictionActionTitle>
        </PredictionActionCardHeader>
        <PredictionActionBody>
          <PredictionBalanceStrip>
            <span>{t("AVAILABLE_BALANCE")}</span>
            <CurrentBalanceComponent />
          </PredictionBalanceStrip>

          {!selection || !selectedMarket || !selectedOutcome ? (
            <PredictionMutedCard>
              {t("TRADE_EMPTY")}
            </PredictionMutedCard>
          ) : (
            <>
              <PredictionSelectionBadge>
                {t("OUTCOME_AT_PRICE", { outcome: selectedOutcome.label, price: selectedOutcome.priceCents })}
              </PredictionSelectionBadge>
              <PredictionSelectionTitle>
                {selectedMarket.shortTitle}
              </PredictionSelectionTitle>
              <PredictionSelectionMeta>
                {t("MARKET_CLOSES_AT", { category: selectedMarket.categoryLabel, date: new Date(selectedMarket.closesAt).toLocaleString() })}
              </PredictionSelectionMeta>
              <PredictionStakeInput
                type="number"
                min="1"
                step="1"
                value={stakeUsd}
                onChange={(event) => dispatch(setPredictionStake(event.target.value))}
                aria-label={t("PREDICTION_STAKE")}
                placeholder={t("STAKE_IN_USD")}
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
                  {t("CLEAR")}
                </PredictionStakeQuickButton>
              </PredictionStakeQuickRow>
              {preview ? (
                <PredictionPreviewGrid>
                  <PredictionPreviewCard>
                    <PredictionPreviewLabel>{t("SHARES")}</PredictionPreviewLabel>
                    <PredictionPreviewValue>{preview.shares.toFixed(2)}</PredictionPreviewValue>
                  </PredictionPreviewCard>
                  <PredictionPreviewCard>
                    <PredictionPreviewLabel>{t("MAX_PAYOUT")}</PredictionPreviewLabel>
                    <PredictionPreviewValue>${preview.maxPayoutUsd.toFixed(2)}</PredictionPreviewValue>
                  </PredictionPreviewCard>
                  <PredictionPreviewCard>
                    <PredictionPreviewLabel>{t("MAX_PROFIT")}</PredictionPreviewLabel>
                    <PredictionPreviewValue $positive>
                      ${preview.maxProfitUsd.toFixed(2)}
                    </PredictionPreviewValue>
                  </PredictionPreviewCard>
                  <PredictionPreviewCard>
                    <PredictionPreviewLabel>{t("AVG_PRICE")}</PredictionPreviewLabel>
                    <PredictionPreviewValue>{preview.priceCents}c</PredictionPreviewValue>
                  </PredictionPreviewCard>
                </PredictionPreviewGrid>
              ) : (
                <PredictionMutedCard>
                  {isLoadingPreview
                    ? t("REFRESHING_TRADE_PREVIEW")
                    : t("ENTER_STAKE_PREVIEW")}
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
                    message.error(t("TRADE_ERROR_INVALID_STAKE"));
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
                    ? t("SUBMITTING_TRADE")
                    : t("PLACE_TRADE")
                  : t("LOGIN_TO_TRADE")}
              </PredictionActionButton>
              {isLoggedIn ? (
                <PredictionStakeQuickRow>
                  <PredictionStakeQuickButton
                    type="button"
                    onClick={() => router.push(buildPredictionActivityPath())}
                  >
                    {t("VIEW_ACTIVITY")}
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
            <PredictionActionEyebrow>{t("MODULE_ACTIVITY")}</PredictionActionEyebrow>
            <PredictionActionTitle>
              {recentOrders.length > 0 ? t("OPEN_ORDERS") : t("RECENTLY_VIEWED")}
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
                    {t("RECENT_MARKET_META", { category: market!.categoryLabel, probability: market!.probabilityPercent })}
                  </PredictionMutedCard>
                ))}
          </PredictionActionBody>
        </PredictionActionCard>
      ) : null}
    </PredictionActionPanel>
  );
};
