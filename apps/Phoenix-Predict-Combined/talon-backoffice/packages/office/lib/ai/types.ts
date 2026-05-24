// Domain types for AI market drafting (Phase B).
// See docs/ai-market-drafting/IMPLEMENTATION-PLAN.md. MVP supports binary markets;
// multiple_choice / scalar_bucket are accepted by the type for forward
// compatibility but are out of MVP scope.

export type MarketType = "binary" | "multiple_choice" | "scalar_bucket";

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
}
