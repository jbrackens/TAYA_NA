import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { message } from "antd";
import { useTranslation } from "i18n";
import { defaultNamespaces } from "../defaults";
import { markPredictionMarketVisited, selectPredictionSelection, selectPredictionOutcome } from "../../../lib/slices/predictionSlice";
import { selectIsLoggedIn } from "../../../lib/slices/authSlice";
import { usePredictionOrders, useCancelPredictionOrder } from "../../../services/go-api";
import {
  buildPredictionActivityPath,
  buildPredictionCategoryPath,
  buildPredictionMarketPath,
  buildPredictionMarketsPath,
} from "../../../lib/product-routing";
import type { PredictionCategory, PredictionMarket, PredictionOverview } from "../../../lib/prediction-market-seed";
import {
  PredictionActivityActions,
  PredictionActivityCard,
  PredictionActivityGrid,
  PredictionActivityHeader,
  PredictionActivityMeta,
  PredictionActivityTitle,
  PredictionBadge,
  PredictionBadgeRow,
  PredictionCategoryCard,
  PredictionCategoryCopy,
  PredictionCategoryGrid,
  PredictionCategoryTitle,
  PredictionDetailCard,
  PredictionDetailGrid,
  PredictionEmptyState,
  PredictionFilterPill,
  PredictionFilterRow,
  PredictionHero,
  PredictionHeroContent,
  PredictionHeroCopy,
  PredictionHeroEyebrow,
  PredictionHeroMarketCard,
  PredictionHeroSpotlight,
  PredictionHeroStat,
  PredictionHeroStatLabel,
  PredictionHeroStatRow,
  PredictionHeroStatValue,
  PredictionHeroTitle,
  PredictionMarketCard,
  PredictionMarketCardHead,
  PredictionMarketGrid,
  PredictionMarketMetaGrid,
  PredictionMarketSummary,
  PredictionMarketTitleButton,
  PredictionMetaCard,
  PredictionMetaLabel,
  PredictionMetaValue,
  PredictionInlineAction,
  PredictionOutcomeButton,
  PredictionOutcomeChange,
  PredictionOutcomeLabel,
  PredictionOutcomePrice,
  PredictionOutcomeRow,
  PredictionRuleList,
  PredictionSection,
  PredictionSectionCopy,
  PredictionSectionEyebrow,
  PredictionSectionHeader,
  PredictionSectionTitle,
  PredictionSectionTitleBlock,
  PredictionSkeletonCard,
  PredictionSkeletonGrid,
  PredictionSurface,
} from "./index.styled";

type PredictionPageView = "home" | "markets" | "category" | "detail" | "activity";

type PredictionPageProps = {
  view: PredictionPageView;
};

type MarketsResponse = {
  totalCount: number;
  markets: PredictionMarket[];
};

type MarketDetailResponse = {
  market: PredictionMarket;
  relatedMarkets: PredictionMarket[];
};

const MarketCard: React.FC<{
  market: PredictionMarket;
  activeOutcomeId?: string;
  onOpen: () => void;
  onSelectOutcome: (outcomeId: string) => void;
  t: (key: string, options?: Record<string, any>) => string;
}> = ({ market, activeOutcomeId, onOpen, onSelectOutcome, t }) => (
  <PredictionMarketCard>
    <PredictionMarketCardHead>
      <PredictionBadgeRow>
        <PredictionBadge>{market.categoryLabel}</PredictionBadge>
        {market.featured ? <PredictionBadge>{t("FEATURED")}</PredictionBadge> : null}
        {market.live ? <PredictionBadge $live>{t("LIVE")}</PredictionBadge> : null}
      </PredictionBadgeRow>
    </PredictionMarketCardHead>
    <PredictionMarketTitleButton type="button" onClick={onOpen}>
      {market.title}
    </PredictionMarketTitleButton>
    <PredictionMarketSummary>{market.summary}</PredictionMarketSummary>
    <PredictionMarketMetaGrid>
      <PredictionMetaCard>
        <PredictionMetaLabel>{t("VOLUME")}</PredictionMetaLabel>
        <PredictionMetaValue>${market.volumeUsd.toLocaleString()}</PredictionMetaValue>
      </PredictionMetaCard>
      <PredictionMetaCard>
        <PredictionMetaLabel>{t("LIQUIDITY")}</PredictionMetaLabel>
        <PredictionMetaValue>${market.liquidityUsd.toLocaleString()}</PredictionMetaValue>
      </PredictionMetaCard>
      <PredictionMetaCard>
        <PredictionMetaLabel>{t("PARTICIPANTS")}</PredictionMetaLabel>
        <PredictionMetaValue>{market.participants.toLocaleString()}</PredictionMetaValue>
      </PredictionMetaCard>
    </PredictionMarketMetaGrid>
    <PredictionOutcomeRow>
      {market.outcomes.map((outcome) => {
        const isActive = activeOutcomeId === outcome.outcomeId;
        return (
          <PredictionOutcomeButton
            key={outcome.outcomeId}
            type="button"
            $active={isActive}
            onClick={() => onSelectOutcome(outcome.outcomeId)}
          >
            <PredictionOutcomeLabel>{outcome.label}</PredictionOutcomeLabel>
            <PredictionOutcomePrice>{outcome.priceCents}c</PredictionOutcomePrice>
            <PredictionOutcomeChange $positive={outcome.change1d >= 0}>
              {outcome.change1d >= 0 ? "+" : ""}{outcome.change1d.toFixed(1)}% 24h
            </PredictionOutcomeChange>
          </PredictionOutcomeButton>
        );
      })}
    </PredictionOutcomeRow>
  </PredictionMarketCard>
);

const PredictionPage: React.FC<PredictionPageProps> & {
  namespacesRequired?: string[];
} = ({ view }) => {
  const router = useRouter();
  const { t } = useTranslation(["prediction"]);
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const selection = useSelector(selectPredictionSelection);
  const [overview, setOverview] = useState<PredictionOverview | null>(null);
  const [marketsPayload, setMarketsPayload] = useState<MarketsResponse | null>(null);
  const [detailPayload, setDetailPayload] = useState<MarketDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCancelOrderId, setPendingCancelOrderId] = useState<string | null>(null);

  const categoryKey = Array.isArray(router.query.categoryKey)
    ? router.query.categoryKey[0]
    : router.query.categoryKey;
  const marketId = Array.isArray(router.query.marketId)
    ? router.query.marketId[0]
    : router.query.marketId;
  const statusFilter = Array.isArray(router.query.status)
    ? router.query.status[0]
    : router.query.status;

  const { data: ordersData, isLoading: ordersLoading, error: ordersError, refetch: refetchOrders } = usePredictionOrders(statusFilter, isLoggedIn && view === "activity");
  const cancelOrderMutation = useCancelPredictionOrder();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        if (view === "activity") {
          setOverview(null);
          setMarketsPayload(null);
          setDetailPayload(null);
          if (!isLoggedIn) {
            if (isMounted) {
              setIsLoading(false);
            }
            return;
          }
          refetchOrders();
          return;
        }

        if (view === "home") {
          const response = await fetch("/api/prediction/overview");
          if (!response.ok) {
            throw new Error(t("ERROR_LOAD_OVERVIEW"));
          }
          const payload = (await response.json()) as PredictionOverview;
          if (isMounted) {
            setOverview(payload);
            setMarketsPayload(null);
            setDetailPayload(null);
          }
          return;
        }

        if (view === "detail") {
          const response = await fetch(`/api/prediction/markets/${encodeURIComponent(`${marketId || ""}`)}`);
          if (!response.ok) {
            throw new Error(t("ERROR_LOAD_MARKET"));
          }
          const payload = (await response.json()) as MarketDetailResponse;
          if (isMounted) {
            setDetailPayload(payload);
            setOverview(null);
            setMarketsPayload(null);
            dispatch(markPredictionMarketVisited(payload.market.marketId));
          }
          return;
        }

        const query = new URLSearchParams();
        if (view === "category" && categoryKey) {
          query.set("category", categoryKey);
        }
        if (statusFilter) {
          query.set("status", statusFilter);
        }
        const response = await fetch(`/api/prediction/markets${query.toString() ? `?${query.toString()}` : ""}`);
        if (!response.ok) {
          throw new Error(t("ERROR_LOAD_MARKETS"));
        }
        const payload = (await response.json()) as MarketsResponse;
        if (isMounted) {
          setMarketsPayload(payload);
          setOverview(null);
          setDetailPayload(null);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t("ERROR_REQUEST_FAILED"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [view, categoryKey, marketId, statusFilter, dispatch, isLoggedIn, refetchOrders, t]);

  useEffect(() => {
    if (view !== "activity") {
      return;
    }
    if (ordersLoading) {
      setIsLoading(true);
      return;
    }
    if (ordersData) {
      setIsLoading(false);
      return;
    }
    if (ordersError) {
      setError(t("ERROR_LOAD_ACTIVITY"));
      setIsLoading(false);
    }
  }, [view, ordersData, ordersError, ordersLoading, t]);

  useEffect(() => {
    if (!cancelOrderMutation.isSuccess || !cancelOrderMutation.data) {
      return;
    }
    message.success(t("ORDER_CANCELLED_TOAST"));
    setPendingCancelOrderId(null);
    refetchOrders();
  }, [cancelOrderMutation.isSuccess, cancelOrderMutation.data, statusFilter, refetchOrders, t]);

  useEffect(() => {
    if (!cancelOrderMutation.error) {
      return;
    }
    message.error(t("ORDER_CANCEL_ERROR_TOAST"));
    setPendingCancelOrderId(null);
  }, [cancelOrderMutation.error, t]);

  const activeOutcomeId = useMemo(() => {
    if (!selection) {
      return undefined;
    }
    return selection.outcomeId;
  }, [selection]);

  const selectOutcome = (market: PredictionMarket, outcomeId: string) => {
    dispatch(selectPredictionOutcome({ marketId: market.marketId, outcomeId }));
    dispatch(markPredictionMarketVisited(market.marketId));
  };

  const cancelOrder = (orderId: string) => {
    setPendingCancelOrderId(orderId);
    cancelOrderMutation.mutate(orderId);
  };

  const renderLoading = () => (
    <PredictionSkeletonGrid>
      {Array.from({ length: 4 }).map((_, index) => (
        <PredictionSkeletonCard key={index} />
      ))}
    </PredictionSkeletonGrid>
  );

  const renderEmpty = (message: string) => (
    <PredictionEmptyState>{message}</PredictionEmptyState>
  );

  if (error) {
    return <PredictionSurface>{renderEmpty(error)}</PredictionSurface>;
  }

  if (isLoading) {
    return <PredictionSurface>{renderLoading()}</PredictionSurface>;
  }

  if (view === "activity") {
    if (!isLoggedIn) {
      return (
        <PredictionSurface>
          {renderEmpty(t("ACTIVITY_LOGIN_EMPTY"))}
        </PredictionSurface>
      );
    }

    const orders = ordersData?.orders || [];
    return (
      <PredictionSurface>
        <PredictionHero>
          <PredictionHeroContent>
            <PredictionHeroEyebrow>{t("ACTIVITY_EYEBROW")}</PredictionHeroEyebrow>
            <PredictionHeroTitle>{t("ACTIVITY_TITLE")}</PredictionHeroTitle>
            <PredictionHeroCopy>
              {t("ACTIVITY_COPY")}
            </PredictionHeroCopy>
            <PredictionHeroStatRow>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>{t("TOTAL_TRADES")}</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{ordersData?.totalCount || 0}</PredictionHeroStatValue>
              </PredictionHeroStat>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>{t("OPEN_TRADES")}</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{orders.filter((order) => order.status === "open").length}</PredictionHeroStatValue>
              </PredictionHeroStat>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>{t("CANCELLED")}</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{orders.filter((order) => order.status === "cancelled").length}</PredictionHeroStatValue>
              </PredictionHeroStat>
            </PredictionHeroStatRow>
          </PredictionHeroContent>
          <PredictionHeroSpotlight>
            <PredictionHeroMarketCard
              type="button"
              onClick={() => router.push(buildPredictionMarketsPath())}
            >
              <PredictionBadgeRow>
                <PredictionBadge>{t("PREDICTION")}</PredictionBadge>
                <PredictionBadge>{t("OPEN_COUNT", { count: orders.filter((order) => order.status === "open").length })}</PredictionBadge>
              </PredictionBadgeRow>
              <PredictionHeroTitle style={{ fontSize: "28px", marginTop: "12px" }}>
                {t("RETURN_TO_MARKET_BOARD")}
              </PredictionHeroTitle>
              <PredictionHeroCopy>
                {t("RETURN_TO_MARKET_BOARD_COPY")}
              </PredictionHeroCopy>
            </PredictionHeroMarketCard>
          </PredictionHeroSpotlight>
        </PredictionHero>

        <PredictionSection>
          <PredictionSectionHeader>
            <PredictionSectionTitleBlock>
              <PredictionSectionEyebrow>{t("ORDER_LEDGER")}</PredictionSectionEyebrow>
              <PredictionSectionTitle>{t("MY_TRADES")}</PredictionSectionTitle>
              <PredictionSectionCopy>
                {t("MY_TRADES_COPY")}
              </PredictionSectionCopy>
            </PredictionSectionTitleBlock>
            <PredictionFilterRow>
              <PredictionFilterPill
                type="button"
                $active={!statusFilter}
                onClick={() => router.push(buildPredictionActivityPath())}
              >
                {t("ALL")}
              </PredictionFilterPill>
              <PredictionFilterPill
                type="button"
                $active={statusFilter === "open"}
                onClick={() => router.push(`${buildPredictionActivityPath()}?status=open`)}
              >
                {t("OPEN")}
              </PredictionFilterPill>
              <PredictionFilterPill
                type="button"
                $active={statusFilter === "settled"}
                onClick={() => router.push(`${buildPredictionActivityPath()}?status=settled`)}
              >
                {t("SETTLED")}
              </PredictionFilterPill>
              <PredictionFilterPill
                type="button"
                $active={statusFilter === "cancelled"}
                onClick={() => router.push(`${buildPredictionActivityPath()}?status=cancelled`)}
              >
                {t("CANCELLED")}
              </PredictionFilterPill>
            </PredictionFilterRow>
          </PredictionSectionHeader>

          {orders.length === 0 ? (
            renderEmpty(t("NO_TRADES_FILTER"))
          ) : (
            <PredictionActivityGrid>
              {orders.map((order) => (
                <PredictionActivityCard key={order.orderId}>
                  <PredictionActivityHeader>
                    <div>
                      <PredictionBadgeRow>
                        <PredictionBadge>{order.categoryLabel}</PredictionBadge>
                        <PredictionBadge $live={order.status === "open"}>
                          {order.status}
                        </PredictionBadge>
                      </PredictionBadgeRow>
                    </div>
                    <PredictionInlineAction
                      type="button"
                      onClick={() => router.push(buildPredictionMarketPath(order.marketId))}
                    >
                      {t("OPEN_MARKET")}
                    </PredictionInlineAction>
                  </PredictionActivityHeader>
                  <PredictionActivityTitle>{order.marketTitle}</PredictionActivityTitle>
                  <PredictionActivityMeta>
                    {t("ORDER_META", { outcome: order.outcomeLabel, price: order.priceCents })}{" "}
                    {new Date(order.createdAt).toLocaleString()}
                  </PredictionActivityMeta>
                  <PredictionMarketMetaGrid>
                    <PredictionMetaCard>
                      <PredictionMetaLabel>{t("STAKE")}</PredictionMetaLabel>
                      <PredictionMetaValue>${Number(order.stakeUsd || 0).toFixed(2)}</PredictionMetaValue>
                    </PredictionMetaCard>
                    <PredictionMetaCard>
                      <PredictionMetaLabel>{t("SHARES")}</PredictionMetaLabel>
                      <PredictionMetaValue>{Number(order.shares || 0).toFixed(2)}</PredictionMetaValue>
                    </PredictionMetaCard>
                    <PredictionMetaCard>
                      <PredictionMetaLabel>{t("MAX_PAYOUT")}</PredictionMetaLabel>
                      <PredictionMetaValue>${Number(order.maxPayoutUsd || 0).toFixed(2)}</PredictionMetaValue>
                    </PredictionMetaCard>
                    {order.marketStatus ? (
                      <PredictionMetaCard>
                        <PredictionMetaLabel>{t("MARKET_STATUS")}</PredictionMetaLabel>
                        <PredictionMetaValue>{order.marketStatus}</PredictionMetaValue>
                      </PredictionMetaCard>
                    ) : null}
                    {order.winningOutcomeLabel ? (
                      <PredictionMetaCard>
                        <PredictionMetaLabel>{t("RESOLVED_TO")}</PredictionMetaLabel>
                        <PredictionMetaValue>{order.winningOutcomeLabel}</PredictionMetaValue>
                      </PredictionMetaCard>
                    ) : null}
                  </PredictionMarketMetaGrid>
                  {order.settlementReason ||
                  order.settlementActor ||
                  order.previousSettlementStatus ||
                  order.previousSettledAt ||
                  order.previousSettledAmountUsd !== undefined ||
                  order.settledAt ? (
                    <PredictionActivityMeta>
                      {order.settlementReason ? t("SETTLEMENT_REASON", { reason: order.settlementReason }) : null}
                      {order.settlementReason && order.settlementActor ? " · " : null}
                      {order.settlementActor ? t("SETTLED_BY", { actor: order.settlementActor }) : null}
                      {(order.settlementReason || order.settlementActor) && order.previousSettlementStatus ? " · " : null}
                      {order.previousSettlementStatus ? t("PREVIOUS_STATUS", { status: order.previousSettlementStatus }) : null}
                      {(order.settlementReason || order.settlementActor || order.previousSettlementStatus) &&
                      order.previousSettledAt
                        ? " · "
                        : null}
                      {order.previousSettledAt
                        ? t("PREVIOUSLY_SETTLED", { date: new Date(order.previousSettledAt).toLocaleString() })
                        : null}
                      {(order.settlementReason ||
                        order.settlementActor ||
                        order.previousSettlementStatus ||
                        order.previousSettledAt) &&
                      order.previousSettledAmountUsd !== undefined
                        ? " · "
                        : null}
                      {order.previousSettledAmountUsd !== undefined
                        ? t("PREVIOUS_AMOUNT", { amount: Number(order.previousSettledAmountUsd || 0).toFixed(2) })
                        : null}
                      {(order.settlementReason ||
                        order.settlementActor ||
                        order.previousSettlementStatus ||
                        order.previousSettledAt ||
                        order.previousSettledAmountUsd !== undefined) &&
                      order.settledAt
                        ? " · "
                        : null}
                      {order.settledAt ? t("UPDATED_AT", { date: new Date(order.settledAt).toLocaleString() }) : null}
                    </PredictionActivityMeta>
                  ) : null}
                  <PredictionActivityActions>
                    {order.status === "open" ? (
                      <PredictionInlineAction
                        type="button"
                        onClick={() => cancelOrder(order.orderId)}
                        disabled={pendingCancelOrderId === order.orderId}
                      >
                        {pendingCancelOrderId === order.orderId ? t("CANCELLING") : t("CANCEL_ORDER")}
                      </PredictionInlineAction>
                    ) : null}
                    <PredictionInlineAction
                      type="button"
                      onClick={() => router.push(buildPredictionMarketPath(order.marketId))}
                    >
                      {t("TRADE_AGAIN")}
                    </PredictionInlineAction>
                  </PredictionActivityActions>
                </PredictionActivityCard>
              ))}
            </PredictionActivityGrid>
          )}
        </PredictionSection>
      </PredictionSurface>
    );
  }

  if (view === "home" && overview) {
    const spotlight = overview.featuredMarkets[0];
    return (
      <PredictionSurface>
        <PredictionHero>
          <PredictionHeroContent>
            <PredictionHeroEyebrow>{t("HOME_EYEBROW")}</PredictionHeroEyebrow>
            <PredictionHeroTitle>{t("HOME_TITLE")}</PredictionHeroTitle>
            <PredictionHeroCopy>
              {t("HOME_COPY")}
            </PredictionHeroCopy>
            <PredictionHeroStatRow>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>{t("FEATURED")}</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{overview.featuredMarkets.length}</PredictionHeroStatValue>
              </PredictionHeroStat>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>{t("LIVE")}</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{overview.liveMarkets.length}</PredictionHeroStatValue>
              </PredictionHeroStat>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>{t("CATEGORIES")}</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{overview.categories.length}</PredictionHeroStatValue>
              </PredictionHeroStat>
            </PredictionHeroStatRow>
          </PredictionHeroContent>
          {spotlight ? (
            <PredictionHeroSpotlight>
              <PredictionHeroMarketCard type="button" onClick={() => router.push(buildPredictionMarketPath(spotlight.marketId))}>
                <PredictionBadgeRow>
                  <PredictionBadge>{spotlight.categoryLabel}</PredictionBadge>
                  {spotlight.live ? <PredictionBadge $live>{t("LIVE")}</PredictionBadge> : null}
                </PredictionBadgeRow>
                <PredictionHeroTitle style={{ fontSize: "28px", marginTop: "12px" }}>
                  {spotlight.shortTitle}
                </PredictionHeroTitle>
                <PredictionHeroCopy>{spotlight.insight}</PredictionHeroCopy>
                <PredictionHeroStatRow>
                  <PredictionHeroStat>
                    <PredictionHeroStatLabel>{spotlight.heroMetricLabel}</PredictionHeroStatLabel>
                    <PredictionHeroStatValue>{spotlight.heroMetricValue}</PredictionHeroStatValue>
                  </PredictionHeroStat>
                  <PredictionHeroStat>
                    <PredictionHeroStatLabel>{t("VOLUME")}</PredictionHeroStatLabel>
                    <PredictionHeroStatValue>${Math.round(spotlight.volumeUsd / 1000)}k</PredictionHeroStatValue>
                  </PredictionHeroStat>
                </PredictionHeroStatRow>
              </PredictionHeroMarketCard>
            </PredictionHeroSpotlight>
          ) : null}
        </PredictionHero>

        <PredictionSection>
          <PredictionSectionHeader>
            <PredictionSectionTitleBlock>
              <PredictionSectionEyebrow>{t("DISCOVERY")}</PredictionSectionEyebrow>
              <PredictionSectionTitle>{t("BROWSE_BY_CATEGORY")}</PredictionSectionTitle>
              <PredictionSectionCopy>{t("BROWSE_BY_CATEGORY_COPY")}</PredictionSectionCopy>
            </PredictionSectionTitleBlock>
          </PredictionSectionHeader>
          <PredictionCategoryGrid>
            {overview.categories.map((category: PredictionCategory) => (
              <PredictionCategoryCard
                key={category.key}
                type="button"
                $accent={category.accent}
                onClick={() => router.push(buildPredictionCategoryPath(category.key))}
              >
                <PredictionCategoryTitle>{category.label}</PredictionCategoryTitle>
                <PredictionCategoryCopy>{category.description}</PredictionCategoryCopy>
              </PredictionCategoryCard>
            ))}
          </PredictionCategoryGrid>
        </PredictionSection>

        <PredictionSection>
          <PredictionSectionHeader>
            <PredictionSectionTitleBlock>
              <PredictionSectionEyebrow>{t("FEATURED_BOARD")}</PredictionSectionEyebrow>
              <PredictionSectionTitle>{t("FEATURED_AND_LIVE")}</PredictionSectionTitle>
              <PredictionSectionCopy>{t("FEATURED_AND_LIVE_COPY")}</PredictionSectionCopy>
            </PredictionSectionTitleBlock>
          </PredictionSectionHeader>
          <PredictionMarketGrid>
            {[...overview.liveMarkets, ...overview.featuredMarkets.filter((market) => !market.live)].slice(0, 4).map((market) => (
              <MarketCard
                key={market.marketId}
                market={market}
                activeOutcomeId={selection?.marketId === market.marketId ? activeOutcomeId : undefined}
                onOpen={() => router.push(buildPredictionMarketPath(market.marketId))}
                onSelectOutcome={(outcomeId) => selectOutcome(market, outcomeId)}
                t={t}
              />
            ))}
          </PredictionMarketGrid>
        </PredictionSection>
      </PredictionSurface>
    );
  }

  if (view === "detail" && detailPayload) {
    const market = detailPayload.market;
    return (
      <PredictionSurface>
        <PredictionHero>
          <PredictionHeroContent>
            <PredictionHeroEyebrow>{t("CATEGORY_MARKET", { category: market.categoryLabel })}</PredictionHeroEyebrow>
            <PredictionHeroTitle>{market.title}</PredictionHeroTitle>
            <PredictionHeroCopy>{market.insight}</PredictionHeroCopy>
            <PredictionHeroStatRow>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>{market.heroMetricLabel}</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{market.heroMetricValue}</PredictionHeroStatValue>
              </PredictionHeroStat>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>{t("RESOLUTION_SOURCE")}</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{market.resolutionSource}</PredictionHeroStatValue>
              </PredictionHeroStat>
            </PredictionHeroStatRow>
          </PredictionHeroContent>
          <PredictionHeroSpotlight>
            <PredictionHeroMarketCard type="button" onClick={() => router.push(buildPredictionMarketsPath())}>
              <PredictionHeroEyebrow>{t("MARKET_NAVIGATION")}</PredictionHeroEyebrow>
              <PredictionHeroCopy>{t("MARKET_NAVIGATION_COPY")}</PredictionHeroCopy>
            </PredictionHeroMarketCard>
          </PredictionHeroSpotlight>
        </PredictionHero>

        <PredictionDetailGrid>
          <PredictionDetailCard>
            <PredictionSectionTitleBlock>
              <PredictionSectionEyebrow>{t("TRADE_BOARD")}</PredictionSectionEyebrow>
              <PredictionSectionTitle>{t("CHOOSE_OUTCOME")}</PredictionSectionTitle>
            </PredictionSectionTitleBlock>
            <PredictionOutcomeRow>
              {market.outcomes.map((outcome) => (
                <PredictionOutcomeButton
                  key={outcome.outcomeId}
                  type="button"
                  $active={selection?.marketId === market.marketId && selection.outcomeId === outcome.outcomeId}
                  onClick={() => selectOutcome(market, outcome.outcomeId)}
                >
                  <PredictionOutcomeLabel>{outcome.label}</PredictionOutcomeLabel>
                  <PredictionOutcomePrice>{outcome.priceCents}c</PredictionOutcomePrice>
                  <PredictionOutcomeChange $positive={outcome.change1d >= 0}>
                    {outcome.change1d >= 0 ? "+" : ""}{outcome.change1d.toFixed(1)}% 24h
                  </PredictionOutcomeChange>
                </PredictionOutcomeButton>
              ))}
            </PredictionOutcomeRow>
            <PredictionMarketSummary>{market.summary}</PredictionMarketSummary>
            <PredictionRuleList>
              {market.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </PredictionRuleList>
          </PredictionDetailCard>
          <PredictionDetailCard>
            <PredictionSectionTitleBlock>
              <PredictionSectionEyebrow>{t("RELATED_MARKETS")}</PredictionSectionEyebrow>
              <PredictionSectionTitle>{t("KEEP_EXPLORING")}</PredictionSectionTitle>
            </PredictionSectionTitleBlock>
            {detailPayload.relatedMarkets.length ? (
              detailPayload.relatedMarkets.map((relatedMarket) => (
                <MarketCard
                  key={relatedMarket.marketId}
                  market={relatedMarket}
                  activeOutcomeId={selection?.marketId === relatedMarket.marketId ? activeOutcomeId : undefined}
                  onOpen={() => router.push(buildPredictionMarketPath(relatedMarket.marketId))}
                  onSelectOutcome={(outcomeId) => selectOutcome(relatedMarket, outcomeId)}
                  t={t}
                />
              ))
            ) : (
              renderEmpty(t("NO_RELATED_MARKETS"))
            )}
          </PredictionDetailCard>
        </PredictionDetailGrid>
      </PredictionSurface>
    );
  }

  const listMarkets = marketsPayload?.markets || [];
  const listTitle =
    view === "category"
      ? t("CATEGORY_TITLE", { category: categoryKey })
      : statusFilter === "live"
      ? t("LIVE_MARKETS_TITLE")
      : t("ALL_MARKETS_TITLE");

  return (
    <PredictionSurface>
      <PredictionSection>
        <PredictionSectionHeader>
          <PredictionSectionTitleBlock>
            <PredictionSectionEyebrow>{t("MARKET_BOARD")}</PredictionSectionEyebrow>
            <PredictionSectionTitle>{listTitle}</PredictionSectionTitle>
            <PredictionSectionCopy>{t("MARKET_BOARD_COPY")}</PredictionSectionCopy>
          </PredictionSectionTitleBlock>
          <PredictionFilterRow>
            <PredictionFilterPill type="button" $active={!statusFilter} onClick={() => router.push(view === "category" && categoryKey ? buildPredictionCategoryPath(categoryKey) : buildPredictionMarketsPath())}>
              {t("ALL")}
            </PredictionFilterPill>
            <PredictionFilterPill type="button" $active={statusFilter === "live"} onClick={() => router.push(`${view === "category" && categoryKey ? buildPredictionCategoryPath(categoryKey) : buildPredictionMarketsPath()}?status=live`)}>
              {t("LIVE")}
            </PredictionFilterPill>
            <PredictionFilterPill type="button" $active={statusFilter === "open"} onClick={() => router.push(`${view === "category" && categoryKey ? buildPredictionCategoryPath(categoryKey) : buildPredictionMarketsPath()}?status=open`)}>
              {t("OPEN")}
            </PredictionFilterPill>
          </PredictionFilterRow>
        </PredictionSectionHeader>
        {listMarkets.length ? (
          <PredictionMarketGrid>
            {listMarkets.map((market) => (
              <MarketCard
                key={market.marketId}
                market={market}
                activeOutcomeId={selection?.marketId === market.marketId ? activeOutcomeId : undefined}
                onOpen={() => router.push(buildPredictionMarketPath(market.marketId))}
                onSelectOutcome={(outcomeId) => selectOutcome(market, outcomeId)}
                t={t}
              />
            ))}
          </PredictionMarketGrid>
        ) : (
          renderEmpty(t("NO_MARKETS_FILTER"))
        )}
      </PredictionSection>
    </PredictionSurface>
  );
};

PredictionPage.namespacesRequired = [...defaultNamespaces, "prediction"];

export default PredictionPage;
