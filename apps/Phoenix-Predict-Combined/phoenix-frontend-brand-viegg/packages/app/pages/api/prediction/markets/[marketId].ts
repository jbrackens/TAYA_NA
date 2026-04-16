import { NextApiRequest, NextApiResponse } from "next";
import {
  findPredictionMarket,
  listPredictionMarkets,
} from "../../../../../app-core/lib/prediction-market-seed";
import { fetchPredictionBackend } from "../shared";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const marketId = Array.isArray(request.query.marketId)
    ? request.query.marketId[0]
    : request.query.marketId;

  const backendResponse = await fetchPredictionBackend<{
    market: ReturnType<typeof findPredictionMarket>;
    relatedMarkets: ReturnType<typeof listPredictionMarkets>;
    error?: string;
  }>(`/api/v1/prediction/markets/${encodeURIComponent(`${marketId || ""}`)}`);
  if (backendResponse) {
    response.status(backendResponse.status).json(backendResponse.data);
    return;
  }

  const market = findPredictionMarket(`${marketId || ""}`);

  if (!market) {
    response.status(404).json({ error: "Prediction market not found" });
    return;
  }

  const relatedMarkets = listPredictionMarkets().filter((item) =>
    market.relatedMarketIds.includes(item.marketId),
  );

  response.status(200).json({
    market,
    relatedMarkets,
  });
}
