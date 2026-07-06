import { NextApiRequest, NextApiResponse } from "next";
import { findPredictionMarket } from "../../../../../app-core/lib/prediction-market-seed";
import { fetchPredictionBackend } from "../shared";

type TicketPreviewRequest = {
  marketId?: string;
  outcomeId?: string;
  stakeUsd?: number;
};

const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export default function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (request.body || {}) as TicketPreviewRequest;
  const backendResponsePromise = fetchPredictionBackend<{
    error?: string;
  }>("/api/v1/prediction/ticket/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return backendResponsePromise.then((backendResponse) => {
    if (backendResponse) {
      response.status(backendResponse.status).json(backendResponse.data);
      return;
    }

    const market = findPredictionMarket(`${body.marketId || ""}`);
    if (!market) {
      response.status(404).json({ error: "Prediction market not found" });
      return;
    }

    const outcome = market.outcomes.find(
      (item) => item.outcomeId === `${body.outcomeId || ""}`,
    );
    if (!outcome) {
      response.status(404).json({ error: "Prediction outcome not found" });
      return;
    }

    const stakeUsd = Number(body.stakeUsd || 0);
    if (!Number.isFinite(stakeUsd) || stakeUsd <= 0) {
      response.status(400).json({ error: "Stake must be greater than zero" });
      return;
    }

    const priceUsd = outcome.priceCents / 100;
    const shares = stakeUsd / priceUsd;
    const maxPayoutUsd = shares;
    const maxProfitUsd = maxPayoutUsd - stakeUsd;

    response.status(200).json({
      marketId: market.marketId,
      outcomeId: outcome.outcomeId,
      priceCents: outcome.priceCents,
      stakeUsd: roundCurrency(stakeUsd),
      shares: roundCurrency(shares),
      maxPayoutUsd: roundCurrency(maxPayoutUsd),
      maxProfitUsd: roundCurrency(maxProfitUsd),
    });
  });
}
