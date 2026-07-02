# PAM Modernization — Progress Ledger

## Bootstrap (session 2026-07-02)

### REPO_ROOT
- **REPO_ROOT = `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict`** (VERIFIED 2026-07-02)
  - Evidence: `git rev-parse --show-toplevel` inside the nested tree returns it; branch `main` at `a53155c3`; the outer tree `/Users/john/Sandbox/Taya_NA_Predict/` returns `fatal: not a git repository`.
  - The outer tree is radioactive per bootstrap rule — not read from or written to, with two disclosed metadata-only exceptions made **before/for** the pinning decision: (1) `ls` of the outer root to identify candidates, (2) `ls` of `outer/docs/` to locate the missing PAM docs for the BOOT-1 decision brief. No file contents were read.
- **Active working tree: `/Users/john/Sandbox/Taya_NA_Predict/pam-worktree`, branch `pam/p0-modernization`** (VERIFIED via `git worktree list` run inside REPO_ROOT)
  - This is a registered linked worktree of REPO_ROOT (same repository, shared object store), NOT the radioactive duplicate. It already carried prior-session PAM work: commit `6914421c` "fix(security): replace fake 2FA toggle with enforced TOTP MFA [P0-1]" (2026-06-27).
  - Interpretation recorded: the prompt's "never touch the other tree" rule targets the outer duplicate *source tree*; a git worktree of the chosen repo is part of the chosen repo. All loop work happens here on branch `pam/p0-modernization`. Nothing is pushed.
  - `main` was merged into `pam/p0-modernization` this session to bring the branch current (main had moved: Tiangge RC spec, auth P1-05 hardening, deploy fixes). Two conflicts in `services/auth/internal/http/handlers.go` resolved by keeping BOTH sides: main's per-IP login limiter + helpers AND P0-1's 3-arg `Login(username, password, otp)`. Auth module `go build` clean, `go test -race ./...` **ok (125.7s)** after resolution.

### Source-of-truth docs (Phase 0.2)
- `docs/pam/spec.md` — **MISSING** from REPO_ROOT (BLOCKED, see BOOT-1)
- `docs/pam/taya-gap-analysis.md` — **MISSING** (BOOT-1)
- `docs/pam/pam-implementation-plan.md` — **MISSING** (BOOT-1)
- `docs/pam/pam-domain-model.md` — **MISSING** (BOOT-1)
- `docs/pam/pam-open-questions.md` — **MISSING** (BOOT-1)
- Evidence: `docs/pam/` does not exist in the main checkout, the pam-worktree, or **anywhere in git history on any branch** (`git log --all --oneline -- docs/pam` is empty).
- Tiangge launch spec — **VERIFIED** at `REPO_ROOT/spec.md` (512,084 bytes; first line `# Tiangge Spec`; tracked, last touched by commit `7069c7c9` "feat: prepare Tiangge parity RC release"). Note: it entered main *after* the pam branch point, which is one reason the merge above was needed.
- Consequence while BOOT-1 is open: backlog items are implemented from their self-contained inline descriptions + the code itself; PAM-spec §-citations are recorded as "citation pending BOOT-1 unblock"; Termination pass B (spec reconciliation) cannot run and is BLOCKED on BOOT-1.

## Baseline
- auth module: go build OK | go test -race OK (125.7s) — after merge resolution, 2026-07-02
- gateway module: go build OK | go test -race OK (all packages `ok`, exit 0), 2026-07-02
- talon-backoffice office: production build OK (`next build`, 44.35s, exit 0), 2026-07-02
- date: 2026-07-02
- Worktree setup gotcha: a fresh checkout needs `yarn install --frozen-lockfile` at `talon-backoffice/` AND `yarn lerna run build --scope @phoenix-ui/utils --scope @phoenix-ui/api-client --include-dependencies` before any package build — `@phoenix-ui/utils` resolves to `dist/index.js`, which only exists after tsc (same order CI uses in `.github/workflows/frontend-build.yml`).

## Status summary
- P0: 0/7 done · P1: 0/6 · P2: 0/4 · Blocked: 1 (BOOT-1)
- P0-1 has a prior-session commit (`6914421c`) — being re-verified against its Definition of Done as iteration 1.

## In progress
- [P0-1] Real admin MFA — slice 2/2: **require** the second factor for privileged sessions. Slice 1 (commit `6914421c`) landed the TOTP machinery and enforces it for accounts that HAVE an active factor; two gaps remain, both re-verified in code this session:
  - Gap A (VERIFIED): un-enrolled admin logs in on password alone — `services/auth/internal/http/handlers.go` login gate comment says "Accounts without active MFA are unaffected".
  - Gap B (VERIFIED): OAuth callback mints sessions via `newSession` at `oauth.go:377` with no MFA check, and `resolveOAuthAccount` links verified emails to existing accounts regardless of role — an admin's Google login yields a privileged session with no second factor.
  - **Plan:** (1) `AUTH_MFA_REQUIRED_FOR_ADMINS`: unconditionally ON in production/staging (setting "false" there is fatal at boot, mirroring the existing `NewAuthService` Fatalf pattern); in dev it defaults off and is settable — matches the repo's house pattern for enforcement flags (KYC/GEO acks). Parsed by a pure helper for testability. (2) Login gate: authenticated admin without active MFA → 403 with `mfaEnrollmentRequired` + a 10-minute single-use enrollment token (in-memory, mutex-guarded — same in-memory pattern as loginLimiter/lockout; auth service is single-instance). (3) `/2fa/enroll` + `/2fa/activate` accept the enrollment token via `X-MFA-Enrollment-Token` header as an alternative to a session, bound to the token's user; token consumed on successful activation. (4) OAuth callback: unconditionally refuse to mint a session for an admin-role account (admins sign in with password + TOTP only). (5) Audit events for every new branch. Tests: table-driven in `mfa_admin_test.go` — denial+token flow end-to-end, token expiry/single-use/wrong-user, player unaffected, dev flag-off legacy behavior, env-parse helper incl. prod-fatal, OAuth admin-deny.
  - Assumptions: only one `Login` caller (VERIFIED grep); 2FA endpoints session-authed today (VERIFIED read); `auth_mfa` created in `ensureUserSchema` (VERIFIED handlers.go:399); `Role=="admin"` identifies privileged principals incl. `admin_users` staff fallback (VERIFIED handlers.go:82, lookupAdminUser sets Role="admin"); httpx errors can carry details via `NewError` (VERIFIED errors.go). No migration. No gateway/protected-core files.
  - DoD: enforced factor for privileged logins on every path (password + OAuth); fail-closed in prod; audit events; auth module `go build` + `go test -race` green; no weakened control; ledger + checkpoint updated.

## Done
- (none yet this session)

## Blocked / awaiting decision
- [BOOT-1] PAM source-of-truth docs missing from the repository
  - **Question:** the five PAM docs (`spec.md`, `taya-gap-analysis.md`, `pam-implementation-plan.md`, `pam-domain-model.md`, `pam-open-questions.md`) were never committed to the repo. A directory named `pam` exists at `/Users/john/Sandbox/Taya_NA_Predict/docs/pam/` — inside the outer non-git tree this loop is forbidden to read. Are those the authoritative docs, and should they be moved into the repo?
  - **Options:** (a) Human moves/copies them: `mkdir -p <REPO_ROOT>/docs/pam && cp /Users/john/Sandbox/Taya_NA_Predict/docs/pam/*.md <REPO_ROOT>/docs/pam/` then commits — loop picks them up next iteration and gains citations + termination pass B. (b) Human authorizes the loop to read the outer `docs/pam/` in place (one-line instruction suffices). (c) Docs are regenerated from scratch — slow, not recommended.
  - **Recommendation:** (a). It is one command and removes all ambiguity.
  - **Unblock criteria:** the five files exist non-empty under `REPO_ROOT/docs/pam/` (in the pam-worktree after a merge/rebase, or committed on a branch this worktree can merge), `spec.md` opening with `# Enterprise Prediction Market PAM / Back Office Spec` and containing `## 36. Progress Matrix` and `## 37. Reconciliation`.

## Stall reports
- (none)

## Doc drift
- (2026-07-02) [loop-prompt:Phase 0.2] — documented: PAM docs live under `REPO_ROOT/docs/pam/` — actual: `docs/pam` has never existed in git history (evidence: empty `git log --all -- docs/pam`); a `pam` directory exists only in the outer non-git tree — action: BOOT-1 blocked item with move instructions; loop continues on inline backlog + Tiangge spec.
- (2026-07-02) [loop-prompt:P0-1] — documented: "replace the in-memory 2FA toggle" gap is open — actual: prior session already landed TOTP MFA on `pam/p0-modernization` (`6914421c`, files `services/auth/internal/http/{handlers,mfa,totp}.go` + tests) — action: iteration 1 re-verifies it against the DoD instead of re-implementing.

## Lessons
- The PAM branch lives in a linked git worktree (`pam-worktree`), not the main checkout — `git worktree list` from REPO_ROOT is the fastest way to find in-flight branch work; file mtimes and directory names mislead.
- Merging `main` into the PAM branch conflicts in `services/auth/internal/http/handlers.go` whenever main hardens auth (it did: per-IP limiter P1-05). Resolution pattern: keep main's additions AND the 3-arg `Login(..., otp)` signature; `firstNonEmpty` now comes from main's copy (P0-1's trailing duplicate was dropped in the merge).
