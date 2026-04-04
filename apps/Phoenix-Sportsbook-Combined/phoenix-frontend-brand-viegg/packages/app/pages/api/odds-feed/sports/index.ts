import { NextApiRequest, NextApiResponse } from "next";
import { getOddsFeedConfig } from "../shared";
import {
  getSportRegistry,
  resolveOddsFeedSport,
} from "../sport-registry";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const config = getOddsFeedConfig();
  const requestedSport =
    (Array.isArray(request.query.sport)
      ? request.query.sport[0]
      : request.query.sport) || "";
  const selected = resolveOddsFeedSport({
    requestedSport,
    fallbackSport: config.sport,
  });

  response.status(200).json({
    provider: "odds-api.io",
    defaultSport: config.sport,
    selectedSport: selected,
    sports: getSportRegistry(),
  });
}
