# Backlog Execution Phases and Tasks

Date: 2026-03-04
Source backlog: `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Phase 1: Canonical Contracts and Adapter Boundary (SB-001, SB-002)

1. Define canonical schema package for:
   - events, fixtures, markets, selections, bets, settlements, translations.
2. Add schema versioning strategy (`v1`, compatibility policy).
3. Define provider adapter interface:
   - ingest streams, snapshot pull, command APIs (place/cancel/cashout/etc).
4. Introduce adapter registry and provider selection by config.
5. Add contract tests proving frontend/internal APIs consume canonical outputs only.

## Phase 2: Feed Runtime and Recovery (SB-003, SB-004, SB-006)

1. Build revision checkpoint store (persist, load, advance, rollback-safe).
2. Implement deterministic replay runner with idempotency guarantees.
3. Add separate feed connectors for:
   - delta, settlement, metadata, translation streams.
4. Implement reconnect logic with revision resume.
5. Add feed reliability telemetry:
   - lag, gap, duplicate, replay counters.
6. Add baseline alert rules and dashboards for feed health SLOs.

## Phase 3: Bet Transaction Core Hardening (SB-101, SB-102, SB-103)

1. Extend bet placement envelope:
   - playerId, requestId, device, segment, ip, precision, item payload.
2. Implement odds-change policy engine with normalized reject taxonomy.
3. Implement LTD policy engine for live betting (single/multi).
4. Add bet pre-validation middleware pipeline and rejection observability.
5. Add integration tests for edge cases:
   - odds drift, LTD timeout, malformed identity/context.

## Phase 4: Cashout and Settlement Safety (SB-201, SB-401, SB-402)

1. Implement cashout quote stream + TTL + accept API.
2. Add idempotent cashout acceptance and wallet-safe settlement transitions.
3. Implement deadheat/multi-result settlement model.
4. Add resettlement conflict policy and deterministic reprocessing.
5. Add reconciliation assertions covering:
   - place, settle, cashout, resettle, refund/cancel branches.

## Phase 5: Quality Gates and Certification (SB-501, SB-502)

1. Create provider conformance test suite framework (Odds88 profile first).
2. Build canonical regression packs for core lifecycle transitions.
3. Make conformance + regression suites mandatory in CI gates.
4. Publish failure triage report format and runbook.

## Phase 6: Commercial Maturity Features (Wave 2 Core)

1. Snapshot recovery + rate-limit governance (SB-005, SB-007).
2. Alternative odds + max-bet precheck (SB-105, SB-106).
3. Bet Builder + Same Game Combo + Fixed Exotics (SB-202, SB-203, SB-204).
4. Match tracker + stats centre + integrated stream flow (SB-301, SB-302, SB-303).
5. Freebets + Odds Boost lifecycle (SB-304, SB-305).
6. Backoffice provider ops cockpit + settlement intervention controls (SB-404, SB-405).

## Phase 7: Reliability and Performance Expansion

1. Chaos suite for reconnect/reorder/drop/duplicate (SB-503).
2. Latency/throughput SLO gate enforcement (SB-504).
3. Production-readiness load profiles for placement/cashout/realtime.

## Phase 8: Differentiation Layer

1. Multi-mode integration models and widgetized modular surfaces (SB-008, SB-306).
2. Ledger correction workflows (SB-403).
3. AI layer:
   - personalized ranking, combo suggestions, churn/LTV, risk segmentation (SB-601..SB-604).

## Phase 9: Multi-Sport Vertical Expansion (MS-001..MS-008)

1. Canonical sport registry and provider adapter contracts.
2. Domain expansion with first-class `sportKey/leagueKey/seasonKey` across fixture/market/bet models.
3. Ingestion refactor to sport-agnostic workers (fixture, market, odds, settlement) with per-sport partitions.
4. New canonical sport APIs (`/api/v1/sports/*`) plus esports compatibility wrappers.
5. Frontend route migration to `/sports/[sportKey]/[leagueKey]/match/[eventKey]` while preserving existing shell and UX.
6. Pilot one non-esports sport (MLB) end-to-end before scale-out.
7. Scale-out to NFL/NBA/UFC/NCAA Baseball using adapter + mapping + presentation modules.
8. Cross-sport replay/load/non-regression gates with esports compatibility as a release blocker.

### Phase 9 Progress

1. [done] MS-001 canonical sport registry + provider adapter contracts in sportsbook odds-feed integration.
2. [done] MS-002 foundation slice delivered in feed API layer (canonical sport resolution + sports discovery endpoint + adapter wiring).
3. [done] MS-004 canonical sport API suite delivered in Go gateway (`/api/v1/sports/*`) with esports compatibility wrappers (`/api/v1/esports/events*`) and HTTP coverage.
4. [done] MS-003 ingestion refactor foundation delivered: sport-aware runtime routing + `adapter/stream/sportKey` partition telemetry + sport allow-list gating + admin/metrics surfacing (`revival/186_MS003_SPORT_PARTITION_RUNTIME_FOUNDATION_PROGRESS.md`).
5. [done] MS-005 frontend native sports route composition delivered: `/sports/[sportKey]/[leagueKey]/match/[eventKey]` tree now renders sportsbook pages natively (no redirect stubs), shared sports route helpers are in place, and navigation/menu/home/auth entrypoints now route through `/sports/esports` while preserving legacy compatibility (`revival/187_MS005_FRONTEND_SPORTS_ROUTE_COMPOSITION_PROGRESS.md`).
6. [done] MS-006 MLB pilot API wiring delivered: native non-esports sportsbook fixture/market retrieval now routes through canonical gateway `/api/v1/sports/*` endpoints (with esports kept on existing Odds API adapter path for non-regression) via feed adapter selection in Next API handlers (`revival/188_MS006_MLB_PILOT_CANONICAL_FRONTEND_WIRING_PROGRESS.md`).
7. [done] MS-007 multi-sport scale-out delivered: canonical adapter path is now generic for non-esports sports, deterministic multi-sport gateway seed data is in place, and live smoke gate execution (`make qa-sports-route-smoke`) now passes for `mlb,nfl,nba,ufc,ncaa_baseball` plus esports compatibility endpoints (`revival/189_MS007_MULTI_SPORT_SMOKE_GATE_FOUNDATION_PROGRESS.md`).
8. [done] MS-008 cross-sport replay/load/non-regression gate path delivered: added runtime gate (`make qa-sports-regression`), wired launch-governance enforcement, provisioned dedicated managed runtime profile execution (`make release-launch-readiness-runtime-profile`) with versioned profile config (`scripts/release/profiles/runtime-gate.env`), added runtime-capable workflow policy path (`.github/workflows/release-runtime-profile.yml`), and extended ruleset automation for runtime check-context promotion (`--include-runtime-profile-checks`) plus sign-off evidence requirements (`revival/190_MS008_CROSS_SPORT_REGRESSION_GATE_PROGRESS.md`, `revival/191_MS008_RELEASE_GOVERNANCE_WIRING_PROGRESS.md`, `revival/192_MS008_RUNTIME_GATE_PROFILE_ENV_PROGRESS.md`, `revival/193_MS008_RUNTIME_PROFILE_WORKFLOW_POLICY_PROGRESS.md`, `revival/194_RULESET_RUNTIME_PROFILE_CHECK_CONTEXTS_PROGRESS.md`).

## Immediate Start Queue (Next Build Steps)

1. [done] Wire sportsbook betslip to call `POST /api/v1/bets/precheck` and consume stable reason taxonomy (SB-105 integration).
2. [done] Start SB-202 bet-builder composition/pricing foundation (single-source canonical contract first).
3. [done] Implement SB-202 bet-builder quote persistence/TTL, quote retrieval, and quote-accept placement path.
4. [done] Wire provider-stream cashout quote updates from runtime adapter events (SB-201 deepening, stream layer).
5. [done] Move provider-ops audit storage from local file to shared durable multi-instance store.
6. [done] Add dashboard/alerts for alternative-offer commit vs expire ratio and stale cashout quote rejects.
7. [done] Implement SB-202 native multi-leg bet entity + settlement normalization path (backend slice).
8. [done] Wire sportsbook frontend builder quote/get/accept integration path against canonical gateway endpoints.
9. [done] Add backoffice/admin structured multi-leg settlement payload support and contract tests.
10. [done] Implement SB-203 Same Game Combo validation rules (single-fixture + distinct-market legs) with explicit reason codes and sportsbook UX feedback.
11. [done] Start SB-204 Fixed Exotics foundation by defining canonical exotic leg schema + quote contract scaffolding.
12. [done] Extend SB-204 with fixed-exotics accept/place lifecycle and settlement normalization coverage.
13. [done] Add sportsbook fixed-exotics UI flow (compose quote -> accept placement) with typed hooks and component interaction tests.
14. [done] Add backoffice/admin controls for fixed-exotics quote/accept lifecycle observability and manual intervention tooling.
15. [done] Wire Talon backoffice UI workflows to the new fixed-exotics admin endpoints (list/detail/expire) with operator-safe action prompts.
16. [done] Add fixed-exotics operator guardrails: richer audit visibility for expire actions and role-scoped action controls.
17. [done] Add fixed-exotics operational dashboard card in Talon (counts by status + recent admin expires) and deep-link into audit logs.
18. [done] Start SB-301 match-tracker foundation by defining canonical live incident/timeline contract and initial gateway read endpoint skeleton.
19. [done] Wire sportsbook frontend fixture page to consume the match-tracker timeline endpoint with a basic live timeline panel and contract tests.
20. [done] Add provider-event mapping path for match-tracker incidents (feed adapter -> canonical timeline updates) and expose deterministic replay coverage.
21. [done] Start SB-302 stats-centre foundation by defining canonical fixture-stats contract + initial gateway fixture stats read endpoint skeleton.
22. [done] Wire sportsbook fixture page to consume new fixture-stats endpoint and render a basic stats centre panel alongside match tracker timeline.
23. [done] Start SB-303 integrated stream flow by adding fixture-page polling/refresh orchestration for timeline + stats endpoints with resilient stale-data UX fallback.
24. [done] Start SB-304 freebets foundation by defining canonical freebet model + initial gateway sportsbook consumption/read endpoints.
25. [done] Start SB-305 odds-boost foundation by defining canonical boosted-offer model + initial gateway read/accept endpoint skeleton.
26. [done] Wire sportsbook promo surfaces to consume freebet and odds-boost endpoints with basic eligibility/availability display in account-betslip flows.
27. [done] Start SB-008/SB-306 integration-mode + widgetized module foundation so sportsbook surfaces can be switched/configured by runtime mode without code forks.
28. [done] Extend SB-008/SB-306 mode presets beyond landing page into sportsbook module composition (home/esports route surfaces) with brand-configurable presets and operator docs.
29. [done] Expand SB-008/SB-306 module-composition pattern to additional sportsbook surfaces (promotions/account/fixture overlays) with reusable config parser and preset validation docs.
30. [done] Implement SB-304/SB-305 promo lifecycle interactions in sportsbook UX (freebet apply and odds-boost accept) with endpoint wiring, state transitions, and component tests.
31. [done] Add SB-304/SB-305 backend enforcement path (freebet reservation/apply and accepted odds-boost validation during placement) with deterministic contract tests.
32. [done] Extend SB-304/SB-305 backend parity with promo-aware precheck rejection taxonomy and admin/audit visibility of applied promo context.
33. [done] Promote promo observability to first-class admin analytics (filterable promo dimensions + aggregated promo-usage counters/endpoints).
34. [done] Surface promo analytics endpoint in Talon backoffice (operator dashboard card + filter controls + contract tests).
35. [done] Extend Talon audit-log UI filters to expose promo dimensions (`userId`, `freebetId`, `oddsBoostId`) and preserve deep-link parity from operations cards.
36. [done] Harden Talon audit-log action/category labeling to recognize newer gateway admin events (promo + fixed-exotics + provider-ops) without falling back to `unknown`.
37. [done] Align Talon audit-log TypeScript DTOs with gateway response shape (`id/action/actorId/userId/freebetId/oddsBoostId/occurredAt/details`) and remove legacy punter-only assumptions.
38. [done] Harden Talon audit reducers to accept both legacy `{data,...}` and gateway `{items,pagination}` payload shapes for audit-log tables.
39. [done] Add end-to-end Talon contract test fixture for `/admin/audit-logs` + `/admin/promotions/usage` shared drill-down flow (summary -> filtered logs).
40. [done] Resolve pre-existing Talon office TypeScript test blockers (`Protected` JSX return typing, `UseApi` tuple shape mismatch in session-guard tests, settle test nullable target) to restore clean `npx tsc --noEmit`.
41. [done] Build SB-404/SB-405 Talon provider-ops cockpit surface under Risk Management (feed-health telemetry + manual provider-cancel form + audit deep-link) with contract/container tests.
42. [done] Add SB-404 Talon settlement intervention panel wiring (manual settle/cancel/refund actions with explicit reason and operator guardrails) using existing admin lifecycle endpoints.
43. [done] Extend SB-405 provider-ops cockpit with explicit stream unhealthy-only toggle and threshold-breach badges to prioritize operator triage.
44. [done] Add SB-405 provider-ops triage ordering and stream-risk summary counters so highest-impact feed issues surface first.
45. [done] Add SB-405 provider-ops quick-action shortcuts (adapter/bet prefill + audit deep-links) from high-risk stream rows.
46. [done] Add SB-405 stream triage acknowledgment workflow (operator note + timestamp) to track incident ownership from the cockpit.
47. [done] Add SB-405 persisted acknowledgment state integration so stream ownership survives page reloads and multi-operator sessions.
48. [done] Add SB-405 acknowledgement lifecycle controls (resolve/reopen/reassign) with explicit audit actions and operator guardrails.
49. [done] Add SB-405 acknowledgement SLA escalation and stale-ownership reminders (age-based warning buckets + targeted audit deep-link shortcuts).
50. [done] Add SB-405 per-adapter acknowledgement SLA controls (operator-tunable warning/critical thresholds with saved defaults surfaced in Provider Ops settings).
51. [done] Add SB-405 Provider Ops acknowledgement SLA audit ergonomics (human-readable Talon audit labels + direct settings-to-audit deep-link).
52. [done] Close SB-405 audit deep-link parity by wiring `targetId` through Talon audit-log filters (router query -> API query) and surfacing `targetId` in the logs table.
53. [done] Add SB-405 audit-log preset chips for provider-ops workflows (SLA default/adapter updates + stream acknowledgement actions) to accelerate triage filtering.
54. [done] Add SB-405 provider-ops deep-link preset handoff (`preset` query contract) so `/logs` can auto-apply recommended filter bundles while preserving operator override.
55. [done] Add SB-405 preset-origin UX on `/logs` (active preset banner + one-click clear) so operators can explicitly inspect/reset inherited Provider Ops context.
56. [done] Add provider-ops acknowledgement lifecycle deep-link UI test coverage for all preset variants (`acknowledged/reassigned/resolved/reopened`) to prevent query contract regressions.
57. [done] Add `/logs` preset-aware URL copy action for incident handoff so operators can share current scoped audit context in one click.
58. [done] Add provider-ops stale acknowledgement audit CTA UI coverage to assert preset + target handoff on warning/critical stream rows.
59. [done] Add provider-ops stale acknowledgement CTA visual-state assertions (warning vs critical badge + CTA coexistence) for richer regression safety.
60. [done] Add `/logs` scoped URL copy coverage for manual-override scenarios (preset active + explicit action override) to preserve operator intent.
61. [done] Add `/logs` copy-workflow fallback UX coverage for clipboard-unavailable environments.
62. [done] Harden `/logs` scoped-copy fallback behavior for clipboard write failures and reset stale fallback state on scope changes.
63. [done] Add `/logs` scoped-copy UX polish with explicit retry behavior after fallback/manual-copy mode.
64. [done] Add `/logs` scoped-copy fallback accessibility hardening (auto-select/manual-copy field focus behavior + coverage).
65. [done] Add `/logs` scoped-copy fallback secondary action (open `/logs` URL in new tab/window) with guarded behavior and test coverage.
66. [done] Add `/logs` scoped-copy fallback secondary action guard coverage for missing `window.open` environments.
67. [done] Add `/logs` scoped-copy fallback UX telemetry hook (copy success/fallback/retry/open) behind non-blocking event emitter contract.
68. [done] Add unit-level telemetry emitter guard coverage for environments without `window.dispatchEvent`.
69. [done] Add `/logs` scoped-copy telemetry payload enrichment (`hasTargetId`, `hasActionOverride`) with regression assertions.
70. [done] Add `/logs` scoped-copy telemetry payload enrichment for pagination scope (`page`, `pageSize`) with regression assertions.
71. [done] Add `/logs` scoped-copy telemetry payload enrichment for copy mode (`manualFallback` vs `clipboard`) with regression assertions.
72. [done] Add `/logs` scoped-copy telemetry payload enrichment for preset-origin state (`isPresetActive`) with regression assertions.
73. [done] Add `/logs` scoped-copy telemetry payload enrichment for fallback-open availability (`canOpenScopedUrl`) with regression assertions.
74. [done] Add `/logs` scoped-copy telemetry payload enrichment for filter cardinality (`nonEmptyFilterCount`) with regression assertions.
75. [done] Add `/logs` scoped-copy telemetry payload enrichment for source action (`copyButtonLabel`: copy/retry) with regression assertions.
76. [done] Add `/logs` scoped-copy telemetry payload enrichment for scoped URL length bucket (`scopedUrlLengthBucket`) with regression assertions.
77. [done] Add `/logs` scoped-copy telemetry payload enrichment for scoped query key count (`scopedQueryKeyCount`) with regression assertions.
78. [done] Add `/logs` scoped-copy telemetry payload enrichment for scoped query key signature (`scopedQueryKeySignature`) with regression assertions.
79. [done] Add `/logs` scoped-copy telemetry payload enrichment for explicit override breadth (`explicitOverrideCount`) with regression assertions.
80. [done] Add `/logs` scoped-copy telemetry payload enrichment for explicit override key signature (`explicitOverrideKeySignature`) with regression assertions.
81. [done] Add `/logs` scoped-copy telemetry payload enrichment for applied-filter key signature (`appliedFilterKeySignature`) with regression assertions.
82. [done] Refactor `/logs` scoped-copy telemetry payload construction into a shared helper to remove duplicate mapping logic between copy and open-action flows.
83. [done] Extract scoped-copy telemetry context/key-signature resolvers into a dedicated utility module with direct unit coverage.
84. [done] Reuse shared scoped-copy telemetry utility in audit container tests to remove duplicated local resolver helpers.
85. [done] Add strict telemetry detail contract assertions (required key-set parity) for scoped-copy events to guard against silent payload drift.
86. [done] Add shared scoped-copy telemetry detail fixture builder for test setup reuse across emitter and container suites.
87. [done] Add scoped-copy telemetry utility edge-case tests for empty/fragment-only query strings to harden signature/count behavior.
88. [done] Add scoped-copy telemetry utility edge-case tests for query parameters with empty keys/values to harden signature normalization.
89. [done] Add scoped-copy telemetry utility edge-case tests for percent-encoded key names to harden signature decode normalization.
90. [done] Add scoped-copy telemetry utility edge-case tests for invalid percent-encoding inputs and harden decode safety behavior.
91. [done] Add scoped-copy telemetry utility edge-case tests for `+`-encoded key names and normalize signature handling for plus literals/spaces.
92. [done] Promote query-key decode normalization helper to module scope and add focused utility tests for decode fallback behavior.
93. [done] Add table-driven test cases for scoped query signature normalization matrix (regular, encoded, malformed, plus-space).
94. [done] Add table-driven test cases for scoped query key count normalization matrix to mirror signature coverage depth.
95. [done] Add table-driven tests for filter-key signature normalization (`explicit`/`applied`) across empty/partial/full filter sets.
96. [done] Add table-driven tests for `buildScopedCopyTelemetryContext` matrix (preset-only, explicit-override, no-filters, open-action mode).
97. [done] Add focused assertions for telemetry context matrix URL-derived fields (`scopedQueryKeyCount`, `scopedQueryKeySignature`) per scenario.
98. [done] Add focused assertions for telemetry context matrix URL-length bucket expectations per scenario.
99. [done] Extend telemetry context matrix with an explicit long-URL scenario so `buildScopedCopyTelemetryContext` bucket assertions cover short/medium/long classifications.
100. [done] Implement SB-403 wallet correction workflow foundation: admin correction-task scan/list/create/resolve APIs with optional correction mutation and reconciliation-safe task summaries.
101. [done] Implement SB-601 personalized ranking hook: gateway ranking endpoint with user-affinity and fixture/start-time weighted scoring (`GET /api/v1/personalization/ranking`).
102. [done] Implement SB-602 combo suggestion hook: gateway combo suggestion endpoint with explainable feature flags and confidence scores (`GET /api/v1/personalization/combo-suggestions`).
103. [done] Implement SB-603 player score hooks: admin score endpoint with churn/LTV/risk outputs, model version, and feature vector payload (`GET /api/v1/admin/risk/player-scores`).
104. [done] Implement SB-604 risk segmentation automation and operator override APIs (`GET /api/v1/admin/risk/segments`, `POST /api/v1/admin/risk/segments/{userId}/override`).
105. [done] Implement SB-504 strict capability SLO gate script and make target (`make qa-capability-slo`) covering placement/cashout/realtime thresholds with pass/fail enforcement.

## Gap Rerun Carryover Queue (2026-03-05)

106. [done] Implemented `SB-401` deadheat + multi-result settlement support in canonical settlement processing with deterministic deadheat settlement tests and admin payload coverage.
107. [done] Implemented `SB-402` resettlement conflict policy + idempotent reprocessing with explicit transition metadata and replay-safe wallet/audit behavior.
108. [done] Implemented `SB-501` provider conformance suite framework (feed-agnostic adapter certification profile) and wired it into CI/`verify-go`.
109. [done] Implemented `SB-502` canonical regression packs for core bet/wallet/settlement transitions and enforced as mandatory `verify-go` gate.
110. [done] Implemented `SB-503` chaos suite for reconnect/reorder/drop/duplicate/error scenarios with threshold enforcement in CI/pre-release gate path.
111. [done] Added frontend dependency modernization baseline automation (`make frontend-deps-baseline`) with artifact/report generation for Talon and Sportsbook outdated package inventories to drive phased upgrade execution.
112. [done] Executed frontend dependency modernization wave 1 (patch/minor root upgrades + compatibility pinning for `@types/lodash`) and kept `make verify-talon` + `make verify-sportsbook` green.
113. [done] Executed frontend dependency modernization wave 2 (range-satisfying workspace upgrades + compatibility resolution pins + Talon Promise typing fix), then revalidated `make verify-talon` + `make verify-sportsbook` and refreshed baseline artifacts.
114. [done] Implemented private-repo release governance fallback bundle (`make release-governance-private`) plus release-ref pre-push enforcement hook (`.githooks/pre-push`) and install helper (`make release-install-private-governance-hooks`) so release branch/tag policy remains enforceable while GitHub private rulesets are blocked.
115. [done] Defined frontend dependency modernization wave 3 major-transition execution plan with staged branch strategy, compatibility checkpoints, rollback guardrails, and mandatory gate matrix for `react`/`next`/`typescript`/`jest`/`eslint`.
