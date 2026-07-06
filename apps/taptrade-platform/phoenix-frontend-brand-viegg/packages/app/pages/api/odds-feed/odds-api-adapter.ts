import type {
  OddsFeedFixtureDetailsQuery,
  OddsFeedFixturesQuery,
  OddsFeedProviderAdapter,
} from "./provider-adapter";
import {
  getFixtureByIdFromOddsFeed,
  getFixturesFromOddsFeed,
} from "./shared";

export const oddsApiAdapter: OddsFeedProviderAdapter = {
  provider: "odds-api.io",
  getFixtures: (query: OddsFeedFixturesQuery) =>
    getFixturesFromOddsFeed({
      apiKey: query.apiKey,
      sport: query.sport,
      bookmaker: query.bookmaker,
      fixtureStatus: query.fixtureStatus,
      competitionId: query.competitionId,
      currentPage: query.currentPage,
      itemsPerPage: query.itemsPerPage,
    }),
  getFixture: (query: OddsFeedFixtureDetailsQuery) =>
    getFixtureByIdFromOddsFeed({
      apiKey: query.apiKey,
      eventId: query.eventId,
      bookmaker: query.bookmaker,
    }),
};
