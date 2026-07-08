// Domain types for AI market drafting (Phase B).
// See docs/ai-market-drafting/IMPLEMENTATION-PLAN.md. MVP supports binary
// markets only; broader market types need separate creation/settlement support.

export type MarketType = "binary";

export type RiskLevel = "low" | "medium" | "high" | "blocked";

export interface ResolutionCriteria {
  yes?: string;
  no?: string;
  outcomeRules?: Record<string, string>;
  doesNotCount: string[];
  ambiguousCases: string[];
  timezone: string;
}

export interface ResolutionSources {
  primary: string[];
  secondary: string[];
}

export interface QualityScores {
  clarityScore: number;
  resolvabilityScore: number;
  tradabilityScore: number;
  newsRelevanceScore: number;
  manipulationRiskScore: number;
  legalSensitivityScore: number;
  overallQualityScore: number;
}

// A single AI-proposed market, before an operator selects/edits it and it is
// flattened into the gateway's CreateMarketRequest.
// ── Market Quality Pipeline additions (2026-07-07) ──────────────────────
// All fields optional: v1 candidates remain valid, and every consumer treats
// absence as "not assessed". See docs/ai-market-drafting/ for the pipeline.

export type Readiness = "ready" | "needs_edits" | "needs_review" | "reject";

export type ResolverType =
  | "manual_official_page"
  | "api_scoreboard"
  | "gov_data_release"
  | "exchange_close"
  | "organizer_announcement"
  | "sec_filing"
  | "other";

// How the market will actually be resolved later — distinct from the
// user-facing question (marketQuestion) and the admin-facing criteria
// (resolutionCriteria). Structured so a resolver can one day consume it.
export interface ResolutionPlan {
  primaryResolutionSource?: string;
  fallbackResolutionSource?: string;
  resolutionSourceUrl?: string;
  resolutionMetric?: string;
  objectiveResolution?: boolean;
  automatableResolution?: boolean;
  resolverType?: ResolverType;
  resolverConfig?: Record<string, unknown>;
  resolutionNotes?: string;
}

export interface CommercialScore {
  score: number; // 0-100
  label: "low" | "medium" | "high";
  reasons: string[];
}

export interface KnownOutcomeRisk {
  risk: RiskLevel;
  explanation: string;
  evidence?: string[];
  recommendedFix?: string;
}

export type DuplicateAction =
  | "create_new_market"
  | "attach_to_existing_event"
  | "reject_duplicate"
  | "rewrite_to_different_angle"
  | "needs_admin_review";

export interface SimilarMarketRef {
  id: string;
  ticker?: string;
  title: string;
  status?: string;
  eventId?: string;
  similarity: number; // 0-1
  similarityReason: string;
}

export interface DuplicateRisk {
  risk: "low" | "medium" | "high";
  similarMarkets: SimilarMarketRef[];
  recommendedAction: DuplicateAction;
}

export interface EventRecommendation {
  action: "attach_existing" | "create_new" | "none";
  existingEventId?: string;
  existingEventTitle?: string;
  proposedEventTitle?: string;
  proposedEventDescription?: string;
  relatedCandidateTitles?: string[];
  reason?: string;
}

export interface EditSuggestion {
  field: string;
  currentValue?: string;
  suggestedValue: string;
  reason: string;
  severity: "info" | "warning" | "critical";
}

export interface MarketCandidate {
  marketTitle: string;
  marketQuestion: string;
  marketType: MarketType;
  outcomes: string[];
  category?: string;
  subcategory?: string;
  tags?: string[];
  jurisdiction?: string[];
  proposedOpenTime?: string;
  proposedCloseTime: string;
  proposedResolutionTime: string;
  resolutionCriteria: ResolutionCriteria;
  resolutionSources: ResolutionSources;
  qualityScores?: QualityScores;
  riskLevel: RiskLevel;
  riskFlags?: string[];
  requiresHumanReview: boolean;

  // ── Market Quality Pipeline (all optional; absent = not assessed) ──
  templateId?: string;
  resolutionPlan?: ResolutionPlan;
  commercialScore?: CommercialScore;
  knownOutcomeRisk?: KnownOutcomeRisk;
  duplicateRisk?: DuplicateRisk;
  eventRecommendation?: EventRecommendation;
  editSuggestions?: EditSuggestion[];
  warnings?: string[];
}
