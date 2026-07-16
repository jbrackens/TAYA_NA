"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  OrderPreview,
  OrderSide,
  PlaceOrderRequest,
  PlaceOrderResponse,
  Position,
  PredictionMarket,
} from "@taptrade-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import { useAuth } from "../../hooks/useAuth";
import { getBalance } from "../../lib/api/wallet-client";
import { logger } from "../../lib/logger";
import {
  orderSignature,
  resolveIdempotencyKey,
  type PendingIdempotency,
} from "../../lib/orderIdempotency";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
  selectCurrentBalance,
  setCurrentBalance,
} from "../../lib/store/pointBalanceSlice";
import { TradeTicket, type TradeTicketSubmitOptions } from "./TradeTicket";

const api = createPredictionClient();

interface ConnectedTradeTicketProps {
  market: PredictionMarket;
  defaultSide?: OrderSide;
  defaultAmount?: number;
  onMarketUpdate?: (market: PredictionMarket) => void;
}

export function ConnectedTradeTicket({
  market,
  defaultSide = "yes",
  defaultAmount = 100,
  onMarketUpdate,
}: ConnectedTradeTicketProps) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const balance = useAppSelector(selectCurrentBalance);
  const dispatch = useAppDispatch();
  const [positions, setPositions] = useState<Position[]>([]);
  const pendingIdemRef = useRef<PendingIdempotency | null>(null);

  const loadPositions = useCallback(async () => {
    if (!isAuthenticated) {
      setPositions([]);
      return;
    }
    try {
      const rows = await api.getPositions();
      setPositions(rows.filter((position) => position.marketId === market.id));
    } catch (error: unknown) {
      logger.warn("ConnectedTradeTicket", "positions refresh failed", error);
      setPositions([]);
    }
  }, [isAuthenticated, market.id]);

  useEffect(() => {
    void loadPositions();
  }, [loadPositions]);

  const availableYesShares = useMemo(
    () =>
      positions
        .filter((position) => position.side === "yes")
        .reduce(
          (sum, position) =>
            sum +
            Math.max(0, position.quantity - (position.reservedQuantity || 0)),
          0,
        ),
    [positions],
  );
  const availableNoShares = useMemo(
    () =>
      positions
        .filter((position) => position.side === "no")
        .reduce(
          (sum, position) =>
            sum +
            Math.max(0, position.quantity - (position.reservedQuantity || 0)),
          0,
        ),
    [positions],
  );

  const handlePreview = useCallback(
    async (
      side: OrderSide,
      quantity: number,
      options?: TradeTicketSubmitOptions,
    ): Promise<OrderPreview | null> => {
      if (!isAuthenticated || authLoading) return null;
      try {
        return await api.previewOrder({
          marketId: market.id,
          side,
          action: options?.action ?? "buy",
          orderType: options?.orderType ?? "market",
          quantity,
          pricePoints: options?.pricePoints,
          timeInForce: options?.timeInForce,
          postOnly: options?.postOnly,
          notionalCapPoints: options?.notionalCapPoints,
        });
      } catch (error: unknown) {
        logger.warn("ConnectedTradeTicket", "order preview failed", error);
        return null;
      }
    },
    [authLoading, isAuthenticated, market.id],
  );

  const handleSubmit = useCallback(
    async (
      side: OrderSide,
      quantity: number,
      options?: TradeTicketSubmitOptions,
    ): Promise<PlaceOrderResponse> => {
      const request: PlaceOrderRequest = {
        marketId: market.id,
        side,
        action: options?.action ?? "buy",
        orderType: options?.orderType ?? "market",
        quantity,
        pricePoints: options?.pricePoints,
        timeInForce: options?.timeInForce,
        postOnly: options?.postOnly,
        notionalCapPoints: options?.notionalCapPoints,
      };
      const signature = orderSignature(request);
      const { key, pending } = resolveIdempotencyKey(
        pendingIdemRef.current,
        signature,
        () => crypto.randomUUID(),
      );
      pendingIdemRef.current = pending;
      const response = await api.placeOrder({
        ...request,
        idempotencyKey: key,
      });
      pendingIdemRef.current = null;

      const refreshes: Promise<unknown>[] = [
        api
          .getMarket(market.ticker)
          .then((updatedMarket) => onMarketUpdate?.(updatedMarket)),
        loadPositions(),
      ];
      if (user?.id) {
        refreshes.push(
          getBalance(user.id).then((nextBalance) => {
            dispatch(setCurrentBalance(nextBalance.availableBalance));
          }),
        );
      }
      const results = await Promise.allSettled(refreshes);
      if (results.some((result) => result.status === "rejected")) {
        logger.warn(
          "ConnectedTradeTicket",
          "one or more post-trade refreshes failed",
          results,
        );
      }
      return response;
    },
    [
      dispatch,
      loadPositions,
      market.id,
      market.ticker,
      onMarketUpdate,
      user?.id,
    ],
  );

  return (
    <TradeTicket
      key={market.id}
      market={market}
      balance={
        isAuthenticated && typeof balance === "number" ? balance : undefined
      }
      defaultSide={defaultSide}
      defaultAmount={defaultAmount}
      isAuthenticated={isAuthenticated}
      authLoading={authLoading}
      availableYesShares={availableYesShares}
      availableNoShares={availableNoShares}
      onPreview={isAuthenticated && !authLoading ? handlePreview : undefined}
      onSubmit={handleSubmit}
      variant="terminal"
    />
  );
}
