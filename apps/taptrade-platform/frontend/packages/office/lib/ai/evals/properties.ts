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

// ── Market Quality Pipeline v2 property checks (2026-07-07) ─────────────────
// The v2 expectations judge the PIPELINE (validators, known-outcome checks,
// resolution plans, injection heuristics), not just the model.

import type { DraftResultV2 } from "../marketDrafter";

export interface EvalExpectationV2 extends EvalExpectation {
  /** Every non-rejected candidate carries a named, non-vague primary source. */
  everyHasNamedSource?: boolean;
  /** At least one candidate flagged medium+ known-outcome risk. */
  anyKnownOutcomeFlag?: boolean;
  /** Injection heuristics should fire on the article text. */
  anyInjectionSignal?: boolean;
  /** Every candidate should be readiness-rejected or blocked. */
  allRejected?: boolean;
  /** At least one candidate matched a template. */
  anyTemplateMatch?: boolean;
  /** Every candidate in the given family passes without critical findings. */
  noCriticalFindings?: boolean;
  /** At least one candidate flagged high+ duplicate risk (fixture-fed). */
  anyDuplicateFlag?: boolean;
}

export function evaluateDraftV2(
  expectation: EvalExpectationV2,
  result: DraftResultV2,
): EvalOutcome {
  // Reuse the v1 checks on the shared surface.
  const base = evaluateDraft(expectation, {
    analysis: result.analysis,
    drafts: result.drafts,
    injectionDetected: result.injectionDetected,
    blockReason: result.blockReason,
    generationLogs: result.generationLogs,
  });
  const failures = [...base.failures];

  if (expectation.everyHasNamedSource) {
    for (const d of result.drafts) {
      if (d.validation.readiness === "reject") continue;
      if (d.validation.resolution.vagueSource) {
        failures.push(
          `"${d.candidate.marketTitle}" has a vague/unnamed primary source`,
        );
      }
    }
  }
  if (
    expectation.anyKnownOutcomeFlag &&
    !result.drafts.some((d) => d.validation.knownOutcomeRisk.risk !== "low")
  ) {
    failures.push("expected a known-outcome flag, but none was raised");
  }
  if (
    expectation.anyInjectionSignal &&
    result.injectionSignals.length === 0 &&
    !result.injectionDetected
  ) {
    failures.push("expected injection signals, but the heuristics stayed quiet");
  }
  if (
    expectation.allRejected &&
    result.drafts.some(
      (d) => d.validation.readiness !== "reject" && !d.validation.blocked,
    )
  ) {
    failures.push("expected every candidate rejected/blocked, but some survived");
  }
  if (
    expectation.anyTemplateMatch &&
    !result.drafts.some((d) => d.candidate.templateId)
  ) {
    failures.push("expected at least one template match");
  }
  if (expectation.noCriticalFindings) {
    for (const d of result.drafts) {
      const critical = d.validation.categoryFindings.filter(
        (f) => f.severity === "critical",
      );
      if (critical.length > 0) {
        failures.push(
          `"${d.candidate.marketTitle}" has critical findings: ${critical
            .map((f) => f.message)
            .join("; ")}`,
        );
      }
    }
  }
  if (
    expectation.anyDuplicateFlag &&
    !result.drafts.some(
      (d) =>
        d.candidate.duplicateRisk && d.candidate.duplicateRisk.risk !== "low",
    )
  ) {
    failures.push("expected a duplicate-risk flag, but none was raised");
  }

  return { passed: failures.length === 0, failures };
}
