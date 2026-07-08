// Deterministic market-quality validation (plan §17). This runs AFTER the LLM
// and never trusts model output for the publish/review decision — the model's
// risk verdict is advisory; this code (plus human review) is the gate.
//
// Errors are hard rejects. Warnings are surfaced to the operator but do not
// block. requiresHumanReview is computed here (never taken from the model);
// note the MVP route additionally forces review on for everything.

import type { MarketCandidate } from "./types";

// §17.2 — vague terms that make a question unresolvable unless defined in the
// resolution criteria. Presence is a warning, not a hard reject.
export const VAGUE_TERMS = [
  "soon",
  "major",
  "significant",
  "likely",
  "probably",
  "justice",
  "fair",
  "good",
  "bad",
  "caught",
  "exposed",
  "scandalous",
  "successful",
] as const;

export interface ValidationResult {
  ok: boolean; // false if there are any hard errors
  errors: string[];
  warnings: string[];
  blocked: boolean;
  requiresHumanReview: boolean;
}

export interface ValidateOptions {
  now?: Date; // injectable clock for deterministic tests
}

export function validateCandidate(
  candidate: MarketCandidate,
  opts: ValidateOptions = {},
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const now = opts.now ?? new Date();

  // §17.1 — required fields
  if (!candidate.marketQuestion?.trim())
    errors.push("market_question is required");
  if (!candidate.marketType) errors.push("market_type is required");
  if (!Array.isArray(candidate.outcomes) || candidate.outcomes.length === 0)
    errors.push("outcomes are required");
  if (!candidate.proposedCloseTime)
    errors.push("proposed_close_time is required");
  if (!candidate.proposedResolutionTime)
    errors.push("proposed_resolution_time is required");
  if (!candidate.resolutionCriteria)
    errors.push("resolution_criteria is required");
  if (!candidate.resolutionSources)
    errors.push("resolution_sources is required");
  if (!candidate.riskLevel) errors.push("risk_level is required");

  // §17.2 — vague wording (warn; may be allowed if defined in the criteria)
  if (candidate.marketQuestion) {
    for (const term of VAGUE_TERMS) {
      if (new RegExp(`\\b${term}\\b`, "i").test(candidate.marketQuestion)) {
        warnings.push(
          `question contains vague term "${term}" — define it in the resolution criteria or remove it`,
        );
      }
    }
  }

  // §17.3 — deadline sanity
  const close = parseDate(candidate.proposedCloseTime);
  const resolution = parseDate(candidate.proposedResolutionTime);
  if (candidate.proposedCloseTime && !close)
    errors.push("proposed_close_time is not a valid date");
  if (candidate.proposedResolutionTime && !resolution)
    errors.push("proposed_resolution_time is not a valid date");
  if (close && resolution && close.getTime() > resolution.getTime())
    errors.push("close_time must not be after resolution_time");
  if (close && close.getTime() <= now.getTime())
    errors.push("close_time must be in the future");

  // §17.4 — outcomes
  if (candidate.marketType !== "binary") {
    errors.push("MVP supports binary markets only");
  }
  const o = candidate.outcomes ?? [];
  if (!(o.length === 2 && o[0] === "Yes" && o[1] === "No"))
    errors.push('binary market outcomes must be exactly ["Yes","No"]');

  // §17.5 — sources
  if (candidate.resolutionSources) {
    const primary = candidate.resolutionSources.primary ?? [];
    const secondary = candidate.resolutionSources.secondary ?? [];
    if (primary.length === 0 && secondary.length === 0)
      errors.push("at least one resolution source is required");
    else if (primary.length === 0)
      warnings.push(
        "no primary official source — resolution relies on secondary sources (requires review)",
      );
  }

  // §9.9 — blocked markets cannot be published
  const blocked = candidate.riskLevel === "blocked";
  if (blocked)
    errors.push("market risk_level is blocked — not eligible for publication");

  // §9.10 — review is computed by us, never the model. The MVP route forces
  // review on regardless; this is the minimum derived from the candidate.
  const requiresHumanReview =
    blocked ||
    candidate.riskLevel !== "low" ||
    warnings.length > 0 ||
    errors.length > 0;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    blocked,
    requiresHumanReview,
  };
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ═══════════════════════════════════════════════════════════════════════════
// Market Quality Pipeline v2 (2026-07-07). validateCandidate above is the
// v1 gate and stays untouched; validateCandidateV2 composes it with
// category-aware checks, known-outcome/close-date strictness, commercial
// scoring, and field-level edit suggestions. Same trust model: the LLM's
// verdicts are advisory hints; every gate here is deterministic.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  CommercialScore,
  EditSuggestion,
  KnownOutcomeRisk,
  Readiness,
  RiskLevel,
} from "./types";
import {
  categoryFamily,
  matchTemplate,
  type CategoryFamily,
  type MarketTemplate,
} from "./marketTemplates";
import {
  assessResolutionPlan,
  type ResolutionAssessment,
} from "./marketResolutionSources";

export const VALIDATOR_VERSION = "market_quality_v2";

export interface ArticleContext {
  text?: string;
  publishedAt?: string;
  updatedAt?: string;
}

export interface ValidateV2Options {
  now?: Date;
  article?: ArticleContext;
  /** LLM self-check hint (advisory): the model thought the outcome is known. */
  modelKnownOutcomeHint?: { flagged: boolean; evidence?: string[] };
}

export interface CategoryFinding {
  family: CategoryFamily;
  message: string;
  severity: "info" | "warning" | "critical";
}

export interface ValidationResultV2 extends ValidationResult {
  readiness: Readiness;
  categoryFindings: CategoryFinding[];
  knownOutcomeRisk: KnownOutcomeRisk;
  commercialScore: CommercialScore;
  editSuggestions: EditSuggestion[];
  template?: MarketTemplate;
  resolution: ResolutionAssessment;
  validatorVersion: string;
}

// ── Known-outcome & close-date strictness ──────────────────────────────────

const PAST_OUTCOME_PATTERNS = [
  /\b(won|lost|defeated|clinched|secured|was (elected|announced|confirmed)|has (won|been elected|announced|resigned)|officially (won|announced))\b/i,
  /\b(final score|full[- ]time|concluded|took place|was held)\b/i,
];

function evidenceLines(text: string, patterns: RegExp[]): string[] {
  const lines = text.split(/(?<=[.!?])\s+/).slice(0, 400);
  const out: string[] = [];
  for (const line of lines) {
    if (patterns.some((re) => re.test(line))) {
      out.push(line.trim().slice(0, 200));
      if (out.length >= 3) break;
    }
  }
  return out;
}

export function assessKnownOutcome(
  candidate: MarketCandidate,
  opts: ValidateV2Options,
): KnownOutcomeRisk {
  const now = opts.now ?? new Date();
  const close = new Date(candidate.proposedCloseTime);
  const resolution = new Date(candidate.proposedResolutionTime);
  const published = opts.article?.publishedAt
    ? new Date(opts.article.publishedAt)
    : undefined;
  const updated = opts.article?.updatedAt
    ? new Date(opts.article.updatedAt)
    : undefined;

  const problems: string[] = [];
  const evidence: string[] = [];
  let risk: RiskLevel = "low";
  const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "blocked"];
  const maxRisk = (a: RiskLevel, b: RiskLevel): RiskLevel =>
    RISK_ORDER.indexOf(b) > RISK_ORDER.indexOf(a) ? b : a;

  if (!Number.isNaN(close.getTime()) && close.getTime() <= now.getTime()) {
    problems.push("close date is in the past");
    risk = maxRisk(risk, "blocked");
  }
  if (
    !Number.isNaN(close.getTime()) &&
    !Number.isNaN(resolution.getTime()) &&
    close.getTime() > resolution.getTime()
  ) {
    problems.push("close date is after the outcome becomes known (resolution)");
    risk = maxRisk(risk, "blocked");
  }
  // Close too tight to resolution: trading up to the moment of the outcome
  // invites insider sniping on time-sensitive events.
  if (
    !Number.isNaN(close.getTime()) &&
    !Number.isNaN(resolution.getTime()) &&
    resolution.getTime() - close.getTime() < 30 * 60 * 1000 &&
    resolution.getTime() >= close.getTime()
  ) {
    problems.push(
      "close is less than 30 minutes before resolution — for scheduled outcomes close earlier",
    );
    risk = maxRisk(risk, "medium");
  }
  // Stale article: outcome likely already public.
  if (published && now.getTime() - published.getTime() > 45 * 86_400_000) {
    problems.push(
      `article is ${Math.round((now.getTime() - published.getTime()) / 86_400_000)} days old — verify the event hasn't already concluded`,
    );
    risk = maxRisk(risk, "medium");
  }
  if (
    updated &&
    published &&
    updated.getTime() - published.getTime() > 6 * 3_600_000
  ) {
    problems.push(
      "article was substantially updated after publication — it may now report the outcome",
    );
    risk = maxRisk(risk, "medium");
  }

  // Article text self-incrimination: past-tense outcome language near the
  // candidate's entities.
  if (opts.article?.text) {
    const hits = evidenceLines(opts.article.text, PAST_OUTCOME_PATTERNS);
    if (hits.length > 0) {
      const candidateEntities = candidate.marketTitle
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3);
      const relevant = hits.filter((h) =>
        candidateEntities.some((e) => h.toLowerCase().includes(e)),
      );
      if (relevant.length > 0) {
        problems.push(
          "the article appears to already contain this outcome in past tense",
        );
        evidence.push(...relevant);
        risk = maxRisk(risk, "high");
      }
    }
  }
  if (opts.modelKnownOutcomeHint?.flagged) {
    problems.push("the drafting model flagged this outcome as possibly already known");
    evidence.push(...(opts.modelKnownOutcomeHint.evidence ?? []).slice(0, 2));
    risk = maxRisk(risk, "medium");
  }

  return {
    risk,
    explanation:
      problems.length > 0 ? problems.join("; ") : "no known-outcome signals",
    evidence: evidence.length > 0 ? evidence : undefined,
    recommendedFix:
      risk === "blocked"
        ? "fix the close/resolution dates before this market can exist"
        : risk !== "low"
          ? "verify the event is still genuinely open, then adjust the close date"
          : undefined,
  };
}

// ── Category-specific validators ───────────────────────────────────────────

type CategoryValidator = (
  candidate: MarketCandidate,
  resolution: ResolutionAssessment,
) => CategoryFinding[];

const require_ = (
  family: CategoryFamily,
  condition: boolean,
  message: string,
  severity: CategoryFinding["severity"] = "warning",
): CategoryFinding[] => (condition ? [] : [{ family, message, severity }]);

const text = (c: MarketCandidate) =>
  `${c.marketTitle} ${c.marketQuestion} ${c.resolutionCriteria?.yes ?? ""} ${
    c.resolutionCriteria?.no ?? ""
  } ${(c.resolutionCriteria?.ambiguousCases ?? []).join(" ")} ${(
    c.resolutionCriteria?.doesNotCount ?? []
  ).join(" ")}`;

const CATEGORY_VALIDATORS: Record<CategoryFamily, CategoryValidator> = {
  sports: (c, r) => [
    ...require_(
      "sports",
      !r.vagueSource,
      "sports markets need the official league/competition source named",
      "critical",
    ),
    ...require_(
      "sports",
      /\b(20\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|final|week|round|game \d|map \d)\b/i.test(
        text(c),
      ),
      "name the match/event date or stage explicitly",
    ),
    ...require_(
      "sports",
      /(cancel|postpon|void|abandon|replay)/i.test(text(c)),
      "define cancellation/postponement handling (void? next date?)",
    ),
    ...require_(
      "sports",
      !/\b(match|game)\b/i.test(text(c)) ||
        /(overtime|extra time|penalt|regulation|tiebreak)/i.test(text(c)),
      "state whether overtime/extra time/penalties count",
      "info",
    ),
  ],
  politics: (c, r) => [
    ...require_(
      "politics",
      !r.vagueSource,
      "political markets need the official election authority or a named pollster",
      "critical",
    ),
    ...require_(
      "politics",
      Boolean(c.jurisdiction?.length) ||
        /\b(US|U\.S\.|United States|UK|federal|state of|governor|senate|house|philippine|eu)\b/i.test(
          text(c),
        ),
      "state the jurisdiction explicitly",
    ),
    ...require_(
      "politics",
      /(recount|withdraw|drop out|contested|certif)/i.test(text(c)) ||
        !/election|primary|nomination/i.test(text(c)),
      "note recount/withdrawal handling in ambiguous cases",
      "info",
    ),
    ...require_(
      "politics",
      !/(guilty|crime|fraud|corrupt|affair|scandal)/i.test(c.marketTitle) ||
        /(court|convict|verdict|charge|indict)/i.test(text(c)),
      "avoid unproven-allegation markets — anchor to a formal legal step instead",
      "critical",
    ),
  ],
  crypto_finance: (c, r) => [
    ...require_(
      "crypto_finance",
      !r.vagueSource,
      "finance markets need the exact exchange/index/statistical source",
      "critical",
    ),
    ...require_(
      "crypto_finance",
      Boolean(c.resolutionCriteria?.timezone) &&
        /(UTC|GMT|ET|EST|EDT|\d{2}:\d{2})/i.test(
          `${c.resolutionCriteria?.timezone} ${text(c)}`,
        ),
      "state the exact timestamp and timezone of the reading",
    ),
    ...require_(
      "crypto_finance",
      Boolean(r.plan.resolutionMetric) ||
        /(close|closing|daily candle|settlement price|official print)/i.test(
          text(c),
        ),
      "define the methodology: which close/candle/print decides it",
    ),
    ...require_(
      "crypto_finance",
      !/(hit|touch|reach)/i.test(c.marketTitle) ||
        /(intraday|any point|wick|high)/i.test(text(c)),
      '"hits price" needs an intraday source and wick/high definition — prefer a close-based question',
    ),
  ],
  entertainment: (c, r) => [
    ...require_(
      "entertainment",
      !r.vagueSource,
      "entertainment markets need the official organizer as the source",
      "critical",
    ),
    ...require_(
      "entertainment",
      /(award|best|title|winner|crown|miss )/i.test(text(c))
        ? /("|')?[A-Z][\w '&-]{3,}("|')? (award|title|category)|category|Best [A-Z]/.test(
            text(c),
          )
        : true,
      "name the award/title/category exactly as the organizer does",
      "info",
    ),
    ...require_(
      "entertainment",
      /(disqualif|withdraw|delay|postpon)/i.test(text(c)) ||
        !/(pageant|award|ceremony)/i.test(text(c)),
      "note disqualification/withdrawal and delayed-announcement handling",
      "info",
    ),
  ],
  general: (c, r) => [
    ...require_(
      "general",
      !r.vagueSource,
      "name a specific source of truth (organization, page, filing)",
      "critical",
    ),
    ...require_(
      "general",
      Boolean(c.proposedCloseTime),
      "a deadline is required",
      "critical",
    ),
    ...require_(
      "general",
      Boolean(r.plan.fallbackResolutionSource),
      "add a fallback source",
      "info",
    ),
  ],
};

// ── Commercial score (separate from safety; safety always wins) ───────────

export function scoreCommercial(
  candidate: MarketCandidate,
  family: CategoryFamily,
  template: MarketTemplate | undefined,
  now: Date,
): CommercialScore {
  const reasons: string[] = [];
  let score = 40;

  const q = candidate.qualityScores;
  if (q) {
    // Reuse the model's advisory axes as weak commercial signal.
    score += Math.round((q.tradabilityScore ?? 0) * 15);
    score += Math.round((q.newsRelevanceScore ?? 0) * 10);
    score += Math.round((q.clarityScore ?? 0) * 5);
    if ((q.tradabilityScore ?? 0) >= 0.7) reasons.push("model rates it highly tradable");
  }

  // Timeliness sweet spot: resolving in 1–60 days sustains engagement;
  // multi-year markets park liquidity.
  const close = new Date(candidate.proposedCloseTime);
  if (!Number.isNaN(close.getTime())) {
    const days = (close.getTime() - now.getTime()) / 86_400_000;
    if (days >= 1 && days <= 60) {
      score += 15;
      reasons.push(`resolves in ${Math.round(days)}d — timely`);
    } else if (days > 365) {
      score -= 15;
      reasons.push("resolves >1y out — parks liquidity");
    }
  }

  // Audience families: sports/politics/crypto carry built-in audiences.
  if (family === "sports" || family === "politics") {
    score += 10;
    reasons.push(`${family} has a broad repeat audience`);
  } else if (family === "crypto_finance") {
    score += 8;
    reasons.push("finance audience trades repeatedly");
  }

  if (template) {
    score += 7;
    reasons.push(`fits template ${template.id} — proven format`);
  }

  // Casual-user clarity: short titles read on a card; question marks help.
  if (candidate.marketTitle.length <= 80) score += 5;
  else {
    score -= 5;
    reasons.push("title too long for cards/push");
  }

  score = Math.max(0, Math.min(100, score));
  const label = score >= 65 ? "high" : score >= 40 ? "medium" : "low";
  if (reasons.length === 0) reasons.push("no strong commercial signals");
  return { score, label, reasons };
}

// ── Readiness + orchestration ──────────────────────────────────────────────

function computeReadiness(
  base: ValidationResult,
  knownOutcome: KnownOutcomeRisk,
  categoryFindings: CategoryFinding[],
  resolution: ResolutionAssessment,
): Readiness {
  if (base.blocked || knownOutcome.risk === "blocked") return "reject";
  if (!base.ok) return "needs_edits";
  const critical = categoryFindings.some((f) => f.severity === "critical");
  if (critical || resolution.vagueSource) return "needs_edits";
  if (
    knownOutcome.risk === "high" ||
    base.requiresHumanReview ||
    knownOutcome.risk === "medium"
  )
    return "needs_review";
  return "ready";
}

function suggestionFromFinding(f: CategoryFinding): EditSuggestion {
  return {
    field: "resolutionCriteria",
    suggestedValue: f.message,
    reason: `${f.family} validation`,
    severity: f.severity,
  };
}

export function validateCandidateV2(
  candidate: MarketCandidate,
  opts: ValidateV2Options = {},
): ValidationResultV2 {
  const now = opts.now ?? new Date();
  const base = validateCandidate(candidate, { now });

  const template = matchTemplate(candidate);
  const family = categoryFamily(candidate);
  const resolution = assessResolutionPlan(candidate, template);
  const knownOutcomeRisk = assessKnownOutcome(candidate, { ...opts, now });
  const categoryFindings = CATEGORY_VALIDATORS[family](candidate, resolution);
  const commercialScore = scoreCommercial(candidate, family, template, now);

  const editSuggestions: EditSuggestion[] = [
    ...resolution.editSuggestions,
    ...categoryFindings
      .filter((f) => f.severity !== "info")
      .map(suggestionFromFinding),
  ];
  if (knownOutcomeRisk.recommendedFix) {
    editSuggestions.push({
      field: "proposedCloseTime",
      currentValue: candidate.proposedCloseTime,
      suggestedValue: knownOutcomeRisk.recommendedFix,
      reason: knownOutcomeRisk.explanation,
      severity: knownOutcomeRisk.risk === "blocked" ? "critical" : "warning",
    });
  }

  const warnings = [
    ...base.warnings,
    ...resolution.warnings,
    ...(knownOutcomeRisk.risk !== "low" ? [knownOutcomeRisk.explanation] : []),
  ];
  const readiness = computeReadiness(
    base,
    knownOutcomeRisk,
    categoryFindings,
    resolution,
  );

  return {
    ...base,
    warnings,
    // Known-outcome "blocked" is a hard gate exactly like a blocked risk level.
    blocked: base.blocked || knownOutcomeRisk.risk === "blocked",
    ok: base.ok && knownOutcomeRisk.risk !== "blocked",
    readiness,
    categoryFindings,
    knownOutcomeRisk,
    commercialScore,
    editSuggestions,
    template,
    resolution,
    validatorVersion: VALIDATOR_VERSION,
  };
}
