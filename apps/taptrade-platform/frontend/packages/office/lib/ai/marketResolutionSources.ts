// Resolution-source assessment (Market Quality Pipeline, 2026-07-07).
//
// Turns a candidate's prose sources into a structured ResolutionPlan and
// judges whether the plan is resolver-ready: named + official beats vague,
// URL beats name-only, metric required where a template demands one. Vague
// sources don't reject a candidate — they downgrade readiness and produce
// edit suggestions, because an admin can often supply the source faster
// than the model.

import type {
  EditSuggestion,
  MarketCandidate,
  ResolutionPlan,
  ResolverType,
} from "./types";
import type { MarketTemplate } from "./marketTemplates";
import { categoryFamily } from "./marketTemplates";

// Phrases that name NOTHING. "official sources", "news reports", "media" —
// unresolvable as written.
const VAGUE_SOURCE_PATTERNS = [
  /^official (sources?|announcement|channels?|statements?)$/i,
  /^(news|media|press) (reports?|outlets?|coverage)?$/i,
  /^(reliable|credible|major|reputable) (sources?|outlets?|media)$/i,
  /^(public|general) (records?|information)$/i,
  /^(tbd|unknown|n\/?a)$/i,
];

// Known-official source families per category, used to (a) recognize a good
// source and (b) suggest one when the model was vague.
const OFFICIAL_HINTS: Record<string, { pattern: RegExp; example: string }[]> = {
  sports: [
    {
      pattern:
        /(uefa|fifa|nba|nfl|mlb|nhl|premier league|liga|bundesliga|atp|wta|iesf|valve|riot|official (league|match|result))/i,
      example: "the official league result page (e.g. FIFA.com match report)",
    },
  ],
  politics: [
    {
      pattern:
        /(election (commission|authority)|secretary of state|federal election|electoral|comelec|official (count|canvass|results?))/i,
      example: "the official election authority's certified results page",
    },
  ],
  crypto_finance: [
    {
      pattern:
        /(coinbase|binance|kraken|cme|nasdaq|nyse|s&p|bloomberg terminal|bls\.gov|fred|federal reserve|bureau of labor|treasury|sec\.gov|investor relations)/i,
      example:
        "a named exchange/index close (e.g. Coinbase BTC-USD daily close) or the official statistical release (BLS/FRED)",
    },
  ],
  entertainment: [
    {
      pattern:
        /(academy|recording academy|hfpa|television academy|official (organizer|pageant|ceremony)|miss universe organization)/i,
      example: "the official organizer's announcement page",
    },
  ],
  general: [
    {
      pattern:
        /(official website|press release|court (record|docket)|gazette|regulator|sec filing|investor relations|government)/i,
      example: "the responsible organization's official announcement channel",
    },
  ],
};

export interface ResolutionAssessment {
  plan: ResolutionPlan;
  /** true when the best available source is vague/unnamed. */
  vagueSource: boolean;
  warnings: string[];
  editSuggestions: EditSuggestion[];
}

export function isVagueSource(source: string): boolean {
  const trimmed = source.trim();
  if (trimmed.length < 4) return true;
  return VAGUE_SOURCE_PATTERNS.some((re) => re.test(trimmed));
}

function looksOfficial(source: string, family: string): boolean {
  const hints = OFFICIAL_HINTS[family] ?? OFFICIAL_HINTS.general;
  return (
    hints.some((h) => h.pattern.test(source)) ||
    OFFICIAL_HINTS.general.some((h) => h.pattern.test(source))
  );
}

function firstUrl(sources: string[]): string | undefined {
  for (const s of sources) {
    const m = s.match(/https?:\/\/\S+/i);
    if (m) return m[0].replace(/[).,]+$/, "");
  }
  return undefined;
}

/**
 * Build/complete the structured ResolutionPlan for a candidate. Model-supplied
 * plan fields (candidate.resolutionPlan, from the v2 prompt) win; prose
 * resolutionSources fill the gaps; the template supplies defaults.
 */
export function assessResolutionPlan(
  candidate: MarketCandidate,
  template: MarketTemplate | undefined,
): ResolutionAssessment {
  const warnings: string[] = [];
  const editSuggestions: EditSuggestion[] = [];
  const family = categoryFamily(candidate);
  const primaryList = candidate.resolutionSources?.primary ?? [];
  const secondaryList = candidate.resolutionSources?.secondary ?? [];

  const modelPlan = candidate.resolutionPlan ?? {};
  const primary =
    modelPlan.primaryResolutionSource?.trim() || primaryList[0]?.trim() || "";
  const fallback =
    modelPlan.fallbackResolutionSource?.trim() ||
    primaryList[1]?.trim() ||
    secondaryList[0]?.trim() ||
    undefined;

  const plan: ResolutionPlan = {
    ...modelPlan,
    primaryResolutionSource: primary || undefined,
    fallbackResolutionSource: fallback,
    resolutionSourceUrl:
      modelPlan.resolutionSourceUrl ??
      firstUrl([...primaryList, ...secondaryList]),
    resolverType:
      modelPlan.resolverType ??
      (template?.defaultResolverType as ResolverType | undefined),
  };

  const vaguePrimary = !primary || isVagueSource(primary);
  const official = primary ? looksOfficial(primary, family) : false;

  if (vaguePrimary) {
    const hint = (OFFICIAL_HINTS[family] ?? OFFICIAL_HINTS.general)[0];
    warnings.push(
      primary
        ? `primary resolution source is vague ("${primary}") — needs a named, official source`
        : "no primary resolution source named",
    );
    editSuggestions.push({
      field: "resolutionPlan.primaryResolutionSource",
      currentValue: primary || undefined,
      suggestedValue: hint.example,
      reason:
        "vague sources are unresolvable as written; name the specific official source",
      severity: "critical",
    });
  } else if (!official) {
    warnings.push(
      `primary source ("${primary}") is named but not recognizably official — verify it is the authoritative source of truth`,
    );
  }

  if (!plan.fallbackResolutionSource && !vaguePrimary) {
    editSuggestions.push({
      field: "resolutionPlan.fallbackResolutionSource",
      suggestedValue:
        "a second independent outlet that reliably republishes the official result",
      reason: "a fallback source keeps the market resolvable if the primary is down",
      severity: "info",
    });
  }

  for (const required of template?.requiredResolutionFields ?? []) {
    if (!plan[required]) {
      editSuggestions.push({
        field: `resolutionPlan.${required}`,
        suggestedValue:
          required === "resolutionMetric"
            ? "the exact series/price/metric and reading methodology"
            : required === "resolutionSourceUrl"
              ? "direct URL of the page that will show the result"
              : "named official source",
        reason: `template ${template?.id} requires ${required}`,
        severity: "warning",
      });
    }
  }

  // Objectivity: default from criteria completeness when the model didn't say.
  if (plan.objectiveResolution === undefined) {
    plan.objectiveResolution =
      !vaguePrimary &&
      Boolean(
        candidate.resolutionCriteria?.yes || candidate.resolutionCriteria?.no,
      );
  }
  if (plan.automatableResolution === undefined) {
    plan.automatableResolution =
      plan.resolverType === "api_scoreboard" ||
      plan.resolverType === "exchange_close" ||
      plan.resolverType === "gov_data_release";
  }

  return { plan, vagueSource: vaguePrimary, warnings, editSuggestions };
}
