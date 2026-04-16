import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { message } from "antd";
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
}> = ({ market, activeOutcomeId, onOpen, onSelectOutcome }) => (
  <PredictionMarketCard>
    <PredictionMarketCardHead>
      <PredictionBadgeRow>
        <PredictionBadge>{market.categoryLabel}</PredictionBadge>
        {market.featured ? <PredictionBadge>Featured</PredictionBadge> : null}
        {market.live ? <PredictionBadge $live>Live</PredictionBadge> : null}
      </PredictionBadgeRow>
    </PredictionMarketCardHead>
    <PredictionMarketTitleButton type="button" onClick={onOpen}>
      {market.title}
    </PredictionMarketTitleButton>
    <PredictionMarketSummary>{market.summary}</PredictionMarketSummary>
    <PredictionMarketMetaGrid>
      <PredictionMetaCard>
        <PredictionMetaLabel>Volume</PredictionMetaLabel>
        <PredictionMetaValue>${market.volumeUsd.toLocaleString()}</PredictionMetaValue>
      </PredictionMetaCard>
      <PredictionMetaCard>
        <PredictionMetaLabel>Liquidity</PredictionMetaLabel>
        <PredictionMetaValue>${market.liquidityUsd.toLocaleString()}</PredictionMetaValue>
      </PredictionMetaCard>
      <PredictionMetaCard>
        <PredictionMetaLabel>Participants</PredictionMetaLabel>
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
            throw new Error("Failed to load prediction overview");
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
            throw new Error("Failed to load prediction market");
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
          throw new Error("Failed to load prediction markets");
        }
        const payload = (await response.json()) as MarketsResponse;
        if (isMounted) {
          setMarketsPayload(payload);
          setOverview(null);
          setDetailPayload(null);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : "Prediction request failed");
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
  }, [view, categoryKey, marketId, statusFilter, dispatch, isLoggedIn, refetchOrders]);

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
      setError("Failed to load prediction activity");
      setIsLoading(false);
    }
  }, [view, ordersData, ordersError, ordersLoading]);

  useEffect(() => {
    if (!cancelOrderMutation.isSuccess || !cancelOrderMutation.data) {
      return;
    }
    message.success("Prediction order cancelled.");
    setPendingCancelOrderId(null);
    refetchOrders();
  }, [cancelOrderMutation.isSuccess, cancelOrderMutation.data, statusFilter, refetchOrders]);

  useEffect(() => {
    if (!cancelOrderMutation.error) {
      return;
    }
    message.error("Unable to cancel that prediction order.");
    setPendingCancelOrderId(null);
  }, [cancelOrderMutation.error]);

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
          {renderEmpty("Log in to view your prediction trades and manage open orders.")}
        </PredictionSurface>
      );
    }

    const orders = ordersData?.orders || [];
    return (
      <PredictionSurface>
        <PredictionHero>
          <PredictionHeroContent>
            <PredictionHeroEyebrow>Prediction Activity</PredictionHeroEyebrow>
            <PredictionHeroTitle>Track prediction orders as a separate product ledger.</PredictionHeroTitle>
            <PredictionHeroCopy>
              Sportsbook bets and prediction trades are intentionally distinct. This activity view keeps prediction-native orders visible inside the module without pushing users into sportsbook-first account flows.
            </PredictionHeroCopy>
            <PredictionHeroStatRow>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>Total trades</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{ordersData?.totalCount || 0}</PredictionHeroStatValue>
              </PredictionHeroStat>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>Open trades</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{orders.filter((order) => order.status === "open").length}</PredictionHeroStatValue>
              </PredictionHeroStat>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>Cancelled</PredictionHeroStatLabel>
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
                <PredictionBadge>Prediction</PredictionBadge>
                <PredictionBadge>{orders.filter((order) => order.status === "open").length} Open</PredictionBadge>
              </PredictionBadgeRow>
              <PredictionHeroTitle style={{ fontSize: "28px", marginTop: "12px" }}>
                Return to the market board
              </PredictionHeroTitle>
              <PredictionHeroCopy>
                Review more markets, price fresh outcomes, and place the next trade without leaving the prediction module.
              </PredictionHeroCopy>
            </PredictionHeroMarketCard>
          </PredictionHeroSpotlight>
        </PredictionHero>

        <PredictionSection>
          <PredictionSectionHeader>
            <PredictionSectionTitleBlock>
              <PredictionSectionEyebrow>Order Ledger</PredictionSectionEyebrow>
              <PredictionSectionTitle>My Trades</PredictionSectionTitle>
              <PredictionSectionCopy>
                Open orders stay actionable here; cancelled orders remain visible for product-aware auditability.
              </PredictionSectionCopy>
            </PredictionSectionTitleBlock>
            <PredictionFilterRow>
              <PredictionFilterPill
                type="button"
                $active={!statusFilter}
                onClick={() => router.push(buildPredictionActivityPath())}
              >
                All
              </PredictionFilterPill>
              <PredictionFilterPill
                type="button"
                $active={statusFilter === "open"}
                onClick={() => router.push(`${buildPredictionActivityPath()}?status=open`)}
              >
                Open
              </PredictionFilterPill>
              <PredictionFilterPill
                type="button"
                $active={statusFilter === "settled"}
                onClick={() => router.push(`${buildPredictionActivityPath()}?status=settled`)}
              >
                Settled
              </PredictionFilterPill>
              <PredictionFilterPill
                type="button"
                $active={statusFilter === "cancelled"}
                onClick={() => router.push(`${buildPredictionActivityPath()}?status=cancelled`)}
              >
                Cancelled
              </PredictionFilterPill>
            </PredictionFilterRow>
          </PredictionSectionHeader>

          {orders.length === 0 ? (
            renderEmpty("No prediction trades match the current filter.")
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
                      Open Market
                    </PredictionInlineAction>
                  </PredictionActivityHeader>
                  <PredictionActivityTitle>{order.marketTitle}</PredictionActivityTitle>
                  <PredictionActivityMeta>
                    {order.outcomeLabel} at {order.priceCents}c · placed{" "}
                    {new Date(order.createdAt).toLocaleString()}
                  </PredictionActivityMeta>
                  <PredictionMarketMetaGrid>
                    <PredictionMetaCard>
                      <PredictionMetaLabel>Stake</PredictionMetaLabel>
                      <PredictionMetaValue>${Number(order.stakeUsd || 0).toFixed(2)}</PredictionMetaValue>
                    </PredictionMetaCard>
                    <PredictionMetaCard>
                      <PredictionMetaLabel>Shares</PredictionMetaLabel>
                      <PredictionMetaValue>{Number(order.shares || 0).toFixed(2)}</PredictionMetaValue>
                    </PredictionMetaCard>
                    <PredictionMetaCard>
                      <PredictionMetaLabel>Max payout</PredictionMetaLabel>
                      <PredictionMetaValue>${Number(order.maxPayoutUsd || 0).toFixed(2)}</PredictionMetaValue>
                    </PredictionMetaCard>
                    {order.marketStatus ? (
                      <PredictionMetaCard>
                        <PredictionMetaLabel>Market status</PredictionMetaLabel>
                        <PredictionMetaValue>{order.marketStatus}</PredictionMetaValue>
                      </PredictionMetaCard>
                    ) : null}
                    {order.winningOutcomeLabel ? (
                      <PredictionMetaCard>
                        <PredictionMetaLabel>Resolved to</PredictionMetaLabel>
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
                      {order.settlementReason ? `Reason: ${order.settlementReason}` : null}
                      {order.settlementReason && order.settlementActor ? " · " : null}
                      {order.settlementActor ? `Settled by ${order.settlementActor}` : null}
                      {(order.settlementReason || order.settlementActor) && order.previousSettlementStatus ? " · " : null}
                      {order.previousSettlementStatus ? `Previous status ${order.previousSettlementStatus}` : null}
                      {(order.settlementReason || order.settlementActor || order.previousSettlementStatus) &&
                      order.previousSettledAt
                        ? " · "
                        : null}
                      {order.previousSettledAt
                        ? `Previously settled ${new Date(order.previousSettledAt).toLocaleString()}`
                        : null}
                      {(order.settlementReason ||
                        order.settlementActor ||
                        order.previousSettlementStatus ||
                        order.previousSettledAt) &&
                      order.previousSettledAmountUsd !== undefined
                        ? " · "
                        : null}
                      {order.previousSettledAmountUsd !== undefined
                        ? `Previous amount $${Number(order.previousSettledAmountUsd || 0).toFixed(2)}`
                        : null}
                      {(order.settlementReason ||
                        order.settlementActor ||
                        order.previousSettlementStatus ||
                        order.previousSettledAt ||
                        order.previousSettledAmountUsd !== undefined) &&
                      order.settledAt
                        ? " · "
                        : null}
                      {order.settledAt ? `Updated ${new Date(order.settledAt).toLocaleString()}` : null}
                    </PredictionActivityMeta>
                  ) : null}
                  <PredictionActivityActions>
                    {order.status === "open" ? (
                      <PredictionInlineAction
                        type="button"
                        onClick={() => cancelOrder(order.orderId)}
                        disabled={pendingCancelOrderId === order.orderId}
                      >
                        {pendingCancelOrderId === order.orderId ? "Cancelling..." : "Cancel Order"}
                      </PredictionInlineAction>
                    ) : null}
                    <PredictionInlineAction
                      type="button"
                      onClick={() => router.push(buildPredictionMarketPath(order.marketId))}
                    >
                      Trade Again
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
            <PredictionHeroEyebrow>Prediction Markets</PredictionHeroEyebrow>
            <PredictionHeroTitle>Price the next headline, not just the next match.</PredictionHeroTitle>
            <PredictionHeroCopy>
              Prediction is a separate player module inside Phoenix. Browse live event-driven markets, move through categories, and stage a ticket without dropping back into sportsbook assumptions.
            </PredictionHeroCopy>
            <PredictionHeroStatRow>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>Featured</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{overview.featuredMarkets.length}</PredictionHeroStatValue>
              </PredictionHeroStat>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>Live</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{overview.liveMarkets.length}</PredictionHeroStatValue>
              </PredictionHeroStat>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>Categories</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{overview.categories.length}</PredictionHeroStatValue>
              </PredictionHeroStat>
            </PredictionHeroStatRow>
          </PredictionHeroContent>
          {spotlight ? (
            <PredictionHeroSpotlight>
              <PredictionHeroMarketCard type="button" onClick={() => router.push(buildPredictionMarketPath(spotlight.marketId))}>
                <PredictionBadgeRow>
                  <PredictionBadge>{spotlight.categoryLabel}</PredictionBadge>
                  {spotlight.live ? <PredictionBadge $live>Live</PredictionBadge> : null}
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
                    <PredictionHeroStatLabel>Volume</PredictionHeroStatLabel>
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
              <PredictionSectionEyebrow>Discovery</PredictionSectionEyebrow>
              <PredictionSectionTitle>Browse by Category</PredictionSectionTitle>
              <PredictionSectionCopy>Structure mirrors a dedicated prediction product, not a sportsbook left-column taxonomy.</PredictionSectionCopy>
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
              <PredictionSectionEyebrow>Featured Board</PredictionSectionEyebrow>
              <PredictionSectionTitle>Featured and Live</PredictionSectionTitle>
              <PredictionSectionCopy>High-signal cards surface marquee markets first, with live candidates pulled to the top.</PredictionSectionCopy>
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
            <PredictionHeroEyebrow>{market.categoryLabel} Market</PredictionHeroEyebrow>
            <PredictionHeroTitle>{market.title}</PredictionHeroTitle>
            <PredictionHeroCopy>{market.insight}</PredictionHeroCopy>
            <PredictionHeroStatRow>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>{market.heroMetricLabel}</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{market.heroMetricValue}</PredictionHeroStatValue>
              </PredictionHeroStat>
              <PredictionHeroStat>
                <PredictionHeroStatLabel>Resolution source</PredictionHeroStatLabel>
                <PredictionHeroStatValue>{market.resolutionSource}</PredictionHeroStatValue>
              </PredictionHeroStat>
            </PredictionHeroStatRow>
          </PredictionHeroContent>
          <PredictionHeroSpotlight>
            <PredictionHeroMarketCard type="button" onClick={() => router.push(buildPredictionMarketsPath())}>
              <PredictionHeroEyebrow>Market Navigation</PredictionHeroEyebrow>
              <PredictionHeroCopy>Return to the board or move through related markets without falling back to sportsbook routing patterns.</PredictionHeroCopy>
            </PredictionHeroMarketCard>
          </PredictionHeroSpotlight>
        </PredictionHero>

        <PredictionDetailGrid>
          <PredictionDetailCard>
            <PredictionSectionTitleBlock>
              <PredictionSectionEyebrow>Trade Board</PredictionSectionEyebrow>
              <PredictionSectionTitle>Choose an Outcome</PredictionSectionTitle>
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
              <PredictionSectionEyebrow>Related Markets</PredictionSectionEyebrow>
              <PredictionSectionTitle>Keep Exploring</PredictionSectionTitle>
            </PredictionSectionTitleBlock>
            {detailPayload.relatedMarkets.length ? (
              detailPayload.relatedMarkets.map((relatedMarket) => (
                <MarketCard
                  key={relatedMarket.marketId}
                  market={relatedMarket}
                  activeOutcomeId={selection?.marketId === relatedMarket.marketId ? activeOutcomeId : undefined}
                  onOpen={() => router.push(buildPredictionMarketPath(relatedMarket.marketId))}
                  onSelectOutcome={(outcomeId) => selectOutcome(relatedMarket, outcomeId)}
                />
              ))
            ) : (
              renderEmpty("No related markets are currently available.")
            )}
          </PredictionDetailCard>
        </PredictionDetailGrid>
      </PredictionSurface>
    );
  }

  const listMarkets = marketsPayload?.markets || [];
  const listTitle =
    view === "category"
      ? `Category: ${categoryKey}`
      : statusFilter === "live"
      ? "Live prediction markets"
      : "All prediction markets";

  return (
    <PredictionSurface>
      <PredictionSection>
        <PredictionSectionHeader>
          <PredictionSectionTitleBlock>
            <PredictionSectionEyebrow>Market Board</PredictionSectionEyebrow>
            <PredictionSectionTitle>{listTitle}</PredictionSectionTitle>
            <PredictionSectionCopy>Dedicated browse surface with category-led discovery and contract-first card density.</PredictionSectionCopy>
          </PredictionSectionTitleBlock>
          <PredictionFilterRow>
            <PredictionFilterPill type="button" $active={!statusFilter} onClick={() => router.push(view === "category" && categoryKey ? buildPredictionCategoryPath(categoryKey) : buildPredictionMarketsPath())}>
              All
            </PredictionFilterPill>
            <PredictionFilterPill type="button" $active={statusFilter === "live"} onClick={() => router.push(`${view === "category" && categoryKey ? buildPredictionCategoryPath(categoryKey) : buildPredictionMarketsPath()}?status=live`)}>
              Live
            </PredictionFilterPill>
            <PredictionFilterPill type="button" $active={statusFilter === "open"} onClick={() => router.push(`${view === "category" && categoryKey ? buildPredictionCategoryPath(categoryKey) : buildPredictionMarketsPath()}?status=open`)}>
              Open
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
              />
            ))}
          </PredictionMarketGrid>
        ) : (
          renderEmpty("No prediction markets match the current filter.")
        )}
      </PredictionSection>
    </PredictionSurface>
  );
};

PredictionPage.namespacesRequired = defaultNamespaces;

export default PredictionPage;
