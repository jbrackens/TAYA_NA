// Reusable market templates (Market Quality Pipeline, 2026-07-07).
//
// A template is a recognized market SHAPE: it names the required resolution
// metadata, the category family whose validator applies, and a title pattern
// used both to match model output and to suggest normalized titles. Matching
// is deterministic and conservative — a wrong template is worse than none,
// so matchTemplate returns undefined below the confidence floor.

import type { MarketCandidate, ResolverType } from "./types";

export type CategoryFamily =
  | "sports"
  | "politics"
  | "crypto_finance"
  | "entertainment"
  | "general";

export interface MarketTemplate {
  id: string;
  family: CategoryFamily;
  description: string;
  /** Regexes tried against the candidate question/title (case-insensitive). */
  match: RegExp[];
  /** ResolutionPlan fields this template expects to be present. */
  requiredResolutionFields: Array<
    "primaryResolutionSource" | "resolutionMetric" | "resolutionSourceUrl"
  >;
  /** Default resolver type when the model didn't provide one. */
  defaultResolverType: ResolverType;
  /** Extra validator expectations, shown to admins as suggestions. */
  validationNotes: string[];
}

export const MARKET_TEMPLATES: MarketTemplate[] = [
  {
    id: "will_team_win_match",
    family: "sports",
    description: "Team/player wins a specific match or fixture",
    match: [
      /will .+ (win|beat|defeat) .*(match|game|final|semi-?final|fixture|series|map|set)\b/i,
      /will .+ (win|beat|defeat) (the )?[A-Z][\w .'-]+ (on|in|at) /i,
    ],
    requiredResolutionFields: ["primaryResolutionSource"],
    defaultResolverType: "api_scoreboard",
    validationNotes: [
      "name the official league/competition result page as primary source",
      "state the match date and competition exactly",
      "define cancellation/postponement/void handling",
      "define overtime/extra-time treatment if the sport has it",
    ],
  },
  {
    id: "will_candidate_win_election",
    family: "politics",
    description: "Candidate/party wins a named election",
    match: [
      /will .+ win (the )?\d{4} .*(election|primary|nomination|presidency|senate|governor)/i,
      /will .+ (be elected|become) (president|governor|senator|mayor|prime minister)/i,
    ],
    requiredResolutionFields: ["primaryResolutionSource"],
    defaultResolverType: "manual_official_page",
    validationNotes: [
      "primary source must be the official election authority",
      "state the jurisdiction and election date",
      "note recount/withdrawal handling in ambiguous cases",
    ],
  },
  {
    id: "will_asset_close_above_price_on_date",
    family: "crypto_finance",
    description: "Asset/index closes above a threshold on a date",
    match: [
      /will .+ (close|trade|be) (above|below|over|under) \$?[\d,.]+[kmb]? (on|by|at)\b/i,
      /will (the )?(price of )?.+ (hit|reach|exceed) \$?[\d,.]+[kmb]?\b/i,
    ],
    requiredResolutionFields: [
      "primaryResolutionSource",
      "resolutionMetric",
    ],
    defaultResolverType: "exchange_close",
    validationNotes: [
      "name the exact exchange/index and the candle/close methodology",
      "state the timestamp and timezone of the reading",
      "avoid ambiguous 'hits price' phrasing unless an intraday source is named",
    ],
  },
  {
    id: "recurring_report_threshold",
    family: "crypto_finance",
    description: "Scheduled data release vs a threshold (CPI, NFP, rates…)",
    match: [
      /will .*(cpi|inflation|unemployment|nonfarm|payrolls|gdp|rate (cut|hike)|fomc|interest rate)/i,
    ],
    requiredResolutionFields: [
      "primaryResolutionSource",
      "resolutionMetric",
    ],
    defaultResolverType: "gov_data_release",
    validationNotes: [
      "primary source must be the official statistical release (BLS/FRED/central bank)",
      "close BEFORE the scheduled release time, timezone-aware",
      "name the exact series/metric and revision handling",
    ],
  },
  {
    id: "will_event_happen_by_date",
    family: "general",
    description: "Named event happens by a deadline",
    match: [/will .+ (by|before) (end of )?([A-Z][a-z]+ \d|\d{4}|Q[1-4])/i],
    requiredResolutionFields: ["primaryResolutionSource"],
    defaultResolverType: "manual_official_page",
    validationNotes: [
      "name a specific announcing body as the source of truth",
      "define what does NOT count in doesNotCount",
    ],
  },
  {
    id: "will_person_announce_action_by_date",
    family: "general",
    description: "Person/org announces or does something by a deadline",
    match: [
      /will .+ (announce|launch|release|resign|step down|drop out|sign|file|approve)\b/i,
    ],
    requiredResolutionFields: ["primaryResolutionSource"],
    defaultResolverType: "organizer_announcement",
    validationNotes: [
      "the announcement channel must be named (official account, IR page, filing)",
      "corporate actions should cite investor relations or an SEC filing",
    ],
  },
  {
    id: "which_option_will_win",
    family: "entertainment",
    description: "Named contender wins an award/title/pageant",
    match: [
      /will .+ win (the )?.*(award|oscar|grammy|emmy|title|pageant|miss |best )/i,
    ],
    requiredResolutionFields: ["primaryResolutionSource"],
    defaultResolverType: "organizer_announcement",
    validationNotes: [
      "primary source must be the official organizer",
      "state the award/category exactly as the organizer names it",
      "note disqualification/withdrawal and delayed-announcement handling",
    ],
  },
];

/** Map a candidate's category string onto a validator family. */
export function categoryFamily(candidate: MarketCandidate): CategoryFamily {
  const cat = `${candidate.category ?? ""} ${candidate.subcategory ?? ""} ${(
    candidate.tags ?? []
  ).join(" ")}`.toLowerCase();
  if (/sport|football|soccer|nba|nfl|mlb|esport|dota|mlbb|cricket|tennis/.test(cat))
    return "sports";
  if (/politic|election|senate|congress|president|government|geopolit/.test(cat))
    return "politics";
  if (/crypto|bitcoin|finance|economic|market|fed|rates|stock|macro/.test(cat))
    return "crypto_finance";
  if (/entertain|culture|celebrity|music|film|movie|award|pageant/.test(cat))
    return "entertainment";
  return "general";
}

/**
 * Deterministic template match on question/title text. Family agreement is
 * required unless the pattern is unambiguous (two regex hits).
 */
export function matchTemplate(
  candidate: MarketCandidate,
): MarketTemplate | undefined {
  const text = `${candidate.marketTitle} ${candidate.marketQuestion}`;
  const family = categoryFamily(candidate);
  let best: { template: MarketTemplate; hits: number } | undefined;
  for (const template of MARKET_TEMPLATES) {
    const hits = template.match.filter((re) => re.test(text)).length;
    if (hits === 0) continue;
    const familyAgrees =
      template.family === family || template.family === "general";
    if (!familyAgrees && hits < 2) continue;
    if (!best || hits > best.hits) best = { template, hits };
  }
  return best?.template;
}
