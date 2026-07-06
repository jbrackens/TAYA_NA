import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPredictionOrders,
  placePredictionOrder,
  cancelPredictionOrder,
} from "./prediction-client";
import type {
  GoPredictionOrdersResponse,
  GoPredictionPlaceOrderRequest,
  GoPredictionPlaceOrderResponse,
  GoPredictionCancelOrderResponse,
} from "./prediction-types";
import type { AppError } from "../types";

export const predictionKeys = {
  all: ["prediction"] as const,
  orders: (status?: string) => ["prediction", "orders", status] as const,
};

/** Fetch prediction orders with optional status filter. */
export function usePredictionOrders(status?: string, enabled = true) {
  return useQuery<GoPredictionOrdersResponse, AppError>({
    queryKey: predictionKeys.orders(status),
    queryFn: () => getPredictionOrders(status ? { status } : undefined),
    enabled,
    staleTime: 15 * 1000,
  });
}

/** Place a prediction order. */
export function usePlacePredictionOrder() {
  const queryClient = useQueryClient();
  return useMutation<GoPredictionPlaceOrderResponse, AppError, GoPredictionPlaceOrderRequest>({
    mutationFn: placePredictionOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.all });
    },
  });
}

/** Cancel a prediction order. */
export function useCancelPredictionOrder() {
  const queryClient = useQueryClient();
  return useMutation<GoPredictionCancelOrderResponse, AppError, string>({
    mutationFn: cancelPredictionOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.all });
    },
  });
}
