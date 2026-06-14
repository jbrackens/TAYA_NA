type MarketLike = object;

type CategoryLike =
  | string
  | {
      slug?: string;
      name?: string;
    }
  | null
  | undefined;

type TaxonomyEntry = {
  label: string;
  aliases: string[];
};

const TAXONOMY: Record<string, TaxonomyEntry[]> = {
  politics: [
    {
      label: "US Elections",
      aliases: [
        "us elections",
        "election",
        "elections",
        "midterms",
        "primary",
        "runoff",
        "ballot",
        "vote",
      ],
    },
    { label: "Congress", aliases: ["congress", "senate", "house"] },
    {
      label: "White House",
      aliases: [
        "white house",
        "president",
        "presidential",
        "jd vance",
        "trump",
        "biden",
      ],
    },
    {
      label: "Global Policy",
      aliases: [
        "global policy",
        "foreign policy",
        "geopolitics",
        "nato",
        "china",
        "taiwan",
        "putin",
        "zelenskyy",
      ],
    },
  ],
  crypto: [
    { label: "Bitcoin", aliases: ["bitcoin", "btc"] },
    { label: "Ethereum", aliases: ["ethereum", "eth"] },
    { label: "Solana", aliases: ["solana", "sol"] },
    {
      label: "Layer 2s",
      aliases: ["layer 2", "layer 2s", "l2", "arbitrum", "optimism", "base"],
    },
    {
      label: "Memecoins",
      aliases: ["memecoin", "memecoins", "doge", "pepe", "shib"],
    },
  ],
  sports: [
    { label: "NFL", aliases: ["nfl", "american football"] },
    { label: "NBA", aliases: ["nba", "basketball"] },
    {
      label: "NHL",
      aliases: ["nhl", "hockey", "stanley cup", "professional hockey"],
    },
    {
      label: "MLB",
      aliases: ["mlb", "baseball", "world series", "professional baseball"],
    },
    { label: "FIFA", aliases: ["fifa", "world cup", "fifa world cup"] },
    {
      label: "Soccer",
      aliases: ["soccer", "football", "uefa", "ucl", "champions league"],
    },
    { label: "UFC", aliases: ["ufc", "mma"] },
    { label: "Tennis", aliases: ["tennis", "wimbledon", "atp", "wta"] },
  ],
  entertainment: [
    { label: "Oscars", aliases: ["oscars", "academy awards"] },
    { label: "Box Office", aliases: ["box office", "movies", "film"] },
    {
      label: "Pop Culture",
      aliases: [
        "pop culture",
        "celebrity",
        "music",
        "album",
        "rihanna",
        "playboi carti",
        "taylor swift",
        "travis kelce",
      ],
    },
    { label: "Gaming", aliases: ["gaming", "game", "esports"] },
  ],
  technology: [
    {
      label: "AI & Models",
      aliases: [
        "ai",
        "artificial intelligence",
        "llm",
        "model",
        "models",
        "gpt",
        "openai",
        "anthropic",
        "claude",
      ],
    },
    {
      label: "Big Tech",
      aliases: [
        "big tech",
        "apple",
        "google",
        "meta",
        "amazon",
        "microsoft",
        "tesla",
        "musk",
      ],
    },
    { label: "SpaceX", aliases: ["spacex", "starship"] },
    {
      label: "Hardware",
      aliases: [
        "hardware",
        "chips",
        "semiconductor",
        "iphone",
        "device",
        "nvidia",
        "gpu",
        "rtx",
      ],
    },
  ],
  economics: [
    {
      label: "Fed Rates",
      aliases: [
        "fed rates",
        "fed",
        "fomc",
        "interest rates",
        "federal reserve",
        "rate cut",
        "rate hike",
        "ecb",
        "boj",
        "boe",
        "pbc",
      ],
    },
    {
      label: "Inflation/CPI",
      aliases: ["inflation", "cpi", "pce", "consumer price index"],
    },
    {
      label: "Stock Market",
      aliases: ["stock market", "stocks", "s&p", "nasdaq", "dow"],
    },
    {
      label: "Crypto Markets",
      aliases: ["crypto markets", "crypto market", "bitcoin etf"],
    },
    { label: "GDP/Growth", aliases: ["gdp", "real gdp", "economic growth"] },
    {
      label: "Labor Market",
      aliases: ["unemployment", "jobs report", "labor market"],
    },
  ],
};

const CATEGORY_ALIASES: Record<string, string> = {
  economy: "economics",
  economics: "economics",
  entertainment: "entertainment",
  politics: "politics",
  crypto: "crypto",
  sports: "sports",
  tech: "technology",
  technology: "technology",
};

const DIRECT_FIELDS = [
  "category",
  "categorySlug",
  "category_slug",
  "eventGroup",
  "event_group",
  "eventSlug",
  "event_slug",
  "group",
  "groupSlug",
  "group_slug",
  "labels",
  "league",
  "leagueKey",
  "league_key",
  "marketType",
  "market_type",
  "series",
  "seriesSlug",
  "series_slug",
  "seriesTitle",
  "series_title",
  "sport",
  "sportKey",
  "tag",
  "tags",
  "topic",
  "topics",
  "tournament",
  "type",
];

const SEARCH_FIELDS = [
  ...DIRECT_FIELDS,
  "description",
  "eventTitle",
  "event_title",
  "name",
  "no_sub_title",
  "question",
  "rules",
  "rules_primary",
  "metadata",
  "settlementParams",
  "settlement_params",
  "subTitle",
  "subtitle",
  "title",
  "yes_sub_title",
];

const GENERIC_VALUES = new Set([
  "binary",
  "clob",
  "daily",
  "general",
  "hourly",
  "market",
  "market price",
  "markets",
  "monthly",
  "no",
  "open",
  "other",
  "parlay",
  "price",
  "recurring",
  "single",
  "uncategorized",
  "weekly",
  "yes",
]);

function categoryKey(category: CategoryLike): string {
  const raw =
    typeof category === "string"
      ? category
      : category?.slug || category?.name || "";
  const normalized = normalizePhrase(raw);
  return CATEGORY_ALIASES[normalized] || normalized;
}

function isGeneralCategory(category: CategoryLike): boolean {
  const key = categoryKey(category);
  return key === "" || key === "all" || key === "general";
}

function normalizePhrase(value: string): string {
  return value
    .replace(/&/g, " and ")
    .replace(/[_-]/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function containsPhrase(haystack: string, needle: string): boolean {
  const text = ` ${normalizePhrase(haystack)} `;
  const query = ` ${normalizePhrase(needle)} `;
  return query.trim() !== "" && text.includes(query);
}

function titleize(value: string): string {
  return normalizePhrase(value)
    .split(" ")
    .map((part) =>
      part.length <= 3
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ");
}

function readField(record: MarketLike, field: string): unknown {
  const values = record as Record<string, unknown>;
  if (field in values) return values[field];
  const lower = field.toLowerCase();
  const key = Object.keys(values).find(
    (candidate) => candidate.toLowerCase() === lower,
  );
  return key ? values[key] : undefined;
}

function collectStrings(value: unknown, depth = 0): string[] {
  if (value == null || depth > 4) return [];
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (typeof value === "number" || typeof value === "boolean") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStrings(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      collectStrings(item, depth + 1),
    );
  }
  return [];
}

function stringsFromFields(market: MarketLike, fields: string[]): string[] {
  return fields.flatMap((field) => collectStrings(readField(market, field)));
}

function knownLabelForText(category: string, value: string): string | null {
  const entries = TAXONOMY[category] || [];
  for (const entry of entries) {
    const aliases = [entry.label, ...entry.aliases];
    if (aliases.some((alias) => containsPhrase(value, alias))) {
      return entry.label;
    }
  }
  return null;
}

function cleanDynamicCandidate(value: string, activeCategory: string): string | null {
  const normalized = normalizePhrase(value);
  if (
    normalized.length < 3 ||
    normalized.length > 32 ||
    normalized.startsWith("http") ||
    normalized === activeCategory ||
    GENERIC_VALUES.has(normalized) ||
    Object.keys(CATEGORY_ALIASES).includes(normalized)
  ) {
    return null;
  }
  return titleize(value);
}

function uniqueInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizePhrase(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractMarketSubcategories(
  markets: readonly MarketLike[],
  category: CategoryLike,
): string[] {
  const key = categoryKey(category);
  if (isGeneralCategory(category)) return [];

  const known = new Set<string>();
  const dynamic: string[] = [];

  for (const market of markets) {
    for (const text of stringsFromFields(market, SEARCH_FIELDS)) {
      const label = knownLabelForText(key, text);
      if (label) known.add(label);
    }
    for (const value of stringsFromFields(market, DIRECT_FIELDS)) {
      const label = knownLabelForText(key, value);
      if (label) {
        known.add(label);
        continue;
      }
      const cleaned = cleanDynamicCandidate(value, key);
      if (cleaned) dynamic.push(cleaned);
    }
  }

  const fallback = TAXONOMY[key]?.map((entry) => entry.label) || [];
  const orderedKnown = fallback.filter((label) => known.has(label));
  const extras = uniqueInOrder(dynamic).filter(
    (label) =>
      !orderedKnown.some(
        (knownLabel) => normalizePhrase(knownLabel) === normalizePhrase(label),
      ),
  );

  if (orderedKnown.length > 0 || extras.length > 0) {
    return [...orderedKnown, ...extras];
  }

  return fallback;
}

export function marketMatchesSubcategory(
  market: MarketLike,
  subcategory: string | null,
  category?: CategoryLike,
): boolean {
  if (!subcategory) return true;
  const key = categoryKey(category);
  const textValues = stringsFromFields(market, SEARCH_FIELDS);
  const known = TAXONOMY[key]?.find(
    (entry) => normalizePhrase(entry.label) === normalizePhrase(subcategory),
  );
  const aliases = known ? [known.label, ...known.aliases] : [subcategory];
  return textValues.some((value) =>
    aliases.some((alias) => containsPhrase(value, alias)),
  );
}
