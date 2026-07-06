import type { ParsedUrlQuery } from "querystring";

export const DEFAULT_SPORT_ROUTE_KEY = "esports";
export const DEFAULT_LEAGUE_ROUTE_KEY = "all";

const SPORT_ROUTE_ALIASES: Record<string, string> = {
  asports: DEFAULT_SPORT_ROUTE_KEY,
  "a-sports": DEFAULT_SPORT_ROUTE_KEY,
};

const firstQueryValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value.find((item) => `${item || ""}`.trim() !== "");
  }
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }
  return undefined;
};

export const canonicalizeSportRouteKey = (
  value: string,
  fallback: string = DEFAULT_SPORT_ROUTE_KEY,
): string => {
  const normalized = `${value || ""}`.trim().toLowerCase();
  if (normalized === "") {
    return fallback;
  }
  return SPORT_ROUTE_ALIASES[normalized] || normalized;
};

const normalizedSportSegment = (value: string, fallback: string): string =>
  canonicalizeSportRouteKey(value, fallback);

const normalizedSegment = (value: string, fallback: string): string => {
  const normalized = `${value || ""}`.trim();
  return normalized === "" ? fallback : normalized;
};

const encodedSportPathSegment = (value: string, fallback: string): string =>
  encodeURIComponent(normalizedSportSegment(value, fallback));

const encodedPathSegment = (value: string, fallback: string): string =>
  encodeURIComponent(normalizedSegment(value, fallback));

export const isSportsRoutePath = (pathname: string): boolean =>
  `${pathname || ""}`.startsWith("/sports");

export const resolveSportRouteKey = (
  query: ParsedUrlQuery,
  fallback: string = DEFAULT_SPORT_ROUTE_KEY,
): string =>
  normalizedSportSegment(
    firstQueryValue(query.gameFilter) ||
      firstQueryValue(query.sportKey) ||
      firstQueryValue(query.sport) ||
      fallback,
    fallback,
  );

export const resolveLeagueRouteKey = (
  query: ParsedUrlQuery,
): string | undefined =>
  firstQueryValue(query.competitionId) || firstQueryValue(query.leagueKey);

export const resolveEventRouteKey = (
  query: ParsedUrlQuery,
): string | undefined =>
  firstQueryValue(query.fixtureId) || firstQueryValue(query.eventKey);

export const buildSportsSportPath = (sportKey: string): string =>
  `/sports/${encodedSportPathSegment(sportKey, DEFAULT_SPORT_ROUTE_KEY)}`;

export const buildSportsLeaguePath = (
  sportKey: string,
  leagueKey: string,
): string =>
  `${buildSportsSportPath(sportKey)}/${encodedPathSegment(
    leagueKey,
    DEFAULT_LEAGUE_ROUTE_KEY,
  )}`;

export const buildSportsMatchPath = (
  sportKey: string,
  leagueKey: string,
  eventKey: string,
): string =>
  `${buildSportsLeaguePath(sportKey, leagueKey)}/match/${encodeURIComponent(
    `${eventKey || ""}`.trim(),
  )}`;

export const buildLegacyMatchPath = (
  sportKey: string,
  eventKey: string,
): string =>
  `/esports-bets/${encodedSportPathSegment(
    sportKey,
    DEFAULT_SPORT_ROUTE_KEY,
  )}/match/${encodeURIComponent(`${eventKey || ""}`.trim())}`;

export const dedupeSportLikeItems = <
  T extends { abbreviation?: string; id?: string; name?: string },
>(
  sports: T[],
): T[] => {
  const deduped = new Map<string, T>();
  sports.forEach((sport) => {
    const key = canonicalizeSportRouteKey(
      `${sport.abbreviation || sport.id || ""}`,
    );
    if (!deduped.has(key)) {
      deduped.set(key, {
        ...sport,
        abbreviation: key,
        id: key,
      });
    }
  });
  return Array.from(deduped.values());
};
