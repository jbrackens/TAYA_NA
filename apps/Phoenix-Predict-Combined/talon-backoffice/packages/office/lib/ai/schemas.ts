// zod schemas for parsing LLM output (Phase B). These define the structured
// shape the model must return; the office route then runs the deterministic
// validator (marketQualityValidator) on top. requiresHumanReview is
// intentionally NOT in the schema — it is computed by our code, never accepted
// from the model (plan §7.2 / Codex).

import { z } from "zod";
import type { MarketCandidate } from "./types";

export const riskLevelSchema = z.enum(["low", "medium", "high", "blocked"]);
export const marketTypeSchema = z.enum([
  "binary",
  "multiple_choice",
  "scalar_bucket",
]);

export const resolutionCriteriaSchema = z.object({
  yes: z.string().optional(),
  no: z.string().optional(),
  outcomeRules: z.record(z.string(), z.string()).optional(),
  doesNotCount: z.array(z.string()).default([]),
  ambiguousCases: z.array(z.string()).default([]),
  timezone: z.string().default("UTC"),
});

export const resolutionSourcesSchema = z.object({
  primary: z.array(z.string()).default([]),
  secondary: z.array(z.string()).default([]),
});

// A model-proposed candidate, minus requiresHumanReview (computed by us).
export const draftedCandidateSchema = z.object({
  marketTitle: z.string().min(1),
  marketQuestion: z.string().min(1),
  marketType: marketTypeSchema,
  outcomes: z.array(z.string()),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  jurisdiction: z.array(z.string()).optional(),
  proposedOpenTime: z.string().optional(),
  proposedCloseTime: z.string(),
  proposedResolutionTime: z.string(),
  resolutionCriteria: resolutionCriteriaSchema,
  resolutionSources: resolutionSourcesSchema,
  riskLevel: riskLevelSchema,
  riskFlags: z.array(z.string()).optional(),
});

export type DraftedCandidate = z.infer<typeof draftedCandidateSchema>;

// Compile-time guarantee that a DraftedCandidate + requiresHumanReview is a
// valid MarketCandidate (catches schema/type drift).
const _assertCandidateShape: (d: DraftedCandidate) => MarketCandidate = (
  d,
) => ({ ...d, requiresHumanReview: false });
void _assertCandidateShape;

// The model returns 1-7 candidates wrapped in an envelope (a top-level object
// is more reliable than a bare array across providers).
export const candidatesEnvelopeSchema = z.object({
  candidates: z.array(draftedCandidateSchema).min(1).max(7),
});

export type CandidatesEnvelope = z.infer<typeof candidatesEnvelopeSchema>;

// Article analysis (routine extraction tier). Kept minimal for MVP.
export const articleAnalysisSchema = z.object({
  articleSummary: z.string(),
  entities: z
    .object({
      people: z.array(z.string()).default([]),
      organizations: z.array(z.string()).default([]),
      locations: z.array(z.string()).default([]),
      legalBodies: z.array(z.string()).default([]),
    })
    .default({
      people: [],
      organizations: [],
      locations: [],
      legalBodies: [],
    }),
  confirmedFacts: z.array(z.string()).default([]),
  reportedClaims: z.array(z.string()).default([]),
  futureUncertainEvents: z.array(z.string()).default([]),
  alreadyResolvedEvents: z.array(z.string()).default([]),
});

export type ArticleAnalysis = z.infer<typeof articleAnalysisSchema>;
