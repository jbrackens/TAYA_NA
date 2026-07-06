# TapTrade Rebrand — WORKLOG

GOAL: zero non-allowlisted case-insensitive hits for tiangge|phoenix|talon across
player app, backend, backoffice; TapTrade everywhere per CURRENT_STATE scheme; five
gates green (Unit/Integration/E2E/Performance/Security); rendered UI clean; docs current.

## Iteration 1 — 2026-07-06 (~15:4x)
- VERIFIED: branch chore/rebrand-taptrade created off main (64d84941).
- VERIFIED (git grep -il): content-hit file counts tiangge=409 phoenix=2923 talon=716;
  path-hit files 6,397; per-surface counts in CURRENT_STATE.md.
- VERIFIED (lockfile grep): no third-party phoenix/talon packages in yarn.lock /
  package-lock.json beyond our own phoenix-ui scope → ALLOWLIST starts empty.
- ASSUMED (needs verification next iteration): phoenix-backend/, phoenix-frontend/,
  phoenix-frontend-brand-viegg/, revival/ are dead vendored trees — no active build/CI
  references. Verification method: grep .github/workflows + compose + Makefiles for refs.
- Seeded CURRENT_STATE.md, WORKLOG.md, RENAME_MAP.md, ALLOWLIST.md.
- Note: /predict award-pass deploy (main 64d84941) was in flight during this iteration;
  rebrand work is isolated on this branch.
- VERIFIED (grep): legacy trees have ZERO references from .github workflows, compose
  files, Caddyfiles, or talon-backoffice/docker, and ZERO imports from active surfaces.
  BUT the Makefile + ~12 scripts/ entries (local-stack.sh, dev-start.sh, health-check.sh,
  seed/migration validators, qa/*) still reference them — those scripts must be classified
  (active dev tooling vs. themselves legacy) before the git rm decision. → Iteration 2.
