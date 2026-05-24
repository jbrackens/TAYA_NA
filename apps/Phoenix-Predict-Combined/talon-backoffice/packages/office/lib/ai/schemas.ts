// zod schemas for parsing LLM output (Phase B). These define the structured
// shape the model must return; the office route then runs the deterministic
// validator (marketQualityValidator) on top. requiresHumanReview is
// intentionally NOT in the schema — it is computed by our code, never accepted
// from the model (plan §7.2 / Codex).
//
// STRICT-MODE CONTRACT: these are sent to the model via OpenAI-style strict
// structured outputs (response_format json_schema), which requires every object
// property to be in `required` and forbids `default`, numeric/length/item
// constraints (min/max), and free-form records (additionalProperties). So:
//   - no .default()/.min()/.max() — quality limits live in marketQualityValidator
//   - optional fields use .nullable() (present, value may be null) not .optional()
// The drafter (marketDrafter.ts) maps null -> undefined when building a
// MarketCandidate, so the public types stay optional-based.

import { z } from "zod";

export const riskLevelSchema = z.enum(["low", "medium", "high", "blocked"]);
export const marketTypeSchema = z.enum([
  "binary",
  "multiple_choice",
  "scalar_bucket",
]);

export const resolutionCriteriaSchema = z.object({
  yes: z.string().nullable(),
  no: z.string().nullable(),
  doesNotCount: z.array(z.string()),
  ambiguousCases: z.array(z.string()),
  timezone: z.string(),
});

export const resolutionSourcesSchema = z.object({
  primary: z.array(z.string()),
  secondary: z.array(z.string()),
});

// A model-proposed candidate, minus requiresHumanReview (computed by us).
export const draftedCandidateSchema = z.object({
  marketTitle: z.string(),
  marketQuestion: z.string(),
  marketType: marketTypeSchema,
  outcomes: z.array(z.string()),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  jurisdiction: z.array(z.string()).nullable(),
  proposedOpenTime: z.string().nullable(),
  proposedCloseTime: z.string(),
  proposedResolutionTime: z.string(),
  resolutionCriteria: resolutionCriteriaSchema,
  resolutionSources: resolutionSourcesSchema,
  riskLevel: riskLevelSchema,
  riskFlags: z.array(z.string()).nullable(),
});

export type DraftedCandidate = z.infer<typeof draftedCandidateSchema>;

// The model returns candidates wrapped in an envelope (a top-level object is
// more reliable than a bare array across providers). Count bounds (1..7) are
// enforced in code, not the schema (strict mode forbids min/maxItems).
export const candidatesEnvelopeSchema = z.object({
  candidates: z.array(draftedCandidateSchema),
});

export type CandidatesEnvelope = z.infer<typeof candidatesEnvelopeSchema>;

// Article analysis (routine extraction tier). Kept minimal for MVP.
export const articleAnalysisSchema = z.object({
  articleSummary: z.string(),
  entities: z.object({
    people: z.array(z.string()),
    organizations: z.array(z.string()),
    locations: z.array(z.string()),
    legalBodies: z.array(z.string()),
  }),
  confirmedFacts: z.array(z.string()),
  reportedClaims: z.array(z.string()),
  futureUncertainEvents: z.array(z.string()),
  alreadyResolvedEvents: z.array(z.string()),
});

export type ArticleAnalysis = z.infer<typeof articleAnalysisSchema>;
