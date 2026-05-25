// Deterministic market-quality validation (plan §17). This runs AFTER the LLM
// and never trusts model output for the publish/review decision — the model's
// risk verdict is advisory; this code (plus human review) is the gate.
//
// Errors are hard rejects. Warnings are surfaced to the operator but do not
// block. requiresHumanReview is computed here (never taken from the model);
// note the MVP route additionally forces review on for everything.

import type { MarketCandidate } from "./types";

// §17.2 — vague terms that make a question unresolvable unless defined in the
// resolution criteria. Presence is a warning, not a hard reject.
export const VAGUE_TERMS = [
  "soon",
  "major",
  "significant",
  "likely",
  "probably",
  "justice",
  "fair",
  "good",
  "bad",
  "caught",
  "exposed",
  "scandalous",
  "successful",
] as const;

export interface ValidationResult {
  ok: boolean; // false if there are any hard errors
  errors: string[];
  warnings: string[];
  blocked: boolean;
  requiresHumanReview: boolean;
}

export interface ValidateOptions {
  now?: Date; // injectable clock for deterministic tests
}

export function validateCandidate(
  candidate: MarketCandidate,
  opts: ValidateOptions = {},
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const now = opts.now ?? new Date();

  // §17.1 — required fields
  if (!candidate.marketQuestion?.trim())
    errors.push("market_question is required");
  if (!candidate.marketType) errors.push("market_type is required");
  if (!Array.isArray(candidate.outcomes) || candidate.outcomes.length === 0)
    errors.push("outcomes are required");
  if (!candidate.proposedCloseTime)
    errors.push("proposed_close_time is required");
  if (!candidate.proposedResolutionTime)
    errors.push("proposed_resolution_time is required");
  if (!candidate.resolutionCriteria)
    errors.push("resolution_criteria is required");
  if (!candidate.resolutionSources)
    errors.push("resolution_sources is required");
  if (!candidate.riskLevel) errors.push("risk_level is required");

  // §17.2 — vague wording (warn; may be allowed if defined in the criteria)
  if (candidate.marketQuestion) {
    for (const term of VAGUE_TERMS) {
      if (new RegExp(`\\b${term}\\b`, "i").test(candidate.marketQuestion)) {
        warnings.push(
          `question contains vague term "${term}" — define it in the resolution criteria or remove it`,
        );
      }
    }
  }

  // §17.3 — deadline sanity
  const close = parseDate(candidate.proposedCloseTime);
  const resolution = parseDate(candidate.proposedResolutionTime);
  if (candidate.proposedCloseTime && !close)
    errors.push("proposed_close_time is not a valid date");
  if (candidate.proposedResolutionTime && !resolution)
    errors.push("proposed_resolution_time is not a valid date");
  if (close && resolution && close.getTime() > resolution.getTime())
    errors.push("close_time must not be after resolution_time");
  if (close && close.getTime() <= now.getTime())
    errors.push("close_time must be in the future");

  // §17.4 — outcomes
  if (candidate.marketType !== "binary") {
    errors.push("MVP supports binary markets only");
  }
  const o = candidate.outcomes ?? [];
  if (!(o.length === 2 && o[0] === "Yes" && o[1] === "No"))
    errors.push('binary market outcomes must be exactly ["Yes","No"]');

  // §17.5 — sources
  if (candidate.resolutionSources) {
    const primary = candidate.resolutionSources.primary ?? [];
    const secondary = candidate.resolutionSources.secondary ?? [];
    if (primary.length === 0 && secondary.length === 0)
      errors.push("at least one resolution source is required");
    else if (primary.length === 0)
      warnings.push(
        "no primary official source — resolution relies on secondary sources (requires review)",
      );
  }

  // §9.9 — blocked markets cannot be published
  const blocked = candidate.riskLevel === "blocked";
  if (blocked)
    errors.push("market risk_level is blocked — not eligible for publication");

  // §9.10 — review is computed by us, never the model. The MVP route forces
  // review on regardless; this is the minimum derived from the candidate.
  const requiresHumanReview =
    blocked ||
    candidate.riskLevel !== "low" ||
    warnings.length > 0 ||
    errors.length > 0;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    blocked,
    requiresHumanReview,
  };
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
