# Taya NA Predict — Codebase & Platform Audit

**Date:** 2026-06-12
**Auditor:** Claude (Fable 5), full-codebase engagement
**Branch audited:** `chore/safe-brand-text-cleanup` @ `aa122190` (2026-06-10)
**Scope:** this repository only; judged against an enterprise-grade, commercially deployable B2C + B2B bar with a hybrid-CLOB (off-chain matching, on-chain settlement, non-custodial) target architecture.

> **Branch note.** The brief said "audit `main`," but `main` is stale: the merge-base is the May brand-rename commit, and all product development since (330 commits, including the geo-compliance work the brief explicitly asks to verify) lives on `chore/safe-brand-text-cleanup`. `main` has only 35 deploy-fix commits this branch lacks. I audited the development branch and recorded the stale-`main` situation as finding ORG-06.

---

## 1. Executive summary

### Health grades

| Workstream | Grade | One-line verdict |
|---|---|---|
| A. Money-path correctness | **C+** | Engine is well-tested and money-safe by reservation design, but one CRITICAL settle/void race and two HIGH concurrency defects exist |
| A2. On-chain settlement leg | **D+** | The live rail is **custodial** (opposite of the stated target); the non-custodial leg is ~15–20% built and 0% user-reachable |
| B. Security | **B−** | No SQLi, no mass assignment, strong session/CSRF/WS-auth design; but broken logout revocation, a bot-API compliance bypass, and a geo-spoof hole |
| C. Architecture & boundaries | **C** | Gateway layering is genuinely clean; but 4 parallel money systems, 5 HTTP client layers, a dual-router backoffice, and a dead 46-service parallel backend |
| D. Code quality | **B−** | Player app is immaculate (0 `any`, 0 `console.*`, gates enforced); office drags ~145 dead files and the `any`/console debt; ~25 ignored money/audit errors in Go |
| E. Build, test, operability | **B** | Everything builds clean; 31/31 migrations apply to a fresh DB; strong Go test culture (race/property/fuzz) — but workers untested, api-client has zero tests, no E2E |
| F. Performance & scalability | **C−** | Fine at demo scale; WS hub blocks on slow clients and is in-process-only (no horizontal scale), public unclamped pagination is a one-request DoS lever |
| G. Enterprise & commercial | **D** | Single-tenant, single-brand; OpenAPI documents the *sportsbook*; no webhooks/sandbox/sanctions-screening; geo gate has real bypass paths |

**Overall: C — a strong single-operator internal alpha wrapped in two-thirds dead weight, with a money-race class that must be fixed before real money, and zero enterprise affordances.**

### How bad is it really? (honest answer)

Better than the owner fears at the core, worse than it looks at the edges. The part everyone worries about — the matching engine, ledger, and settlement — is the **best** code in the repo: a real price-time-priority CLOB with complementary issuance and self-match prevention, integer-cents money, idempotency keys on every wallet mutation, property/fuzz/race tests, and a consistent fail-closed configuration culture. The repo builds clean and all suites pass; that is not the profile of a "poorly built" codebase. What *is* bad: (1) a concurrency race class in settlement (settle-vs-void can pay out both sides — CRITICAL, fix is small and the author demonstrably knows the pattern, having applied it to the proposal path only); (2) the custody reality contradicts the stated non-custodial direction — today user funds sit in one treasury wallet and withdrawals are manually broadcast by a human; (3) roughly two-thirds of the repository by file count is dead sportsbook residue, parallel prototypes, and stale docs that actively mislead (the architecture doc, runbooks, deployment guide, and OpenAPI spec all describe the *sportsbook*); and (4) nothing about the platform is multi-tenant, white-label, or partner-facing yet — the B2B surface is a self-service bot-key system that currently **bypasses the compliance gate**. The right move is not a rewrite: it is a short, surgical correctness/security phase, then a ruthless deletion-and-consolidation phase, then building the enterprise layer on a core that has already earned trust. See §4.

### Top 10 findings

| # | ID | Sev | Finding |
|---|---|---|---|
| 1 | COR-01 | CRITICAL | Concurrent settle + void on the same market both commit → winners paid **and** all stakes refunded (near-double money out) |
| 2 | SEC-02 | HIGH | Bot/partner API places orders with **no geo/KYC compliance gate** — the entire B2B surface bypasses jurisdiction controls |
| 3 | SEC-03 | HIGH | Geo-fence spoofable: gateway trusts `CF-IPCountry` and compose publishes `:18080` to the host — direct-origin requests bypass the edge that strips forged headers |
| 4 | SEC-01 | HIGH | Logout never revokes the session server-side (double-digest bug) — captured tokens survive logout for up to 15 min |
| 5 | A2-01 | CRITICAL (strategic) | The live cashier is **custodial** (single treasury address, manual human-signed withdrawals); the non-custodial stack is interfaces + mocks, unreachable by users |
| 6 | COR-02 | HIGH | Exchange match plans are built before the per-market lock and maker fill state is overwritten with stale absolute values — money-safe, but order-book state corrupts under concurrency (phantom liquidity, spurious rejections) |
| 7 | COR-03 | HIGH | AMM path: unlocked read-modify-write with no serialization retry — lost updates under concurrency; a swallowed read error can silently reset a user's position |
| 8 | PERF-03 | HIGH | WS hub: one slow client freezes the entire realtime plane (blocking send, no default case) and the hub is in-process-only — **two gateway replicas break realtime**, capping horizontal scale at 1 |
| 9 | G-01 | HIGH | Enterprise readiness is absent as a category: no tenancy, no per-brand theming, OpenAPI describes the sportsbook API, no outbound webhooks, no sandbox, no sanctions screening |
| 10 | ORG-01 | MEDIUM | ~⅔ of the repo is dead: 46-service parallel backend (`services/codex-prep`), `archive/`, `libs/phoenix-core`, `review/`, ~145 dead office files, 27 dead app components, plus sportsbook-era docs presented as authoritative |

---

## 2. Findings

Severity rubric: CRITICAL = money loss / double-settlement / auth bypass / data corruption / repo doesn't build. HIGH = exploitable security flaw, conditional correctness bug, missing money-path tests, architecture blocking safe work. MEDIUM = significant debt/drift/dead weight. LOW = style/docs.

All paths are relative to `apps/Phoenix-Predict-Combined/go-platform/services/gateway/` unless noted. Findings marked ✓self were verified by direct code reading by the auditor; the rest were produced by delegated analysis and spot-verified.

### A. Money-path correctness

**COR-01 · CRITICAL · Settle/void race pays both sides ✓self**
- Evidence: `internal/prediction/sql_repository.go:880-944` (`PersistResolvedMarketAtomic`) and `:998-1032` (`PersistVoidedMarketAtomic`) both write the market status via `updateMarketWithExec` (`:456-469`), which is `UPDATE … WHERE id=$11` — **no status guard**. Status is checked only at read time (`internal/prediction/settlement.go:429-439` for settle, `:656-663` for void). Settle credits use idempotency keys `prediction_payout:<mkt>:<pos>` (`settlement.go:494`); void uses `prediction_void:<mkt>:<pos>` (`settlement.go:691`) — different key families, so wallet idempotency cannot dedupe across them.
- Race: admin A settles a closed market while admin B voids it (or `AutoSettler` — `internal/prediction/workers/settler.go:146` — races an admin void). Both read `status=closed`, both pass validation, both transactions commit: winners receive 100¢/contract **and** every holder receives their stake back. The market row ends `voided` while a settlement row exists for it.
- What protects the settle-vs-**settle** case is the DB: `prediction_settlements.market_id … UNIQUE` (`migrations/014_prediction_schema.sql:150`) — a second settlement INSERT fails and the tx rolls back. Nothing equivalent protects settle-vs-void.
- The author knows the fix pattern: `PersistProposalAtomic` (`sql_repository.go:954-975`) does exactly the right thing — `UPDATE … WHERE id=$3 AND status=$4`, roll back when `RowsAffected != 1` — with a comment explaining why. Settle and void never got the guard.
- Impact: direct money loss, plausible under dual-control operations (two admins working a settlement queue) and certain once auto-settlement feeds are enabled. The per-market collateral reconciler (`internal/prediction/reconciliation.go:61`) would *detect* the drift after the fact, not prevent it.

**COR-02 · HIGH · Match plan built outside the lock; maker fill state regressed by stale absolute writes ✓self**
- Evidence: makers are loaded and the plan computed before any lock (`internal/prediction/service.go:987-1029`); `PersistMatchAtomic` then takes `pg_advisory_xact_lock(hashtext(market_id))` (`sql_exchange_repository.go:52-56`) and re-validates **only** market status (`:58-69`) and seller oversell (`:71-111`). Maker/taker order rows are written with absolute values from the pre-lock plan (`updateOrderFillStateWithTx`, `:197-218` — `SET filled_quantity = $2 … WHERE id = $1`, no optimistic check).
- Behavior under two concurrent takers vs the same maker: money is safe — `CaptureReservationWithTx` enforces cumulative captures ≤ reservation under `FOR UPDATE` (`internal/wallet/service.go:837-863`) and position mutations are relative under `FOR UPDATE` (`sql_exchange_repository.go:223-259`) — but the loser either gets a spurious rejection (full overlap; no re-match/retry exists) or, on partial overlap that still fits the maker's reservation, **commits maker order rows regressed to stale fill state**: the book then advertises phantom remaining quantity that repeatedly rejects subsequent takers.
- Impact: order-book state corruption and degraded fill quality under exactly the load a real market creates. Not exploitable for profit (reservation caps), but it makes the venue look broken precisely when it's busy.

**COR-03 · HIGH · AMM path: unlocked read-modify-write, no retry, and a position-reset hazard ✓self**
- Evidence: market read at `service.go:631`, LMSR executes against the in-memory struct (`:776`), position read at `:825`, then `PersistFilledOrderAtomic` opens a SERIALIZABLE tx that blindly overwrites market AMM state and the position with absolute values (`sql_repository.go:456-469`, `:680-696` via `upsertPositionWithExec`). No advisory lock, no version check, no 40001 retry anywhere in the call chain.
- Two failure shapes: (a) overlap → serialization failure → raw error to the user; (b) interleave → **silent lost update** of AMM shares/prices/volume and position quantity. Additionally, `existing, _ := s.repo.GetPosition(...)` (`service.go:825`) swallows the read error: a transient DB failure there builds a *fresh* position snapshot whose absolute upsert would **overwrite the user's existing position with only the new trade's quantity**.
- Mitigation in place: new markets default to `order_book` (`service.go:652-656`); the AMM is the legacy path. The strategic recommendation (§4) is to retire it rather than fix it.

**COR-04 · MEDIUM-HIGH · ~25 ignored errors on money/settlement/audit writes ✓self (spot-verified)**
- The worst: `internal/wallet/service.go:598` — the held-funds SUM inside `Hold()` is `_ =`'d; on query failure `heldTotal=0` and `available=balance`, weakening the insufficient-funds check. Mitigated in practice because a failed statement poisons the Postgres tx (the subsequent INSERT fails), but it is a funds-availability check silently degrading by accident of driver behavior.
- Others (delegated sweep, representative): `wallet/service.go:677-679` (auto-expire ignores Exec + Commit), `prediction/service.go:883` (compensating refund credit ignored on the memory-mode path), `prediction/service.go:1036,1070` (taker order update after engine/persist rejection), `settlement.go:153,188,227,278,317,380,593,730` (lifecycle/audit/proposal-state writes), `alphacashier/service.go:411` + 10× ignored `recordAudit`, auth session invalidation `services/auth/internal/http/handlers.go:597,949,996`. Also `prediction/service.go:1087-1091`: a comment claims "Log via existing pattern" but the body is `_ = err` — nothing logs.
- Impact: silent audit-trail gaps and silent state divergence in exactly the subsystems where silence is most expensive.

**COR-05 · MEDIUM · Settlement is one transaction over all positions ✓self**
- `settlement.go:472-515` loads every position and credits every winner inside a single tx (`PersistResolvedMarketAtomic`). At 10k+ holders this is a multi-second/minute transaction holding thousands of wallet row locks while trading continues on other markets. No batching/checkpointing.

**COR-06 · MEDIUM · Ledger is single-entry running-balance, not double-entry ✓self**
- `applyMutationTx` (`wallet/service.go:1250-1299`): one row per mutation with `balance_after`, idempotency key dedupe with amount/reason conflict detection (good), `FOR UPDATE` serialization on the balance row (good). But there is no contra account — house cash, fee income, and collateral pools are not ledger entities, so "money created/destroyed" is only caught by the separate reconciler (`reconciliation.go`) rather than being structurally impossible. For a money platform seeking institutional partners, double-entry (or a documented equivalence argument plus a *scheduled, alerting* reconciler) is table stakes.

**COR-07 · MEDIUM · Void refunds never persist payout rows ✓self**
- `PersistVoidedMarketAtomic` receives the computed `payouts` but only writes wallet credits (`sql_repository.go:1020-1024`); unlike settle, no `prediction_payouts` rows are inserted. Void refunds are visible in the wallet ledger but absent from payout history/audit surfaces.

**COR-08 · LOW · Settlement override flag always recorded false**
- `settlement.go:595-599` TODO: the back-office override field is not threaded through, so `RecordSettlement(..., override=false)` always — audit/metrics fidelity gap on the highest-trust admin action.

**COR-09 · MEDIUM · No TS↔Go money-math parity testing**
- The trade ticket recomputes cost/shares in float (`packages/app/app/components/prediction/TradeTicket.tsx:266,286,319`) against Go's integer-cents engine (`internal/prediction/accounting.go`, `exchange.go`). No parity tests exist; `app/__tests__/odds.test.ts` literally tests a pasted copy of functions rather than importing the source. Portfolio PnL correctly uses server values. Risk: displayed quotes drift from executed reality at rounding boundaries.

What is **right** in workstream A (verified): idempotency keys on every wallet mutation with conflict detection; the responsible-gambling gate is atomic (TOCTOU-closed) and runs before money moves (`service.go:85-133, 640-685`); settle-twice is structurally blocked (UNIQUE); payout retries are idempotent; the per-market advisory-lock + reservation-capture design makes the *cash* invariants hold even where order state corrupts; float money is confined to the legacy AMM with deterministic house-favorable `math.Ceil` at the cents boundary (`amm.go:88,105`); seed/demo data flows through the real `PlaceOrder`/`ResolveMarket` paths so the ledger reconciles.

### A2. On-chain settlement leg

**A2-01 · CRITICAL (strategic, not a code defect) · The live custody model is the opposite of the stated target**
- The only working on-chain rail, `internal/alphacashier/`, is **custodial by design and by its own documentation**: "Closed Alpha **custodial** USDC cashier" (`migrations/030_alpha_cashier.sql:3`; `docs/cashier/CUSTODIAL_USDC_ALPHA_PLAN.md`). Deposits: user sends USDC to **one shared Hula treasury address** (`ALPHA_CASHIER_TREASURY_ADDRESS`, `internal/alphacashier/config.go:37`), pastes the tx hash, backend verifies the ERC-20 Transfer log (`evm.go:69-143` — correct token/from/to/amount, receipt success, ≥12 confirmations, exactly-one-log match) and credits the internal cents ledger. Trading is pure internal ledger. Withdrawals: admin approves, then a human **broadcasts the payout manually outside the app** (`service.go:528-557`; `preflight.go:113-114`) — the platform holds no signing keys at all.
- Implication: every property the owner is selling (non-custodial asset control, transparent on-chain payouts) is currently false in the running system. This is the most important strategic fact in the audit.

**A2-02 · HIGH · The non-custodial stack is a sandbox, not a system (~15–20% complete, 0% reachable)**
- `contracts/` (repo root): 3 Solidity **interfaces**, 92 lines total, no framework, no tests, no implementation; CI actively *enforces* non-deployability (`scripts/check-cashier-contracts.mjs` fails the build if a deployable `contract` appears). `INVARIANTS.md` mandates an external audit before any deploy. This is a requirements doc in `.sol` form — appropriately gated, but not code.
- `services/relayer/`: README + POLICY.md + 2 JSON fixtures. **No source code.** `services/bridge-watcher/`: one 67-line mock adapter reading fixtures; the reconciliation worker its own README describes (leases, exactly-once, reorg handling) exists only as prose. Neither has a manifest, a server, compose wiring, or CI as a service.
- `services/cashier-api/` (~2.3k LOC, 16 passing tests) and `packages/cashier-sdk/` (1.4k LOC TS, well-tested state machines, HMAC verify, idempotency-key builders, relayer/compliance policy evaluation) are genuinely good **pure-function libraries** — but no HTTP server exists (`createServer`/`listen` appear nowhere), nothing imports the SDK from any app, and the player app's `noncustodial-cashier-client.ts` calls `/v1/cashier/*` paths **no gateway handler registers**.
- Net: exactly-once on-chain settlement, reorg handling, nonce management, and key management for the hybrid-CLOB target are **specified, not implemented**.

**A2-03 · HIGH · No reorg handling on the live deposit path**
- `alphacashier` credits after a one-time receipt check at ≥N confirmations (`evm.go:84-104`, default 12 — `config.go:38`); there is no post-credit reorg watch and no finalized-block check. Idempotency prevents double-credit of the same `(chainId, txHash, logIndex)` (`service.go:330`; DB uniques `migrations/030:72-96`), but a deep reorg that orphans a credited deposit is silently kept as an internal balance. The component meant to own this (bridge-watcher) is unbuilt.

**A2-04 · HIGH · Manual withdrawal broadcast has no in-system controls**
- Payout integrity rests on operator discipline plus RBAC `cashier:write` (`internal/http/alpha_cashier_admin_handlers.go:105`). Mandatory review note and prod boot-refusal without `WITHDRAWAL_BROADCAST_ACK` exist (`config.go:54-72`), but there is no two-person rule on the custodial path (the two-person helper exists only in the unused SDK), no signer policy, no hot/cold split, no runbook.

**A2-05 · MEDIUM · Four parallel money systems coexist**
- (1) internal wallet/ledger (live backbone), (2) `internal/alphacashier` (live, flag-gated), (3) `internal/payments/crypto_rail.go` (fail-closed prototype, wired at `internal/http/handlers.go:452-453`, UI client exists but has no importers), (4) the root non-custodial stack (unwired). Plus `internal/cashier` (11 files of policy/state-machine Go) which **nothing imports — a dead package**. Each extra system is drift surface; two of the four have dangling frontend clients pointing at unimplemented endpoints.
- Positive note: no private keys, mnemonics, or xpubs exist anywhere in active code/config (verified by sweep; the only hits are comments, a well-known go-ethereum test key in a test, and an AWS key in `archive/` for an unrelated legacy product — rotate it if that history is shared).

### B. Security

**SEC-01 · HIGH · Logout does not revoke sessions server-side (double-digest no-op) ✓self**
- `services/auth/internal/http/handlers.go:597` passes an already-digested token to `DeleteByAccessToken`, which digests again (`session_store.go:97-98`; Redis store identical) — the delete key never matches. Cookies clear in the browser, but a captured bearer token stays valid until its 15-min TTL. Same bug class on the refresh path (`:949,996` ignore the delete errors that would have exposed this). Fix is one line. Related: password change does not invalidate existing sessions (`handlers.go:814-866`).
- Context that limits blast radius: tokens are opaque 256-bit random values stored as SHA-256 digests (no JWT, no alg confusion — `JWT_SECRET` is vestigial and unused), single-active-session per user, cookies are HttpOnly/SameSite=Lax/Secure-in-prod, CSRF is double-submit verified constant-time, bcrypt cost 12, per-username throttle + lockout. The auth design is good; this is an implementation slip in its most security-relevant function.

**SEC-02 · HIGH · Bot/partner API bypasses the compliance gate ✓self**
- `internal/http/bot_handlers.go:93` calls `svc.PlaceOrder` directly; the geo/KYC gate (`checkComplianceGates`) is applied to the session order route (`prediction_handlers.go:396`) but **not** the bot route. An API key — which **any authenticated player can self-issue** (`bot_handlers.go:16`) — trades with no jurisdiction or KYC check. Given US-exclusion is a load-bearing control, this is a hole through the load-bearing wall. (The RG gate still applies — it lives inside `PlaceOrder` — which is the correct layering lesson: gates inside the service can't be forgotten by a new transport.)
- Also: no HTTP route exposes key revocation/rotation (`DeactivateAPIKey` exists unexposed in the repo layer), no per-key rate limit, no expiry set at issuance. Key storage itself is sound (bcrypt'd secrets, scopes, prefix lookup — `internal/prediction/botauth.go:55-106`).

**SEC-03 · HIGH · Geo-fence spoofable via direct origin access ✓self**
- The gateway trusts the configured country header (`CF-IPCountry` default — `internal/http/pretrade_gate.go:37-43`) with no verification the request transited the edge; `GEO_TRUSTED_PROXY_MODE=require` only changes logging for a **missing** header, it does not reject a forged-but-present one. Caddy strips inbound spoof headers — but `docker-compose.yml:49-50` publishes `18080:18080` on the host and the demo overlay does not remove it, so on the documented single-box topology anyone can `curl http://<box>:18080` with `CF-IPCountry: PH` and trade from a blocked jurisdiction. Denial counters are in-process `atomic.Int64` only (`pretrade_gate.go:51,118`) — not exported metrics, reset on restart, no alerting.

**SEC-04 · HIGH (patch available) · Next.js 16.2.2 carries three middleware/proxy-bypass advisories**
- `yarn audit`: advisories 1118955/1118959/1118961, fixed in ≥16.2.5. Auth is enforced in the Go gateway (so not a standalone authz bypass), but the app proxy/middleware layer should not sit on a known-bypassable version. The 7 "critical" audit hits are dev-only transitives (jest/lerna chains) — not runtime-exploitable. `jsonwebtoken@8` is present but its CVE-affected functions (`verify`/`sign`) are never called (only `decode` in `office/utils/auth.ts:204`); bump to v9 as hygiene.

**SEC-05 · MEDIUM · Login throttling is per-username only; register limiter trusts client XFF**
- Password spray (one password × many usernames) evades both the 10/min per-username limit and the lockout (`services/auth/.../handlers.go:764,1384-1444`); no per-IP limiter on login. Registration is per-IP limited but `extractIP` trusts the leftmost client-controlled `X-Forwarded-For` (`:1264-1278`) — spoofable. LOW sibling: `DELETE /api/v1/auth/sessions/{sessionId}` is unauthenticated (`:604-621`), practically hard to exploit (digest IDs) but wrong; password policy is weak (min 7, 2-of-3 classes).

**SEC-06 · clean · SQL injection and mass assignment: no findings ✓delegated, spot-verified**
- Every dynamic query builds structure from hardcoded column lists with `$N` binds (verified across `sql_repository.go`, `sql_exchange_repository.go`, `sql_admin_repository.go`, wallet, rbac, alphacashier, bonus, discover). `LIMIT %d` interpolations format Go ints parsed by clamped-at-1 parsers — DoS surface (PERF-01), not injection. Handlers bind dedicated DTOs; identity always comes from the session (e.g., `PlaceOrderRequest` has no `UserID` field; auth `Register` hardcodes role=player). Two latent stubs to fix before wiring: `user_handlers.go:90-98` profile PUT (map decode, no ownership check, writes an unread in-memory map) and the GDPR-stub `POST /api/v1/punters/delete` (`:52-68`, trusts body `user_id`, does nothing).
- WebSocket auth is **well built**: auth before upgrade, cookie/header only (query-param auth explicitly removed for leak reasons — `internal/ws/handler.go:98-120`), per-channel authorization fail-closed (`client.go:198-217` — user A cannot subscribe to `portfolio:<userB>`), origin fail-closed in prod when `WS_ALLOWED_ORIGINS` unset.
- Secrets: no real production secrets committed. Dev defaults (`localdev`, `whsec_local`, `dev-secret-key-…`) are **boot-rejected** in prod/staging (`cmd/gateway/main.go:180-225`); demo compose requires `${JWT_SECRET:?}`; CI injects deploy secrets; `.gitignore` excludes `.env*`. One out-of-scope flag: a real-looking AWS key for an unrelated legacy product in `archive/legacy-review/.../aws.yaml:166` — rotate/scrub if that history is shared.

### C. Architecture & boundaries

**ARCH-01 · HIGH · The realtime plane caps the platform at one gateway instance ✓self (code pattern verified)**
- `internal/ws/` is in-process only — no Redis pub/sub, no event backbone; order/lifecycle events are emitted by the local process. Two replicas = subscribers on instance B never see trades from instance A. Combined with PERF-03 (blocking fan-out) this is the binding architectural constraint on both reliability and scale. (A `feat/ws-redis-pubsub` branch exists with 1 commit — stalled.)

**ARCH-02 · MEDIUM · Four-plus parallel HTTP client layers in the frontend**
- (1) app's hand-rolled `app/lib/api/` (16 domain clients with own cookie/CSRF logic), (2) `api-client/src/prediction-client.ts` (used by app *and* office via deep `src/` imports that bypass `dist/`), (3) office `services/api/api-service.ts` `useApi`, (4) office `app/lib/admin-fetch.ts`, (5) `api-client/src/client.ts` (`PhoenixApiClient`) — dead, zero live importers. `@phoenix-ui/api-client` is not the single source of truth CLAUDE.md implies. Cents formatting is hand-rolled 9× across app+office.

**ARCH-03 · MEDIUM · Backoffice is a dual-router hybrid with a gutted legacy half**
- Pages Router survives as `_app.js` + `_document.tsx` plus config; the live admin surface is the App Router tree. ~62% of office source files (181/293; ~145 excluding translations/configs) are unreachable from any route — entire sportsbook container/component trees (`containers/users|markets|market-categories|fixed-exotics`, `components/users` 32 files, etc.). The office `gate.sh` quality gates only scan `app/` routes, which is exactly why the dead mass persists ungated.

**ARCH-04 · MEDIUM · Domain leakage is contained but not zero ✓delegated**
- Live leaks: `marketSubcategories.ts:222-223` still reads `sportKey`/`sport_key` metadata; `/admin/promotions/usage` serves `betsWithFreebet`/`betsWithOddsBoost` keys as documented zeros (`reports_handlers.go`); inert `FreebetID/OddsBoostID` fields on the live audit struct (`admin_handlers.go:34-36`). Gateway `internal/prediction/` itself is effectively clean (1 comment). Migrations 001–013 still create the full sportsbook schema on every fresh install (fixtures, selections, punter_bets, freebets) — dead tables in every new environment.
- The flagship boundary rule **holds**: `prediction` never imports `wallet` (WalletAdapter seam, bridged in `internal/http/prediction_wallet_adapter.go`), repositories are interface-backed, handlers→service→repo layering is real. Gateway internals are the architecturally healthiest part of the repo.

**ARCH-05 · MEDIUM · Contract drift: the published API spec describes the sportsbook**
- `api/openapi.yaml` (45KB, claims `version: 2.0.0`) documents `/api/v1/fixtures`, `/bets/place`, `/freebets`, `/odds-boosts`, `/match-tracker`. Zero of the live prediction endpoints are present. For a B2B/API-first ambition, the only machine-readable contract actively misdescribes the product. Same disease in prose: `ARCHITECTURE.md` is titled "Phoenix Sportsbook Platform Architecture" and describes a Kubernetes/Prometheus/ELK/Jaeger topology that exists nowhere; `RUNBOOKS.md` and `DEPLOYMENT.md` document fixture settlement and K8s deploys against a Hetzner docker-compose reality (verified: deploy is rsync+compose via `deploy-demo.yml`).

**ARCH-06 · LOW · Monorepo without unified tooling**
- Yarn workspaces cover only `talon-backoffice/packages/*`; Go services are independent modules with no `go.work`; root `Makefile` includes a dead `scripts/Makefile` hardcoding another machine's paths (`/Users/johnb/Desktop/PhoenixBotRevival`). ~18 Makefiles and 50+ compose files exist repo-wide; 2 and 2 are real.

### D. Code quality

**QUAL-01 · MEDIUM · Quality is gate-shaped: pristine where gated, debt where not ✓delegated, spot-verified**
- Player app `app/`: **0** `any`, **0** `@ts-ignore` family, **0** `console.*` outside the sanctioned logger, **0** design-system imports — the CLAUDE.md bans are enforced by `gate.sh` and it shows. All tsconfigs `strict: true`.
- Office: 145 `any` lines/78 files (+4 generic-default `any`s; ~31% in live code, the rest in dead files), 34 `console.*` (no logger module exists in office; one live `console.log("Selected punter:", …)` on the admin users page), debt concentrated exactly where the gates don't scan.
- Go: 0 panics in request paths, 0 bare DB calls in `internal/` (everything `*Context`), slog throughout, **2 TODOs total** in the entire production codebase — but 83 ignored-error sites in the gateway (the money-relevant subset is COR-04), and `internal/wallet`'s exported API doesn't accept `context.Context` (synthesizes `Background()+timeout` internally — request cancellation never propagates into wallet ops).

**QUAL-02 · MEDIUM · Dead code inventory (active packages)**
- App: 27/65 components have zero importers (incl. `BonusBadge` — a banned-concept freebet component, `GeoComplyCheck`, `ProtectedRoute`, `LoginForm`), plus dead `lib/utils/odds.ts` (sportsbook odds math), `hooks/useApi.ts`, `useLiveData.ts`. Office: ~145 dead files (ARCH-03). Gateway: `internal/cashier` dead package; `internal/events` bus has 6 publishers and **zero subscribers** (a zombie inside a live path). `api-client`: `client.ts` + `websocket.ts` dead but exported.
- `archive/v2-prediction` is properly isolated (nothing imports it) — the `reference/` prototype concern from the brief resolves clean.

### E. Build, test, operability — verified by execution

All commands and results in §5. Summary of findings:

**TEST-01 · HIGH · The money-path test floor has three holes**
- `internal/prediction/workers/` — **no test files** (MarketCloser, AutoSettler, Reconciler, SMM: the unattended components that close markets and will someday settle them automatically). `api-client` — zero tests (`jest --passWithNoTests`). No E2E suite over register→fund→trade→resolve→payout (playwright exists for smoke only). Settlement math, AMM, exchange engine, accounting, and wallet *are* well tested (property/fuzz/race/bench suites pass), so the brief's worst-case ("no tests on settlement math") is **not** the situation — but nothing tests the orchestration layer that runs unattended, and nothing tests COR-01-class cross-flow races.

**OPS-01 · MEDIUM · Observability would leave you blind in an incident**
- No metrics exporter wiring for the domain counters that matter (geo denials are an in-process int; settlement metrics exist in-process); OTel packages exist (`internal/tracing` tests pass) but no evidence of an exporter/backend; logs are structured (good). No SLOs, no alerting, no prediction-era runbooks (the existing RUNBOOKS.md would actively mislead an on-call engineer — it documents settling *fixtures* via tables that don't exist).
- Genuinely present: DB backup sidecar (6h pg_dump loop + restore script — `ops/backup/`, wired in demo compose), boot-time config validation with fail-closed posture, healthz/readyz, goose migrations that apply cleanly (31/31 on fresh PG16, verified) with no destructive ALTERs (clean), though no `CONCURRENTLY` usage and no zero-downtime practice for a live ledger.

**OPS-02 · LOW · DX papercuts**
- Office typecheck fails against a stale `.next/` (regenerates clean — cost me one false alarm, will cost every new engineer the same); `typecheck-scoped.sh` in app covers tests/ with a "baseline 0 errors" note implying scoped coverage; brotli/codesign workaround documented for macOS; Quick Start works (verified end-to-end: install 6.6s, builds pass, migrations apply, demo creds documented — though `CLAUDE.md` claims a Redis cache the gateway doesn't have).

### F. Performance & scalability

**PERF-01 · HIGH · Public unclamped pagination is a one-request DoS lever ✓delegated, pattern verified**
- `intQueryParam` clamps only the floor (`prediction_handlers.go:1093-1103`); `GET /api/v1/markets?pageSize=1000000` is public, unauthenticated, and each row executes the LATERAL join below. Same pattern on `/events`, `/orders`, `/portfolio/history`, and the wallet-ledger endpoints (where it compounds with a missing index).

**PERF-02 · HIGH · Two missing indexes and a per-row LATERAL on every market read**
- `marketSelectQuery` (`sql_repository.go:1408-1415`) runs a `LEFT JOIN LATERAL` on `imported_markets` matched via `upper(substr(external_hash,1,8)) = upper(substr(m.ticker,5,8))` with **no expression index** — O(markets × imported_markets) on every list/discovery/worker read. `wallet_ledger` (schema created in code, `wallet/service.go:1670-1681`) has **no user_id index** — the busiest append-only table seq-scans per ledger view. Plus: no `(status, volume_cents DESC)` composite for the public discovery sort.

**PERF-03 · HIGH · WS hub: blocking fan-out ✓self (verified)**
- `Client.SendMessage` is a select with no default (`internal/ws/client.go:233-238`); `handleBroadcast` calls it from the hub's single event-loop goroutine (`hub.go:137-139`). A slow client fills its 256 buffer → the entire realtime plane freezes until that client's 10s write deadline; once the 100-cap broadcast queue fills, **PlaceOrder HTTP handlers block** (`prediction_handlers.go:485-507`). Combined with ARCH-01 (in-process only) and a synchronous per-connect auth HTTP call with no connection cap, this is the first thing that falls over in production.
- Scale ceiling summary (validated reasoning): per-market advisory lock holds the whole multi-statement match tx → ~70–200 matches/sec/market; shared 50-conn DB pool; single Postgres writer; horizontal scale blocked at 1 replica by ARCH-01. For a prediction market (Kalshi-like per-market rates) the per-market ceiling is acceptable for years; the replica cap and the blocking hub are not.

**PERF-04 · clean · No Go-side N+1; matching-path indexes are right**
- List/portfolio/discovery endpoints are fixed-query; best quotes are denormalized post-match; the four partial price-time indexes serve the book loads exactly. The gateway has **no cache layer at all** (CLAUDE.md's "Redis wraps reads" is fiction — no Redis client in go.mod), which is correct-by-construction for staleness and a cost problem later; settlement/lifecycle events broadcast post-commit so there is no stale-cache settlement hazard today.

### G. Enterprise & commercial readiness

See gap matrix §3. Highest-weight compliance findings beyond SEC-02/SEC-03:

**CMP-01 · HIGH · No sanctions/AML screening in the live money path**
- The only screening logic (`internal/cashier/policy.go`, AddressScreeningSanctionsHit → quarantine) lives in the dead package; `alphacashier` performs zero address/identity screening. KYC itself is real (DB-backed store, manual-review default, vendor seam that fails closed — `internal/compliance/kyc_postgres.go`, `idv.go:46-71`) but FATF-grade AML needs screening wired before real money.

**CMP-02 · MEDIUM · Audit-trail immutability is by convention only**
- Admin/money actions are audited (`recordMoneyAuditEntry` — wallet ops, settlements, RBAC changes, KYC decisions) into `provider_ops_audit_log` when a DB is wired (INSERT-only *writer*), with a **mutable local JSON file as the no-DB fallback**. No DB triggers/`REVOKE UPDATE/DELETE` enforce append-only; a DB-credentialed insider can rewrite history. Legacy `audit_logs` table has no writer at all.

**CMP-03 · MEDIUM-HIGH · GDPR erasure is a stub with an IDOR shape**
- `POST /api/v1/punters/delete` accepts an arbitrary body `user_id` with no ownership check and **does nothing** (`user_handlers.go:51-68`). No PII anonymization path exists for ledger/orders/KYC docs. Harmless today only because it's a no-op.

**CMP-04 · verified ✅ · The fail-closed boot policy is real**
- Confirmed at `cmd/gateway/main.go:245-273`: prod/staging boot requires `GEO_GATE_ENABLED=true` + non-empty allowlist; `BETA_COMPLIANCE_MODE=permissive` is a boot error in production; KYC flags must be true or explicitly acked off. Geo gate fails closed on missing signal (`geo_gate.go:47-55`). The two-commit compliance push (`445cf46c`, `aa122190`) did what it claimed — the residual holes are the *bypass paths* (SEC-02, SEC-03) and missing metrics, not the policy core.
- RG limits are genuinely enforced atomically at order time (`prediction/service.go:85-133`); deposit limits at `payments/handlers.go:123-139`. WS is ungated for geo (read-only data — LOW).

### Repo organization (cross-cutting)

**ORG-01 · MEDIUM · ~⅔ of the repo is inert.** Dead/stale at root: `archive/` (4 ancient trees incl. a properly-isolated v2 prototype), `libs/phoenix-core` (11 pre-fork services), `review/` (3 sportsbook infra trees), `services/codex-prep` (**a complete 46-service parallel sportsbook backend** with its own compose files, never integrated), `tmp/slides`, `configs/workspace`, `Phoenix-Sportsbook-Combined` (root), `apps/.../phoenix-frontend-brand-viegg` (stale Pages-Router variant), `apps/.../revival/` (200+ migration-archaeology docs), `packages/mock-server`. Nothing imports any of it (verified by reference sweeps).
**ORG-02 · MEDIUM · Doc rot at the entry points.** `ARCHITECTURE.md`, `RUNBOOKS.md`, `DEPLOYMENT.md`, `LAUNCH_CHECKLIST.md`, `PLAYER_APP_GAP_ANALYSIS.md`, `api/openapi.yaml` all describe the sportsbook or fictional infrastructure. Current and excellent: `CLAUDE.md` (minus the Redis-cache and antd-4.16 claims — office is actually on antd ^5.29), `DESIGN.md`, `PRODUCT-USER-JOURNEYS.md`, the `docs/cashier/` ADR set.
**ORG-03 · LOW · 15+ stalled branches** (1–2 commits each: rate-limiting, risk-dashboard, social-oauth, ws-redis-pubsub, office-p8-*) with no CI coverage and unclear status.
**ORG-04 · MEDIUM · Sibling worktree inventory (required by brief).** `../Taya_Na_Predict-cashier` is a worktree on `feat/binary-exchange-engine` — **28 commits ahead, all frontend/branding work** ("Tiangge." rebrand, Robinhood-style homepage, market-card polish, hero video). It is **not** an alternative market-engine architecture: the exchange engine (migration 019, `exchange.go`, order book, fuzz/property/bench tests) was merged into the main line long ago. The branch name is a historical artifact; treat the branch as a UI/brand iteration sandbox that needs a merge/kill decision (it also trails the audited branch by 11 commits). `feat/hula-na-cashier` (22 commits) is the non-custodial cashier scaffold lineage, partially merged via PR #65.
**ORG-05 · LOW · Branding is three-way unsettled.** Repo/docs say "Taya NA Predict," the live brand is "Hula Na!", and the worktree is rebranding to "Tiangge." — one name must win before any white-label story makes sense.
**ORG-06 · MEDIUM · `main` is not the mainline.** 330 commits of product development live on a branch named like a chore; `main` is a deploy-target snapshot. CI tests run only on `main` + `feat/binary-exchange-engine`. This guarantees integration surprises and makes "audit main" a trick question.

---

## 3. Enterprise/commercial gap matrix (Workstream G)

| Capability | Status | Evidence | Effort |
|---|---|---|---|
| Multi-tenancy (schema/auth/config) | **ABSENT** | No tenant/operator/brand concept in 32 migrations or any Go; RBAC is single-org | XL |
| Per-tenant branding/theming | **ABSENT** | Brand hardcoded ~12 places in app; single `:root` token set; P8 tokens exist but single-brand | L |
| Per-tenant feature flags / market catalogs | **ABSENT** | Build-time `NEXT_PUBLIC_FEATURE_*`; process-global gateway env flags; markets have no owner column | M–L |
| API versioning strategy | PARTIAL | Everything `/api/v1`, no negotiation/deprecation policy; spec claims v2.0.0 | M |
| OpenAPI accuracy | **WRONG PRODUCT** | `api/openapi.yaml` documents sportsbook endpoints; 0/5 spot-checked live endpoints present | M |
| Partner API keys | PARTIAL | Real key system (bcrypt, scopes) but player-self-issued, no revoke route, no expiry, no per-key limits | M |
| Outbound webhooks (fills/settlements) | **ABSENT** | Only inbound payments webhook | M |
| Rate limiting (API surface) | PARTIAL | In-memory, dispute-submissions only; auth service has proper Redis limiter; nothing on orders/bot | M |
| Sandbox environment | **ABSENT** | No partner test mode | M |
| Geo-fencing | PARTIAL | Boot policy + gate real and fail-closed (CMP-04); bypasses: bot API (SEC-02), direct origin (SEC-03); no metrics | S–M to close |
| KYC | PARTIAL (good) | DB-backed, manual-review default, fail-closed vendor seam | S (vendor config) |
| Sanctions/AML screening | **ABSENT (live path)** | Screening logic exists only in dead `internal/cashier` | M |
| Immutable admin audit trail | PARTIAL | DB audit store, insert-only writer; no DB-level append-only enforcement; mutable file fallback | S |
| Responsible-trading limits | **EXISTS** | Atomic enforcement in order path, verified | — |
| GDPR retention/erasure | STUB | No-op delete endpoint, no anonymization | M |
| Per-market jurisdiction config | **ABSENT** | Single global allowlist; no per-market rules | M |
| Environments (dev/staging/prod) | PARTIAL | ENVIRONMENT tiers in boot logic; only a demo box exists | M |
| CI/CD | PARTIAL | Real test/deploy workflows, demo-targeted; no prod pipeline, CI only on 2 branches | M |
| IaC | **ABSENT** | Helm charts are sportsbook leftovers; live deploy is rsync+compose | L–XL |
| Backup/restore/DR | PARTIAL | 6h pg_dump sidecar + restore script; offsite off by default; no drills, no PITR | S–M |
| SLOs / on-call / runbooks | **ABSENT** | Stale sportsbook runbooks only | M |
| Observability (metrics/traces/alerts) | PARTIAL | slog structured logs; OTel scaffolding; no exporters/dashboards/alerts; compliance counters in-process | M |
| Scale ceiling | — | One gateway replica max (ARCH-01/PERF-03); per-market ~10² matches/s; single PG writer; see PERF | M–L |

---

## 4. Strategic decision — refactor vs. rewrite (Phase 1.5)

### The decisive facts (from the audit)

1. **The hybrid-CLOB off-chain half already exists, in place, and it is the best code in the repo.** The brief assumed the AMM is the engine and the CLOB lives in a side worktree. Reality: the CLOB merged into the main line at migration 019; `feat/binary-exchange-engine` contains only UI polish (ORG-04). The AMM is a legacy mode for pre-019 markets. The strategic question "how do we get to a CLOB" is already answered; the open questions are *hardening* (COR-01/02), *scale-out* (ARCH-01/PERF-03), and *the on-chain leg* (A2).
2. **The defects that matter are point defects, not load-bearing-design defects.** COR-01 is a missing `WHERE status=` guard the codebase already uses elsewhere. COR-02 is revalidation scope inside an existing lock. SEC-01 is one line. SEC-02 is a missing middleware call. The WS plane needs a pub/sub backbone — a known, bounded retrofit (a stalled branch even exists). None of these indict Go, Postgres, or the service shape.
3. **The expensive gap is the on-chain leg, and it is net-new work under every option.** Contracts are interfaces; relayer/bridge-watcher are prose. Whether you evolve, partially rewrite, or fully rewrite the Web2 side, the Solidity + relayer + watcher work is the same work in the same languages, gated on the same ADR-0003/0004 decisions and an external audit. A rewrite buys nothing here.
4. **What a full rewrite would discard:** ~70k LOC of Go with 113 test files including the property/fuzz/race suites on exactly the math that must never be wrong; the fail-closed compliance boot policy; the RBAC system; the idempotent ledger. What it would keep: the defects' *lessons*, at the price of 6–12 months of parity-chasing while the current platform (which has a live demo deployment and an investor process — Nimbus — in flight) stands still and re-earns trust from zero. Rewrites of working money code carry their own correctness risk: the current engine's edge cases are *tested*; a new one's are not.

### Options assessed

**Option A — Evolve in place (Go + Next.js, CLOB already merged).** Fix the CRITICAL/HIGH correctness and security findings in weeks; retire the AMM; add the Redis event backbone to unlock replicas; delete the dead two-thirds; then build the enterprise layer (tenancy, partner API, webhooks) and execute the on-chain leg per the existing ADRs. Cost to enterprise-grade: roughly 2–3 quarters of focused work, incremental and shippable throughout. Risk: medium-low — every step is verifiable against a running system with tests.

**Option B — Partial rewrite at the engine seam.** The natural seam exists and is clean (`Repository`/`WalletAdapter`/`ExchangeRepository` interfaces) — but the engine behind the seam is the *strongest* component, so rebuilding it first is rebuilding the wrong thing. A language switch for the matching engine (e.g., Rust in-memory book) buys throughput the business cannot use yet: matching is bounded by Postgres durability and the single-replica WS plane, not by Go. Hold B as the escalation path if a binding throughput SLO ever invalidates the Postgres-locked design (tripwire below).

**Option C — Full rewrite in a different stack.** Candidates honestly assessed: **Rust** (axum/sqlx + an in-memory LOB) — best raw fit for a low-latency CLOB, excellent EVM ecosystem (alloy/foundry), but the smallest hiring pool, slowest iteration, and it solves a latency problem this venue does not have (sub-second is met today; HFT-grade microseconds is not the product). **TypeScript end-to-end** (NestJS/Fastify + Prisma/postgres.js) — one language across stack and the team's frontend strength, decent web3 tooling (viem), but materially worse fit for a concurrency-sensitive ledger/matching core than what already exists in Go, and it would *lower* the floor on the most safety-critical code. Either way: 6–12 months to parity, all current tests void, compliance scaffolding re-derived, and the live demo/fundraise narrative frozen. **Rejected on the evidence: the audit found a sound core with point defects, which is precisely the profile where full rewrites destroy value.**

### Recommendation

**Option A — evolve in place. Confidence: high (~85%).**

Drivers (the three findings that most shaped it): (1) the CLOB is already merged, tested, and money-safe under its reservation design — the presumed reason to rewrite doesn't exist (ORG-04 / workstream A strengths); (2) the worst defects are small, locatable, and pattern-matched to fixes the codebase already contains (COR-01 vs `PersistProposalAtomic`); (3) the genuinely large builds (on-chain leg, multi-tenancy) are net-new in every scenario, so a rewrite adds cost without subtracting any.

**Fate of the AMM: kill it, on a schedule.** New markets already default to `order_book`. Do not keep the AMM as a liquidity backstop — the Synthetic Market Maker (`SMM_ENABLED`) already plays that role *on the book*, which is the architecturally correct place. Plan: freeze AMM market creation (verify none enabled), settle/void remaining pre-019 AMM markets, then delete the AMM execution path (`amm.go` execution, `PersistFilledOrderAtomic` AMM variant) and keep only the pricing math if SMM wants it for quoting. This deletes COR-03 instead of fixing it.

**Custody migration sequencing (off-chain → on-chain):** (0) say the quiet part internally — the alpha is custodial; treat A2-04 controls (two-person withdrawal approval in-app, runbook, daily reconciliation report) as launch blockers for any real-money custodial alpha; (1) land ADR-0003/0004 (wallet + settlement chain) — these gate everything; (2) implement + externally audit the collateral contract set; (3) build the relayer/bridge-watcher as real services against testnet with the existing SDK state machines as their spec (that code is good and tested — promote it); (4) run dual-rail (custodial alpha + non-custodial beta) behind the existing fail-closed flags; (5) migrate balances by user cohort with on-chain attestation, then retire the treasury rail. The CLOB stays off-chain throughout — only settlement/custody moves on-chain, which is exactly the hybrid target.

**Tripwires that would change the call:**
- If, after P1 hardening, a written throughput SLO (e.g., sustained >500 matches/sec on one market) is real and benchmarked as unreachable on the Postgres-locked path → escalate to **Option B** (in-memory single-writer match core per market, Postgres as journal), keeping the seam.
- If two or more B2B tenants sign before tenancy lands → pull the multi-tenancy epic forward and reassess whether the tenancy plane justifies a service split (still not a language change).
- If ledger invariants cannot be made double-entry-equivalent within the P2 ledger task's budget (it can — the schema is in code and additive) → reassess the wallet service specifically.

The improvement plan (docs/audit/IMPROVEMENT_PLAN.md) implements Option A.

---

## 5. Verification log

Environment: macOS (darwin/arm64), Go 1.26.1, Node 20+, Yarn 1.22.x, Docker Desktop running. All commands executed 2026-06-12 from the repo or stated subdirectory.

| # | Command (abridged) | Result |
|---|---|---|
| 1 | `git branch --show-current` / `git status --short` | `chore/safe-brand-text-cleanup`; tree clean except 2 untracked images |
| 2 | `git merge-base main chore/safe-brand-text-cleanup`; `git rev-list --count` both ways | base `0a2241b9` (brand rename); branch +330 vs main, main +35 vs branch |
| 3 | `git rev-list --count chore/…..feat/binary-exchange-engine`; log | +28 commits, all UI/brand ("Tiangge"); engine already in main line; branch trails by 11 |
| 4 | gateway: `go build ./...` | **PASS** (exit 0) |
| 5 | gateway: `go vet ./...` | PASS; 3 warnings (unexported fields w/ json tags, `cmd/gateway/migrate_legacy_loyalty.go:39-41`) |
| 6 | gateway: `go test ./...` | **PASS — all packages ok** (prediction, wallet, alphacashier, compliance, rbac, http, ws, …); `internal/prediction/workers` + `internal/content` + `cmd/migrate`: *no test files* |
| 7 | auth: `go build && go vet && go test ./...` | PASS (`internal/http` ok, 5.9s) |
| 8 | `modules/platform`: `go build && go test ./...` | PASS (canonical, runtime, httpx ok) |
| 9 | `yarn install --frozen-lockfile` (talon-backoffice) | PASS, 6.6s (peer-dep + workspace-private warnings) |
| 10 | app: `npm run typecheck` | PASS (note: scoped script; tests/ scope + baseline note — see OPS-02) |
| 11 | app: `npm test` | **PASS — 203/203** (59 suites) |
| 12 | office: `npx tsc --noEmit` (stale `.next` present) | FAIL on `.next/dev/types` referencing deleted routes |
| 13 | office: `rm -rf .next && npx tsc --noEmit` | **PASS** (exit 0) → stale-artifact issue, not source error |
| 14 | api-client: `npm test` | "No tests found" (passWithNoTests) — zero tests |
| 15 | app: `npm run build` (Next 16 production) | **PASS** (incl. repo's own "leak-check: ok" gate) |
| 16 | office: `npm run build` | **PASS** |
| 17 | Fresh PG16 container (port 5439) + `go run ./cmd/migrate up` | **PASS — 31/31 migrations**, `goose: successfully migrated database to version: 31` |
| 18 | `yarn audit --level high` | 82 high / 7 critical; runtime-relevant: Next.js 16.2.2 middleware advisories (fix ≥16.2.5); criticals all dev-only transitives |
| 19 | `govulncheck` | not installed; Go deps reviewed manually (modern: x/crypto v0.49+, go-ethereum, OTel current) |
| 20 | Targeted source verification | COR-01/02/03/04, SEC-01/02/03, PERF-03 pattern, CSRF wiring (`main.go:112`), settlement UNIQUE, void persist, bot handler, compose `18080:18080`, pretrade header trust — all confirmed at the cited lines |

Delegated sweeps (6 subagent workstreams: repo-org, on-chain leg, security, code quality, performance, enterprise) produced the counts and inventories cited above; every HIGH/CRITICAL claim used in this report was re-verified against source by the auditor before inclusion.

---

## 6. Disposition of prior audit findings

Prior analyses: `../TIANGGE_AUDIT_REPORT_Fable.md` (2026-06-10) and `../IMPLEMENTATION_PLAN_BLOCKERS_3-4-5.md`.

| Prior finding | Disposition |
|---|---|
| #4 Cross-repo symlinks break self-containment | **FIXED** — commit `983bd5be` removed them + CI guard (`scripts/check-no-external-symlinks.sh`); clean-machine install/typecheck/test/build all pass (Verification #9–16) |
| #5 Synthetic chart data shown to users | **FIXED** — commit `854f2a94`; synthetic walk now behind `NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS` (default off), honest loading/error/empty states |
| #3 Geo gate fails open / KYC defaults off | **SUBSTANTIALLY FIXED, residual holes** — commits `445cf46c`+`aa122190` delivered the deny-by-default boot policy and cashier-surface gates exactly as planned (CMP-04 verified). Still open: bot-API bypass (SEC-02 — the plan's C2 step never listed the bot surface), direct-origin spoof (SEC-03 — plan's C3 anti-spoof stopped at the proxy layer; `:18080` exposure unaddressed), metrics-less denial counters |
| #1 Money in/out alpha-grade, manual ops | **OPEN** — unchanged (A2-03/04); deposit watcher and withdrawal runbook still absent |
| #2 No oracle; manual resolution only | **OPEN** — `internal/prediction/feed/` still has no production adapter; AutoSettler idles |
| Geo fail-open at `handlers.go:412` | **FIXED** (superseded by boot policy; see #3 row) |
| Office UI lacks route guards (P0-8) | **OPEN** — office still relies on Caddy basic-auth front gate; APIs enforce RBAC server-side |
| Single-entry ledger question (§12-6) | **CONFIRMED as designed** — still single-entry running-balance + reconciler (COR-06); never answered in repo |
| Wash-trade/sybil surveillance absent (P0-6) | **OPEN** — self-match prevention exists on the book; no multi-account/wash surveillance |
| Stale sportsbook docs/migrations (P1-8) | **OPEN** — and broader than prior audit recorded (ORG-01/02 inventory) |
| Branding unfinalized (P1-9) | **OPEN — worse**: now three-way (Taya Na / Hula Na! / Tiangge), ORG-05 |
| "Exchange engine well tested, strongest part" | **CONFIRMED** — with the two concurrency caveats the prior audit missed (COR-01 settle/void race, COR-02 stale-plan maker writes). Prior audit's "settlement idempotent, payouts safe" claim was correct for retries but did not test cross-flow races |
| Prior worktree question "is cashier branch merged? retire worktree" | Partially merged (PR #65 on main); worktree now hosts unrelated UI work (ORG-04) — still needs a decision |

Prior-audit claims checked and found **wrong/outdated**: office is on antd ^5.29.3, not 4.16 (CLAUDE.md also stale on this); "Redis cache wraps gateway reads" was never true of the prediction gateway (no Redis client in go.mod); frontend suite "environment-blocked" is resolved (203 tests pass on this machine).

---

## 7. What's good (preserve these)

1. **The exchange engine and its test culture.** Price-time priority, complementary issuance, self-match prevention, partial fills, post-only, notional caps — with property, fuzz, bench-verify, and race suites that pass. This is the asset.
2. **Money-mutation discipline.** Idempotency keys with amount/reason conflict detection on every wallet op; scoped key families per flow; reservation hold/capture with cumulative caps that kept even the concurrency bugs found here money-safe.
3. **Fail-closed configuration culture.** Boot refuses prod with dev secrets, anon-admin, permissive compliance, missing geo allowlist, unacked KYC-off, withdrawal-broadcast unacked. Rare to see done this consistently.
4. **The compliance core.** Atomic RG gate ahead of money movement; DB-backed KYC with a fail-closed vendor seam; RBAC with super-admin invariants; deny-by-default geo policy (modulo the two bypasses).
5. **Gateway internal layering.** handlers→service→repo with interface seams (`WalletAdapter`, `Repository`, `ExchangeRepository`) that genuinely decouple — the seam quality is what makes Option A cheap and Option B *possible* later.
6. **The player app's hygiene.** Zero `any`/`console`/suppressions, enforced by gates; strict TS everywhere; structured logger; honest empty/error states post-`854f2a94`.
7. **Operational seeds worth growing:** migrations apply clean 31/31 with no destructive ALTERs; pg_dump sidecar + restore script; demo seed data flows through real order paths so demo ledgers reconcile; WS auth done right (cookie-based, per-channel authz, fail-closed origins).
8. **The cashier-sdk state machines and policy evaluators** — tested pure functions that should become the spec for the real relayer/watcher services rather than being rewritten.
