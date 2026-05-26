// LLM eval runner (plan §17d). Runs the drafter on each golden case and
// scores it with the deterministic property checks.
//
// Real-model run (needs AI_HARD_*/AI_ROUTINE_* configured + reachable):
//   import { createAISDKProvider } from "../provider";
//   const reports = await runEval(createAISDKProvider());
// Offline, the harness is smoke-tested with a mock provider (see the eval test).

import type { ModelProvider } from "../provider-types";
import { draftMarketsFromArticle } from "../marketDrafter";
import { evaluateDraft } from "./properties";
import { EVAL_CASES, type EvalCase } from "./cases";

export interface EvalReport {
  name: string;
  passed: boolean;
  failures: string[];
}

export async function runEval(
  provider: ModelProvider,
  cases: EvalCase[] = EVAL_CASES,
): Promise<EvalReport[]> {
  const reports: EvalReport[] = [];
  for (const currentCase of cases) {
    const result = await draftMarketsFromArticle(provider, {
      articleText: currentCase.articleText,
      userNotes: currentCase.notes,
    });
    const outcome = evaluateDraft(currentCase.expectation, result);
    reports.push({
      name: currentCase.name,
      passed: outcome.passed,
      failures: outcome.failures,
    });
  }
  return reports;
}
