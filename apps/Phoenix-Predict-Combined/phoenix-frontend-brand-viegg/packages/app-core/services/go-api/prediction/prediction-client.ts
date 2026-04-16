import { goApi } from "../client";
import type {
  GoPredictionOrdersResponse,
  GoPredictionPlaceOrderRequest,
  GoPredictionPlaceOrderResponse,
  GoPredictionCancelOrderResponse,
} from "./prediction-types";

/** Fetch prediction orders. */
export async function getPredictionOrders(
  params?: { status?: string },
): Promise<GoPredictionOrdersResponse> {
  const { data } = await goApi.get<GoPredictionOrdersResponse>(
    "/api/v1/prediction/orders",
    { params },
  );
  return data;
}

/** Place a prediction order. */
export async function placePredictionOrder(
  request: GoPredictionPlaceOrderRequest,
): Promise<GoPredictionPlaceOrderResponse> {
  const { data } = await goApi.post<GoPredictionPlaceOrderResponse>(
    "/api/v1/prediction/orders",
    request,
  );
  return data;
}

/** Cancel a prediction order. */
export async function cancelPredictionOrder(
  orderId: string,
): Promise<GoPredictionCancelOrderResponse> {
  const { data } = await goApi.post<GoPredictionCancelOrderResponse>(
    `/api/v1/prediction/orders/${orderId}/cancel`,
  );
  return data;
}
