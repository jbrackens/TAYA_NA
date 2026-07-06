import { NextApiRequest, NextApiResponse } from "next";
import { oddsApiAdapter } from "../odds-api-adapter";
import { canonicalGatewayAdapter } from "../canonical-gateway-adapter";
import { resolveOddsFeedSport } from "../sport-registry";
import {
  getFallbackFixtureDetails,
  getOddsFeedConfig,
  getQueryText,
} from "../shared";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const config = getOddsFeedConfig();
  const requestedSport =
    getQueryText(request.query.sport) || getQueryText(request.query.gameFilter);
  const sportResolution = resolveOddsFeedSport({
    requestedSport,
    fallbackSport: config.sport,
  });
  const canonicalSportKey =
    sportResolution.sportKey === "custom" ? undefined : sportResolution.sportKey;
  const shouldUseCanonicalGateway =
    canonicalSportKey !== undefined && canonicalSportKey !== "esports";
  const sport = shouldUseCanonicalGateway
    ? canonicalSportKey || "esports"
    : sportResolution.providerSport;

  if (!shouldUseCanonicalGateway && !config.apiKey) {
    response.status(500).json({
      error:
        "Odds feed is not configured. Set ODDS_API_KEY in packages/app/.env.local",
    });
    return;
  }

  const fixtureId = getQueryText(request.query.fixtureId);
  if (!fixtureId) {
    response.status(400).json({
      error: "Missing fixtureId",
    });
    return;
  }

  const bookmaker = getQueryText(request.query.bookmaker) || config.bookmaker;
  const selectedAdapter = shouldUseCanonicalGateway
    ? canonicalGatewayAdapter
    : oddsApiAdapter;

  try {
    const payload = await selectedAdapter.getFixture({
      apiKey: config.apiKey,
      sport,
      eventId: fixtureId,
      bookmaker,
    });
    response.status(200).json(payload);
  } catch (error) {
    if (shouldUseCanonicalGateway) {
      response.status(502).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch fixture from canonical sports gateway",
      });
      return;
    }

    response.status(200).json({
      ...getFallbackFixtureDetails(bookmaker),
      source: "fallback",
      warning:
        error instanceof Error
          ? error.message
          : "Failed to fetch fixture from Odds API",
    });
  }
}
