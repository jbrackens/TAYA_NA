> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> Written on branch `pam/p0-modernization` (2026-07-02 → 2026-07-06); never merged. The reference
> implementation (345 commits, migrations 057–061) lives at tag `archive/pam-p0-modernization-2026-07-06`.
> Paths here are PRE-REBRAND (`apps/Phoenix-Predict-Combined/go-platform` = `apps/taptrade-platform/go-platform`;
> `talon-backoffice/packages/app` = `frontend/packages/office`) and units are pre-points ("cents", before
> migration 050). Commit hashes cited inside resolve only at that tag.
> For what of this main still lacks, see `docs/licensability-gaps.md`. See `CLAUDE.md` for current architecture.

# GAP-69 (protected-core sites) — exact-match ENVIRONMENT fail-open in the trading/settlement core — BLOCKED

**Status:** BLOCKED (Blocked-Item Protocol — protected core). Needs a human owner of `internal/prediction` / `internal/wallet`.
**Spec:** PAM §13 Responsible Gaming, §22 Payments, §27 Security. Discovered by the 2026-07-03 `env-check-audit` workflow.

## The class
GAP-69 remediated a systematic vulnerability: exact-match `env == "production" || env == "staging"` checks that FAIL OPEN for a non-canonical deployed `ENVIRONMENT` value ("prod", "preprod", a typo, stray case/whitespace), because such a value matches neither literal and falls into the dev/permissive branch. The non-protected sites were fixed by gating on the shared dev-allowlist `compliance.IsDeployedEnvironment` (commits for GAP-69 slices 1–2 and GAP-67). Two residual sites live in PROTECTED CORE and **must not be edited autonomously** (Absolute Guardrail #1: `internal/prediction/*` and `internal/wallet/*` are protected).

## Site 1 — `internal/prediction/service.go:170` — HIGH, NOT contained
```go
if err != nil { // responsible-gambling check failed (transient RG-store error)
    env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
    if env == "production" || env == "staging" {
        return false, fmt.Errorf("responsible-gambling check unavailable") // fail closed
    }
    return false, nil // fail-open in development only
}
```
On a transient responsible-gambling backend error, a deployment whose `ENVIRONMENT` is a non-canonical value ("prod"/"preprod"/typo) takes the `else` and **fails OPEN** — the order is permitted despite the RG gate being unevaluable, silently bypassing loss/stake/self-exclusion enforcement. Unlike the geo/KYC boot gates, nothing else contains this: the boot check does not force the RG backend healthy, and this branch is a *runtime* error path. This is the same HIGH-severity fail-open class as the payments/pretrade sites already fixed in GAP-69 slice 1 — but here the code is inside the protected trading path.

**Recommended fix (for the protected-core owner):** replace the exact-match with the allowlist, mirroring the non-protected fixes:
```go
if compliance.IsDeployedEnvironment(env) {
    return false, fmt.Errorf("responsible-gambling check unavailable")
}
return false, nil
```
This is a one-line change confined to the env-detection in the RG-error branch — it does not touch order matching, pricing, settlement, reservation, or ledger logic, and does not change the fail-open direction for genuine dev environments. Risk is low, but because it is inside `internal/prediction`, a human owner must make it and re-run the full protected-core race/settlement suite. (Note: `internal/prediction` importing `internal/compliance` — verify no import cycle; if one exists, add a tiny local allowlist matching `knownDevEnvironments`, or move the allowlist to a shared low-level package.)

## Site 2 — `internal/wallet/service.go:165` — LOW, contained
```go
isProduction := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT"))) == "production"
```
`isProduction` gates wallet store-mode selection (in-memory vs Postgres) at construction. A non-canonical deployed env would compute `isProduction=false`, but the gateway boot check (`cmd/gateway/main.go`) already refuses to boot a deployed env without `WALLET_STORE_MODE=db`, so the permissive in-memory path is unreachable in a real deployment. Contained; LOW. Fix for consistency when the protected-core owner is in the file: gate on the same allowlist (`... != "production"` → not-in-dev-allowlist). Not urgent.

## Unblock condition
A human owner of the protected trading/wallet core applies the two allowlist changes above (Site 1 is the material one) and re-runs the protected-core test suite. Until then these two sites remain the only unremediated members of the GAP-69 env-check class, tracked here.
