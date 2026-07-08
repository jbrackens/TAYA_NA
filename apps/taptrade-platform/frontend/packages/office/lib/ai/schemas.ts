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
export const marketTypeSchema = z.literal("binary");

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
  // One-sentence article summary, produced in the SAME call as the candidates
  // (used for provenance + the draft modal). A separate extraction pass was
  // dropped after an A/B showed equal quality at ~30% fewer tokens.
  articleSummary: z.string(),
  candidates: z.array(draftedCandidateSchema),
});

export type CandidatesEnvelope = z.infer<typeof candidatesEnvelopeSchema>;

// ── Market Quality Pipeline v2 wire schema (2026-07-07) ─────────────────────
// Same strict-mode contract as v1 (all properties required, optionals are
// .nullable(), no records/min/max). resolverConfig crosses the wire as a JSON
// STRING because strict mode forbids free-form objects; the drafter parses it
// leniently. v1 schemas above stay exported — logs, evals, and any pinned
// callers keep working.

export const resolverTypeSchema = z.enum([
  "manual_official_page",
  "api_scoreboard",
  "gov_data_release",
  "exchange_close",
  "organizer_announcement",
  "sec_filing",
  "other",
]);

export const resolutionPlanSchema = z.object({
  primaryResolutionSource: z.string().nullable(),
  fallbackResolutionSource: z.string().nullable(),
  resolutionSourceUrl: z.string().nullable(),
  resolutionMetric: z.string().nullable(),
  objectiveResolution: z.boolean().nullable(),
  automatableResolution: z.boolean().nullable(),
  resolverType: resolverTypeSchema.nullable(),
  resolverConfigJson: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
});

export const knownOutcomeSelfCheckSchema = z.object({
  alreadyKnown: z.boolean(),
  evidence: z.array(z.string()),
});

export const commercialHintsSchema = z.object({
  audience: z.enum(["niche", "moderate", "broad"]),
  timeliness: z.enum(["evergreen", "timely", "breaking"]),
  shareability: z.enum(["low", "medium", "high"]),
  reasons: z.array(z.string()),
});

export const draftedCandidateV2Schema = draftedCandidateSchema.extend({
  resolutionPlan: resolutionPlanSchema.nullable(),
  knownOutcomeSelfCheck: knownOutcomeSelfCheckSchema.nullable(),
  commercialHints: commercialHintsSchema.nullable(),
  templateGuess: z.string().nullable(),
  eventGroupTitle: z.string().nullable(),
});

export type DraftedCandidateV2 = z.infer<typeof draftedCandidateV2Schema>;

export const eventGroupSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  candidateTitles: z.array(z.string()),
});

export const candidatesEnvelopeV2Schema = z.object({
  articleSummary: z.string(),
  candidates: z.array(draftedCandidateV2Schema),
  eventGroups: z.array(eventGroupSchema).nullable(),
});

export type CandidatesEnvelopeV2 = z.infer<typeof candidatesEnvelopeV2Schema>;
