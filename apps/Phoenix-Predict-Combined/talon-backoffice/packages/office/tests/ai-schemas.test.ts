import { describe, expect, it } from "vitest";
import {
  articleAnalysisSchema,
  candidatesEnvelopeSchema,
  draftedCandidateSchema,
} from "../lib/ai/schemas";

const validDraft = {
  marketTitle: "Will the ICC confirm a warrant before July 31?",
  marketQuestion:
    "Will the ICC publicly confirm at least one additional warrant before July 31, 2026?",
  marketType: "binary",
  outcomes: ["Yes", "No"],
  proposedCloseTime: "2026-07-31T23:59:00Z",
  proposedResolutionTime: "2026-08-03T23:59:00Z",
  resolutionCriteria: { timezone: "UTC" },
  resolutionSources: { primary: ["ICC official website"] },
  riskLevel: "high",
};

describe("draftedCandidateSchema", () => {
  it("parses a valid draft and applies defaults", () => {
    const c = draftedCandidateSchema.parse(validDraft);
    expect(c.resolutionCriteria.doesNotCount).toEqual([]);
    expect(c.resolutionCriteria.ambiguousCases).toEqual([]);
    expect(c.resolutionCriteria.timezone).toBe("UTC");
    expect(c.resolutionSources.secondary).toEqual([]);
  });

  it("does not accept requiresHumanReview from the model", () => {
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
});

describe("candidatesEnvelopeSchema", () => {
  it("parses 1-7 candidates", () => {
    const env = candidatesEnvelopeSchema.parse({ candidates: [validDraft] });
    expect(env.candidates).toHaveLength(1);
  });

  it("rejects an empty candidate list", () => {
    expect(() => candidatesEnvelopeSchema.parse({ candidates: [] })).toThrow();
  });

  it("rejects more than 7 candidates", () => {
    expect(() =>
      candidatesEnvelopeSchema.parse({
        candidates: Array.from({ length: 8 }, () => validDraft),
      }),
    ).toThrow();
  });
});

describe("articleAnalysisSchema", () => {
  it("parses minimal input and applies entity/array defaults", () => {
    const a = articleAnalysisSchema.parse({ articleSummary: "x" });
    expect(a.entities.people).toEqual([]);
    expect(a.futureUncertainEvents).toEqual([]);
  });
});
