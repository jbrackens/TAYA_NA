import { describe, expect, it } from "vitest";
import {
  articleAnalysisSchema,
  candidatesEnvelopeSchema,
  draftedCandidateSchema,
} from "../lib/ai/schemas";

// Strict-mode schemas: every field required; optionals are .nullable() (present,
// value may be null); no defaults, no min/max. See schemas.ts header.
const validDraft = {
  marketTitle: "Will the ICC confirm a warrant before July 31?",
  marketQuestion:
    "Will the ICC publicly confirm at least one additional warrant before July 31, 2026?",
  marketType: "binary",
  outcomes: ["Yes", "No"],
  category: null,
  subcategory: null,
  tags: null,
  jurisdiction: null,
  proposedOpenTime: null,
  proposedCloseTime: "2026-07-31T23:59:00Z",
  proposedResolutionTime: "2026-08-03T23:59:00Z",
  resolutionCriteria: {
    yes: null,
    no: null,
    doesNotCount: [],
    ambiguousCases: [],
    timezone: "UTC",
  },
  resolutionSources: { primary: ["ICC official website"], secondary: [] },
  riskLevel: "high",
  riskFlags: null,
};

const validAnalysis = {
  articleSummary: "x",
  entities: { people: [], organizations: [], locations: [], legalBodies: [] },
  confirmedFacts: [],
  reportedClaims: [],
  futureUncertainEvents: [],
  alreadyResolvedEvents: [],
};

describe("draftedCandidateSchema", () => {
  it("parses a valid strict draft", () => {
    const c = draftedCandidateSchema.parse(validDraft);
    expect(c.marketType).toBe("binary");
    expect(c.resolutionCriteria.timezone).toBe("UTC");
    expect(c.category).toBeNull();
  });

  it("strips requiresHumanReview if the model sends it", () => {
    const c = draftedCandidateSchema.parse({
      ...validDraft,
      requiresHumanReview: false,
    }) as Record<string, unknown>;
    expect(c.requiresHumanReview).toBeUndefined();
  });

  it("rejects an invalid risk level", () => {
    expect(() =>
      draftedCandidateSchema.parse({ ...validDraft, riskLevel: "extreme" }),
    ).toThrow();
  });

  it("rejects a missing required field", () => {
    const { marketQuestion, ...rest } = validDraft;
    void marketQuestion;
    expect(() => draftedCandidateSchema.parse(rest)).toThrow();
  });

  // .nullable() (not .optional()) means the key must be present, value may be null.
  it("rejects an absent nullable field (must be present as null)", () => {
    const { category, ...rest } = validDraft;
    void category;
    expect(() => draftedCandidateSchema.parse(rest)).toThrow();
  });
});

describe("candidatesEnvelopeSchema", () => {
  it("parses a list of candidates", () => {
    const env = candidatesEnvelopeSchema.parse({ candidates: [validDraft] });
    expect(env.candidates).toHaveLength(1);
  });

  // Count bounds (1..7) are enforced in marketDrafter, not the schema (strict
  // structured outputs can't carry min/maxItems), so the schema accepts any count.
  it("accepts an empty list at the schema level (bounds enforced in code)", () => {
    expect(
      candidatesEnvelopeSchema.parse({ candidates: [] }).candidates,
    ).toEqual([]);
  });
});

describe("articleAnalysisSchema", () => {
  it("parses a full analysis object", () => {
    const a = articleAnalysisSchema.parse(validAnalysis);
    expect(a.entities.people).toEqual([]);
    expect(a.futureUncertainEvents).toEqual([]);
  });

  it("rejects missing required fields (no defaults under strict mode)", () => {
    expect(() =>
      articleAnalysisSchema.parse({ articleSummary: "x" }),
    ).toThrow();
  });
});
