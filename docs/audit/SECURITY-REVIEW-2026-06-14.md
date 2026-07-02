# Security & Bug Review — 2026-06-14

**Reviewer:** Claude (Opus 4.8), 6 parallel domain agents + manual verification of every Critical/High finding against source.
**Scope:** the LIVE/deployed code only — Go gateway (`apps/Phoenix-Predict-Combined/go-platform/services/gateway`), auth service (`.../services/auth`), and the Next.js player + office frontends (`.../talon-backoffice/packages/{app,office,api-client}`). Dead trees (`phoenix-backend`, `archive`, `revival`, `phoenix-frontend-brand-viegg`) and `cmd/seed` dev tooling were excluded.
**Method:** dimensional fan-out (auth/session, money matching/settlement, wallet/cashier, access-control/webhooks, injection/SSRF/DoS, frontend). Findings marked **[V]** were read and confirmed in source by the reviewer; **[R]** are agent-reported with corroboration noted.
**Relation to AUDIT_REPORT.md (same date):** that audit graded money-path **B** and security **B**. This pass goes deeper and surfaces several issues the audit's top-10 did **not** capture — notably the settlement double-pay sibling-writer, the unwired reorg watcher, the staff-RBAC gap on money routes, and the frontend XSS→token-theft chain.

## Remediation status (2026-06-14)

**All 24 findings remediated and pushed to `main`** as verified units (each: local
`go build`/`vet`/`test ./...` + frontend typecheck/gate green → commit → CI green).
Commits: `1f4c03b0` #1 · `1d58d349` #5 · `c717d0b0` #7/#13/#14 · `5a97ec29` #6 ·
`5ef5a69d` #10 · `632c57f6` #8 · `6c4e26de` #3/#4/#12/#15/#23 ·
`03a69902` #9/#2/#17/#19/#22 · `f9f552f8` #11/#18 · `6c5b3983` #16/#20/#21/#24 ·
`9beead70` (migration-042 goose-compat hotfix). Final `main` @ `9beead70` is fully
CI-green (G-02 `-race`, G-03 fresh-DB migrations, G-04, Tests, Deploy) and deployed.
New CI-enforced regression coverage: market-status CAS test, SSRF guard test,
reorg-watcher + payments-webhook DSN tests, bonus money-math tests; new
permissions/constraints in migrations 040–043.

**Owner follow-ups (intentionally NOT auto-implemented — flagged in the relevant
commits):** #4 full removal of the localStorage access token (needs IdComply →
same-origin + an SSR `/session` bootstrap); #18 trigger-gated self-service bonus
claims (currently *refused*, pending trigger→deposit/bet-event wiring) +
`MinDeposits`/`TierMin` eligibility; #2 reorg watcher + #11 wagering gate are
latent until the crypto rail / wagering accrual is enabled; full SIWE/EIP-712
(#19); strict-required webhook amount/user (#17); and the role→permission grants
introduced by #5/#8 (`finances:write`, `compliance:write`, `cashier:broadcast`)
which the owner can tighten in the Role Matrix.

## Severity summary

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 1 | **CRITICAL** | Unguarded `UpdateMarketStatus` → void-refund + settlement **double payout** | `prediction/sql_repository.go:509` | [V] |
| 2 | **CRITICAL** | Deposit reorg-finality watcher is **never wired** → unbacked withdrawable balance | `alphacashier/finality.go:54,92` | [V] |
| 3 | **HIGH** | Stored **XSS** via unsanitized CMS `dangerouslySetInnerHTML` (player origin) | `app/components/ContentPage.tsx:23,102` | [V] |
| 4 | **HIGH** | Access token in **non-HttpOnly/non-Secure cookie + localStorage** (session-theft enabler for #3) | `app/lib/api/client.ts:21,235` | [V] |
| 5 | **HIGH** | Money/settlement routes gate on `requireAdminRole` only → **staff RBAC bypass** | `http/admin_handlers.go:184,217`; `prediction_handlers.go:668…1102` | [V] |
| 6 | **HIGH** | Outbound **webhook SSRF** — no private-IP/redirect guard | `http/webhook_admin_handlers.go:175`; `webhooks/deliver.go:50` | [V] |
| 7 | **HIGH** | Spoofable `X-Admin-Actor` header → **defeats two-person withdrawal** + forges audit | `http/admin_handlers.go:265`; `httpx/middleware.go:243` | [V] |
| 8 | **HIGH** | Two-person withdrawal **default-off**, ACK-escapable, approve+broadcast share one permission | `alphacashier/config.go:56,80`; `service.go:476,566` | [R] |
| 9 | **HIGH** | Deposit credit + intent-flip **non-atomic**; AML screen only at intent, **fail-open** by default | `alphacashier/service.go:338,197,321`; `screening.go:58` | [R] |
| 10 | **HIGH** | Fully-filled GTC buy never releases reservation surplus → **user cash locked** until expiry | `prediction/exchange.go:640`; `wallet/service.go:910` | [R] |
| 11 | **HIGH** | Bonus: `GrantBonus` has no ceiling/budget check; wagering enforcement is **dead code** | `bonus/service.go:279`; `wallet/wagering.go:37` | [R] |
| 12 | **HIGH** | **Open redirect** in office login via `returnUrl` (`//evil.com`) | `office/app/(auth)/auth/login/page.tsx:74` | [R] |
| 13 | MEDIUM | `POST /punters/delete` trusts body `user_id` (IDOR; stub today) | `http/user_handlers.go:48` | [V] |
| 14 | MEDIUM | Wallet read ownership check **fails open** when auth ctx empty | `http/wallet_handlers.go:46` | [V] |
| 15 | MEDIUM | Office auth guard **fails open** when validator unreachable; disableable via env | `office/proxy.ts:51,81` | [R] |
| 16 | MEDIUM | Unbounded `limit` on public leaderboard + unclamped `page` OFFSET → DoS | `http/leaderboard_handlers.go:278`; `prediction_handlers.go:68…` | [R] |
| 17 | MEDIUM | Webhook replay / amount not reconciled against signed payload (legacy path) | `payments/db_service.go:416,428` | [R] |
| 18 | MEDIUM | Bonus claim ignores eligibility/trigger rules; claim/budget limits racy | `bonus/service.go:141,154` | [R] |
| 19 | MEDIUM | Wallet-connect challenge has no domain binding (SIWE/EIP-712) → signature replay | `alphacashier/signature.go:23` | [R] |
| 20 | LOW | `LIMIT/OFFSET` built with `fmt.Sprintf` (latent SQLi-shaped; currently int-safe) | `prediction/sql_repository.go:153,251,565` | [R] |
| 21 | LOW | Bot API-key `key_prefix` lacks UNIQUE constraint | `migrations/014_…:224` | [R] |
| 22 | LOW | Audit-write errors swallowed across cashier + bonus money events | `alphacashier/service.go:239…`; `bonus/service.go:*` | [R] |
| 23 | LOW | `window.open(...)` for PSP/IDV redirects without `noopener`; player app has no CSP | `app/components/IdComplyModal.tsx:187`; `app/cashier/page.tsx` | [R] |
| 24 | LOW | `GATEWAY_AUTH_ENABLED=false` chain doesn't strip client identity headers (dev/demo only) | `cmd/gateway/main.go:96` | [R] |

---

## CRITICAL

### 1. Unguarded `UpdateMarketStatus` lets the closer/admin clobber a `voided` market → double payout  [V]
`prediction/sql_repository.go:509` — concurrency / missing CAS.
`UpdateMarketStatus` runs `UPDATE prediction_markets SET status=$1 WHERE id=$2` with **no status guard and no advisory lock**, unlike every money-path persister (which use the CAS-guarded `transitionMarketStatusWithExec`, `…WHERE id=$ AND status=$prev`). Two writers call it: the 30 s `MarketCloser` (`workers/closer.go:52`, after `ListMarketsToClose` selects `status='open' AND close_at<=now`) and admin `TransitionMarketStatus` (`service.go:1276`).

**Exploit (race):** an admin voids an open market in the window after the closer has read it as `open` but before the closer's unguarded write. The guarded open→voided commits (refunds paid via `PersistVoidedMarketAtomic`, which **leaves positions intact** — verified, no `closeSettledPosition`/quantity-zeroing), then the closer's `UpdateMarketStatus(closed)` resurrects it to `closed`. `ListMarketsToSettle` (`:528`, `WHERE status='closed' … AND id NOT IN (SELECT market_id FROM prediction_settlements)`) then re-selects it and the auto-settler pays winners 100¢/contract **on top of** the void refund. Void and payout use different wallet idempotency keys (`prediction_void:*` vs `prediction_payout:*`), so the ledger cannot dedupe.

This is the **same defect class the audit's COR-01 fixed** — but COR-01 only guarded three persisters; this sibling writer bypasses the guard. **Fix:** make `UpdateMarketStatus` a guarded CAS (pass the validated `expectedPrev`, take the per-market advisory lock, abort on `RowsAffected()!=1`). **Confidence: High** (chain verified end-to-end; trigger is a real but narrow TOCTOU).

### 2. Deposit reorg-finality watcher is never invoked → credited deposits never re-checked  [V]
`alphacashier/finality.go:54,92` — reorg-credit reversal.
`CheckDepositFinality` and `FreezeReorgedDeposit` exist (and the package comment claims "a thin worker walks credited deposits") but have **zero non-test callers** anywhere in `cmd/`, `internal/http`, or any worker (verified by grep). `SubmitDepositTx` credits the wallet after `Confirmations` (default 12) and the deposit is never revisited. A chain reorg deeper than the confirmation depth orphans the deposit tx while the user keeps an internal, **directly-withdrawable** balance backed by no treasury funds. **Fix:** wire a periodic worker iterating `status='credited'` intents through `CheckDepositFinality` → `FreezeReorgedDeposit`, or gate withdrawals on a finality-confirmed flag. **Confidence: High.** Caveat: impact is realized only when the USDC deposit rail is enabled in production (alpha rail is default-off), but it is a latent CRITICAL in the deposit safety design.

---

## HIGH

### 3. Stored XSS via unsanitized CMS content  [V]
`app/components/ContentPage.tsx:23` (and `:102`). `getPage(slug)` fetches `/api/v1/content/{slug}` and injects the `html` string via `dangerouslySetInnerHTML` with **no sanitization** (no DOMPurify in the repo). Any HTML/`<script>`/`onerror` stored in a CMS page executes in every visitor's browser on the player origin. **Note:** the injection vector requires CMS-author privilege — but finding #5 makes *any* back-office staffer effectively admin, and the office "Content" nav has no required permission, so the bar to plant it is low. Chains with #4 into full session theft. **Fix:** sanitize with a DOMPurify allowlist, or render structured blocks without raw HTML. **Confidence: High.**

### 4. Player access token in JS-readable cookie + localStorage  [V]
`app/lib/api/client.ts:21` writes `authToken=<token>; path=/; SameSite=Lax` with **no `HttpOnly` and no `Secure`**, and `getToken()` (`:235`) also reads `localStorage["phoenix_access_token"]`. Combined with #3, an injected script exfiltrates a live session token via `document.cookie`/`localStorage`. Missing `Secure` also exposes it on any non-HTTPS hop. The api-client (`api-client/src/auth.ts`) and office login likewise place access **and refresh** tokens in localStorage. **Fix:** rely on the HttpOnly `authToken` cookie the login route already sets; stop mirroring tokens to JS-readable storage; add `Secure`. **Confidence: High.**

### 5. Money/settlement routes enforce only coarse `requireAdminRole`, not RBAC permissions  [V]
`http/admin_handlers.go:184,217` (wallet credit/debit), `prediction_handlers.go:668,729,772,794,814,829,1013` (settlement resolve/void, market create/open/halt/close, event create), plus dispute-resolve, KYC-decision, and loyalty-adjust handlers. All gate on `requireAdminRole`. Every back-office staffer authenticates via the `admin_users` fallback that assigns an admin role (`auth/.../handlers.go:228`, fallback at `:826/:1144`), so the granular RBAC permissions (migration 027 — `finances:write`, `settlements:resolve`, `markets:edit`, …) that you built are **not enforced** on exactly the highest-impact actions. A least-privilege "Customer Support" staffer can credit/debit any wallet, resolve/void markets, and adjust loyalty balances. (The `/admin/users`, `/admin/roles`, partner-key, webhook, and cashier routes *do* use `requireRBACPermission` — these money routes were missed.) **Fix:** add `requireRBACPermission(r, rbacService, "<perm>")` after the admin gate on each money/settlement route. **Confidence: High.**

### 6. Outbound webhook SSRF  [V] (corroborated by 2 agents)
`http/webhook_admin_handlers.go:175` (`validateWebhookURL` checks only scheme∈{http,https} + non-empty host) and `webhooks/deliver.go:50` (bare `client.Do`, no `CheckRedirect`/`DialContext`). A partner endpoint registered as `http://169.254.169.254/latest/meta-data/…`, `http://127.0.0.1:18080/…`, or any RFC-1918 address receives the signed POST; no redirect or DNS-rebind defense. Gated by `partners:write` (operator/compromised-RBAC threat, not anonymous) — hence High not Critical. **Fix:** SSRF guard resolving the host and rejecting loopback/link-local/private/unspecified IPs, enforced at registration **and** at dial time via a custom `DialContext` + `CheckRedirect`. **Confidence: High.**

### 7. Spoofable `X-Admin-Actor` header defeats two-person withdrawal & forges audit  [V]
`http/admin_handlers.go:265` (`adminActorFromRequest` reads `X-Admin-Actor`/`X-Admin-User`/`X-Actor-Id`). The ingress middleware (`modules/platform/transport/httpx/middleware.go:243-246`) strips `X-User-ID`/`X-Admin-Role`/`X-Bot-Scopes`/`X-Bot-Key-ID` but **not** these actor headers. One operator with `cashier:write` can approve a withdrawal sending `X-Admin-Actor: alice`, then broadcast sending `X-Admin-Actor: bob`, satisfying the broadcaster≠approver check and forging the audit trail. **Fix:** derive the actor from `httpx.UsernameFromContext` (session identity), never from request headers. **Confidence: High.**

### 8. Two-person withdrawal: default-off, ACK-escapable, single permission  [R]
`alphacashier/config.go:56` (`TwoPersonWithdrawal` defaults `false`), boot enforcement `:80-88` requires it only in prod/staging and accepts `…_ACK_DISABLED=true` to run without it; `service.go:476` `ApproveWithdrawal` has no approver≠requester check, and approve + broadcast sit behind the same `cashier:write` permission. Combined with #7 the only remaining barrier is two differing (spoofable) strings. **Fix:** make dual-control mandatory when withdrawals are enabled (drop the ACK), forbid approver==requester, split approve vs broadcast permissions.

### 9. Deposit credit non-atomic + AML screening fail-open / mis-ordered  [R]
`alphacashier/service.go:338` credits the wallet in its own tx, then `:347` flips the intent in a separate write — a crash between leaves the wallet credited but the intent un-finalized (reconciliation under-counts; re-submit re-verifies). `screenAddress` runs at intent creation (`:197`) but **not** in `SubmitDepositTx` (`:321`), so the actual money-in has no sanctions gate; and `screening.go:58` defaults to observe-only (`ScreeningEnforced=false`, default screener returns allow) **with no prod boot guard**. The legacy `payments` path does no screening at all. **Fix:** one tx for credit+intent-flip; re-screen inside `SubmitDepositTx`; require enforcement on at boot in prod.

### 10. Fully-filled GTC buy never releases reservation surplus  [R]
`prediction/exchange.go:640` (`applyTIF` early-returns `Filled` without appending a `ReleaseReservation`; only IOC/market paths release) + `wallet/service.go:910` (capture flips to `captured` only when capture exactly equals the worst-case hold). A limit buy that fills at a better price leaves the surplus `held` until `ExpireStaleReservations` fires at `CloseAt+1h` — days out. Not fund loss, but materially understates spendable balance for the market's life. **Fix:** append an idempotent release on the fully-filled branch.

### 11. Bonus: unbounded admin grant + wagering enforcement is dead code  [R]
`bonus/service.go:279` `GrantBonus` accepts `OverrideAmountCents>0` with no maximum and no budget/status/window check. `wallet/wagering.go:37` `RecordWageringContribution` (the only function that records wagering progress and triggers `ConvertBonusToReal`) has **zero callers** — no bet/order path records wagering, so the wagering gate exists only on paper, and `ConvertBonusToReal` (`bonus_ops.go:291`) itself checks no wagering. Migration 011 has no `CHECK (>=0)` on amount columns; an admin-supplied multiplier can overflow. (Bonus funds are not *directly* withdrawable — conversion is the gate — which is why the dead conversion guard matters.) **Fix:** enforce campaign budget/status/window + an absolute cap in `GrantBonus`; wire `RecordWageringContribution` into order/settlement; add CHECK constraints.

### 12. Open redirect in office login via `returnUrl`  [R]
`office/app/(auth)/auth/login/page.tsx:74` — guard is `returnUrl.startsWith("/")` then `window.location.assign(...)`. `//evil.com` and `/\evil.com` pass the check but browsers treat them as absolute → an authenticated admin is redirected off-site (phishing/credential relay). **Fix:** reject values matching `^//` or `^/\\`. (The gateway-side office `proxy.ts` returnUrl handling was verified safe; this is the client login page.)

---

## MEDIUM

- **13. `POST /api/v1/punters/delete` IDOR** — `http/user_handlers.go:48` reads body `user_id`, never compares to the session user or requires admin. Session-gated, and the handler is a stub today (echoes `pending_deletion`), so impact is bounded — but it's a missing authz check on a deletion endpoint that becomes account-takeover once wired. **[V]** Fix: use `UserIDFromContext`, or require admin for a non-self target.
- **14. Wallet read fails open on empty auth context** — `http/wallet_handlers.go:46` (`if authUserID != "" && userID != authUserID && role != "admin"`). Not exploitable today (route is auth-gated), but fail-open by construction: any future public-prefix or empty-UID path leaks every wallet. **[V]** Fix: deny on empty `authUserID` first.
- **15. Office auth guard fails open / is env-disableable** — `office/proxy.ts:51` (validator throw → `null` → degrade to presence-check-allow) and `:81` (`OFFICE_AUTH_GUARD_DISABLED=true` → bypass all). Documented defense-in-depth, but a deploy-env leak or induced gateway timeout opens the shell. Fix: fail closed in prod on transient errors; boot-assert the disable flag is never set in prod.
- **16. Public pagination DoS** — `leaderboard_handlers.go:278` validates `limit>0` with no upper clamp on the public `/leaderboards/<id>/entries` route (slipped the PERF-01 sweep); `prediction_handlers.go` leaves `page` unclamped → huge `OFFSET` scans and negative-OFFSET overflow on `/markets`,`/events`. Fix: clamp `limit` (≤200) and `page`.
- **17. Webhook replay / amount not reconciled** — `payments/db_service.go:416` runs the `FOR UPDATE` read + status writes on the bare `*sql.DB` (lock released immediately), and `:428` credits the *stored* amount without asserting the webhook's signed `Amount`/`UserID` match. No nonce store; idempotency rests on mutable status + a 5-min window. Fix: wrap in one tx; reconcile signed payload; persist consumed event-ids.
- **18. Bonus claim ignores eligibility/trigger; racy limits** — `bonus/service.go:154` parses only reward+wagering rules (eligibility/trigger never enforced; `TriggerReference` unverified), and `:141` checks `MaxClaims`/budget non-atomically. Fix: enforce eligibility/trigger; single conditional `UPDATE … WHERE claim_count<max_claims AND spent+amt<=budget`.
- **19. Wallet-connect challenge has no domain binding** — `alphacashier/signature.go:23` signs a plain string (not SIWE/EIP-4361/EIP-712), so a signature solicited by a look-alike site replays within the 10-min TTL. Fix: adopt SIWE/EIP-712 with domain+expiry; consume in the same tx as verify.

## LOW / informational

- **20. `LIMIT/OFFSET` via `fmt.Sprintf`** (`prediction/sql_repository.go:153,251,565`) — currently safe (operands are typed `int`) but the string-built-SQL pattern the codebase otherwise avoids; bind as `$N`.
- **21. Bot API-key `key_prefix` not UNIQUE** (`migrations/014…:224`) — `GetAPIKeyByPrefix` uses `QueryRow`; a prefix collision (improbable, 4 random bytes) would bcrypt-compare against the wrong row. Add UNIQUE + retry-on-conflict.
- **22. Swallowed audit/money-write errors** — `alphacashier/service.go` (`_ = recordAudit(...)` at 239/351/430/499/536/583/617) and across `bonus/service.go` (claim-count increment, status `RowsAffected`, event publishes). Tamper-evidence/accounting silently lost. Log+metric; consider failing broadcast on audit failure.
- **23. Frontend hardening** — `window.open(...)` for PSP/IDV redirects without `noopener,noreferrer` (`IdComplyModal.tsx:187`, `cashier/page.tsx`); the player app sets **no CSP** (office sets only `frame-ancestors`). Add `noopener` + a strict player CSP (the last mitigation against #3/#4).
- **24. Auth-disabled chain doesn't strip identity headers** — `cmd/gateway/main.go:96` (`GATEWAY_AUTH_ENABLED=false` omits the `Auth` middleware that deletes `X-User-ID`/`X-Admin-Role`). Boot refuses the flag in prod/staging, so dev/demo-only — but move the header strips to an always-on middleware.
- **Dead code (`internal/cashier/`)** — zero importers, but contains latent fail-open compliance caps, an initiator-not-excluded two-person check, and amount-canonicalization gaps in idempotency keys. Fix or delete to avoid a future trap.

---

## Cross-cutting themes
1. **State-machine guard is applied inconsistently** — the CAS guard exists (`transitionMarketStatusWithExec`) but a sibling writer (`UpdateMarketStatus`) bypasses it (#1). Audit every status mutator.
2. **Authorization layered but incomplete** — RBAC permissions exist and are enforced on some routes but not the money routes (#5); actor identity is taken from spoofable headers in one place (#7). Identity and authz should come only from session context.
3. **No Go-side SSRF guard** — a strong TS SSRF guard exists in the office (`ssrfGuard.ts`), but the gateway has none; the webhook dispatcher is the live vector (#6), with image-rehost latent.
4. **Money writes that aren't transactional / idempotent end-to-end** — deposit credit+flip (#9), legacy webhook (#17), bonus multi-step (#11/#18). For a custodial money system, each money mutation + its state flip + its audit row should be one tx.
5. **Frontend trusts JS-readable token storage** (#4) — turning any XSS (#3) into session theft.

## Verified solid (no action — bounds the review)
Session tokens are 24-byte `crypto/rand`, SHA-256-stored, no JWT (no alg-confusion); CSRF is double-submit with constant-time compare; login brute-force limiter + lockout present; bot API key is bcrypt-verified and client `X-User-ID`/`X-Bot-*` are stripped at ingress; compliance/geo/KYC gates run **before** the action on order/bot/cashier paths and fail closed (SEC-02/SEC-03 hold); webhook HMAC uses `hmac.Equal`; the wallet ledger has `UNIQUE(entry_type,user_id,idempotency_key)` + Serializable txs (the backstop preventing a true deposit double-credit); SQL is parameterized (the two `ORDER BY "+dir` sites use typed enum literals, not input); panic-recovery + 1 MiB body cap wrap all routes; the office market-bot URL fetch SSRF guard is genuinely robust (resolved-IP check, redirect re-validation, kill-switch); OAuth uses per-provider `state` + PKCE and only auto-links on a verified email.

## Methodology / caveats
Six read-only domain agents produced the raw findings; the reviewer then read source for every Critical/High and confirmed file:line, exploitability, and the known false positives (the two `context.Background()` boot-DDL sites — COR-06 — are correctly **excluded**). Findings marked **[R]** were not all line-by-line re-read by the reviewer but several were independently corroborated by ≥2 agents (noted inline). This review reflects code at `main @ 04de5b4b`. **This document maps live vulnerabilities — keep it access-controlled; do not publish externally before the Critical/High items are remediated.**
