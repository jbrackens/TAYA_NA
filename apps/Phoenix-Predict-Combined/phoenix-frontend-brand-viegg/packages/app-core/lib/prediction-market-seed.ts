export type PredictionMarketStatus = "open" | "live" | "resolved";

export type PredictionCategory = {
  key: string;
  label: string;
  description: string;
  accent: string;
};

export type PredictionOutcome = {
  outcomeId: string;
  label: string;
  priceCents: number;
  change1d: number;
};

export type PredictionMarket = {
  marketId: string;
  slug: string;
  title: string;
  shortTitle: string;
  categoryKey: string;
  categoryLabel: string;
  status: PredictionMarketStatus;
  featured: boolean;
  live: boolean;
  closesAt: string;
  resolvesAt: string;
  volumeUsd: number;
  liquidityUsd: number;
  participants: number;
  summary: string;
  insight: string;
  rules: string[];
  tags: string[];
  resolutionSource: string;
  heroMetricLabel: string;
  heroMetricValue: string;
  probabilityPercent: number;
  priceChangePercent: number;
  outcomes: PredictionOutcome[];
  relatedMarketIds: string[];
};

export type PredictionOverview = {
  featuredMarkets: PredictionMarket[];
  liveMarkets: PredictionMarket[];
  trendingMarkets: PredictionMarket[];
  categories: PredictionCategory[];
};

export const predictionCategories: PredictionCategory[] = [
  {
    key: "crypto",
    label: "Crypto",
    description: "Bitcoin, Solana, ETFs, and crypto catalysts.",
    accent: "#00d4aa",
  },
  {
    key: "politics",
    label: "Politics",
    description: "Elections, legislation, and government risk.",
    accent: "#4f8cff",
  },
  {
    key: "macro",
    label: "Macro",
    description: "Rates, inflation, and market-moving macro calls.",
    accent: "#ffb020",
  },
  {
    key: "sports",
    label: "Sports",
    description: "Narrative-driven sports outcomes beyond sportsbook lines.",
    accent: "#7a5cff",
  },
  {
    key: "culture",
    label: "Culture",
    description: "Entertainment, launches, and internet moments.",
    accent: "#ff5c7a",
  },
  {
    key: "technology",
    label: "Technology",
    description: "AI launches, platform bets, and tech milestones.",
    accent: "#5cc8ff",
  },
];

export const predictionMarkets: PredictionMarket[] = [
  {
    marketId: "pm-btc-120k-2026",
    slug: "bitcoin-120k-before-2026-close",
    title: "Will Bitcoin trade above $120k before December 31, 2026?",
    shortTitle: "BTC above $120k in 2026",
    categoryKey: "crypto",
    categoryLabel: "Crypto",
    status: "live",
    featured: true,
    live: true,
    closesAt: "2026-12-31T23:00:00Z",
    resolvesAt: "2026-12-31T23:59:00Z",
    volumeUsd: 4825000,
    liquidityUsd: 965000,
    participants: 1842,
    summary: "A high-volume flagship crypto market tracking whether Bitcoin prints above the $120k threshold before year-end.",
    insight: "Momentum accelerated after ETF inflows returned and perpetual funding normalized.",
    rules: [
      "Resolves YES if a reputable reference source prints BTC/USD above 120,000.00 before market close.",
      "If the threshold is never printed before the close timestamp, the market resolves NO.",
    ],
    tags: ["Featured", "Live", "Crypto"],
    resolutionSource: "Composite BTC/USD reference basket",
    heroMetricLabel: "Implied YES",
    heroMetricValue: "62%",
    probabilityPercent: 62,
    priceChangePercent: 8.4,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 62, change1d: 4.2 },
      { outcomeId: "no", label: "No", priceCents: 38, change1d: -4.2 },
    ],
    relatedMarketIds: ["pm-solana-etf-2026", "pm-fed-cut-july-2026"],
  },
  {
    marketId: "pm-solana-etf-2026",
    slug: "solana-spot-etf-approved-before-2026-close",
    title: "Will a U.S. spot Solana ETF be approved before December 31, 2026?",
    shortTitle: "Spot SOL ETF in 2026",
    categoryKey: "crypto",
    categoryLabel: "Crypto",
    status: "open",
    featured: true,
    live: false,
    closesAt: "2026-12-31T23:00:00Z",
    resolvesAt: "2026-12-31T23:59:00Z",
    volumeUsd: 1395000,
    liquidityUsd: 355000,
    participants: 792,
    summary: "Tracks whether a U.S.-listed spot ETF for Solana receives formal approval before year-end.",
    insight: "The market tightened after new filing momentum and custody chatter improved the approval narrative.",
    rules: [
      "Resolves YES on formal approval by the relevant U.S. regulator before market close.",
      "Withdrawn or indefinitely delayed filings resolve NO at expiry.",
    ],
    tags: ["Featured", "ETF", "Crypto"],
    resolutionSource: "SEC filing / issuer announcement",
    heroMetricLabel: "Approval odds",
    heroMetricValue: "54%",
    probabilityPercent: 54,
    priceChangePercent: 3.1,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 54, change1d: 1.5 },
      { outcomeId: "no", label: "No", priceCents: 46, change1d: -1.5 },
    ],
    relatedMarketIds: ["pm-btc-120k-2026"],
  },
  {
    marketId: "pm-us-shutdown-q3-2026",
    slug: "us-government-shutdown-before-q3-2026-end",
    title: "Will the U.S. government enter a shutdown before September 30, 2026?",
    shortTitle: "U.S. shutdown before Q3 end",
    categoryKey: "politics",
    categoryLabel: "Politics",
    status: "live",
    featured: false,
    live: true,
    closesAt: "2026-09-30T23:00:00Z",
    resolvesAt: "2026-09-30T23:59:00Z",
    volumeUsd: 2130000,
    liquidityUsd: 442000,
    participants: 1114,
    summary: "A live policy-risk market following congressional budget negotiations and shutdown risk.",
    insight: "Spreads widened after the latest fiscal hawk bloc rejected the continuing resolution.",
    rules: [
      "Resolves YES if a federal government shutdown begins before the close timestamp.",
      "Temporary funding extensions without shutdown resolve NO at expiry.",
    ],
    tags: ["Live", "Politics"],
    resolutionSource: "Official federal operations notices",
    heroMetricLabel: "Shutdown risk",
    heroMetricValue: "47%",
    probabilityPercent: 47,
    priceChangePercent: 5.8,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 47, change1d: 2.9 },
      { outcomeId: "no", label: "No", priceCents: 53, change1d: -2.9 },
    ],
    relatedMarketIds: ["pm-fed-cut-july-2026"],
  },
  {
    marketId: "pm-fed-cut-july-2026",
    slug: "fed-cuts-rates-before-july-2026-meeting",
    title: "Will the Fed cut rates before the July 2026 meeting?",
    shortTitle: "Fed cut before July 2026",
    categoryKey: "macro",
    categoryLabel: "Macro",
    status: "open",
    featured: true,
    live: false,
    closesAt: "2026-07-28T18:00:00Z",
    resolvesAt: "2026-07-29T00:00:00Z",
    volumeUsd: 3280000,
    liquidityUsd: 610000,
    participants: 1368,
    summary: "A macro flagship market that prices the next pivot in Fed policy.",
    insight: "Softening payroll revisions tightened the curve and pulled YES into the lead.",
    rules: [
      "Resolves YES if the target range is lowered before the July 2026 meeting concludes.",
      "A hold or hike resolves NO.",
    ],
    tags: ["Featured", "Macro"],
    resolutionSource: "FOMC statement",
    heroMetricLabel: "Cut probability",
    heroMetricValue: "58%",
    probabilityPercent: 58,
    priceChangePercent: 2.6,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 58, change1d: 1.3 },
      { outcomeId: "no", label: "No", priceCents: 42, change1d: -1.3 },
    ],
    relatedMarketIds: ["pm-btc-120k-2026", "pm-us-shutdown-q3-2026"],
  },
  {
    marketId: "pm-lakers-playoffs-2026",
    slug: "lakers-make-playoffs-2026",
    title: "Will the Lakers make the 2026 NBA playoffs?",
    shortTitle: "Lakers make 2026 playoffs",
    categoryKey: "sports",
    categoryLabel: "Sports",
    status: "open",
    featured: false,
    live: false,
    closesAt: "2026-04-10T23:00:00Z",
    resolvesAt: "2026-04-18T23:00:00Z",
    volumeUsd: 945000,
    liquidityUsd: 210000,
    participants: 640,
    summary: "A narrative sports market for season-long team performance rather than a single game line.",
    insight: "The market moved after the latest trade-window rumour cycle and rest-management concerns.",
    rules: [
      "Resolves YES if the team officially qualifies for the postseason bracket or play-in pathway that converts into a playoff berth.",
      "Failure to qualify resolves NO.",
    ],
    tags: ["Sports"],
    resolutionSource: "Official NBA standings",
    heroMetricLabel: "Playoff odds",
    heroMetricValue: "44%",
    probabilityPercent: 44,
    priceChangePercent: -1.8,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 44, change1d: -0.9 },
      { outcomeId: "no", label: "No", priceCents: 56, change1d: 0.9 },
    ],
    relatedMarketIds: ["pm-jon-jones-return-2026"],
  },
  {
    marketId: "pm-jon-jones-return-2026",
    slug: "jon-jones-fights-again-before-2026-close",
    title: "Will Jon Jones fight again before December 31, 2026?",
    shortTitle: "Jon Jones return in 2026",
    categoryKey: "sports",
    categoryLabel: "Sports",
    status: "open",
    featured: false,
    live: false,
    closesAt: "2026-12-31T23:00:00Z",
    resolvesAt: "2026-12-31T23:59:00Z",
    volumeUsd: 675000,
    liquidityUsd: 133000,
    participants: 412,
    summary: "A celebrity-combat prediction market tracking whether one of MMA's biggest names returns to the cage.",
    insight: "Odds firmed after training-camp footage and promoter hints circulated.",
    rules: [
      "Resolves YES if Jon Jones completes a sanctioned professional MMA fight before market close.",
      "Announcements without an actual fight resolve NO.",
    ],
    tags: ["Sports", "UFC"],
    resolutionSource: "Official promotion result",
    heroMetricLabel: "Return odds",
    heroMetricValue: "36%",
    probabilityPercent: 36,
    priceChangePercent: 4.7,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 36, change1d: 2.4 },
      { outcomeId: "no", label: "No", priceCents: 64, change1d: -2.4 },
    ],
    relatedMarketIds: ["pm-lakers-playoffs-2026"],
  },
  {
    marketId: "pm-gta6-delay-2026",
    slug: "gta-vi-delayed-into-2027",
    title: "Will GTA VI be delayed into 2027?",
    shortTitle: "GTA VI delayed into 2027",
    categoryKey: "culture",
    categoryLabel: "Culture",
    status: "live",
    featured: false,
    live: true,
    closesAt: "2026-11-30T23:00:00Z",
    resolvesAt: "2026-12-31T23:00:00Z",
    volumeUsd: 1120000,
    liquidityUsd: 248000,
    participants: 882,
    summary: "A high-attention entertainment market that trades on launch-date confidence versus delay risk.",
    insight: "Community sentiment flipped after supply-chain chatter and silence on final gameplay reveal timing.",
    rules: [
      "Resolves YES if the title is officially delayed such that launch occurs in 2027 or later.",
      "If launch remains scheduled inside 2026, the market resolves NO.",
    ],
    tags: ["Live", "Culture"],
    resolutionSource: "Official publisher announcement",
    heroMetricLabel: "Delay odds",
    heroMetricValue: "41%",
    probabilityPercent: 41,
    priceChangePercent: 6.2,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 41, change1d: 3.1 },
      { outcomeId: "no", label: "No", priceCents: 59, change1d: -3.1 },
    ],
    relatedMarketIds: ["pm-openai-gpt6-2026"],
  },
  {
    marketId: "pm-openai-gpt6-2026",
    slug: "gpt-6-public-release-before-2026-close",
    title: "Will GPT-6 launch publicly before December 31, 2026?",
    shortTitle: "GPT-6 launches in 2026",
    categoryKey: "technology",
    categoryLabel: "Technology",
    status: "open",
    featured: true,
    live: false,
    closesAt: "2026-12-31T23:00:00Z",
    resolvesAt: "2026-12-31T23:59:00Z",
    volumeUsd: 2675000,
    liquidityUsd: 512000,
    participants: 1290,
    summary: "A flagship AI milestone market built around public model-launch timing.",
    insight: "The market repriced higher after enterprise roadmap chatter and new inference capacity signals.",
    rules: [
      "Resolves YES if a public release explicitly branded GPT-6 is announced before market close.",
      "Research previews or rumors alone do not resolve YES.",
    ],
    tags: ["Featured", "Technology"],
    resolutionSource: "Official product announcement",
    heroMetricLabel: "Launch odds",
    heroMetricValue: "49%",
    probabilityPercent: 49,
    priceChangePercent: 1.9,
    outcomes: [
      { outcomeId: "yes", label: "Yes", priceCents: 49, change1d: 0.9 },
      { outcomeId: "no", label: "No", priceCents: 51, change1d: -0.9 },
    ],
    relatedMarketIds: ["pm-gta6-delay-2026"],
  },
];

export const getPredictionOverview = (): PredictionOverview => ({
  featuredMarkets: predictionMarkets.filter((market) => market.featured),
  liveMarkets: predictionMarkets.filter((market) => market.live),
  trendingMarkets: [...predictionMarkets]
    .sort((left, right) => right.volumeUsd - left.volumeUsd)
    .slice(0, 4),
  categories: predictionCategories,
});

export const listPredictionMarkets = (filters?: {
  categoryKey?: string;
  status?: PredictionMarketStatus;
  liveOnly?: boolean;
  live?: boolean;
  featuredOnly?: boolean;
  featured?: boolean;
}) => {
  const categoryKey = `${filters?.categoryKey || ""}`.trim().toLowerCase();
  return predictionMarkets.filter((market) => {
    if (categoryKey && categoryKey !== "all" && market.categoryKey !== categoryKey) {
      return false;
    }
    if (filters?.status && market.status !== filters.status) {
      return false;
    }
    if (filters?.liveOnly && !market.live) {
      return false;
    }
    if (filters?.live !== undefined && market.live !== filters.live) {
      return false;
    }
    if (filters?.featuredOnly && !market.featured) {
      return false;
    }
    if (
      filters?.featured !== undefined &&
      market.featured !== filters.featured
    ) {
      return false;
    }
    return true;
  });
};

export const findPredictionMarket = (marketId: string) =>
  predictionMarkets.find((market) => market.marketId === marketId || market.slug === marketId);

export const findPredictionCategory = (categoryKey: string) =>
  predictionCategories.find((category) => category.key === categoryKey);
