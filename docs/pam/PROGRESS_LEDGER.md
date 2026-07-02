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
- P0: 2/7 done · P1: 0/6 · P2: 0/4 · Blocked: 1 (BOOT-1) · GAP items: 1 (GAP-1, pending)

## In progress
- [P0-3] KYC admin review UI + document binary storage — slice 1/3 (gateway).
  - Gap re-verification (VERIFIED this session): `kyc_documents` table has NO content column (`internal/compliance/kyc_postgres.go:57-69` — metadata only); `VerificationDocument` type has no content field (`types.go:100-111`); the only admin route is `POST /api/v1/admin/kyc/decision` (`internal/http/kyc_admin_handlers.go:45`, RBAC `compliance:write`, audited) — no queue list, no per-user document view, no binary download. Office App Router has no KYC page (`app/(dashboard)/` listing); `users/[id]/page.tsx` exists as the Profile-360 candidate.
  - Slices: **1)** gateway — document binary storage (`kyc_document_files` runtime table: document_id FK, BYTEA content, content_type, sha256, size; the KYC subsystem manages its own schema via `CREATE TABLE IF NOT EXISTS`, NOT goose — following its local pattern) + optional base64 content on the existing user submit path (size-capped) + admin read API: GET queue (pending statuses), GET user detail (status + docs), GET document content (audited as sensitive access) — all RBAC-gated on a NEW `compliance:read` permission added by goose migration 050 (permissions ARE goose-managed, see 040). **2)** office — admin review screen under `app/(dashboard)/` wired to those routes (App Router only). **3)** office — Profile-360 KYC tab on `users/[id]`. Launch-safety: back-office only; the player-side KYC surface stays behind NEXT_PUBLIC_FEATURE_KYC (default off) and is not touched.
  - Assumptions: RBAC perm seeding pattern = migration 040 (VERIFIED); latest migration is 049 → new one is 050 (VERIFIED ls); admin route helpers `requireAdminPermission` + `recordProviderOpsAuditAction` (VERIFIED kyc_admin_handlers.go:47,63); scratch-DB migration gate available via docker postgres :5434 (ASSUMED — verify before the migration gate).
  - DoD: slice-1 endpoints RBAC-gated + sensitive reads audited; migration 050 up+down clean on scratch DB; unit tests incl. handler RBAC denial; full gateway build + `go test -race` green; ledger updated per slice.

## Done
- [P0-1] Real admin MFA — commits `6914421c` (slice 1, prior session: TOTP machinery — enroll/activate/disable/status endpoints, `auth_mfa` table via ensureUserSchema, login OTP verification for active factors) and `268157b8` (slice 2, this session: forced enrollment for admins + OAuth admin denial) — files: `services/auth/internal/http/{handlers,mfa,totp,oauth}.go` + `{handlers,totp,mfa_admin}_test.go` — tests: full auth suite `go test -race` ok (174.3s) incl. new `TestMFAAdminRequiredFromEnv`, `TestAdminLoginRequiresEnrollmentWhenFlagOn` (9-step end-to-end journey), `TestAdminLoginLegacyWhenFlagOff`, `TestEnrollTokenExpiryAndRotation`, `TestOAuthSessionGateDeniesAdmins` — spec §: citation pending BOOT-1.
  - P0 Checkpoint Summary: **What changed:** privileged (admin-role) logins now require an active TOTP factor. Un-enrolled admins presenting a correct password get a single-use, 10-minute enrollment token (honored only by /2fa/enroll + /2fa/activate via X-MFA-Enrollment-Token) instead of a session; after activation they log in with password + OTP. Enforcement is unconditional in production/staging (setting AUTH_MFA_REQUIRED_FOR_ADMINS=false there is a fatal boot error) and opt-in in dev. OAuth callbacks refuse to mint sessions for admin accounts, closing the verified-email auto-link bypass. **Risk:** enrollment-token bootstrap is trust-on-first-use — an attacker who already holds a valid admin password can enroll their own factor; that is no worse than the pre-change posture (password alone logged them in) but provisioning-time enrollment is recommended; tokens are in-memory (single-instance auth service — restart just re-issues). Dev/e2e flows are unchanged because dev defaults to off. **Review focus:** the login-gate ordering in `Login` (enrollment check sits between the fail-closed MFA lookup and the active-factor OTP verification), and `mfaPrincipalFromRequest` (token path must not widen what a session can do — it authorizes enroll/activate only, and activation consumes the token).

- [P0-2] Remove KYC mock-fallback — commit `5adf223c` — files: `gateway/internal/compliance/fail_closed.go` (+`KYCFallbackForEnv`), `fail_closed_test.go` (new), `gateway/internal/http/handlers.go` (wiring), `gateway/cmd/gateway/main.go` (boot check), `main_test.go` + `edge_auth_boot_test.go` (baselines + new refusal/acceptance tables) — tests: full gateway `go test -race` ok, 26 packages — spec §: citation pending BOOT-1.
  - P0 Checkpoint Summary: **What changed:** production and staging can no longer run KYC on the in-memory mock. If the Postgres KYC store fails to initialize, deployed environments degrade to the fail-closed service (refuses verifications, reports non-approved status); a deployment without a DB-backed wallet store (which carries the KYC/RG schema) now refuses to boot in production AND staging — previously only production was covered, and only by the wallet service itself. Dev behavior is unchanged. **Risk:** a mid-flight Postgres schema failure in prod now turns KYC actions into denials instead of silent mock approvals — operationally louder (slog.Error + fail-closed) but compliance-correct. Existing boot-validation tests needed the new baseline keys (`WALLET_STORE_MODE=db`), which is expected churn, not weakened coverage. **Review focus:** the boot check's mode aliases (db/sql/postgres) mirror `wallet.NewServiceFromEnv` exactly; `KYCFallbackForEnv` is the single chokepoint both fallback branches route through. Note: `go vet` on cmd/gateway flags pre-existing json-tag nits in `migrate_legacy_loyalty.go` (untouched by this diff; vet is not a repo gate).

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

## Backlog additions (GAP items)
- [GAP-1] (P1) Responsible-gambling and geo-compliance services also fall back to in-memory mocks in deployed environments (`internal/http/handlers.go:479` mock geo unconditionally; `:498-500` RG mock on init error; `FailClosedGeoComplianceService` is dead code) — same defect class as P0-2 but distinct services; justification: fail-closed compliance posture requirement (PAM spec citation pending BOOT-1).

## Lessons
- The PAM branch lives in a linked git worktree (`pam-worktree`), not the main checkout — `git worktree list` from REPO_ROOT is the fastest way to find in-flight branch work; file mtimes and directory names mislead.
- Merging `main` into the PAM branch conflicts in `services/auth/internal/http/handlers.go` whenever main hardens auth (it did: per-IP limiter P1-05). Resolution pattern: keep main's additions AND the 3-arg `Login(..., otp)` signature; `firstNonEmpty` now comes from main's copy (P0-1's trailing duplicate was dropped in the merge).
- Husky pre-commit runs the FULL frontend unit suite (`lerna run test`) + lint-staged on every commit (~2 min) and a post-commit commitlint that complains about old commits — its failure does not block the commit. Budget commit time; use timeout ≥300s.
- The auth test harness pattern: `t.Setenv` for seed users + `NewAuthService()` + `RegisterRoutes` + `httpx.Chain(...)`; `totpCode(secret, time.Now())` from totp.go generates valid codes in tests. Suite is bcrypt-slow (~3 min with -race) — run targeted `-run` filters while iterating.
- The gateway already has a fail-closed services toolkit (`internal/compliance/fail_closed.go`) that nothing uses — check for existing dead "correct" implementations before writing new ones.
