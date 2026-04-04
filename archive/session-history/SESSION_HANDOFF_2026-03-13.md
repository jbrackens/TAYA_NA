# Phoenix Session Handoff — 2026-03-13

This file is a restart-safe summary.

Canonical investor-demo execution now lives in:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/INVESTOR_DEMO_READINESS_BOARD.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/investor-demo-setup.md`

## Repo layout

There are still two backend generations in the workspace:

- Old Scala/Akka Phoenix backend:
  - `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-backend`
- New Go Phoenix platform:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep`

The real player frontend being migrated is:

- `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg`

The legacy thin public demo frontend on top of the Go backend is:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-demo-web`

The target investor-demo runtime is now:

- real player frontend: `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg`
- real Talon backoffice: `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice`
- compose runtime: `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docker-compose.demo.yml`

## Current backend state

The Go platform is no longer just a scaffold/demo backend. It now has:

- sportsbook core in Go
- prediction service in Go
- dedicated `phoenix-realtime` fanout service for sportsbook core websocket domains
- initial Go admin/backoffice plane
- support notes plus unified operator timeline
- timeline filtering and CSV export
- cashier queue, reconciliation queue, and CSV exports
- payment assignment/notes/actions/detail/event history
- verification sessions, provider event history, assignment/notes, review queue filtering, and CSV export
- terms/config admin surface
- reporting/admin export slice in `phoenix-analytics`
- audit-log CSV export in `phoenix-audit`
- websocket compatibility endpoint for sportsbook frontend expectations
- provider sync seams and adapters for `mockdata`, `oddin`, and `betgenius`

Recent backend slices completed in this session window include:

- `phoenix-user` verification review queue CSV export and filtering
- `phoenix-wallet` reconciliation queue CSV export
- `phoenix-realtime` plus gateway websocket proxying behind a feature flag, with Kafka-driven fanout for `market`, `fixture`, `bets`, and `wallets`
- seeded realtime rehearsal command via `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/realtime-rehearsal.sh`, backed by `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-realtime/cmd/rehearsal`
- deterministic provider rehearsal scripts via `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/payment-provider-simulator.sh` and `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/verification-provider-simulator.sh`
- demo seed expanded with an ops-only review user and stable provider-backed payment / verification cases for Talon rehearsal
- live Wave 5 rehearsal artifacts now exist for:
  - cashier/provider flows: `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/artifacts/payment_provider_simulator_20260315_181314.md`
  - verification/provider flows: `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/artifacts/verification_provider_simulator_20260315_181123.md`
- Wave 5 runtime fixes landed during live rehearsal:
  - `demo-seed.sh` no longer burns auth rate-limit budget during provider-only reseeds
  - gateway now exposes public payment and verification provider callback routes
  - wallet provider-reference lookups now cast UUID IDs safely and handle nullable assignees
  - wallet provider-state normalization now preserves `PENDING_APPROVAL` for cashier approve flows
- investor-demo runtime now also has a local host-run frontend fallback:
  - configurable player/Talon ports defaulting to `3100` and `3101`
  - auto-resolved `docker` vs `host` frontend mode in `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/demo-bootstrap.sh`
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-frontends-start.sh`
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-frontends-stop.sh`
  - player local production build/start path repaired on the migrated frontend branch so host fallback is no longer blocked by stale player TS errors
- host runtime hardening progressed further:
  - host fallback now defaults to Node `20.20.0`
  - Talon launcher repairs the incompatible `next` -> `http-errors` -> `statuses` dependency drift locally by injecting `statuses@1.5.0` under `next/node_modules` when needed
  - Talon launcher now calls the repo-local Next CLI directly instead of assuming Yarn PATH resolution is healthy
  - Talon `packages/office/next.config.js` now gates `I18NextHMRPlugin` to dev-only
- Talon production build blocker is resolved:
  - root cause was `rc-upload` bundling a nested `@babel/runtime@7.13.9` that lacks the `./helpers/esm/regeneratorRuntime` export required by the babel transform chain
  - fix: `@babel/runtime` resolution pinned to `7.28.6` in root `package.json`; launcher removes the nested copy so webpack resolves to root
- combined host-run frontend runtime is validated including terminal-close survival:
  - root cause of process disappearance: `nohup` sets SIG_IGN for SIGHUP, but Node.js/libuv overrides inherited signal dispositions by installing its own handlers, so terminal-close SIGHUP kills the processes despite nohup
  - fix: launcher now uses `perl -MPOSIX=setsid` exec chain so each Node process runs in its own session (PGID = own PID, session leader), unreachable by terminal-close SIGHUP
  - validated via `script -q /dev/null` pty-exit simulation: launcher starts both, pty exits (simulating terminal close), both processes survive with HTTP 200 at t=0/10/30s
  - stop script correctly terminates setsid'd processes and releases ports
- earlier recent slices already in the repo include:
  - reporting/admin export parity
  - provider/payment admin workflows
  - provider-backed verification session depth
  - sportsbook websocket compatibility
  - supplier adapter parity

## Current frontend state

Claude CLI already did a substantial frontend migration pass on:

- branch: `feature/go-backend-migration`
- commit reported by Claude: `0fc2ead`

Claude’s migration summary said slices 1-7 were complete, but that report is not the final truth because:

1. it predates later backend work done in Go
2. some frontend features were disabled under older blocker assumptions
3. those assumptions are now partially stale

The correct next frontend move is:

1. reconcile disabled/stubbed features against the CURRENT Go backend
2. re-enable anything that is now unblocked
3. validate on Node 20
4. then move into prediction or final sportsbook realtime/polish

Latest player-hardening work already completed in this session window:

- player transaction history is now on the Go wallet client path instead of legacy `useApi`
- `phoenix-wallet` transaction listing runtime bug is fixed
- `phoenix-wallet` transaction listing now supports `product` filtering for the migrated player page
- responsibility-check requirement is now exposed by Go profile/current-session responses
- deposit-threshold modal now respects the Redux selector instead of forcing itself open
- Go profile data is now normalized into Redux more safely in both the classic layout and sportsbook redesign shell
- GeoComply license-key and geo-packet calls are now on the Go compliance client instead of legacy `useApi`
- win/loss now uses Go betting filters for `status`, `start_date`, and `end_date`, and the Go `matched` status is normalized to open in the UI
- demo-critical frontend tests for transaction-history, win/loss, session-timer, and deposit-threshold now reflect current Go contracts instead of the old `useApi` layer
- the package-scoped Node 20 Jest batch for those rewritten app-core tests is green; remaining frontend test noise is now outside those demo-critical paths

## Current Talon state

Wave 2 on the investor-demo board is now in progress in:

- `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice`

The first Talon migration tranche already done is:

- office login/logout route normalization from legacy paths to Go gateway auth paths
- Go-aware auth eligibility using top-level `role` claims in addition to legacy `realm_access.roles`
- Go refresh-payload normalization in Talon auth/session utilities
- users recent-activity preview normalization from legacy `recent-activities` payloads and Go `/admin/punters/{id}/timeline` payloads
- users notes normalization from Go support-notes payloads, including nested pagination and snake-case note fields
- Talon notes add flow now posts the Go `note_text` body shape instead of the old camel-case payload
- provider-ops now includes a real Go-backed verification review queue with session detail, provider event history, assignment, and note actions
- provider-ops now includes a real Go-backed cashier review panel over `phoenix-wallet` admin routes, including queue filters, queue and reconciliation CSV exports, queue summary, reconciliation preview/mutation, transaction detail, event history, assignment, notes, and approve/decline/retry/settle/refund/reverse/chargeback actions
- risk-management summary now includes Go-backed analytics reporting and risk-summary actions through `phoenix-analytics`, including daily report generation/repeat, exclusion and per-user transaction CSV exports, truthful promo-usage reads, wallet correction task reads, player risk scores, and risk segments
- backend audit/report depth is slightly wider now because `phoenix-audit` also exposes filtered CSV export through `GET /admin/audit-logs/export`
- provider-ops page and menu access now include `operator`, matching the Go admin verification queue role model

Current validation signal for this Talon slice:

- `tsc -p packages/office/tsconfig.json --noEmit --pretty false --types jest,node` passes on Node 20
- Talon office Jest harness is now fixed:
  - root cause: missing `transform` config meant `babel-jest` never ran on `.ts`/`.tsx` files; and when added, babel's `module-resolver` plugin conflicted with Jest's own module resolution
  - fix: `jest.config.js` now configures `babel-jest` with a Jest-specific babel config (`.babelrc.jest.js`) that omits `module-resolver`, plus `moduleDirectories` for path alias resolution
  - 22 of 24 office suites pass (131 of 132 tests); `prediction-ops` has a pre-existing timeout, `userDetailsContainer` has 1 pre-existing test-level failure — neither are harness issues

## Backend priority order from here

For investor-demo purposes, ops/backoffice depth takes priority over deeper provider realism.

Execute backend work in this order:

1. Continue broader `phoenix-analytics` report-family depth now that truthful promo usage is implemented
2. Richer verification review workflow depth in `phoenix-user`
3. Remaining Talon-facing admin workflow depth
4. Then continue payment-provider/state depth in `phoenix-wallet`
5. Then continue full third-party IdComply / KBA / IDPV depth in `phoenix-user`

## Frontend priority order from here

Claude should execute in this order:

1. Reconcile stale disabled-feature assumptions
2. Re-enable terms, responsible gaming, MFA/verification, KBA/IDPV, promotions, and sportsbook enrichments where Go now supports them
3. Validate with Node 20
4. Then move to prediction on Go if the service contract is sufficient

## Investor demo

The investor-demo path is no longer centered on the thin public frontend.

Current runtime target:

- player UI on port `3100`
- Talon UI on port `3101`
- gateway on port `8080`
- private reverse proxy / DNS split still needs to be applied on the demo VM

`phoenix-demo-web` should now be treated as a legacy fallback only.

## Important docs

- Implementation status:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/IMPLEMENTATION_STATUS.md`
- Investor demo board:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/INVESTOR_DEMO_READINESS_BOARD.md`
- Investor demo runbook:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/investor-demo-setup.md`
- Backend parity plan:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/BACKEND_PARITY_EXECUTION_PLAN.md`
- Frontend migration plan:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/FRONTEND_GO_MIGRATION_PLAN.md`
- Frontend dependency inventory:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/FRONTEND_API_DEPENDENCY_INVENTORY.md`
- Old vs new backend gap analysis:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/OLD_VS_NEW_BACKEND_GAP_ANALYSIS.md`

## Immediate next step if Codex resumes

Finish investor-demo wave execution in this order:

1. Run the seeded realtime rehearsal against a live investor-demo stack and capture the first markdown artifact proving market, fixture, bet, and wallet propagation through the gateway websocket path
2. Re-run the payment and verification simulator packs against the full investor-demo runtime with player and Talon up, so Wave 5 evidence moves from the minimal Go stack to the actual demo topology
3. Continue Talon ops-first migration after the auth/session/access foundation: broader report/audit/provider-ops coverage
4. Clean up remaining app-core Jest harness and repo-wide frontend TS noise outside the demo-critical hardened paths

## Immediate next step if Claude resumes

Use the updated frontend continuation prompt and start with:

1. disabled/stubbed feature reconciliation against the current Go backend
