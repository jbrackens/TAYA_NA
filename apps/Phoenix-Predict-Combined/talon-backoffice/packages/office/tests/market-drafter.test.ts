import { describe, expect, it } from "vitest";
import { draftMarketsFromArticle } from "../lib/ai/marketDrafter";
import type {
  GenerateObjectParams,
  GenerateObjectResult,
  ModelProvider,
} from "../lib/ai/provider-types";

const NOW = new Date("2026-05-24T00:00:00Z");

function validCandidate(overrides: Record<string, unknown> = {}) {
  return {
    marketTitle: "Will the ICC confirm a warrant before July 31?",
    marketQuestion:
      "Will the International Criminal Court publicly confirm at least one additional arrest warrant related to the Philippines drug war before July 31, 2026?",
    marketType: "binary",
    outcomes: ["Yes", "No"],
    proposedCloseTime: "2026-07-31T23:59:00Z",
    proposedResolutionTime: "2026-08-03T23:59:00Z",
    resolutionCriteria: {
      doesNotCount: [],
      ambiguousCases: [],
      timezone: "UTC",
    },
    resolutionSources: { primary: ["ICC official website"], secondary: [] },
    riskLevel: "high",
    ...overrides,
  };
}

// Mock provider: returns a canned summary + candidates for the single draft
// call. No vendor SDK, no network.
function mockProvider(candidates: unknown[]): ModelProvider {
  return {
    async generateObject<T>(
      _params: GenerateObjectParams<T>,
    ): Promise<GenerateObjectResult<T>> {
      const object = {
        articleSummary: "summary",
        candidates,
      } as unknown as T;
      return { object, usage: {}, provider: "mock", model: "mock" };
    },
  };
}

const input = { articleText: "Some article text about ICC warrants." };

describe("draftMarketsFromArticle", () => {
  it("returns validated candidates and forces human review (MVP)", async () => {
    const r = await draftMarketsFromArticle(
      mockProvider([validCandidate()]),
      input,
      {
        now: NOW,
      },
    );
    expect(r.injectionDetected).toBe(false);
    expect(r.drafts).toHaveLength(1);
    expect(r.drafts[0].candidate.requiresHumanReview).toBe(true);
    expect(r.drafts[0].validation.ok).toBe(true);
    // Audit: one generation-log entry (single hard-tier draft call).
    expect(r.generationLogs).toHaveLength(1);
    expect(r.generationLogs[0].tier).toBe("hard");
    expect(r.generationLogs[0].provider).toBe("mock");
  });

  it("surfaces a blocked-risk candidate via validation (not eligible)", async () => {
    const r = await draftMarketsFromArticle(
      mockProvider([validCandidate({ riskLevel: "blocked" })]),
      input,
      { now: NOW },
    );
    expect(r.drafts[0].validation.blocked).toBe(true);
    expect(r.drafts[0].validation.ok).toBe(false);
  });

  it("blocks everything when the canary token leaks (prompt injection)", async () => {
    const canary = "CANARY-test123";
    const r = await draftMarketsFromArticle(
      mockProvider([validCandidate({ marketTitle: `pwned ${canary}` })]),
      input,
      { now: NOW, canary },
    );
    expect(r.injectionDetected).toBe(true);
    expect(r.drafts).toHaveLength(0);
  });

  it("runs the deterministic validator (vague wording warns)", async () => {
    const r = await draftMarketsFromArticle(
      mockProvider([
        validCandidate({
          marketQuestion: "Will justice be served in the Philippines soon?",
        }),
      ]),
      input,
      { now: NOW },
    );
    expect(r.drafts[0].validation.warnings.length).toBeGreaterThan(0);
  });
});
