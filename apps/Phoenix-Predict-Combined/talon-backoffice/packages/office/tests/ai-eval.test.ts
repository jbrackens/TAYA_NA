import { describe, expect, it } from "vitest";
import { evaluateDraft } from "../lib/ai/evals/properties";
import { runEval } from "../lib/ai/evals/runEval";
import type { DraftResult } from "../lib/ai/marketDrafter";
import type { MarketCandidate } from "../lib/ai/types";
import type {
  GenerateObjectParams,
  GenerateObjectResult,
  ModelProvider,
} from "../lib/ai/provider-types";

const candidate: MarketCandidate = {
  marketTitle: "ICC warrant before July 31?",
  marketQuestion:
    "Will the ICC confirm an additional warrant before July 31, 2026?",
  marketType: "binary",
  outcomes: ["Yes", "No"],
  proposedCloseTime: "2026-07-31T23:59:00Z",
  proposedResolutionTime: "2026-08-03T23:59:00Z",
  resolutionCriteria: { doesNotCount: [], ambiguousCases: [], timezone: "UTC" },
  resolutionSources: { primary: ["ICC"], secondary: [] },
  riskLevel: "high",
  requiresHumanReview: true,
};

function goodResult(): DraftResult {
  return {
    analysis: {
      articleSummary: "s",
      entities: {
        people: [],
        organizations: [],
        locations: [],
        legalBodies: [],
      },
      confirmedFacts: [],
      reportedClaims: [],
      futureUncertainEvents: [],
      alreadyResolvedEvents: [],
    },
    drafts: [
      {
        candidate: structuredClone(candidate),
        validation: {
          ok: true,
          errors: [],
          warnings: [],
          blocked: false,
          requiresHumanReview: true,
        },
      },
    ],
    injectionDetected: false,
    generationLogs: [],
  };
}

describe("evaluateDraft", () => {
  it("passes a clean binary draft", () => {
    const o = evaluateDraft(
      {
        minCandidates: 1,
        allBinary: true,
        everyHasDeadline: true,
        everyHasSource: true,
        noInjection: true,
      },
      goodResult(),
    );
    expect(o.passed).toBe(true);
  });

  it("fails when a candidate has no resolution source", () => {
    const r = goodResult();
    r.drafts[0].candidate.resolutionSources = { primary: [], secondary: [] };
    const o = evaluateDraft({ everyHasSource: true }, r);
    expect(o.passed).toBe(false);
    expect(o.failures.some((f) => f.includes("source"))).toBe(true);
  });

  it("fails noInjection when an injection is detected", () => {
    const r = goodResult();
    r.injectionDetected = true;
    r.drafts = [];
    expect(evaluateDraft({ noInjection: true }, r).passed).toBe(false);
  });
});

function mockProvider(): ModelProvider {
  const analysis = goodResult().analysis;
  return {
    async generateObject<T>(
      params: GenerateObjectParams<T>,
    ): Promise<GenerateObjectResult<T>> {
      const object = (params.schemaName === "ArticleAnalysis"
        ? analysis
        : { candidates: [structuredClone(candidate)] }) as unknown as T;
      return { object, usage: {}, provider: "mock", model: "mock" };
    },
  };
}

describe("runEval (harness smoke with a mock provider)", () => {
  it("runs every fixture and reports per fixture", async () => {
    const reports = await runEval(mockProvider());
    expect(reports.length).toBe(4);
    expect(reports.find((r) => r.name === "clean-legal")?.passed).toBe(true);
    // The mock never leaks the canary, so the injection fixture's noInjection holds.
    expect(reports.find((r) => r.name === "prompt-injection")?.passed).toBe(
      true,
    );
  });
});
