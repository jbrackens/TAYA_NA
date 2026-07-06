import { describe, expect, it } from "vitest";
import { validateCandidate } from "../lib/ai/marketQualityValidator";
import type { MarketCandidate } from "../lib/ai/types";

const NOW = new Date("2026-05-24T00:00:00Z");

function validCandidate(
  overrides: Partial<MarketCandidate> = {},
): MarketCandidate {
  return {
    marketTitle: "Will the ICC confirm an additional warrant before July 31?",
    marketQuestion:
      "Will the International Criminal Court publicly confirm at least one additional arrest warrant related to the Philippines drug war before July 31, 2026?",
    marketType: "binary",
    outcomes: ["Yes", "No"],
    proposedCloseTime: "2026-07-31T23:59:00Z",
    proposedResolutionTime: "2026-08-03T23:59:00Z",
    resolutionCriteria: {
      doesNotCount: ["Rumors or anonymous claims"],
      ambiguousCases: [],
      timezone: "UTC",
    },
    resolutionSources: {
      primary: ["International Criminal Court official website"],
      secondary: ["Reuters"],
    },
    riskLevel: "low",
    requiresHumanReview: true,
    ...overrides,
  };
}

describe("validateCandidate", () => {
  it("accepts a clean low-risk binary candidate (no review needed)", () => {
    const r = validateCandidate(validCandidate(), { now: NOW });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.blocked).toBe(false);
    expect(r.requiresHumanReview).toBe(false);
  });

  it("rejects binary outcomes that are not exactly Yes/No", () => {
    const r = validateCandidate(validCandidate({ outcomes: ["yes", "no"] }), {
      now: NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("Yes"))).toBe(true);
  });

  it("rejects close_time after resolution_time", () => {
    const r = validateCandidate(
      validCandidate({
        proposedCloseTime: "2026-08-10T00:00:00Z",
        proposedResolutionTime: "2026-08-03T23:59:00Z",
      }),
      { now: NOW },
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("after resolution_time"))).toBe(
      true,
    );
  });

  it("rejects a close_time in the past", () => {
    const r = validateCandidate(
      validCandidate({
        proposedCloseTime: "2020-01-01T00:00:00Z",
        proposedResolutionTime: "2020-01-02T00:00:00Z",
      }),
      { now: NOW },
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("future"))).toBe(true);
  });

  it("rejects when there are no resolution sources at all", () => {
    const r = validateCandidate(
      validCandidate({ resolutionSources: { primary: [], secondary: [] } }),
      { now: NOW },
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("resolution source"))).toBe(true);
  });

  it("warns (does not reject) on vague wording and forces review", () => {
    const r = validateCandidate(
      validCandidate({
        marketQuestion: "Will justice be served in the Philippines soon?",
      }),
      { now: NOW },
    );
    expect(r.ok).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.requiresHumanReview).toBe(true);
  });

  it("blocks a blocked-risk market", () => {
    const r = validateCandidate(validCandidate({ riskLevel: "blocked" }), {
      now: NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.blocked).toBe(true);
    expect(r.requiresHumanReview).toBe(true);
  });

  it("forces review for non-low risk", () => {
    const r = validateCandidate(validCandidate({ riskLevel: "high" }), {
      now: NOW,
    });
    expect(r.requiresHumanReview).toBe(true);
  });

  it("flags a missing required field", () => {
    const r = validateCandidate(validCandidate({ marketQuestion: "" }), {
      now: NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("market_question"))).toBe(true);
  });

  it("warns when only secondary sources are present", () => {
    const r = validateCandidate(
      validCandidate({
        resolutionSources: { primary: [], secondary: ["Reuters"] },
      }),
      { now: NOW },
    );
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.includes("primary"))).toBe(true);
    expect(r.requiresHumanReview).toBe(true);
  });
});
