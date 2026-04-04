import http from "http";
import https from "https";
import { URL } from "url";
import type {
  OddsFeedFixtureDetailsQuery,
  OddsFeedFixturesQuery,
  OddsFeedProviderAdapter,
} from "./provider-adapter";
import type {
  OddsFeedFixtureDetails,
  OddsFeedListResponse,
} from "./shared";

const {
  API_GLOBAL_ENDPOINT,
  CANONICAL_GATEWAY_ENDPOINT,
} = require("next/config").default().publicRuntimeConfig;

const DEFAULT_GATEWAY_BASE_URL = "http://localhost:18080";
const DEFAULT_MARKETS_PAGE_SIZE = 50;
const DEFAULT_REQUEST_TIMEOUT_MS = 5000;

type CanonicalPageMeta = {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
};

type CanonicalSportEvent = {
  eventKey: string;
  fixtureId: string;
  sportKey: string;
  leagueKey: string;
  leagueName: string;
  seasonKey?: string;
  name: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  marketsTotalCount: number;
};

type CanonicalSportEventsResponse = {
  sportKey: string;
  items: CanonicalSportEvent[];
  pagination: CanonicalPageMeta;
};

type CanonicalMarketSelection = {
  id: string;
  name: string;
  odds: number;
  active: boolean;
};

type CanonicalMarket = {
  id: string;
  fixtureId: string;
  sportKey?: string;
  leagueKey?: string;
  eventKey?: string;
  name: string;
  status: string;
  startsAt: string;
  selections: CanonicalMarketSelection[];
};

type CanonicalSportEventMarketsResponse = {
  sportKey: string;
  eventKey: string;
  fixtureId: string;
  items: CanonicalMarket[];
  pagination: CanonicalPageMeta;
};

type CanonicalSportNameMap = Record<string, string>;

const CANONICAL_SPORT_DISPLAY_NAMES: CanonicalSportNameMap = {
  esports: "Esports",
  mlb: "MLB",
  nfl: "NFL",
  ncaa_baseball: "NCAA Baseball",
  nba: "NBA",
  ufc: "UFC",
};

type DisplayOdds = {
  decimal: number;
  american: string;
  fractional: string;
};

const normalizeGatewayBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/g, "");
  if (/\/api\/v1$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/api/v1`;
};

const buildGatewayUrl = (
  path: string,
  queryParams: Record<string, string | number | undefined>,
): string => {
  const configuredBase = `${
    CANONICAL_GATEWAY_ENDPOINT || API_GLOBAL_ENDPOINT || ""
  }`.trim();
  const rawBase =
    configuredBase.length > 0 ? configuredBase : DEFAULT_GATEWAY_BASE_URL;
  const apiBase = normalizeGatewayBaseUrl(rawBase);
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, `${apiBase}/`);
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}` !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

const requestJson = <T>(url: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === "https:" ? https : http;
    const request = transport.get(url, (response) => {
      let payload = "";
      response.on("data", (chunk) => {
        payload += chunk;
      });
      response.on("end", () => {
        let parsedPayload: unknown = payload;
        try {
          parsedPayload = payload ? JSON.parse(payload) : {};
        } catch (_error) {
          parsedPayload = payload;
        }

        const statusCode = response.statusCode ?? 500;
        if (statusCode >= 400) {
          const extractedError =
            typeof parsedPayload === "object" &&
            parsedPayload !== null &&
            "error" in parsedPayload
              ? String((parsedPayload as { error?: unknown }).error)
              : "";
          const message =
            extractedError.trim() ||
            `Canonical sports request failed with status ${statusCode}`;
          reject(new Error(message));
          return;
        }

        resolve(parsedPayload as T);
      });
    });
    request.on("error", (error) => {
      reject(error);
    });
    request.setTimeout(DEFAULT_REQUEST_TIMEOUT_MS, () => {
      request.destroy(
        new Error(
          `Canonical sports request timed out after ${DEFAULT_REQUEST_TIMEOUT_MS}ms`,
        ),
      );
    });
  });
};

const toAmericanOdds = (decimalOdds: number): string => {
  if (decimalOdds <= 1) {
    return "0";
  }
  if (decimalOdds >= 2) {
    return `+${Math.round((decimalOdds - 1) * 100)}`;
  }
  return `${Math.round(-100 / (decimalOdds - 1))}`;
};

const greatestCommonDivisor = (a: number, b: number): number => {
  if (!b) {
    return a;
  }
  return greatestCommonDivisor(b, a % b);
};

const toFractionalOdds = (decimalOdds: number): string => {
  if (decimalOdds <= 1) {
    return "0/1";
  }
  const numeratorRaw = Math.round((decimalOdds - 1) * 1000);
  const denominatorRaw = 1000;
  const divisor = greatestCommonDivisor(numeratorRaw, denominatorRaw);
  return `${numeratorRaw / divisor}/${denominatorRaw / divisor}`;
};

const toDisplayOdds = (odds: number): DisplayOdds => {
  const normalizedOdds = Number.isFinite(odds) ? odds : 1;
  const decimal = Number(normalizedOdds.toFixed(2));
  return {
    decimal,
    american: toAmericanOdds(decimal),
    fractional: toFractionalOdds(decimal),
  };
};

const toFixtureStatus = (status: string): string => {
  switch (`${status}`.trim().toLowerCase()) {
    case "scheduled":
      return "PRE_GAME";
    case "in_play":
      return "IN_PLAY";
    case "finished":
      return "POST_GAME";
    case "cancelled":
      return "GAME_ABANDONED";
    case "suspended":
      return "BREAK_IN_PLAY";
    default:
      return "UNKNOWN";
  }
};

const toEventStatusQuery = (fixtureStatus?: string): string | undefined => {
  switch (`${fixtureStatus || ""}`.trim().toUpperCase()) {
    case "UPCOMING":
      return "scheduled";
    case "IN_PLAY":
      return "in_play";
    case "FINISHED":
      return "finished";
    default:
      return undefined;
  }
};

const toMarketType = (marketName: string): string => {
  const normalized = marketName.toLowerCase();
  if (
    normalized === "ml" ||
    normalized.includes("moneyline") ||
    normalized.includes("match winner")
  ) {
    return "MATCH_WINNER";
  }
  return marketName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const toSelectionName = (selectionName: string): string =>
  `${selectionName || ""}`.trim().toLowerCase();

const toMarketStatusType = (status: string): string =>
  `${status}`.trim().toLowerCase() === "open" ? "BETTABLE" : "SUSPENDED";

const toMarketChangeReasonStatus = (status: string): string =>
  `${status}`.trim().toLowerCase() === "open" ? "OPEN" : "SUSPENDED";

const toMarketCategory = (marketName: string): string =>
  /map/i.test(marketName) ? "MAP" : "MATCH";

const parseSpecifierValue = (marketName: string): string => {
  const mapMatch = marketName.toLowerCase().match(/(\d+)(?:st|nd|rd|th)\s*map/);
  if (mapMatch?.[1]) {
    return mapMatch[1];
  }
  return "";
};

const toSportDisplayName = (sportKey: string): string =>
  CANONICAL_SPORT_DISPLAY_NAMES[sportKey] ||
  `${sportKey}`
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const resolveCanonicalFixtureId = (event: CanonicalSportEvent): string =>
  event.fixtureId || event.eventKey;

const resolveCanonicalEventLookupKey = (event: CanonicalSportEvent): string =>
  event.eventKey || event.fixtureId;

const mapEventMarketsToFixtureListMarkets = (markets: CanonicalMarket[]) =>
  markets.map((market) => ({
    marketId: market.id,
    marketName: market.name,
    marketType: toMarketType(market.name),
    marketStatus: {
      type: toMarketStatusType(market.status),
    },
    selectionOdds: market.selections.map((selection, index) => ({
      odds: Number.isFinite(selection.odds)
        ? Number(selection.odds.toFixed(2))
        : 1,
      displayOdds: toDisplayOdds(selection.odds),
      selectionId: index + 1,
      selectionName: toSelectionName(selection.name),
    })),
  }));

const mapCanonicalEventToFixtureListItem = (
  event: CanonicalSportEvent,
  markets: CanonicalMarket[],
) => {
  const fixtureId = resolveCanonicalFixtureId(event);
  const sportKey = event.sportKey || "esports";
  const fixtureMarkets = mapEventMarketsToFixtureListMarkets(markets);

  return {
    fixtureId,
    fixtureName: event.name || `${event.homeTeam} vs ${event.awayTeam}`,
    startTime: event.startTime,
    sport: {
      sportId: sportKey,
      sportName: toSportDisplayName(sportKey),
      abbreviation: sportKey,
    },
    score: {
      home: 0,
      away: 0,
    },
    markets: fixtureMarkets,
    marketsTotalCount:
      event.marketsTotalCount > 0
        ? event.marketsTotalCount
        : fixtureMarkets.length,
    competitors: {
      home: {
        competitorId: `home:${fixtureId}`,
        name: event.homeTeam,
        abbreviation: `${event.homeTeam || ""}`.slice(0, 3).toUpperCase(),
        qualifier: "home",
        score: 0,
      },
      away: {
        competitorId: `away:${fixtureId}`,
        name: event.awayTeam,
        abbreviation: `${event.awayTeam || ""}`.slice(0, 3).toUpperCase(),
        qualifier: "away",
        score: 0,
      },
    },
    tournament: {
      name: event.leagueName || event.leagueKey,
      sportId: sportKey,
      startTime: event.startTime,
      tournamentId: event.leagueKey,
    },
    status: toFixtureStatus(event.status),
  };
};

const mapCanonicalEventAndMarketsToFixtureDetails = (
  event: CanonicalSportEvent,
  markets: CanonicalMarket[],
): OddsFeedFixtureDetails => {
  const fixtureId = resolveCanonicalFixtureId(event);
  const sportKey = event.sportKey || "esports";
  const marketsList = markets.map((market) => ({
    marketId: market.id,
    marketName: market.name,
    marketType: toMarketType(market.name),
    marketCategory: toMarketCategory(market.name),
    marketStatus: {
      changeReason: {
        status: toMarketChangeReasonStatus(market.status),
        type: "NONE",
      },
      type: toMarketStatusType(market.status),
    },
    selectionOdds: market.selections.map((selection) => ({
      active: selection.active !== false,
      odds: Number.isFinite(selection.odds)
        ? Number(selection.odds.toFixed(2))
        : 1,
      displayOdds: toDisplayOdds(selection.odds),
      selectionId: selection.id || `${market.id}:${selection.name}`,
      selectionName: toSelectionName(selection.name),
    })),
    specifiers: {
      map: parseSpecifierValue(market.name),
      value: "",
    },
  }));

  const groupedMarkets = marketsList.reduce<
    Record<string, typeof marketsList>
  >((accumulator, market) => {
    const key = market.marketCategory;
    if (accumulator[key] == null) {
      accumulator[key] = [];
    }
    accumulator[key].push(market);
    return accumulator;
  }, {});

  return {
    competitors: {
      home: {
        competitorId: `home:${fixtureId}`,
        name: event.homeTeam,
        abbreviation: `${event.homeTeam || ""}`.slice(0, 3).toUpperCase(),
        qualifier: "home",
        score: 0,
      },
      away: {
        competitorId: `away:${fixtureId}`,
        name: event.awayTeam,
        abbreviation: `${event.awayTeam || ""}`.slice(0, 3).toUpperCase(),
        qualifier: "away",
        score: 0,
      },
    },
    fixtureId,
    fixtureName: event.name || `${event.homeTeam} vs ${event.awayTeam}`,
    isLive: `${event.status}`.trim().toLowerCase() === "in_play",
    markets: groupedMarkets,
    marketsList,
    marketsTotalCount:
      event.marketsTotalCount > 0 ? event.marketsTotalCount : marketsList.length,
    sport: {
      abbreviation: sportKey,
      displayToPunters: true,
      name: toSportDisplayName(sportKey),
      sportId: sportKey,
      startTime: event.startTime,
    },
    status: toFixtureStatus(event.status),
    tournament: {
      name: event.leagueName || event.leagueKey,
      sportId: sportKey,
      startTime: event.startTime,
      tournamentId: event.leagueKey,
    },
    startTime: event.startTime,
  };
};

const listEventMarkets = async (
  sportKey: string,
  eventKey: string,
): Promise<CanonicalMarket[]> => {
  const marketsUrl = buildGatewayUrl(
    `/sports/${encodeURIComponent(sportKey)}/events/${encodeURIComponent(
      eventKey,
    )}/markets`,
    {
      page: 1,
      pageSize: DEFAULT_MARKETS_PAGE_SIZE,
      status: "open",
    },
  );
  const payload = await requestJson<CanonicalSportEventMarketsResponse>(
    marketsUrl,
  );
  return Array.isArray(payload.items) ? payload.items : [];
};

const getFixturesFromCanonicalGateway = async (
  query: OddsFeedFixturesQuery,
): Promise<OddsFeedListResponse> => {
  const status = toEventStatusQuery(query.fixtureStatus);
  const eventsUrl = buildGatewayUrl(
    `/sports/${encodeURIComponent(query.sport)}/events`,
    {
      leagueKey: query.competitionId,
      status,
      page: query.currentPage,
      pageSize: query.itemsPerPage,
    },
  );
  const eventsPayload = await requestJson<CanonicalSportEventsResponse>(eventsUrl);
  const items = Array.isArray(eventsPayload.items) ? eventsPayload.items : [];

  const marketsByEventKey = new Map<string, CanonicalMarket[]>();
  await Promise.all(
    items.map(async (event) => {
      const eventKey = resolveCanonicalEventLookupKey(event);
      if (!eventKey) {
        return;
      }
      try {
        const markets = await listEventMarkets(query.sport, eventKey);
        marketsByEventKey.set(eventKey, markets);
      } catch (_error) {
        marketsByEventKey.set(eventKey, []);
      }
    }),
  );

  return {
    data: items.map((event) => {
      const eventKey = resolveCanonicalEventLookupKey(event);
      return mapCanonicalEventToFixtureListItem(
        event,
        marketsByEventKey.get(eventKey) || [],
      );
    }),
    totalCount: eventsPayload.pagination?.total || 0,
    itemsPerPage:
      eventsPayload.pagination?.pageSize || query.itemsPerPage || items.length,
    currentPage: eventsPayload.pagination?.page || query.currentPage || 1,
    hasNextPage: Boolean(eventsPayload.pagination?.hasNext),
  };
};

const getFixtureByIdFromCanonicalGateway = async (
  query: OddsFeedFixtureDetailsQuery,
): Promise<OddsFeedFixtureDetails> => {
  const eventUrl = buildGatewayUrl(
    `/sports/${encodeURIComponent(query.sport)}/events/${encodeURIComponent(
      query.eventId,
    )}`,
    {},
  );
  const event = await requestJson<CanonicalSportEvent>(eventUrl);
  const markets = await listEventMarkets(query.sport, query.eventId);
  return mapCanonicalEventAndMarketsToFixtureDetails(event, markets);
};

export const canonicalGatewayAdapter: OddsFeedProviderAdapter = {
  provider: "phoenix-gateway-canonical",
  getFixtures: (query: OddsFeedFixturesQuery) =>
    getFixturesFromCanonicalGateway(query),
  getFixture: (query: OddsFeedFixtureDetailsQuery) =>
    getFixtureByIdFromCanonicalGateway(query),
};
