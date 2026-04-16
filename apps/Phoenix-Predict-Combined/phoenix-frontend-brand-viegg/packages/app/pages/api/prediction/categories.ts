import { NextApiRequest, NextApiResponse } from "next";
import { predictionCategories } from "../../../../app-core/lib/prediction-market-seed";
import { fetchPredictionBackend } from "./shared";

export default async function handler(
  _request: NextApiRequest,
  response: NextApiResponse,
) {
  const backendResponse = await fetchPredictionBackend<{ categories: typeof predictionCategories }>(
    "/api/v1/prediction/categories",
  );
  if (backendResponse && backendResponse.status >= 200 && backendResponse.status < 300) {
    response.status(backendResponse.status).json(backendResponse.data);
    return;
  }

  response.status(200).json({ categories: predictionCategories });
}
