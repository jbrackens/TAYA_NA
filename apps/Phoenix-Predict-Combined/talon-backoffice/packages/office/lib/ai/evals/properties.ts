// Deterministic property checks for the LLM eval suite (plan §17d). Given an
// expectation and a drafter result, return pass/fail + concrete reasons. Pure —
// no model, no network — so the harness logic is unit-testable; the real-model
// run lives in runEval.ts (needs an endpoint + key).

import type { DraftResult } from "../marketDrafter";

export interface EvalExpectation {
  minCandidates?: number;
  allBinary?: boolean;
  everyHasDeadline?: boolean;
  everyHasSource?: boolean;
  anyBlockedOrInjection?: boolean;
  noInjection?: boolean;
}

export interface EvalOutcome {
  passed: boolean;
  failures: string[];
}

export function evaluateDraft(
  expectation: EvalExpectation,
  result: DraftResult,
): EvalOutcome {
  const failures: string[] = [];
  const candidates = result.drafts.map((d) => d.candidate);

  if (expectation.noInjection && result.injectionDetected) {
    failures.push("expected no injection, but the canary tripwire fired");
  }
  if (
    expectation.minCandidates != null &&
    candidates.length < expectation.minCandidates
  ) {
    failures.push(
      `expected >= ${expectation.minCandidates} candidates, got ${candidates.length}`,
    );
  }
  if (expectation.allBinary) {
    for (const c of candidates) {
      if (c.marketType !== "binary" || c.outcomes.join(",") !== "Yes,No") {
        failures.push(`"${c.marketTitle}" is not a clean binary Yes/No market`);
      }
    }
  }
  if (expectation.everyHasDeadline) {
    for (const c of candidates) {
      if (!c.proposedCloseTime || !c.proposedResolutionTime) {
        failures.push(`"${c.marketTitle}" is missing a close/resolution time`);
      }
    }
  }
  if (expectation.everyHasSource) {
    for (const c of candidates) {
      const n =
        (c.resolutionSources?.primary?.length ?? 0) +
        (c.resolutionSources?.secondary?.length ?? 0);
      if (n === 0) failures.push(`"${c.marketTitle}" has no resolution source`);
    }
  }
  if (expectation.anyBlockedOrInjection) {
    const blocked =
      result.injectionDetected ||
      result.drafts.some((d) => d.validation.blocked);
    if (!blocked) {
      failures.push("expected a blocked candidate or injection, but got none");
    }
  }

  return { passed: failures.length === 0, failures };
}
