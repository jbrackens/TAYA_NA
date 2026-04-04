export type CanonicalSportKey =
  | "esports"
  | "mlb"
  | "nfl"
  | "ncaa_baseball"
  | "nba"
  | "ufc";

export type SportRegistryEntry = {
  sportKey: CanonicalSportKey;
  displayName: string;
  providerSport: string;
  aliases: string[];
  enabled: boolean;
};

type RegistrySeed = {
  displayName: string;
  providerSport: string;
  aliases: string[];
};

const REGISTRY_SEED: Record<CanonicalSportKey, RegistrySeed> = {
  esports: {
    displayName: "Esports",
    providerSport: "esports",
    aliases: ["esport"],
  },
  mlb: {
    displayName: "MLB",
    providerSport: "baseball_mlb",
    aliases: ["baseball"],
  },
  nfl: {
    displayName: "NFL",
    providerSport: "americanfootball_nfl",
    aliases: ["american-football", "american_football"],
  },
  ncaa_baseball: {
    displayName: "NCAA Baseball",
    providerSport: "baseball_ncaa",
    aliases: ["ncaa-baseball", "college-baseball"],
  },
  nba: {
    displayName: "NBA",
    providerSport: "basketball_nba",
    aliases: ["basketball"],
  },
  ufc: {
    displayName: "UFC",
    providerSport: "mma_mixed_martial_arts",
    aliases: ["mma"],
  },
};

const ROUTE_FILTER_TOKENS = new Set([
  "home",
  "in-play",
  "in_play",
  "upcoming",
  "matches",
  "results",
]);

type SportMapOverrides = Partial<Record<CanonicalSportKey, string>>;

const normalizeToken = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, "_");

const isCanonicalSportKey = (value: string): value is CanonicalSportKey =>
  Object.prototype.hasOwnProperty.call(REGISTRY_SEED, value);

const parseEnabledSports = (value: string | undefined): Set<CanonicalSportKey> => {
  if (!value || value.trim() === "") {
    return new Set(Object.keys(REGISTRY_SEED) as CanonicalSportKey[]);
  }

  const enabled = new Set<CanonicalSportKey>();
  value
    .split(",")
    .map((part) => normalizeToken(part))
    .forEach((token) => {
      if (isCanonicalSportKey(token)) {
        enabled.add(token);
      }
    });

  // Always keep esports available as safe default.
  enabled.add("esports");
  return enabled;
};

const parseSportMapOverrides = (value: string | undefined): SportMapOverrides => {
  if (!value || value.trim() === "") {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const overrides: SportMapOverrides = {};
    Object.keys(REGISTRY_SEED).forEach((rawKey) => {
      if (!isCanonicalSportKey(rawKey)) {
        return;
      }
      const overrideValue = parsed[rawKey];
      if (typeof overrideValue === "string" && overrideValue.trim() !== "") {
        overrides[rawKey] = overrideValue.trim();
      }
    });
    return overrides;
  } catch (_error) {
    return {};
  }
};

const findEntryByToken = (
  token: string,
  entries: SportRegistryEntry[],
): SportRegistryEntry | undefined => {
  return entries.find((entry) => {
    if (normalizeToken(entry.sportKey) === token) {
      return true;
    }
    if (normalizeToken(entry.providerSport) === token) {
      return true;
    }
    return entry.aliases.some((alias) => normalizeToken(alias) === token);
  });
};

export const getSportRegistry = (): SportRegistryEntry[] => {
  const enabledSports = parseEnabledSports(process.env.ODDS_API_ENABLED_SPORTS);
  const mapOverrides = parseSportMapOverrides(process.env.ODDS_API_SPORT_MAP);

  const entries = (Object.keys(REGISTRY_SEED) as CanonicalSportKey[]).map(
    (sportKey) => {
      const seed = REGISTRY_SEED[sportKey];
      return {
        sportKey,
        displayName: seed.displayName,
        providerSport: mapOverrides[sportKey] || seed.providerSport,
        aliases: seed.aliases,
        enabled: enabledSports.has(sportKey),
      };
    },
  );

  return entries;
};

const pickFallbackEntry = (
  fallbackSport: string,
  entries: SportRegistryEntry[],
): SportRegistryEntry | undefined => {
  const fallbackToken = normalizeToken(fallbackSport);
  const byFallback = findEntryByToken(fallbackToken, entries);
  if (byFallback && byFallback.enabled) {
    return byFallback;
  }

  return entries.find((entry) => entry.enabled);
};

export const resolveOddsFeedSport = (params: {
  requestedSport?: string;
  fallbackSport: string;
}): {
  sportKey: CanonicalSportKey | "custom";
  providerSport: string;
  usedFallback: boolean;
} => {
  const entries = getSportRegistry();
  const normalizedRequested =
    params.requestedSport && params.requestedSport.trim() !== ""
      ? normalizeToken(params.requestedSport)
      : "";

  if (normalizedRequested !== "" && !ROUTE_FILTER_TOKENS.has(normalizedRequested)) {
    const requestedEntry = findEntryByToken(normalizedRequested, entries);
    if (requestedEntry && requestedEntry.enabled) {
      return {
        sportKey: requestedEntry.sportKey,
        providerSport: requestedEntry.providerSport,
        usedFallback: false,
      };
    }
  }

  const fallbackEntry = pickFallbackEntry(params.fallbackSport, entries);
  if (fallbackEntry) {
    return {
      sportKey: fallbackEntry.sportKey,
      providerSport: fallbackEntry.providerSport,
      usedFallback: true,
    };
  }

  return {
    sportKey: "custom",
    providerSport: params.fallbackSport,
    usedFallback: true,
  };
};
