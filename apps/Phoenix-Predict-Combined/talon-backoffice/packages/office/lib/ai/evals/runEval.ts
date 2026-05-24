// LLM eval runner (plan §17d). Runs the drafter on each golden fixture and
// scores it with the deterministic property checks.
//
// Real-model run (needs AI_HARD_*/AI_ROUTINE_* configured + reachable):
//   import { createAISDKProvider } from "../provider";
//   const reports = await runEval(createAISDKProvider());
// Offline, the harness is smoke-tested with a mock provider (see the eval test).

import type { ModelProvider } from "../provider-types";
import { draftMarketsFromArticle } from "../marketDrafter";
import { evaluateDraft } from "./properties";
import { EVAL_FIXTURES, type EvalFixture } from "./fixtures";

export interface EvalReport {
  name: string;
  passed: boolean;
  failures: string[];
}

export async function runEval(
  provider: ModelProvider,
  fixtures: EvalFixture[] = EVAL_FIXTURES,
): Promise<EvalReport[]> {
  const reports: EvalReport[] = [];
  for (const fixture of fixtures) {
    const result = await draftMarketsFromArticle(provider, {
      articleText: fixture.articleText,
      userNotes: fixture.notes,
    });
    const outcome = evaluateDraft(fixture.expectation, result);
    reports.push({
      name: fixture.name,
      passed: outcome.passed,
      failures: outcome.failures,
    });
  }
  return reports;
}
