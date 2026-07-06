import { NextApiRequest, NextApiResponse } from "next";
import {
  PredictionMarketStatus,
  listPredictionMarkets,
} from "../../../../../app-core/lib/prediction-market-seed";
import { fetchPredictionBackend } from "../shared";

const allowedStatuses = new Set<PredictionMarketStatus>([
  "open",
  "live",
  "resolved",
]);

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const categoryKey =
    (Array.isArray(request.query.category)
      ? request.query.category[0]
      : request.query.category) || undefined;
  const status =
    (Array.isArray(request.query.status)
      ? request.query.status[0]
      : request.query.status) || undefined;
  const normalizedStatus =
    status && allowedStatuses.has(status as PredictionMarketStatus)
      ? (status as PredictionMarketStatus)
      : undefined;
  const featured =
    (Array.isArray(request.query.featured)
      ? request.query.featured[0]
      : request.query.featured) || undefined;
  const live =
    (Array.isArray(request.query.live)
      ? request.query.live[0]
      : request.query.live) || undefined;

  const backendQuery = new URLSearchParams();
  if (categoryKey) {
    backendQuery.set("category", categoryKey);
  }
  if (normalizedStatus) {
    backendQuery.set("status", normalizedStatus);
  }
  if (featured !== undefined) {
    backendQuery.set("featured", featured);
  }
  if (live !== undefined) {
    backendQuery.set("live", live);
  }

  const backendResponse = await fetchPredictionBackend<{
    totalCount: number;
    markets: ReturnType<typeof listPredictionMarkets>;
  }>(
    `/api/v1/prediction/markets${
      backendQuery.toString() ? `?${backendQuery.toString()}` : ""
    }`,
  );
  if (backendResponse && backendResponse.status >= 200 && backendResponse.status < 300) {
    response.status(backendResponse.status).json(backendResponse.data);
    return;
  }

  const markets = listPredictionMarkets({
    categoryKey,
    status: normalizedStatus,
    featured: featured === undefined ? undefined : featured === "true",
    live: live === undefined ? undefined : live === "true",
  });

  response.status(200).json({
    totalCount: markets.length,
    markets,
  });
}
