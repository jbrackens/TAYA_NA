import type {
  OddsFeedFixtureDetails,
  OddsFeedListResponse,
} from "./shared";

export type OddsFeedFixturesQuery = {
  apiKey: string;
  sport: string;
  bookmaker: string;
  fixtureStatus?: string;
  competitionId?: string;
  currentPage: number;
  itemsPerPage: number;
};

export type OddsFeedFixtureDetailsQuery = {
  apiKey: string;
  sport: string;
  eventId: string;
  bookmaker: string;
};

export interface OddsFeedProviderAdapter {
  provider: string;
  getFixtures(query: OddsFeedFixturesQuery): Promise<OddsFeedListResponse>;
  getFixture(query: OddsFeedFixtureDetailsQuery): Promise<OddsFeedFixtureDetails>;
}
