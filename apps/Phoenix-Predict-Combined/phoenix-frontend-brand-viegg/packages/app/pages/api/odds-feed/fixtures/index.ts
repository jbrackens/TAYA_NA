import { NextApiRequest, NextApiResponse } from "next";
import { oddsApiAdapter } from "../odds-api-adapter";
import { canonicalGatewayAdapter } from "../canonical-gateway-adapter";
import { getSportRegistry, resolveOddsFeedSport } from "../sport-registry";
import type { OddsFeedProviderAdapter, OddsFeedFixturesQuery } from "../provider-adapter";
import type { OddsFeedFixtureListItem, OddsFeedListResponse } from "../shared";
import {
  getOddsFeedConfig,
  getQueryNumber,
  getQueryText,
} from "../shared";

const DEFAULT_ITEMS_PER_PAGE = 20;
const MAX_ITEMS_PER_PAGE = 50;
const DEFAULT_CURRENT_PAGE = 1;
const DEFAULT_SPORT = "esports";
const AGGREGATE_ROUTE_FILTERS = new Set([
  "home",
  "in-play",
  "in_play",
  "upcoming",
]);

const clamp = (value: number, minValue: number, maxValue: number): number =>
  Math.min(Math.max(value, minValue), maxValue);

const isInvalidSportSlugError = (error: unknown): boolean =>
  error instanceof Error && /invalid sport slug/i.test(error.message);

const createEmptyPayload = (
  currentPage: number,
  itemsPerPage: number,
): OddsFeedListResponse => ({
  data: [],
  totalCount: 0,
  itemsPerPage,
  currentPage,
  hasNextPage: false,
});

const selectAdapterForSport = (
  sportKey: string,
): OddsFeedProviderAdapter =>
  sportKey === "esports" ? oddsApiAdapter : canonicalGatewayAdapter;

const resolveProviderSport = (sportKey: string, providerSport: string): string =>
  sportKey === "esports" ? providerSport : sportKey;

const mergeAggregatePayloads = (
  payloads: OddsFeedListResponse[],
  currentPage: number,
  itemsPerPage: number,
  fixtureStatus?: string,
): OddsFeedListResponse => {
  const totalCount = payloads.reduce(
    (accumulator, payload) => accumulator + payload.totalCount,
    0,
  );
  const combined = payloads.reduce<OddsFeedFixtureListItem[]>(
    (accumulator, payload) => accumulator.concat(payload.data),
    [],
  );
  const shouldSortDescending = `${fixtureStatus || ""}`.trim().toUpperCase() === "FINISHED";
  const sorted = combined.sort((left: OddsFeedFixtureListItem, right: OddsFeedFixtureListItem) => {
    const leftTime = Date.parse(left.startTime) || 0;
    const rightTime = Date.parse(right.startTime) || 0;
    return shouldSortDescending ? rightTime - leftTime : leftTime - rightTime;
  });
  const groupedBySport = sorted.reduce<Map<string, OddsFeedFixtureListItem[]>>(
    (accumulator, fixture: OddsFeedFixtureListItem) => {
      const sportKey = fixture.sport?.abbreviation || "unknown";
      const existing = accumulator.get(sportKey) || [];
      existing.push(fixture);
      accumulator.set(sportKey, existing);
      return accumulator;
    },
    new Map<string, OddsFeedFixtureListItem[]>(),
  );
  const bucketOrder = Array.from(
    groupedBySport.entries(),
  ) as Array<[string, OddsFeedFixtureListItem[]]>;
  bucketOrder.sort(
    (
      left: [string, OddsFeedFixtureListItem[]],
      right: [string, OddsFeedFixtureListItem[]],
    ) => {
      const leftTime = Date.parse(left[1].length ? left[1][0].startTime : "") || 0;
      const rightTime =
        Date.parse(right[1].length ? right[1][0].startTime : "") || 0;
      return shouldSortDescending ? rightTime - leftTime : leftTime - rightTime;
    },
  );
  const interleaved: OddsFeedFixtureListItem[] = [];
  let hasItems = true;
  while (hasItems) {
    hasItems = false;
    bucketOrder.forEach(([, fixtures]: [string, OddsFeedFixtureListItem[]]) => {
      const nextFixture = fixtures.shift();
      if (nextFixture) {
        interleaved.push(nextFixture);
        hasItems = true;
      }
    });
  }
  const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
  const endIndex = startIndex + itemsPerPage;

  return {
    data: interleaved.slice(startIndex, endIndex),
    totalCount: totalCount || interleaved.length,
    itemsPerPage,
    currentPage,
    hasNextPage:
      payloads.some((payload) => payload.hasNextPage) ||
      endIndex < (totalCount || interleaved.length),
  };
};

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const config = getOddsFeedConfig();
  const fixtureStatus = getQueryText(request.query.fixtureStatus);
  const competitionId = getQueryText(request.query.competitionId);
  const requestedSport =
    getQueryText(request.query.sport) || getQueryText(request.query.gameFilter);
  const sportResolution = resolveOddsFeedSport({
    requestedSport,
    fallbackSport: config.sport || DEFAULT_SPORT,
  });
  const canonicalSportKey =
    sportResolution.sportKey === "custom" ? undefined : sportResolution.sportKey;
  const shouldUseCanonicalGateway =
    canonicalSportKey !== undefined && canonicalSportKey !== "esports";
  const sport = shouldUseCanonicalGateway
    ? canonicalSportKey || "esports"
    : sportResolution.providerSport;
  const currentPage = getQueryNumber(
    request.query.page,
    DEFAULT_CURRENT_PAGE,
  );
  const requestedItemsPerPage = getQueryNumber(
    request.query.itemsPerPage,
    DEFAULT_ITEMS_PER_PAGE,
  );
  const itemsPerPage = clamp(requestedItemsPerPage, 1, MAX_ITEMS_PER_PAGE);
  const bookmaker = getQueryText(request.query.bookmaker) || config.bookmaker;
  const normalizedRequestedSport = `${requestedSport || ""}`.trim().toLowerCase();
  const shouldAggregateSportsbookHome =
    AGGREGATE_ROUTE_FILTERS.has(normalizedRequestedSport);

  if (shouldAggregateSportsbookHome) {
    const enabledSports = getSportRegistry().filter((entry) => entry.enabled);
    const aggregateFetchSize = clamp(
      currentPage * itemsPerPage,
      itemsPerPage,
      MAX_ITEMS_PER_PAGE,
    );
    const aggregatePayloads = await Promise.all(
      enabledSports.map(async (entry) => {
        if (entry.sportKey === "esports" && !config.apiKey) {
          return createEmptyPayload(currentPage, aggregateFetchSize);
        }

        const adapter = selectAdapterForSport(entry.sportKey);
        const query: OddsFeedFixturesQuery = {
          apiKey: config.apiKey,
          sport: resolveProviderSport(entry.sportKey, entry.providerSport),
          bookmaker,
          fixtureStatus,
          competitionId,
          currentPage: 1,
          itemsPerPage: aggregateFetchSize,
        };

        try {
          return await adapter.getFixtures(query);
        } catch (_error) {
          return createEmptyPayload(currentPage, aggregateFetchSize);
        }
      }),
    );

    response
      .status(200)
      .json(
        mergeAggregatePayloads(
          aggregatePayloads,
          currentPage,
          itemsPerPage,
          fixtureStatus,
        ),
      );
    return;
  }

  const selectedAdapter = shouldUseCanonicalGateway
    ? canonicalGatewayAdapter
    : oddsApiAdapter;

  if (!shouldUseCanonicalGateway && !config.apiKey) {
    response.status(500).json({
      error:
        "Odds feed is not configured. Set ODDS_API_KEY in packages/app/.env.local",
    });
    return;
  }

  const fetchParams = {
    apiKey: config.apiKey,
    sport,
    bookmaker,
    fixtureStatus,
    competitionId,
    currentPage,
    itemsPerPage,
  };

  try {
    const payload = await selectedAdapter.getFixtures(fetchParams);
    response.status(200).json(payload);
  } catch (error) {
    const fallbackSport = config.sport || DEFAULT_SPORT;
    if (
      !shouldUseCanonicalGateway &&
      isInvalidSportSlugError(error) &&
      sport !== fallbackSport
    ) {
      try {
        const payload = await selectedAdapter.getFixtures({
          ...fetchParams,
          sport: fallbackSport,
        });
        response.status(200).json(payload);
        return;
      } catch (retryError) {
        error = retryError;
      }
    }

    const fallbackPayload = {
      data: [],
      totalCount: 0,
      itemsPerPage,
      currentPage,
      hasNextPage: false,
    };
    response.status(200).json({
      ...fallbackPayload,
      source: "fallback",
      warning:
        error instanceof Error
          ? error.message
          : shouldUseCanonicalGateway
          ? "Failed to fetch fixtures from canonical sports gateway"
          : "Failed to fetch fixtures from Odds API",
    });
  }
}
