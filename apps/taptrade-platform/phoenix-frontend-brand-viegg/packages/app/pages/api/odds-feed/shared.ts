import https from "https";
import { URL } from "url";

type OddsApiStatus = "pending" | "live" | "settled" | "cancelled";

type OddsApiSport = {
  name: string;
  slug: string;
};

type OddsApiLeague = {
  name: string;
  slug: string;
};

export type OddsApiEvent = {
  id: number | string;
  home: string;
  away: string;
  date: string;
  status: string;
  scores?: {
    home?: number;
    away?: number;
  };
  sport: OddsApiSport;
  league: OddsApiLeague;
};

type OddsLine = Record<string, string | number>;

type OddsApiMarket = {
  name: string;
  updatedAt?: string;
  odds: OddsLine[];
};

export type OddsApiOddsEvent = OddsApiEvent & {
  urls?: Record<string, string>;
  bookmakers?: Record<string, OddsApiMarket[]>;
};

type DisplayOdds = {
  american: string;
  decimal: number;
  fractional: string;
};

type FixtureListSelection = {
  odds: number;
  displayOdds: DisplayOdds;
  selectionId: number;
  selectionName: string;
};

type FixtureListMarket = {
  marketId: string;
  marketName: string;
  selectionOdds: FixtureListSelection[];
  marketType: string;
  marketStatus: {
    type: string;
  };
};

type FixtureDetailSelection = {
  active: boolean;
  odds: number;
  displayOdds: DisplayOdds;
  selectionId: string;
  selectionName: string;
};

type FixtureDetailMarket = {
  marketId: string;
  marketName: string;
  marketType: string;
  marketCategory: string;
  marketStatus: {
    changeReason: {
      status: string;
      type: string;
    };
    type: string;
  };
  selectionOdds: FixtureDetailSelection[];
  specifiers: {
    map: string;
    value: string;
    [key: string]: string;
  };
};

export type OddsFeedFixtureListItem = {
  fixtureId: string;
  fixtureName: string;
  startTime: string;
  sport: {
    sportId: string;
    sportName: string;
    abbreviation: string;
  };
  score: {
    home: number;
    away: number;
  };
  markets: FixtureListMarket[];
  marketsTotalCount: number;
  competitors: {
    home: {
      competitorId: string;
      name: string;
      abbreviation: string;
      qualifier: string;
      score: number;
    };
    away: {
      competitorId: string;
      name: string;
      abbreviation: string;
      qualifier: string;
      score: number;
    };
  };
  tournament: {
    name: string;
    sportId: string;
    startTime: string;
    tournamentId: string;
  };
  status: string;
};

export type OddsFeedFixtureDetails = {
  competitors: OddsFeedFixtureListItem["competitors"];
  fixtureId: string;
  fixtureName: string;
  isLive: boolean;
  markets: {
    [key: string]: FixtureDetailMarket[];
  };
  marketsList: FixtureDetailMarket[];
  marketsTotalCount: number;
  sport: {
    abbreviation: string;
    displayToPunters: boolean;
    name: string;
    sportId: string;
    startTime: string;
  };
  status: string;
  tournament: {
    name: string;
    sportId: string;
    startTime: string;
    tournamentId: string;
  };
  startTime: string;
};

export type OddsFeedListResponse = {
  data: OddsFeedFixtureListItem[];
  totalCount: number;
  itemsPerPage: number;
  currentPage: number;
  hasNextPage: boolean;
};

const SAMPLE_ODDS_EVENT: OddsApiOddsEvent = {
  id: 69575558,
  home: "Cloud Rising",
  away: "Interactive Philippines",
  date: "2026-03-06T04:00:00Z",
  status: "pending",
  sport: {
    name: "Esports",
    slug: "esports",
  },
  league: {
    name: "Dota - EPL World Series Southeast Asia",
    slug: "dota-epl-world-series-southeast-asia",
  },
  scores: {
    home: 0,
    away: 0,
  },
  bookmakers: {
    Bet365: [
      {
        name: "ML",
        updatedAt: "2026-03-06T01:01:46.072Z",
        odds: [{ home: "2.50", away: "1.50" }],
      },
      {
        name: "Spread",
        updatedAt: "2026-03-06T01:01:46.072Z",
        odds: [{ hdp: 1.5, home: "1.44", away: "2.62" }],
      },
      {
        name: "1st Map Moneyline",
        updatedAt: "2026-03-06T01:01:46.072Z",
        odds: [{ home: "2.20", away: "1.61" }],
      },
      {
        name: "2nd Map Moneyline",
        updatedAt: "2026-03-06T01:01:46.073Z",
        odds: [{ home: "2.20", away: "1.61" }],
      },
      {
        name: "1st Map Total Kills",
        updatedAt: "2026-03-06T01:01:46.073Z",
        odds: [{ hdp: 50.5, over: "1.83", under: "1.83" }],
      },
      {
        name: "2nd Map Total Kills",
        updatedAt: "2026-03-06T01:01:46.073Z",
        odds: [{ hdp: 50.5, over: "1.83", under: "1.83" }],
      },
    ],
  },
};

const DEFAULT_ODDS_API_BASE_URL = "https://api.odds-api.io/v3";
const DEFAULT_ODDS_SPORT = "esports";
const DEFAULT_ODDS_BOOKMAKER = "Bet365";
const DEFAULT_CACHE_TTL_MS = 30_000;
const MAX_MULTI_ODDS_EVENT_IDS = 10;

type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

const requestCache = new Map<string, CacheEntry>();

const buildRequestUrl = (
  path: string,
  queryParams: Record<string, string | number | undefined>,
): string => {
  const baseUrl =
    process.env.ODDS_API_BASE_URL?.trim() || DEFAULT_ODDS_API_BASE_URL;
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBaseUrl);
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

export const getOddsFeedConfig = (): {
  apiKey: string;
  sport: string;
  bookmaker: string;
} => {
  const apiKey = process.env.ODDS_API_KEY?.trim() || "";
  const sport = process.env.ODDS_API_SPORT?.trim() || DEFAULT_ODDS_SPORT;
  const bookmaker =
    process.env.ODDS_API_BOOKMAKERS?.trim() || DEFAULT_ODDS_BOOKMAKER;
  return { apiKey, sport, bookmaker };
};

const requestJson = <T>(url: string, cacheTtlMs = DEFAULT_CACHE_TTL_MS): Promise<T> => {
  const now = Date.now();
  const cachedEntry = requestCache.get(url);
  if (cachedEntry && cachedEntry.expiresAt > now) {
    return Promise.resolve(cachedEntry.payload as T);
  }

  return new Promise<T>((resolve, reject) => {
    const request = https.get(url, (response) => {
      let payload = "";
      response.on("data", (chunk) => {
        payload += chunk;
      });
      response.on("end", () => {
        const statusCode = response.statusCode ?? 500;
        let parsedPayload: unknown = payload;
        try {
          parsedPayload = payload ? JSON.parse(payload) : {};
        } catch (_error) {
          parsedPayload = payload;
        }

        if (statusCode >= 400) {
          const errorMessage =
            typeof parsedPayload === "object" &&
            parsedPayload !== null &&
            "error" in parsedPayload
              ? String((parsedPayload as { error?: string }).error)
              : `Odds API request failed with status ${statusCode}`;
          reject(new Error(errorMessage));
          return;
        }

        requestCache.set(url, {
          payload: parsedPayload,
          expiresAt: Date.now() + cacheTtlMs,
        });
        resolve(parsedPayload as T);
      });
    });

    request.on("error", (error) => {
      reject(error);
    });
  });
};

const toPositiveInteger = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toMatchStatus = (status: string): string => {
  switch (`${status}`.toLowerCase()) {
    case "pending":
      return "PRE_GAME";
    case "live":
      return "IN_PLAY";
    case "settled":
      return "POST_GAME";
    case "cancelled":
      return "GAME_ABANDONED";
    default:
      return "UNKNOWN";
  }
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

const toDisplayOdds = (decimalOdds: number): DisplayOdds => ({
  decimal: Number(decimalOdds.toFixed(2)),
  american: toAmericanOdds(decimalOdds),
  fractional: toFractionalOdds(decimalOdds),
});

const parseMapFromMarketName = (marketName: string): string => {
  const lowerCase = marketName.toLowerCase();
  const withOrdinal = lowerCase.match(/(\d+)(?:st|nd|rd|th)\s*map/);
  if (withOrdinal?.[1]) {
    return withOrdinal[1];
  }
  const withoutOrdinal = lowerCase.match(/map\s*(\d+)/);
  if (withoutOrdinal?.[1]) {
    return withoutOrdinal[1];
  }
  return "";
};

const toMarketType = (marketName: string): string => {
  const lowerCase = marketName.toLowerCase();
  if (
    lowerCase === "ml" ||
    lowerCase.includes("moneyline") ||
    lowerCase.includes("match winner")
  ) {
    return "MATCH_WINNER";
  }

  return marketName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const toSelectionName = (key: string, line: OddsLine): string => {
  const normalizedKey = key.toLowerCase();
  if (
    normalizedKey === "home" ||
    normalizedKey === "away" ||
    normalizedKey === "draw" ||
    normalizedKey === "over" ||
    normalizedKey === "under" ||
    normalizedKey === "yes" ||
    normalizedKey === "no"
  ) {
    return normalizedKey;
  }

  if (typeof line.label === "string" && line.label.trim().length > 0) {
    return line.label.trim().toLowerCase();
  }

  return normalizedKey;
};

const mapMarketSelections = (
  marketId: string,
  line: OddsLine,
): FixtureDetailSelection[] => {
  const selectionEntries = Object.entries(line).filter(([key, value]) => {
    if (key === "hdp" || key === "label") {
      return false;
    }
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0;
  });

  return selectionEntries.map(([key, value], index) => {
    const decimalOdds = Number(value);
    return {
      active: true,
      odds: Number(decimalOdds.toFixed(2)),
      displayOdds: toDisplayOdds(decimalOdds),
      selectionId: `${marketId}:${index}`,
      selectionName: toSelectionName(key, line),
    };
  });
};

const mapOddsMarkets = (
  eventId: string,
  bookmakerMarkets: OddsApiMarket[],
): FixtureDetailMarket[] => {
  const mappedMarkets: FixtureDetailMarket[] = [];
  bookmakerMarkets.forEach((bookmakerMarket, marketIndex) => {
    const marketType = toMarketType(bookmakerMarket.name);
    const mapNumber = parseMapFromMarketName(bookmakerMarket.name);

    bookmakerMarket.odds.forEach((line, lineIndex) => {
      const marketId = `${eventId}:${marketType}:${marketIndex}:${lineIndex}`;
      const selectionOdds = mapMarketSelections(marketId, line);
      if (!selectionOdds.length) {
        return;
      }

      mappedMarkets.push({
        marketId,
        marketName: bookmakerMarket.name,
        marketType,
        marketCategory: mapNumber ? "MAP" : "MATCH",
        marketStatus: {
          type: "BETTABLE",
          changeReason: {
            status: "OPEN",
            type: "NONE",
          },
        },
        selectionOdds,
        specifiers: {
          map: mapNumber,
          value:
            typeof line.hdp === "number" || typeof line.hdp === "string"
              ? String(line.hdp)
              : "",
        },
      });
    });
  });

  return mappedMarkets;
};

const toCompetitors = (event: OddsApiEvent) => {
  const homeScore = Number(event.scores?.home ?? 0);
  const awayScore = Number(event.scores?.away ?? 0);
  return {
    home: {
      competitorId: `home:${event.id}`,
      name: event.home,
      abbreviation: event.home.slice(0, 3).toUpperCase(),
      qualifier: "home",
      score: Number.isFinite(homeScore) ? homeScore : 0,
    },
    away: {
      competitorId: `away:${event.id}`,
      name: event.away,
      abbreviation: event.away.slice(0, 3).toUpperCase(),
      qualifier: "away",
      score: Number.isFinite(awayScore) ? awayScore : 0,
    },
  };
};

export const mapOddsEventToFixtureListItem = (
  event: OddsApiEvent,
  oddsEvent: OddsApiOddsEvent | undefined,
  bookmaker: string,
): OddsFeedFixtureListItem => {
  const fixtureId = String(event.id);
  const competitorData = toCompetitors(event);
  const bookmakerMarkets = oddsEvent?.bookmakers?.[bookmaker] ?? [];
  const detailMarkets = mapOddsMarkets(fixtureId, bookmakerMarkets);
  const markets: FixtureListMarket[] = detailMarkets.map((market) => ({
    marketId: market.marketId,
    marketName: market.marketName,
    marketType: market.marketType,
    marketStatus: {
      type: market.marketStatus.type,
    },
    selectionOdds: market.selectionOdds.map((selection, selectionIndex) => ({
      odds: selection.odds,
      displayOdds: selection.displayOdds,
      selectionId: selectionIndex + 1,
      selectionName: selection.selectionName,
    })),
  }));

  return {
    fixtureId,
    fixtureName: `${event.home} vs ${event.away}`,
    startTime: event.date,
    sport: {
      sportId: event.sport.slug,
      sportName: event.sport.name,
      abbreviation: event.sport.slug,
    },
    score: {
      home: competitorData.home.score,
      away: competitorData.away.score,
    },
    markets,
    marketsTotalCount: markets.length,
    competitors: competitorData,
    tournament: {
      name: event.league.name,
      sportId: event.sport.slug,
      startTime: event.date,
      tournamentId: event.league.slug,
    },
    status: toMatchStatus(event.status),
  };
};

export const mapOddsEventToFixtureDetails = (
  oddsEvent: OddsApiOddsEvent,
  bookmaker: string,
): OddsFeedFixtureDetails => {
  const fixtureId = String(oddsEvent.id);
  const competitors = toCompetitors(oddsEvent);
  const bookmakerMarkets = oddsEvent.bookmakers?.[bookmaker] ?? [];
  const marketsList = mapOddsMarkets(fixtureId, bookmakerMarkets);
  const groupedMarkets = marketsList.reduce<Record<string, FixtureDetailMarket[]>>(
    (accumulator, market) => {
      const key = market.marketCategory;
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(market);
      return accumulator;
    },
    {},
  );

  return {
    competitors,
    fixtureId,
    fixtureName: `${oddsEvent.home} vs ${oddsEvent.away}`,
    isLive: `${oddsEvent.status}`.toLowerCase() === "live",
    markets: groupedMarkets,
    marketsList,
    marketsTotalCount: marketsList.length,
    sport: {
      abbreviation: oddsEvent.sport.slug,
      displayToPunters: true,
      name: oddsEvent.sport.name,
      sportId: oddsEvent.sport.slug,
      startTime: oddsEvent.date,
    },
    status: toMatchStatus(oddsEvent.status),
    tournament: {
      name: oddsEvent.league.name,
      sportId: oddsEvent.sport.slug,
      startTime: oddsEvent.date,
      tournamentId: oddsEvent.league.slug,
    },
    startTime: oddsEvent.date,
  };
};

export const getFallbackFixtureListResponse = (params: {
  bookmaker: string;
  itemsPerPage: number;
  currentPage: number;
}): OddsFeedListResponse => {
  const fixture = mapOddsEventToFixtureListItem(
    SAMPLE_ODDS_EVENT,
    SAMPLE_ODDS_EVENT,
    params.bookmaker,
  );
  return {
    data: [fixture],
    totalCount: 1,
    itemsPerPage: params.itemsPerPage,
    currentPage: params.currentPage,
    hasNextPage: false,
  };
};

export const getFallbackFixtureDetails = (
  bookmaker: string,
): OddsFeedFixtureDetails => {
  return mapOddsEventToFixtureDetails(SAMPLE_ODDS_EVENT, bookmaker);
};

const uniqueByEventId = (events: OddsApiEvent[]): OddsApiEvent[] => {
  const deduplicatedEvents = new Map<string, OddsApiEvent>();
  events.forEach((event) => {
    deduplicatedEvents.set(String(event.id), event);
  });
  return Array.from(deduplicatedEvents.values());
};

const compareByDateAscending = (left: OddsApiEvent, right: OddsApiEvent) =>
  new Date(left.date).getTime() - new Date(right.date).getTime();

const compareByDateDescending = (left: OddsApiEvent, right: OddsApiEvent) =>
  new Date(right.date).getTime() - new Date(left.date).getTime();

const chunkEventIds = (
  events: OddsApiEvent[],
  chunkSize: number,
): string[][] => {
  const ids = events.map((event) => String(event.id));
  if (ids.length === 0) {
    return [];
  }

  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += chunkSize) {
    chunks.push(ids.slice(index, index + chunkSize));
  }
  return chunks;
};

const toOddsStatuses = (fixtureStatus?: string): OddsApiStatus[] => {
  switch (`${fixtureStatus || ""}`.toUpperCase()) {
    case "IN_PLAY":
      return ["live"];
    case "UPCOMING":
      return ["pending"];
    case "FINISHED":
      return ["settled"];
    default:
      return ["pending", "live"];
  }
};

export const getQueryText = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export const getQueryNumber = (
  value: string | string[] | undefined,
  fallback: number,
): number => {
  if (Array.isArray(value)) {
    return toPositiveInteger(value[0], fallback);
  }
  return toPositiveInteger(value, fallback);
};

export const getFixturesFromOddsFeed = async (params: {
  apiKey: string;
  sport: string;
  bookmaker: string;
  fixtureStatus?: string;
  competitionId?: string;
  currentPage: number;
  itemsPerPage: number;
}): Promise<OddsFeedListResponse> => {
  const statuses = toOddsStatuses(params.fixtureStatus);
  const eventsByStatus = await Promise.all(
    statuses.map((status) =>
      requestJson<OddsApiEvent[]>(
        buildRequestUrl("events", {
          apiKey: params.apiKey,
          sport: params.sport || DEFAULT_ODDS_SPORT,
          status,
          limit: 100,
          skip: 0,
        }),
      ),
    ),
  );

  let allEvents = uniqueByEventId(
    eventsByStatus.reduce<OddsApiEvent[]>(
      (accumulator, events) => accumulator.concat(events),
      [],
    ),
  );
  if (params.competitionId) {
    const competition = params.competitionId.toLowerCase();
    allEvents = allEvents.filter((event) => {
      return (
        event.league.slug.toLowerCase() === competition ||
        event.league.name.toLowerCase() === competition
      );
    });
  }

  const isResultsFeed = statuses.length === 1 && statuses[0] === "settled";
  allEvents.sort(isResultsFeed ? compareByDateDescending : compareByDateAscending);

  const startIndex = (params.currentPage - 1) * params.itemsPerPage;
  const endIndex = startIndex + params.itemsPerPage;
  const pageEvents = allEvents.slice(startIndex, endIndex);
  const hasNextPage = endIndex < allEvents.length;
  if (!pageEvents.length) {
    return {
      data: [],
      totalCount: allEvents.length,
      itemsPerPage: params.itemsPerPage,
      currentPage: params.currentPage,
      hasNextPage,
    };
  }

  const eventIdChunks = chunkEventIds(pageEvents, MAX_MULTI_ODDS_EVENT_IDS);
  const oddsEventsByChunk = await Promise.all(
    eventIdChunks.map((eventIds) =>
      requestJson<OddsApiOddsEvent[]>(
        buildRequestUrl("odds/multi", {
          apiKey: params.apiKey,
          eventIds: eventIds.join(","),
          bookmakers: params.bookmaker,
        }),
      ),
    ),
  );
  const oddsById = new Map<string, OddsApiOddsEvent>();
  oddsEventsByChunk.forEach((oddsEvents) => {
    oddsEvents.forEach((event) => {
      oddsById.set(String(event.id), event);
    });
  });

  const fixtures = pageEvents.map((event) =>
    mapOddsEventToFixtureListItem(
      event,
      oddsById.get(String(event.id)),
      params.bookmaker,
    ),
  );

  return {
    data: fixtures,
    totalCount: allEvents.length,
    itemsPerPage: params.itemsPerPage,
    currentPage: params.currentPage,
    hasNextPage,
  };
};

export const getFixtureByIdFromOddsFeed = async (params: {
  apiKey: string;
  eventId: string;
  bookmaker: string;
}): Promise<OddsFeedFixtureDetails> => {
  const oddsEvent = await requestJson<OddsApiOddsEvent>(
    buildRequestUrl("odds", {
      apiKey: params.apiKey,
      eventId: params.eventId,
      bookmakers: params.bookmaker,
    }),
  );

  return mapOddsEventToFixtureDetails(oddsEvent, params.bookmaker);
};
