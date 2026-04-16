# 166 - Section 13 CI Gate Enforcement (Release + Verify)

Date: 2026-03-05  
Owner: Codex

## Scope
Implemented Section 13 governance execution items by hardening CI workflow triggers and mandatory gate coverage.

## Implementation

Updated:
- `.github/workflows/release-gates.yml`
- `.github/workflows/verify-go.yml`
- `.github/workflows/verify-frontends.yml` (new)
- `.github/workflows/verify-api-contract-fixtures.yml` (new)

### Changes
1. `Release Gates` workflow now runs automatically on:
- `pull_request` to `release/**`
- `push` to `release/**`
- `push` tags `release-*` and `v*`
- `workflow_dispatch` (existing)

2. `Verify Go Parity` now runs on all pull requests (removed path filter) so it can be enforced as a mandatory pre-merge check.

3. Added `Verify Frontends` workflow with dedicated required-check jobs:
- `verify-sportsbook`
- `verify-talon`

4. Added `API Contract Fixtures` workflow for sportsbook API response-shape fixture regression (`sportsbook-api-response-shapes`) triggered when API contract/fixture surfaces change.

## Outcome
Section 13 items (1), (3), and (4) now have concrete CI enforcement primitives in-repo.
