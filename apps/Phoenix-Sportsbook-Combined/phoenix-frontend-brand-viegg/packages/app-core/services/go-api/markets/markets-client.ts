import { goApi } from "../client";
import type {
  GoMarketsResponse,
  GoMarket,
  GoMarketsQuery,
} from "./markets-types";

/** Fetch markets for an event (or by other filters). */
export async function getMarkets(
  query: GoMarketsQuery,
): Promise<GoMarketsResponse> {
  const { data } = await goApi.get<GoMarketsResponse>("/api/v1/markets", {
    params: query,
  });
  return data;
}

/** Fetch a single market by ID. */
export async function getMarket(marketId: string): Promise<GoMarket> {
  const { data } = await goApi.get<GoMarket>(
    `/api/v1/markets/${encodeURIComponent(marketId)}`,
  );
  return data;
}
