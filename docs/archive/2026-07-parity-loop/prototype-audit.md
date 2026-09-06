# TapTrade Prototype Audit — loop log

> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> The audit loop that produced it ended 2026-07-01; the trees it audited
> (`phoenix-backend/`, `phoenix-frontend-brand-viegg/`, `revival/`) were deleted 2026-09-06.
> See `CLAUDE.md` for current architecture.

> **CLOSED RECORD — the loop that wrote this stopped on 2026-07-01 at Loop 520.** It has not
> been appended to since; the only later commits are the 2026-07-06 rebrand sweep renaming
> strings inside it. Read it as history, not as a live plan.
>
> - The release it tracks is the **Tiangge parity RC** (`7069c7c9`, 2026-07-01). That brand no
>   longer exists and the RC never completed: Scenario 12 (safety / compliance / trust boundary)
>   was still **Partial** at the last entry, with two signoff templates left at `Status: pending`.
>   The "highest-leverage next slice" notes are the loop talking to its next iteration, not an
>   assignment to a reader.
> - **Units are stale.** The entries speak in `*_cents`. Migration `050_points_unit_model.sql`
>   (2026-07-07 — six days after the last entry) renamed every one of those columns to `*_points`;
>   the launch unit is non-redeemable Points. Do not copy a field name out of this file.
> - The `make qa-*` targets, `scripts/qa/*` and the `revival/` artifact and signoff paths it cites
>   do still exist in the tree, but nothing runs them on a schedule and `revival/` is on the
>   dead-directory list in `docs/audit/IMPROVEMENT_PLAN.md` (IMP-05).
>
> Entries are newest-first. See `CLAUDE.md` for current architecture.

Loop 518 update: the required Scenario 12 signoff files now exist as pending
templates instead of missing paths:
`revival/signoffs/security_residual_acceptance.md` and
`revival/signoffs/production_preservation_signoff.md`. They are prefilled with
the current residual-security, production-preservation, signoff-gate, and RC
artifacts plus the decision areas reviewers must complete.

`make qa-scenario-12-signoff` still fails correctly at
`revival/artifacts/scenario_12_signoff_gate_20260701_083723.md` because both
templates remain `Status: pending` and lack named reviewer/date fields. The
production dossier refreshed at
`revival/artifacts/production_preservation_dossier_20260701_083733.md`, and
the RC completion audit still fails correctly at
`revival/artifacts/rc_completion_audit_gate_20260701_083733.md`.

Scenario 12 remains Partial until accountable reviewers complete the templates
or remediation changes the required decision.

Loop 517 update: Scenario 12 signoff is now an executable gate instead of only
a prose blocker. `make qa-scenario-12-signoff` runs
`scripts/qa/scenario-12-signoff-gate.sh` and requires two explicit signoff
files: `revival/signoffs/security_residual_acceptance.md` and
`revival/signoffs/production_preservation_signoff.md`. Each signoff must carry
accepted or approved status, a named reviewer, an ISO date, and references to
the current review artifacts. Launch readiness now runs this gate before the RC
completion audit.

The gate failed correctly at
`revival/artifacts/scenario_12_signoff_gate_20260701_083415.md` because both
signoff files are missing. The production dossier refreshed at
`revival/artifacts/production_preservation_dossier_20260701_083425.md`, and
the RC completion audit still fails correctly at
`revival/artifacts/rc_completion_audit_gate_20260701_083425.md`.

Scenario 12 remains Partial, but the remaining human decisions are now
machine-checkable release blockers.

Loop 516 update: security residual acceptance is now packaged for review at
`revival/artifacts/security_residual_acceptance_packet_20260701_082738.md`.
The packet summarizes the current frontend, direct JVM, and resolved JVM
residual evidence, lists the residual classes, states required
launch-owner/security decisions, and records compatibility constraints for any
remediation. It is explicitly unsigned and does not accept residual risk.

The production dossier was refreshed at
`revival/artifacts/production_preservation_dossier_20260701_082831.md`.
The RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_082943.md`.

Scenario 12 remains Partial because the packet makes acceptance reviewable but
does not replace launch-owner/security acceptance or remediation, and does not
replace human preservation signoff.

Loop 515 update: residual dependency/security gates were refreshed against the
current artifacts. `make qa-frontend-residual-advisories` passed at
`revival/artifacts/frontend_residual_advisory_gate_20260701_082427.md` with
zero critical rows and only reviewed inherited Lerna-path high residuals for
`ip` and `lodash.set`. `make security-jvm-direct-residual-advisories` passed at
`revival/artifacts/jvm_direct_residual_advisory_gate_20260701_082427.md`, and
`make security-jvm-resolved-residual-advisories` passed at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260701_082427.md`.
The production dossier was refreshed at
`revival/artifacts/production_preservation_dossier_20260701_082448.md`.
The RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_082559.md`.

Scenario 12 remains Partial because these gates prove current residual drift
control, not launch-owner/security acceptance or remediation, and not human
preservation signoff.

Loop 514 update: inherited production-contract anchor coverage was expanded
before more feature work. `make qa-preservation-contract-anchors` now compares
six anchor sets against `HEAD`: Gateway OpenAPI paths, root handler route
strings, combined root/wallet/prediction Gateway route strings,
`PhoenixApiClient` methods, `PredictionApiClient` methods, and player wallet
client exported functions. Legacy player wallet `deposit`, `withdraw`, and
payment `getTransactionStatus` removals are classified as launch-prohibited;
any other inherited anchor removal fails the gate.

The strengthened anchor gate passed at
`revival/artifacts/preservation_contract_anchors_20260701_081950.md` with zero
unexpected removals. The production dossier was refreshed at
`revival/artifacts/production_preservation_dossier_20260701_082018.md`.
The RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_082230.md`.

Scenario 12 remains Partial because mechanical anchors reduce accidental
rewrite risk but do not replace human preservation signoff or
launch-owner/security residual-policy acceptance.

Loop 513 update: production-contract preservation review is now front-loaded
into `revival/artifacts/production_contract_review_pack_20260701_081231.md`.
The pack explicitly treats the 544-file tracked diff as preservation risk, not
as proof that inherited production contracts were safely rewritten. It
separates launch-required money-path deletions from high-risk backend,
gateway, prediction, wallet, public API/client, player, and office/admin
contract movement, then gives reviewers concrete signoff questions.

Preservation evidence was refreshed at
`revival/artifacts/preservation_deletion_map_20260701_081349.md`,
`revival/artifacts/preservation_modification_map_20260701_081356.md`, and
`revival/artifacts/production_preservation_dossier_20260701_081419.md`.
The RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_081548.md`.

Scenario 12 remains Partial because the review pack is guidance, not human
signoff or launch-owner/security residual-policy acceptance.

Loop 512 update: active wallet/admin point-account mutation errors now guard
rendered `wallet` copy without rewriting the internal wallet service contract.
`mapWalletError` now renders `invalid point account mutation request` and
`point account mutation failed` for invalid and generic mutation errors.

The full gateway HTTP package passed at
`revival/artifacts/gateway_http_wallet_mutation_error_boundary_20260701_100453.log`,
and the wallet package passed as a neighboring sanity check. Abuse and
preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260701_080532.md`,
`revival/artifacts/preservation_deletion_map_20260701_080532.md`,
`revival/artifacts/preservation_modification_map_20260701_080532.md`, and
`revival/artifacts/production_preservation_dossier_20260701_080533.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_080837.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 520 Audit Update

A compact Scenario 12 reviewer handoff now exists at
`revival/artifacts/scenario_12_reviewer_handoff_20260701_084500.md`. It names
the exact pending signoff files, current evidence artifacts, preservation diff
scale, security residual focus areas, reviewer commands, and non-negotiable
launch constraints.

The preservation dossier passed at
`revival/artifacts/production_preservation_dossier_20260701_084732.md`. The
Scenario 12 signoff gate failed correctly at
`revival/artifacts/scenario_12_signoff_gate_20260701_084755.md` because both
signoff files still need accepted or approved status, named reviewer, and ISO
signoff date. The RC completion audit still fails correctly with Scenario 12
Partial at `revival/artifacts/rc_completion_audit_gate_20260701_084755.md`.

Scenario 12 remains Partial because the handoff is not launch-owner/security
residual-policy acceptance, remediation, or human preservation signoff.

## Loop 519 Audit Update

Scenario 12 signoff governance is now explicitly classified in the production
preservation dossier. `revival/signoffs/` is treated as medium launch signoff
governance instead of generic low-risk revival evidence, which keeps pending
security residual and production preservation decisions visible to reviewers.

The preservation dossier passed at
`revival/artifacts/production_preservation_dossier_20260701_084313.md`. The
Scenario 12 signoff gate failed correctly at
`revival/artifacts/scenario_12_signoff_gate_20260701_084405.md` because both
signoff files still need accepted or approved status, named reviewer, and ISO
signoff date. The RC completion audit still fails correctly with Scenario 12
Partial at `revival/artifacts/rc_completion_audit_gate_20260701_084411.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 511 update: active wallet/admin point-account errors now guard cash-like
copy without rewriting the internal wallet service contract.
`mapWalletError(wallet.ErrInsufficientFunds)` renders `insufficient points`
instead of `insufficient funds`.

The full gateway HTTP package passed at
`revival/artifacts/gateway_http_wallet_error_copy_boundary_20260701_095821.log`,
and the wallet package passed as a neighboring sanity check. Abuse and
preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260701_075845.md`,
`revival/artifacts/preservation_deletion_map_20260701_075845.md`,
`revival/artifacts/preservation_modification_map_20260701_075845.md`, and
`revival/artifacts/production_preservation_dossier_20260701_075845.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_080148.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 510 update: preserved alpha cashier admin error responses now guard legacy
external-chain copy without rewriting inherited request contracts. Invalid
broadcast `txHash` errors keep the `txHash` field detail but no longer render
`EVM transaction hash` wording to callers.

The full gateway HTTP package passed at
`revival/artifacts/gateway_http_alpha_admin_error_boundary_20260701_095242.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260701_075309.md`,
`revival/artifacts/preservation_deletion_map_20260701_075309.md`,
`revival/artifacts/preservation_modification_map_20260701_075309.md`, and
`revival/artifacts/production_preservation_dossier_20260701_075309.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_075426.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 509 update: preserved alpha cashier admin reconciliation compatibility
reads now guard unsafe legacy token values without rewriting the inherited
summary contract. `/api/v1/admin/cashier/alpha/reconciliation` renders a copied
summary payload, redacts unsafe `tokenSymbol: "USDC"` values, and leaves the
raw `ReconciliationSummary` service result intact for internal preservation
review.

The full gateway HTTP package passed at
`revival/artifacts/gateway_http_alpha_reconciliation_boundary_20260701_094545.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260701_074610.md`,
`revival/artifacts/preservation_deletion_map_20260701_074611.md`,
`revival/artifacts/preservation_modification_map_20260701_074611.md`, and
`revival/artifacts/production_preservation_dossier_20260701_074611.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_074813.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 508 update: preserved alpha cashier deposit/release compatibility reads
now guard unsafe legacy token values without rewriting inherited row contracts.
User deposit/release reads and admin deposit/withdrawal reads copy row payloads
before rendering, redact unsafe `tokenSymbol: "USDC"` values alongside
`failureReason` and `reviewNote`, and leave raw repository records intact for
internal preservation review.

The alpha cashier package passed at
`revival/artifacts/alpha_cashier_row_token_boundary_20260701_093818.log`, and
the full gateway HTTP package passed at
`revival/artifacts/gateway_http_alpha_row_token_boundary_20260701_093818.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260701_073848.md`,
`revival/artifacts/preservation_deletion_map_20260701_073849.md`,
`revival/artifacts/preservation_modification_map_20260701_073849.md`, and
`revival/artifacts/production_preservation_dossier_20260701_073849.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_074047.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 507 update: preserved alpha cashier admin audit-event compatibility reads
now guard legacy audit identifiers without rewriting stored audit records.
`/api/v1/admin/cashier/alpha/audit-events` still accepts inherited filters and
leaves raw `subjectType`/`eventType` values intact for internal review, but
rendered audit rows redact unsafe identifiers such as `deposit_intent`,
`withdrawal_request`, and `alpha_cashier.*` alongside the already-redacted
audit payload strings.

The full gateway HTTP package passed at
`revival/artifacts/gateway_http_alpha_audit_identifier_boundary_20260701_073044.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260701_072910.md`,
`revival/artifacts/preservation_deletion_map_20260701_072920.md`,
`revival/artifacts/preservation_modification_map_20260701_072921.md`, and
`revival/artifacts/production_preservation_dossier_20260701_072935.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_073124.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 506 update: preserved alpha cashier user config compatibility reads now
guard legacy config values without rewriting the inherited config contract.
`/api/v1/cashier/alpha/config` renders a copied config payload, redacts unsafe
legacy string values such as `tokenSymbol: "USDC"`, and preserves inherited
compatibility field names and raw `svc.Config()` state for internal review.

The alpha cashier package passed at
`revival/artifacts/alpha_cashier_user_config_redaction_boundary_20260701_072126.log`,
and the full gateway HTTP package passed at
`revival/artifacts/gateway_http_after_alpha_config_boundary_20260701_072132.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260701_072126.md`,
`revival/artifacts/preservation_deletion_map_20260701_072137.md`,
`revival/artifacts/preservation_modification_map_20260701_072138.md`, and
`revival/artifacts/production_preservation_dossier_20260701_072152.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_072354.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 505 update: preserved alpha cashier admin preflight compatibility reads
now guard legacy operational status copy without rewriting the inherited
service report. `/api/v1/admin/cashier/alpha/preflight` renders a copied
launch-safe preflight report, redacts unsafe check messages, metadata string
values, and token/network fields, and leaves raw `svc.Preflight` output intact
for internal operations and preservation review. The shared alpha-cashier
unsafe-copy detector now also catches `cashier`.

The alpha cashier package passed at
`revival/artifacts/alpha_cashier_preflight_redaction_package_20260701_071142.log`,
and the full gateway HTTP package passed at
`revival/artifacts/gateway_http_alpha_preflight_boundary_20260701_071150.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260701_071555.md`,
`revival/artifacts/preservation_deletion_map_20260701_071605.md`,
`revival/artifacts/preservation_modification_map_20260701_071606.md`, and
`revival/artifacts/production_preservation_dossier_20260701_071620.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_071755.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 504 update: preserved alpha cashier user compatibility reads now guard
restored legacy free-text fields without rewriting the inherited route or data
contract. Deposit/release response rows are copied before rendering, unsafe
`failureReason` and `reviewNote` values are redacted, and legacy user-route
error messages now use launch-neutral point-route copy while preserving
compatibility field names such as `walletAddress`, `amountCents`, and `txHash`.
Raw repository values remain available for internal preservation review.

The alpha cashier package passed at
`revival/artifacts/alpha_cashier_user_redaction_boundary_20260701_070138.log`,
and the full gateway HTTP package passed at
`revival/artifacts/gateway_http_after_alpha_user_boundary_20260701_070147.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260701_070720.md`,
`revival/artifacts/preservation_deletion_map_20260701_070737.md`,
`revival/artifacts/preservation_modification_map_20260701_070738.md`, and
`revival/artifacts/production_preservation_dossier_20260701_070757.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_070800.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 503 update: preserved alpha cashier admin compatibility reads now guard
restored legacy free-text fields without rewriting the inherited route or data
contract. Deposit/release/audit response rows are copied before rendering,
unsafe `failureReason`, `reviewNote`, and audit payload string values are
redacted, and approve/reject `reviewNote` input is rejected before service
persistence when it uses launch-prohibited money wording. The raw repository
values remain available for internal preservation review.

The full gateway HTTP package passed at
`revival/artifacts/alpha_cashier_admin_redaction_boundary_20260701_065248.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260701_065309.md`,
`revival/artifacts/preservation_deletion_map_20260701_065325.md`,
`revival/artifacts/preservation_modification_map_20260701_065330.md`, and
`revival/artifacts/production_preservation_dossier_20260701_065351.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_065358.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 502 update: admin resolution-source health reads now protect the
`lastError` seam for legacy/future source adapters. The route copies
`feed.SourceHealth` snapshots and redacts unsafe stored adapter error text
before JSON rendering, while preserving source IDs, health counters,
timestamps, and raw reporter values for internal operations and preservation
review. The focused regression proves unsafe `lastError` text is redacted in
`/api/v1/admin/resolution-sources`, safe errors remain unchanged, and the raw
reporter snapshot is not mutated.

The full gateway HTTP package passed at
`revival/artifacts/resolution_source_health_redaction_boundary_20260701_063848.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260701_063912.md`,
`revival/artifacts/preservation_deletion_map_20260701_063931.md`,
`revival/artifacts/preservation_modification_map_20260701_063933.md`, and
`revival/artifacts/production_preservation_dossier_20260701_063947.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_063956.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 501 update: admin CMS page and banner reads now use the launch-safe CMS
payload boundary. Restored/imported unsafe page title/body/meta/block strings,
banner titles, and retired money-path links are redacted before admin list,
detail, create, or update responses render, while raw `content.Page` and
`content.Banner` values remain unchanged for internal review. Focused CMS tests
and the full gateway HTTP package passed at
`revival/artifacts/admin_content_read_redaction_boundary_20260701_062957.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_063021.md`,
`revival/artifacts/preservation_deletion_map_20260701_063037.md`,
`revival/artifacts/preservation_modification_map_20260701_063038.md`, and
`revival/artifacts/production_preservation_dossier_20260701_063053.md`. The RC
completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_063101.md`.
Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 500 update: admin lifecycle audit metadata now uses the same launch
copy boundary as lifecycle reasons before JSON and CSV export rendering.
Unsafe restored/imported metadata strings such as `cash payout lifecycle
metadata` or `crypto prize review` are redacted in responses, while raw
`prediction.LifecycleEvent.Metadata` remains unchanged for internal review and
compatibility. Focused lifecycle tests and the full gateway HTTP package
passed at
`revival/artifacts/lifecycle_audit_metadata_redaction_boundary_20260701_062418.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_062441.md`,
`revival/artifacts/preservation_deletion_map_20260701_062458.md`,
`revival/artifacts/preservation_modification_map_20260701_062459.md`, and
`revival/artifacts/production_preservation_dossier_20260701_062514.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_062522.md`.
Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 499 update: legacy loyalty ledger metadata now normalizes inherited
`bet` wording and then redacts any remaining unsafe metadata copy before public
or admin loyalty ledger responses render. This preserves stored
`LoyaltyLedgerEntry.Metadata` and source-id compatibility while preventing
restored/imported values such as `cash payout loyalty bonus` or `crypto prize
review` from leaking through the launch API. Focused proof is at
`revival/artifacts/loyalty_ledger_metadata_redaction_boundary_20260701_061557.log`;
the full gateway HTTP package also passed. Abuse and preservation gates passed
at `revival/artifacts/abuse_boundary_20260701_061618.md`,
`revival/artifacts/preservation_deletion_map_20260701_061630.md`,
`revival/artifacts/preservation_modification_map_20260701_061631.md`, and
`revival/artifacts/production_preservation_dossier_20260701_061644.md`. The RC
completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_061653.md`.
Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 498 update: leaderboard standing/event metadata now normalizes legacy
`bet` labels and then redacts any remaining unsafe metadata value before
rendering. This preserves stored leaderboard metadata and compatibility
normalization while preventing restored/imported metadata such as `cash payout`
or `crypto prize` notes from leaking through public or admin standings. Focused
proof is at
`revival/artifacts/leaderboard_metadata_redaction_boundary_20260701_061135.log`;
the full gateway HTTP package also passed. Abuse and preservation gates passed
at `revival/artifacts/abuse_boundary_20260701_061200.md`,
`revival/artifacts/preservation_deletion_map_20260701_061210.md`,
`revival/artifacts/preservation_modification_map_20260701_061211.md`, and
`revival/artifacts/production_preservation_dossier_20260701_061228.md`. The RC
completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_061309.md`.
Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 497 update: admin Predict loyalty account detail responses now redact
legacy unsafe stored ledger `metadata.reason` text before JSON rendering while
preserving the raw `PredictLedgerEntry.Reason` for internal review and audit
compatibility. The public loyalty ledger path already had this boundary; this
loop closes the matching office/admin detail seam without changing storage or
service behavior. Focused proof is at
`revival/artifacts/predict_loyalty_admin_ledger_reason_redaction_boundary_20260630_204050.log`;
the full gateway HTTP package also passed. Abuse and preservation gates passed
at `revival/artifacts/abuse_boundary_20260630_204129.md`,
`revival/artifacts/preservation_deletion_map_20260630_204140.md`,
`revival/artifacts/preservation_modification_map_20260630_204140.md`, and
`revival/artifacts/production_preservation_dossier_20260630_204154.md`. The RC
completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_204201.md`.
Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 495 update: admin lifecycle audit responses now guard legacy stored
reason copy before JSON and CSV export rendering. `lifecycleAuditEventResponses`
copies each event, redacts launch-prohibited `reason` text, and leaves the
stored audit row unchanged for internal review; safe reasons and CSV
formula-escaping behavior are preserved. The full gateway HTTP package passed
at
`revival/artifacts/lifecycle_audit_reason_redaction_boundary_20260630_222946.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_202957.md`,
`revival/artifacts/preservation_deletion_map_20260630_203007.md`,
`revival/artifacts/preservation_modification_map_20260630_203008.md`, and
`revival/artifacts/production_preservation_dossier_20260630_203021.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_203024.md`.
Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 494 update: player point-ledger presentation no longer carries the old
legacy settlement phrase as a direct maintained source literal, while
historical ledger descriptions/idempotency keys with that fingerprint still
classify as `Settlement points` and `Prediction settlement`. The focused
point-ledger test artifact is
`revival/artifacts/point_ledger_legacy_settlement_boundary_20260630_222304.log`.
The launch-facing app/office source scan for the phrase found no matches
outside test directories, abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_202314.md`,
`revival/artifacts/preservation_deletion_map_20260630_202325.md`,
`revival/artifacts/preservation_modification_map_20260630_202326.md`, and
`revival/artifacts/production_preservation_dossier_20260630_202340.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_202342.md`.
Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 483 update: user profile display-copy responses now guard another
launch-facing profile seam without changing session identity fields. Profile
GET responses redact unsafe derived `username` display copy while preserving
`user_id`, `email`, KYC status, and timestamps. Profile PUT still behaves as a
non-persistent echo, but the echo payload now copies and recursively redacts
unsafe string values in maps and arrays before serialization. Regressions prove
the response values are redacted and the raw profile/update inputs are not
mutated.

The full gateway HTTP package passed at
`revival/artifacts/user_profile_display_copy_redaction_boundary_20260630_212440.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_192454.md`,
`revival/artifacts/preservation_deletion_map_20260630_192455.md`,
`revival/artifacts/preservation_modification_map_20260630_192455.md`, and
`revival/artifacts/production_preservation_dossier_20260630_192455.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_192520.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 493 Audit Update

Gateway HTTP raw service-error echo cleanup now has maintained source-level
regression coverage. `TestGatewayHTTPHandlersDoNotEchoRawServiceErrors` scans
handler source files and rejects direct raw `err.Error()` serialization through
bad-request/status helpers, `stdhttp.Error`, or JSON `error` bodies while
allowing centralized redacting helper constructors. This keeps the response
boundary closed for future gateway HTTP edits.

The full gateway HTTP package passed at
`revival/artifacts/gateway_http_raw_error_echo_guard_20260630_201641.log`, and
the prediction package passed. Abuse and preservation evidence was refreshed
at `revival/artifacts/abuse_boundary_20260630_201652.md`,
`revival/artifacts/preservation_deletion_map_20260630_201701.md`,
`revival/artifacts/preservation_modification_map_20260630_201702.md`, and
`revival/artifacts/production_preservation_dossier_20260630_201715.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_201718.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 492 Audit Update

The preserved legacy transfer admin compatibility mapper now uses
launch-neutral response copy without changing its route or payload contracts.
`mapAlphaCashierAdminError` keeps its status mapping and field details, but
disabled-rail, disabled external-release, invalid-status, missing-request,
insufficient-point-account, reservation, and internal-failure messages no
longer serialize the old cashier/withdrawal/wallet wording. The regression
proves status preservation while rejecting those legacy words in mapped
messages.

The full gateway HTTP package passed at
`revival/artifacts/legacy_transfer_admin_error_copy_boundary_20260630_201255.log`,
and the prediction package passed. Abuse and preservation evidence was
refreshed at `revival/artifacts/abuse_boundary_20260630_201307.md`,
`revival/artifacts/preservation_deletion_map_20260630_201317.md`,
`revival/artifacts/preservation_modification_map_20260630_201318.md`, and
`revival/artifacts/production_preservation_dossier_20260630_201333.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_201336.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 491 Audit Update

Gateway HTTP status/error-body responses now redact another legacy-copy echo
class. RBAC conflict/not-found/forbidden/validation responses, CMS page/banner
not-found responses, bonus campaign/player-bonus not-found responses, and
bonus claim conflict/forbidden JSON error bodies redact launch-prohibited
wording before serialization. Bonus claim branching still uses the raw service
message to preserve existing status semantics, but the client-visible `error`
field is redacted.

The full gateway HTTP package passed at
`revival/artifacts/gateway_http_error_status_redaction_boundary_20260630_200750.log`,
and the prediction package passed. Abuse and preservation evidence was
refreshed at `revival/artifacts/abuse_boundary_20260630_200805.md`,
`revival/artifacts/preservation_deletion_map_20260630_200817.md`,
`revival/artifacts/preservation_modification_map_20260630_200818.md`, and
`revival/artifacts/production_preservation_dossier_20260630_200833.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_200837.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 490 Audit Update

Gateway HTTP service-error responses now have a broader redaction boundary
outside prediction market routes. Admin dispute resolution, KYC decisions,
predict-loyalty adjustments, CMS page/banner creation, partner webhook URL
validation, campaign lifecycle actions, bonus forfeits, and point-alias
campaign validation now redact launch-prohibited wording before returning
bad-request messages. Existing structured details such as `field` are
preserved. The gateway HTTP raw bad-request scan now finds only redacting
helper constructors rather than direct service-error echoes.

The full gateway HTTP package passed at
`revival/artifacts/gateway_http_service_error_redaction_boundary_20260630_200304.log`,
and the prediction package passed. Abuse and preservation evidence was
refreshed at `revival/artifacts/abuse_boundary_20260630_200326.md`,
`revival/artifacts/preservation_deletion_map_20260630_200338.md`,
`revival/artifacts/preservation_modification_map_20260630_200338.md`, and
`revival/artifacts/production_preservation_dossier_20260630_200354.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_200357.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 489 Audit Update

Admin prediction service errors now use the same launch-facing response
boundary as order placement and preview errors. Remaining admin market,
source, event, taxonomy, lifecycle, resolution, jurisdiction, void, and
settlement service `BadRequest` paths in `prediction_handlers.go` now pass
through `serviceBadRequestError`, redacting unsafe restored copy only before
serialization. The regression injects an unsafe create-market repository
error, verifies the HTTP envelope uses the redaction marker, verifies the
unsafe text is not echoed, and verifies no market is persisted.

The full gateway HTTP package passed at
`revival/artifacts/prediction_admin_service_error_redaction_boundary_20260630_195715.log`,
and the prediction package passed. Abuse and preservation evidence was
refreshed at `revival/artifacts/abuse_boundary_20260630_195736.md`,
`revival/artifacts/preservation_deletion_map_20260630_195748.md`,
`revival/artifacts/preservation_modification_map_20260630_195748.md`, and
`revival/artifacts/production_preservation_dossier_20260630_195803.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_195807.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 488 Audit Update

Order placement and preview errors now redact unsafe service-message copy at
the HTTP boundary. The prediction service may still produce detailed internal
errors that include restored market tickers, but `orderPlacementError` and the
preview bad-request path redact launch-prohibited wording before the message
is serialized. Existing prediction-limit and responsible-play reason-code
details are preserved, and safe generic order errors keep their old response
shape.

The full gateway HTTP package passed at
`revival/artifacts/order_service_error_redaction_boundary_20260630_194902.log`,
and the prediction package passed. Abuse and preservation evidence was
refreshed at `revival/artifacts/abuse_boundary_20260630_194918.md`,
`revival/artifacts/preservation_deletion_map_20260630_194931.md`,
`revival/artifacts/preservation_modification_map_20260630_194932.md`, and
`revival/artifacts/production_preservation_dossier_20260630_194948.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_194950.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 487 Audit Update

Admin prediction-risk snapshots now sanitize launch-facing aggregate rows on
read without changing the raw risk model. `/api/v1/admin/prediction/risk`
serializes a copied snapshot whose settlement-aging and concentration tickers
are redacted when they carry restored launch-prohibited copy, and
`/api/v1/admin/prediction/risk?format=csv` writes from the same sanitized copy
before formula-safe CSV encoding. The regression proves unsafe restored ticker
copy does not leak and the original `prediction.RiskSnapshot` remains
unchanged for operator review.

The full gateway HTTP package passed at
`revival/artifacts/admin_risk_snapshot_read_redaction_boundary_20260630_194511.log`,
and the prediction package passed. Abuse and preservation evidence was
refreshed at `revival/artifacts/abuse_boundary_20260630_194523.md`,
`revival/artifacts/preservation_deletion_map_20260630_194536.md`,
`revival/artifacts/preservation_modification_map_20260630_194537.md`, and
`revival/artifacts/production_preservation_dossier_20260630_194551.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_194554.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 486 Audit Update

Admin taxonomy and market-detail read paths now use sanitized response copies
instead of serializing restored raw copy directly. Admin category and series
list/create responses route through the taxonomy payload helpers, admin tag
reads redact unsafe restored tag values, and admin market detail/edit
responses serialize sanitized market copies. The regressions prove unsafe
restored series title/description/tag values and admin market detail copy do
not leak, while raw backing records remain available for operator review and
inherited-contract preservation.

The full gateway HTTP package passed at
`revival/artifacts/admin_taxonomy_detail_read_redaction_boundary_20260630_194115.log`,
and the prediction package passed. Abuse and preservation evidence was
refreshed at `revival/artifacts/abuse_boundary_20260630_194124.md`,
`revival/artifacts/preservation_deletion_map_20260630_194135.md`,
`revival/artifacts/preservation_modification_map_20260630_194136.md`, and
`revival/artifacts/production_preservation_dossier_20260630_194150.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_194153.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 485 Audit Update

Admin market list and export reads now use the same sanitized market-copy
boundary as public catalog reads. `/api/v1/admin/markets` JSON responses
serialize redacted market copies, and `/api/v1/admin/markets?format=csv`
redacts unsafe restored market copy before formula-safe CSV encoding. The
regression proves unsafe title, description, category, translation, settlement
source/rule/params, and fallback source copy do not leak through either JSON
or CSV while the backing market remains raw for operator review and inherited
contract preservation.

The full gateway HTTP package passed at
`revival/artifacts/admin_market_read_redaction_boundary_20260630_193733.log`,
and the prediction package passed. Abuse and preservation evidence was
refreshed at `revival/artifacts/abuse_boundary_20260630_193743.md`,
`revival/artifacts/preservation_deletion_map_20260630_193754.md`,
`revival/artifacts/preservation_modification_map_20260630_193755.md`, and
`revival/artifacts/production_preservation_dossier_20260630_193810.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_193813.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 484 Audit Update

Public prediction catalog reads now have the same response-only launch-copy
boundary as the recent social, loyalty, leaderboard, and profile surfaces.
Discovery, category, series, tag, event, and market responses serialize
sanitized copies of launch-facing display text; event payloads sanitize nested
markets, and market payloads sanitize nested translation/settlement JSON
strings. Category detail also rejects restored taxonomy rows whose slug is
safe but whose stored name/icon still carries launch-prohibited copy. The
regressions prove unsafe catalog copy is redacted while the raw
event/market/series structs remain unchanged for compatibility and
preservation review.

The full gateway HTTP package passed at
`revival/artifacts/prediction_public_catalog_redaction_boundary_20260630_193320.log`,
and the prediction package passed with the service taxonomy guard. Abuse and
preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_193350.md`,
`revival/artifacts/preservation_deletion_map_20260630_193401.md`,
`revival/artifacts/preservation_modification_map_20260630_193402.md`, and
`revival/artifacts/production_preservation_dossier_20260630_193416.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_193418.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 482 update: social profile display names now redact legacy unsafe display
copy without mutating raw profile structs. Public profile reads and follow
responses route `displayName` through the points-only safety boundary while
preserving the stable `userId` identifier and social counters. The regression
proves unsafe profile display copy is redacted, non-display fields are
preserved, and the original `publicUserProfile` value remains unchanged.

The full gateway HTTP package passed at
`revival/artifacts/social_profile_display_name_redaction_boundary_20260630_212058.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_192111.md`,
`revival/artifacts/preservation_deletion_map_20260630_192111.md`,
`revival/artifacts/preservation_modification_map_20260630_192111.md`, and
`revival/artifacts/production_preservation_dossier_20260630_192111.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_192135.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 481 update: Predict leaderboard entry display names now redact legacy
unsafe user-supplied copy without mutating raw leaderboard rows. Public
`/api/v1/leaderboards/{id}/entries`, `/api/v1/me/leaderboards`,
viewer-rank payloads, and admin leaderboard standings now route `displayName`
through the points-only launch boundary. The regressions prove unsafe public
and admin display names are redacted while the raw `leaderboards.PredictEntry`
values remain unchanged for review and ranking compatibility.

The full gateway HTTP package passed at
`revival/artifacts/leaderboard_entry_display_name_redaction_boundary_20260630_211646.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_191700.md`,
`revival/artifacts/preservation_deletion_map_20260630_191700.md`,
`revival/artifacts/preservation_modification_map_20260630_191700.md`, and
`revival/artifacts/production_preservation_dossier_20260630_191700.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_191726.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 480 update: bonus/campaign read payloads now redact legacy unsafe campaign
display copy without mutating inherited reward records. Player bonus responses
redact unsafe `campaignName` / `campaign_name` values derived from restored
metadata, and admin campaign responses redact unsafe `name` and `description`
fields before serialization. The regressions prove the unsafe response copy is
redacted while raw `PlayerBonus.Metadata` and `bonus.Campaign` values stay
unchanged for preservation review.

The full gateway HTTP package passed at
`revival/artifacts/campaign_read_redaction_boundary_20260630_211234.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_191248.md`,
`revival/artifacts/preservation_deletion_map_20260630_191248.md`,
`revival/artifacts/preservation_modification_map_20260630_191248.md`, and
`revival/artifacts/production_preservation_dossier_20260630_191248.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_191315.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 479 update: Predict-native admin leaderboard rows now redact legacy unsafe
display copy without mutating inherited/generated board definitions. The
office-facing admin row mapper preserves stable `leaderboardId`, `slug`,
`metricKey`, and `pointMetricKey` identifiers, but redacts unsafe restored
`name`, `description`, and `rewardSummary` values before serialization. The
regression constructs an unsafe `category:crypto` board definition directly and
proves the admin payload is redacted while the original struct still contains
the raw legacy copy for review.

The full gateway HTTP package passed at
`revival/artifacts/predict_leaderboard_admin_read_redaction_boundary_20260630_210807.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_190823.md`,
`revival/artifacts/preservation_deletion_map_20260630_190823.md`,
`revival/artifacts/preservation_modification_map_20260630_190823.md`, and
`revival/artifacts/production_preservation_dossier_20260630_190823.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_190906.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 474 update: admin social moderation report JSON and CSV reads now redact
legacy unsafe stored report copy without mutating moderation records.
`/api/v1/admin/social/reports` applies `adminSocialReportPayloads` before JSON
responses or `format=csv` export, redacting report `Reason`, `ReviewNote`, and
comment `Body` while preserving report identity, actors, status, timestamps,
and reviewer fields. A focused regression seeds a raw in-memory report/comment
with `cash payout`, `crypto payout`, and `cash prize` text, proves the raw
store remains available for review, and proves both JSON and CSV exports return
`Removed by points-only safety boundary.` The full gateway HTTP package passed
at `revival/artifacts/social_report_read_redaction_boundary_20260630_183535.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_183555.md`; preservation evidence
passed at
`revival/artifacts/preservation_deletion_map_20260630_183609.md`,
`revival/artifacts/preservation_modification_map_20260630_183611.md`, and
`revival/artifacts/production_preservation_dossier_20260630_183627.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_183640.md`.
Scenario 12 remains Partial until launch-owner/security residual-policy
acceptance or remediation and high-risk inherited-contract preservation review
are complete.

Loop 473 update: KYC status/document reads now redact legacy unsafe rejection
copy without mutating stored compliance records. `/api/v1/compliance/kyc/status`
serializes copied `RejectionReasons` through a local compliance launch-safety
helper, and `/api/v1/compliance/kyc/documents` redacts copied document
`RejectReason` values. A focused regression seeds fake stored KYC status and
document rows with `cash payout` / `crypto payout` text, proves the raw mock
store still contains those values for review, and proves the session-bound KYC
read responses return `Removed by points-only safety boundary.` The production
preservation dossier classifier now explicitly categorizes new untracked
gateway compliance helpers/tests as high-risk compliance behavior, keeping
this new file visible to preservation review. The full compliance and gateway
HTTP packages passed at
`revival/artifacts/kyc_read_redaction_boundary_20260630_182922.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_182948.md`; preservation evidence
passed at
`revival/artifacts/preservation_deletion_map_20260630_183002.md`,
`revival/artifacts/preservation_modification_map_20260630_183217.md`, and
`revival/artifacts/production_preservation_dossier_20260630_183237.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_183240.md`.
Scenario 12 remains Partial until launch-owner/security residual-policy
acceptance or remediation and high-risk inherited-contract preservation review
are complete.

Loop 472 update: admin punter note reads now redact legacy unsafe stored
category/content text without mutating `user_notes`. The account-review notes
route now serializes through `adminPunterNotePayloads` for both GET and
post-create responses, preserving note IDs, punter IDs, author IDs, timestamps,
and raw repository values while replacing unsafe legacy text with
`Removed by points-only safety boundary.` A focused regression seeds a fake
stored note with `cash payout` / `crypto payout` text, proves the raw repo note
is unchanged for review, and proves the admin response returns redacted
category/content values. The full gateway HTTP package passed at
`revival/artifacts/admin_note_read_redaction_boundary_20260630_182445.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_182506.md`; preservation evidence
passed at
`revival/artifacts/preservation_deletion_map_20260630_182519.md`,
`revival/artifacts/preservation_modification_map_20260630_182521.md`, and
`revival/artifacts/production_preservation_dossier_20260630_182538.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_182547.md`.
Scenario 12 remains Partial until launch-owner/security residual-policy
acceptance or remediation and high-risk inherited-contract preservation review
are complete.

Loop 471 update: SQL-backed admin audit-log read payloads now redact legacy
unsafe stored details without mutating `audit_logs`. The admin audit endpoint
sanitizes the copied DB rows before merging them with provider-ops audit rows:
JSON details are recursively sanitized for string values, non-JSON details are
redacted before JSON encoding, and safe operational values such as idempotency
keys are preserved. A route-level regression seeds a fake DB audit row with
`cash payout` / `crypto payout` detail text, proves the raw repo value remains
unchanged for review, and proves `/api/v1/admin/audit-logs` returns the
redacted response value. The full gateway HTTP package passed at
`revival/artifacts/admin_audit_read_redaction_boundary_20260630_182026.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_182046.md`; preservation evidence
passed at
`revival/artifacts/preservation_deletion_map_20260630_182106.md`,
`revival/artifacts/preservation_modification_map_20260630_182107.md`, and
`revival/artifacts/production_preservation_dossier_20260630_182123.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_182147.md`.
Scenario 12 remains Partial until launch-owner/security residual-policy
acceptance or remediation and high-risk inherited-contract preservation review
are complete.

Loop 470 update: provider-ops audit read payloads now redact legacy unsafe
details without mutating the inherited audit store. The admin audit-log merge
continues to expose provider-ops wallet/operator activity in the shared
`AdminAuditLog` shape, but `Details` now runs through a read-side redaction
boundary: JSON details are recursively sanitized for string values, non-JSON
details are redacted before JSON encoding, and safe operational values such as
idempotency keys are preserved. A focused regression records an imported-style
`cash payout` / `crypto payout` detail directly, proves the raw snapshot still
contains the original values for review, and proves the admin audit-log read
replaces unsafe strings with `Removed by points-only safety boundary.` The full
gateway HTTP package passed at
`revival/artifacts/provider_ops_audit_read_redaction_boundary_20260630_181602.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_181634.md`; preservation evidence
passed at
`revival/artifacts/preservation_deletion_map_20260630_181655.md`,
`revival/artifacts/preservation_modification_map_20260630_181701.md`, and
`revival/artifacts/production_preservation_dossier_20260630_181720.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_181729.md`.
Scenario 12 remains Partial until launch-owner/security residual-policy
acceptance or remediation and high-risk inherited-contract preservation review
are complete.

Loop 469 update: settlement record payloads now redact legacy unsafe override
reason text on read. `settlementRecordPayload` copies any stored
`OverrideReason` pointer and routes only the response value through the shared
points-only launch-boundary helper before serializing direct settlement,
proposed-resolution finalization, and any settlement operation payload that
embeds the settlement record. Raw settlement rows, result metadata, total
settlement point amounts, and `PTS` units remain intact. A focused regression
covers an imported-style `cash payout override` reason and proves point totals
are preserved. The full gateway HTTP package passed at
`revival/artifacts/settlement_override_read_redaction_boundary_20260630_180823.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_180836.md`; preservation evidence
passed at
`revival/artifacts/preservation_deletion_map_20260630_180837.md`,
`revival/artifacts/preservation_modification_map_20260630_180837.md`, and
`revival/artifacts/production_preservation_dossier_20260630_180904.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_180904.md`.
Scenario 12 remains Partial until launch-owner/security residual-policy
acceptance or remediation and high-risk inherited-contract preservation review
are complete.

Loop 468 update: dispute read payloads now redact legacy unsafe stored reason
and resolution-note text. `disputePayload` routes holder dispute `Reason` and
admin `ResolutionNote` values through the shared points-only launch-boundary
helper before serializing user dispute history, newly filed disputes, admin
dispute queues, and dispute resolution responses. Raw dispute storage,
lifecycle state, bond point amounts, and `PTS` response units remain intact. A
focused regression covers imported-style `cash payout` and `crypto payout`
dispute text while proving bond points are preserved. The full gateway HTTP
package passed at
`revival/artifacts/dispute_read_redaction_boundary_20260630_180416.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_180430.md`; preservation evidence
passed at
`revival/artifacts/preservation_deletion_map_20260630_180430.md`,
`revival/artifacts/preservation_modification_map_20260630_180430.md`, and
`revival/artifacts/production_preservation_dossier_20260630_180455.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_180455.md`.
Scenario 12 remains Partial until launch-owner/security residual-policy
acceptance or remediation and high-risk inherited-contract preservation review
are complete.

Loop 467 update: wallet ledger read payloads now redact legacy unsafe reason
text. `walletLedgerEntryPayload` routes stored wallet `Reason` through the
shared points-only launch-boundary helper before serializing
`/api/v1/wallet/{userId}/ledger`, admin wallet mutation responses, and admin
account-review ledger payloads. Raw wallet ledger rows and inherited
idempotency/accounting behavior are unchanged. A focused regression covers an
imported-style `cash deposit payout adjustment` reason and proves stable point
fields remain intact. The full gateway HTTP package passed at
`revival/artifacts/wallet_ledger_read_redaction_boundary_20260630_175618.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_175618.md`; preservation evidence
passed at
`revival/artifacts/preservation_deletion_map_20260630_175646.md`,
`revival/artifacts/preservation_modification_map_20260630_175618.md`, and
`revival/artifacts/production_preservation_dossier_20260630_175646.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_175744.md`.
Scenario 12 remains Partial until launch-owner/security residual-policy
acceptance or remediation and high-risk inherited-contract preservation review
are complete.

Loop 466 update: private Predict loyalty standing/ledger reads now redact
legacy unsafe rank display and ledger reason text. `/api/v1/loyalty`,
`/api/v1/loyalty/standing`, and `/api/v1/loyalty/ledger` route `rankName`,
`nextRankName`, and ledger `reason` through the shared points-only redaction
helper before serialization, while raw loyalty/account storage remains
unchanged for admin review and idempotency. Focused regressions cover unsafe
cash/crypto rank names and an unsafe cash-payout ledger reason, and the full
gateway HTTP package passed at
`revival/artifacts/loyalty_read_redaction_boundary_20260630_175145.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_175145.md`; preservation evidence
passed at
`revival/artifacts/preservation_deletion_map_20260630_175118.md`,
`revival/artifacts/preservation_modification_map_20260630_175118.md`, and
`revival/artifacts/production_preservation_dossier_20260630_175145.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_175313.md`.
Scenario 12 remains Partial until launch-owner/security residual-policy
acceptance or remediation and high-risk inherited-contract preservation review
are complete.

Loop 465 update: public loyalty tier payloads now redact legacy unsafe tier
display/benefit text on read. Both Predict-native `/api/v1/loyalty/tiers` and
the older loyalty tier payload builder route `rankName` and benefit strings
through the shared points-only redaction helper, so imported tier config such
as cash-prize or crypto-payout benefits cannot leak to public reward surfaces.
Admin storage/review behavior is unchanged. Focused regressions cover unsafe
rank names, safe benefits that remain intact, and unsafe benefit strings that
are replaced with `Removed by points-only safety boundary.` The full gateway
HTTP package passed at
`revival/artifacts/loyalty_tier_public_redaction_boundary_20260630_174442.log`.
Preservation gates passed at
`revival/artifacts/preservation_modification_map_20260630_174458.md` and
`revival/artifacts/production_preservation_dossier_20260630_174458.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_174524.md`.

Loop 464 update: Predict-native public leaderboard cards now protect against
legacy unsafe category copy. Public `/api/v1/leaderboards` responses redact
unsafe board display strings (`name`, `description`, `rewardSummary`) and skip
generated category boards whose public identifier/slug contains prohibited
money or crypto wording, so imported legacy categories cannot expose
`category:crypto` or cash-prize text. Admin/recompute internals remain
unchanged for review. The focused regression covers a safe `pageants` slug with
unsafe display copy plus an unsafe `crypto` slug, and the full gateway HTTP
package passed at
`revival/artifacts/leaderboard_public_redaction_boundary_20260630_174039.log`.
Preservation gates passed at
`revival/artifacts/preservation_modification_map_20260630_174053.md` and
`revival/artifacts/production_preservation_dossier_20260630_174053.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_174113.md`.

Loop 463 update: the shared points-only redaction helper now lives in the
launch-boundary utility instead of the social handler file. CMS and social
public read paths use the same `redactLaunchProhibitedUserText` behavior, and a
focused regression covers money wording, redeemable wording, allowed
`non-redeemable` disclosure copy, and safe points-only copy. This keeps the
last read-side hardening reusable without tying CMS safety to the social route
implementation. The full gateway HTTP package passed at
`revival/artifacts/shared_redaction_boundary_20260630_173603.log`.
Preservation gates passed at
`revival/artifacts/preservation_modification_map_20260630_173616.md` and
`revival/artifacts/production_preservation_dossier_20260630_173616.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_173637.md`.

Loop 462 update: legacy unsafe CMS content is now redacted on public read
paths. Admin content/page/banner writes already reject unsafe launch wording
before persistence; this loop adds public delivery protection for older or
imported CMS rows by sanitizing `/api/v1/content/{slug}` page title/content,
meta fields, nested JSON block strings, and `/api/v1/banners` title/link
fields before response serialization. Raw admin records remain reviewable. The
regression proves redaction does not mutate the original raw page/banner values
and preserves safe nested block text. The full gateway HTTP package passed at
`revival/artifacts/content_public_redaction_boundary_20260630_173148.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_173213.md`; preservation gates passed
at `revival/artifacts/preservation_modification_map_20260630_173237.md` and
`revival/artifacts/production_preservation_dossier_20260630_173237.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_173258.md`.

Loop 461 update: legacy unsafe social text is redacted on public read paths.
The social store can still retain raw comment/report text for moderation, but
public comment lists, created/updated comment responses, user activity, global
activity, and admin social activity exports now run comment/activity bodies
through the points-only launch boundary. A regression seeds a legacy
`cash payout` comment directly into the store, proves storage keeps the raw
moderation text, and verifies `/api/v1/social/markets/.../comments`,
`/api/v1/social/activity`, and `/api/v1/social/users/.../activity` return only
`Removed by points-only safety boundary.` The full gateway HTTP package passed
at `revival/artifacts/social_read_redaction_boundary_20260630_172426.log`.
Preservation gates passed at
`revival/artifacts/preservation_modification_map_20260630_172426.md` and
`revival/artifacts/production_preservation_dossier_20260630_172426.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_172426.md`.

Loop 460 update: public/user activity reward rows no longer echo raw stored
loyalty ledger reasons. The SQL-backed social activity feed still includes
`loyalty_ledger` rows, but reward bodies now render generic point-safe text
(`Earned N reward points` or `Reward adjustment N points`) instead of appending
the stored `reason`, preventing legacy/imported reason values from resurfacing
on `/activity` or public profiles. The focused Go regression and full gateway
HTTP package passed at
`revival/artifacts/activity_reason_boundary_20260630_171939.log`, and the
player app regression suite passed at
`revival/artifacts/activity_reason_frontend_regression_20260630_171954.log`.
Preservation gates passed at
`revival/artifacts/preservation_modification_map_20260630_172020.md` and
`revival/artifacts/production_preservation_dossier_20260630_172020.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_172020.md`.

Loop 459 update: user-generated public/moderation text now has the same
launch-copy boundary as admin reason fields. Dispute filing rejects unsafe
`reason` text before market lookup or dispute creation; market comment creation
rejects unsafe public `body` text before rate-limit/store work; and social
comment reporting rejects unsafe `reason` text before report persistence. New
focused tests prove unsafe values are not echoed and do not persist comments,
reports, or dispute state, while the full gateway HTTP package passed at
`revival/artifacts/user_generated_copy_boundary_20260630_171545.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_171606.md`; preservation gates passed
at `revival/artifacts/preservation_modification_map_20260630_171606.md` and
`revival/artifacts/production_preservation_dossier_20260630_171606.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_171606.md`.

Loop 458 update: the resolved JVM residuals now have an explicit drift policy,
but this is not launch acceptance. Added
`revival/jvm_resolved_residual_allowlist.json` with the exact 8 retained
resolved coordinates and 28 OSV ids from
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_170146.md`.
Each entry records why the narrow remediation trial was rejected and is marked
pending launch-owner sign-off. `make security-jvm-resolved-residual-advisories`
now passes at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_171007.md`,
proving there are no unreviewed resolved JVM residuals beyond the policy.
Preservation gates were refreshed at
`revival/artifacts/preservation_modification_map_20260630_171018.md` and
`revival/artifacts/production_preservation_dossier_20260630_171019.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_171019.md`. Scenario 12
remains Partial because the residual policy still needs launch-owner/security
acceptance or remediation, and the broad inherited production-contract
preservation review is still required.

Loop 457 update: SnakeYAML remediation was trialed and rejected to preserve
direct residual governance. SnakeYAML `2.6` still fails strict SBT resolution
because Coursier fetches a missing `snakeyaml-2.6-android.jar`; SnakeYAML
`1.33` compiled and reduced unique resolved JVM OSV ids from 28 to 22, but it
still had `GHSA-mjmj-j48q-9wg2` and failed the direct residual gate, so it was
rolled back. A focused `/docs/docs.yaml` OpenAPI YAML regression was retained
in `DevRoutesSpec` and passed after rollback at
`revival/artifacts/openapi_yaml_regression_20260630_170100.log`. Fresh
retained-state evidence points at
`revival/artifacts/backend_compile_20260630_170100.log`,
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_170135.md`,
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_170137.md`,
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_170146.md`, and
the expected failing
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_170155.md`.

Loop 456 update: SFTP/SSHJ dependency hardening is retained with runtime
evidence, while an unsafe Akka Streams Kafka adapter bump was rejected. SSHJ now
resolves to `0.40.0`, removing the prior EdDSA residual from the Alpakka FTP
path; `revival/artifacts/sftp_dependency_compat_20260630_162558.log` passed 3
suites and 4 tests against a Testcontainers SFTP server. Testcontainers was
updated to `1.21.4` and the integration harness now uses `getHost` so Docker
Desktop verification works. `akka-stream-kafka` was rolled back to `3.0.0`
because the `4.0.2` trial pulled Akka `2.7.0` artifacts into the inherited
Akka `2.6.19` runtime and caused ActorSystem startup failure. Fresh retained
evidence now points at
`revival/artifacts/backend_compile_20260630_165054.log`,
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_164958.md`,
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_165026.md`,
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_165053.md`, and
the expected failing
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_165054.md`.
Preservation evidence was refreshed through modification, deletion,
contract-anchor, and production-dossier gates. The RC audit still fails
correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_165306.md`.

Loop 455 update: Keycloak `25.0.3` was trialed and rejected to preserve the
inherited auth/session contract. The trial reduced direct JVM advisory ids from
12 to 5, but the resolved classpath worsened from 8 to 11 coordinates with
findings by adding Keycloak `server-spi-private` and BouncyCastle `jdk18on`
residuals, and backend compile failed because the inherited
`CustomKeycloakDeploymentBuilder` depends on adapter APIs that moved or changed
on the newer Keycloak line. The code was rolled back to Keycloak `17.0.1`, and
fresh retained-state evidence now points at
`revival/artifacts/backend_compile_20260630_161305.log`,
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_161305.md`,
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_161915.md`,
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_162001.md`, and
the expected failing
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_162009.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_162324.md`.

Loop 454 update: the Kafka/LZ4 resolved JVM residuals were removed through a
narrow dependency override while preserving the direct residual gate. Backend
Kafka clients now resolve to `4.3.1`, which replaces the old
`org.lz4:lz4-java@1.8.0` line with `at.yawk.lz4:lz4-java@1.10.2`. Backend
compile passed at `revival/artifacts/backend_compile_20260630_153800.log`; the
resolved JVM baseline now reports 238 resolved coordinates, with 8 coordinates
and 28 OSV ids at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_153740.md`.
Direct JVM evidence remains governed at
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_153927.md` and
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_153957.md`; the
resolved residual gate still fails correctly at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_154009.md`.
SBOM and preservation evidence were refreshed at
`revival/artifacts/sbom_20260630_174009/`,
`revival/artifacts/preservation_modification_map_20260630_155758.md`, and
`revival/artifacts/production_preservation_dossier_20260630_155758.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_155758.md`.

Loop 453 update: the Logback residual was reduced after the Scala toolchain
remediation made the upgrade compile-safe. Backend logging now uses Logback
`1.5.37`, `logstash-logback-encoder` `8.1`, and SLF4J `2.0.17`; backend compile
passed at `revival/artifacts/backend_compile_20260630_141620.log`, direct JVM
residual governance still passes, and the resolved JVM baseline now reports 238
resolved coordinates, with 10 coordinates and 34 OSV ids at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_143322.md`.
SBOM and preservation evidence were refreshed at
`revival/artifacts/sbom_20260630_163402/`,
`revival/artifacts/preservation_modification_map_20260630_143402.md`, and
`revival/artifacts/production_preservation_dossier_20260630_143430.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_143430.md` because the
Logback coordinate is remediated but 10 other resolved coordinates remain
unremediated and unaccepted by reviewed residual policy.

Loop 451 update: Java 17/SBT executable evidence was restored after the
Logback/SLF4J trial was rejected. The trial moved Logback to `1.3.16` and SLF4J
to `2.0.17`, reducing unique resolved JVM OSV ids from 39 to 36, but it was not
kept because a targeted Logback configuration test crashed Scala 2.13.8
compilation while importing Logback classic metadata. The workspace is back on
Logback `1.2.13` and SLF4J `1.7.36`; `make security-jvm-required`,
`make security-jvm-osv-resolved-classpath`, `make security-jvm-osv-direct`,
`make security-jvm-direct-residual-advisories`, and backend compile pass with
fresh artifacts, while `make security-jvm-resolved-residual-advisories` still
fails correctly on 12 resolved coordinates with 39 OSV ids. Scenario 12 remains
Partial because the resolved residual gate still blocks RC until remediation or
reviewed residual policy entries exist.

Loop 452 update: the Scala resolved JVM residual is remediated. Backend Scala
now uses `2.13.16` with `sbt-scalafix` `0.14.3`; the obsolete newer-line
`scalafix-rules` custom-rule dependency was removed; and stricter compiler
warnings were fixed directly instead of weakening `-Xfatal-warnings`. Backend
compile passed at `revival/artifacts/backend_compile_20260630_135908.log`, the
resolved JVM baseline now reports 238 resolved coordinates with 11 coordinates
and 38 OSV ids at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_135649.md`,
direct residual governance still passes, SBOM and preservation evidence were
refreshed, and the RC audit still fails correctly with Scenario 12 Partial.
Scenario 12 remains Partial because 11 resolved JVM residual coordinates remain
unremediated and unaccepted by reviewed residual policy.

# TapTrade Prototype Audit

## Summary

The current prototype is a migrated TapTrade/TapTrade prediction platform with a Next.js user app, a Next.js backoffice app, and a Go gateway. It already contains substantial real prediction-market infrastructure: categories, events, markets, orders, order-book and AMM execution modes, positions, trades, settlement records, payouts, lifecycle audit events, wallet ledger entries, loyalty points, leaderboards, admin market tooling, and seed/demo scripts.

The prototype is not yet TapTrade launch-ready. The safety slices removed the user-facing cashier route, old cashier components, direct insufficient-balance cashier link, user-app cashier/crypto clients, broad launch-source route links, office cashier route/menu/container/admin-payment actions, the old office manual funds transaction modal, and many money-style displays from the launch apps. The gateway now omits legacy cashier/payment/crypto routes by default behind an explicit `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED` opt-in that deployed environments reject, Loop 137 pins those legacy paths out of the default public/CSRF bypass lists, and launch market creation now rejects asset-price settlement sources/rules plus launch-prohibited copy before persistence while default feed registration omits the legacy asset-price adapter unless explicitly enabled. Daily claim, configured point packs, daily check-in, first-prediction, three-predictions, five-predictions, ten-predictions, settled-result, three-settled-results, five-settled-results, ten-settled-results, weekly check-in, monthly check-in, seasonal check-in, quarterly check-in, and leaderboard debut missions, 3-day, 7-day, 14-day, 30-day, 60-day, and 90-day check-in streaks, non-redeemable ledger- and leaderboard-derived badges including leaderboard-debut, prediction-regular, prediction-veteran, prediction-expert, streak-champion, monthly-streak, double-monthly-streak, quarterly-streak, monthly-check-in, seasonal-check-in, quarterly-check-in, settlement-regular, settlement-veteran, and settlement-expert status, a ledger-backed daily reward grant cap, optional device/IP reward cluster caps backed by hashed wallet-service cluster evidence, and an admin-only hashed reward-cluster review/export endpoint plus office page now exist as real rewards-page/API/admin surfaces, and wallet reward payloads now expose point-native aliases with `PTS` units without retired reward response aliases. Loyalty standing and tier payloads now expose point-native XP/rank aliases with `PTS` units without retired tier/threshold response aliases. Market social now exists as prediction-native comments/replies/reactions/reports, public profiles, follows, activity feed, office report moderation, per-user/action social write rate limits, and optional per-client-IP/action social write rate limits for comments/reactions/reports/follows, with Loop 116 live browser/API/SQL proof. Admin lifecycle now has a strict launch-facing mapping from legacy engine states to TapTrade stages/actions, a per-market lifecycle audit endpoint/modal with CSV export, a real admin market edit API, an office Edit Market modal wired to that API, and Loop 119 live API proof for create/edit/open/pause/resume/close/settle/cancel/replay/audit/export; office market/settlement/dispute/risk/leaderboard/loyalty surfaces render mapped labels, point-denominated operation/exposure/void copy, `PTS` leaderboard units, non-redeemable reward summaries, and prediction-settlement loyalty copy. Leaderboard API responses now expose point-native `unit`, `rewardSummary`, and `pointMetricKey` fields without retired `currency` or `prizeSummary` response aliases, and demo seed mode now recomputes Predict leaderboard snapshots immediately after seeded settlements so demo `leaderboard_snapshots` do not depend on a later server tick. Full demo seed mode now runs on a fresh migrated gateway DB before `wallet_ledger` exists, reruns cleanly after demo ledger rows exist, and visible seed summaries use `pts` instead of dollar-style output. Loyalty admin rule and ledger responses now expose `predictionSourceType`, `predictionSourceId`, `minQualifiedPointsCents`, `eligiblePredictionTypes`, and sanitized point metadata aliases while preserving temporary compatibility fields. The risk API now exposes point-native `pointAccounting` and concentration fields for the office risk page and CSV export while preserving old money/liability field names only as temporary compatibility aliases. Portfolio summary and history APIs now expose point-native `totalValuePointsCents`, `portfolioValuePointsCents`, `investedPointsCents`, `unrealizedPointsCents`, `realizedPointsCents`, `settlementPointsCents`, and `PTS` aliases while shared clients normalize from those aliases. Office user detail and admin account-review APIs now expose point-ledger inspection, point-account summaries, `pointAccountBalanceCents`, `realizedPointsCents`, `settlementPointsCents`, `amountPointsCents`, `balancePointsCents`, and `PTS` aliases while keeping older compatibility fields non-preferred. Live gateway/auth/browser proof now shows disclosure-backed registration, login, session acceptance fields, idempotent starter grant, redirect to seeded market discovery, top-bar starter balance, and visible point-ledger rendering for the initial PTS credit. The remaining product-boundary blockers are internal legacy naming and service contracts: wallet/cents/payment terminology remains below the launch UI. Several parity surfaces are partial: dual-admin resolution variants, rewards bonus/broader abuse proof, account-graph/multi-node abuse proof, and live no-money-path safety proof remain incomplete.

Loop 347 update: the live no-money boundary wrapper now supports explicit surface skips for partial runtime evidence, and `local-stack.sh` can start a selected service set without requiring unavailable `sbt` when the backend is not requested. A foreground gateway run with `GATEWAY_AUTH_ENABLED=false` produced gateway-only live route evidence through `make qa-live-no-money-boundary`: `/api/v1/status` reported non-redeemable point mode, disabled legacy money routes, required launch domains present, and prohibited money domains absent; all 21 inherited cashier, admin-cashier, payment, withdrawal, webhook, and crypto-payment probes returned 404. The report is saved at `revival/32_LIVE_NO_MONEY_BOUNDARY.md` with timestamped artifact `revival/artifacts/live_no_money_boundary_20260628_141156.md`. Scenario 12 remains Partial because this is gateway-only live evidence; player, office, full-stack settlement/reward/admin, account-graph abuse, and fully deployed-like authenticated canonical proof remain incomplete.

Loop 348 update: the live no-money boundary proof now covers the running player, office, and gateway surfaces together again. With player on `3022`, office on `3020`, and gateway on `18180`, `make qa-live-no-money-boundary` passed with 70 checks and 0 failures. The player rendered `/`, `/predict`, `/rewards`, and `/leaderboards` below 500 and returned 404 for cashier, cashout, crypto, deposit, fiat, payment, prize, redeem, redemption, and withdrawal routes. The office rendered `/` and `/auth/login` below 500 and returned 404 for the same retired money routes. The gateway reported non-redeemable point mode, disabled legacy money routes, required launch domains present, prohibited money domains absent, and 404 for all inherited cashier/payment/crypto endpoints. The report is saved at `revival/32_LIVE_NO_MONEY_BOUNDARY.md` with timestamped artifact `revival/artifacts/live_no_money_boundary_20260628_141848.md`. Scenario 12 remains Partial because this evidence proves route absence, not the fully authenticated canonical journey, broader backend terminology cleanup, or account-graph/multi-node abuse proof.

Loop 349 update: the deletion-preservation gate now writes a reviewer-facing preservation map instead of only printing classified deletion counts. `make qa-preservation-deletions` passed with 54 classified deleted artifacts, zero unclassified deletions, and wrote `revival/33_PRESERVATION_DELETION_MAP.md` plus timestamped artifact `revival/artifacts/preservation_deletion_map_20260628_163229.md`. The map lists every deleted path and its preservation decision, separating launch-prohibited public money surfaces from point-native proof replacements, relocated tests, and duplicate seed cleanup. Scenario 12 remains Partial because this improves auditability of the current large diff, but it does not prove the authenticated canonical journey, backend terminology cleanup, or abuse-control completeness.

Loop 350 update: reward and social abuse controls now have a maintained QA gate. `make qa-abuse-boundary` passed and wrote `revival/34_ABUSE_BOUNDARY_PROOF.md` plus timestamped artifact `revival/artifacts/abuse_boundary_20260628_163608.md`. The gate proves persistent reward-cluster migration ownership, same-device daily-claim blocking for a second account, route-restart persistence of hashed cluster evidence, admin hashed review/export without raw device IDs, same-IP point-pack blocking, same-user social comment burst throttling, and same-IP multi-account throttles for comments, reports, reactions, and follows. The pre-commit launch hook now runs this gate. Scenario 12 remains Partial because this is focused maintained abuse evidence, not the fully deployed-like authenticated canonical journey or backend terminology cleanup.

Loop 351 update: the Playwright prediction critical-path API spec now follows launch contracts instead of inherited money contracts. Registration uses terms and no-cashout disclosure acceptance, portfolio assertions require point-native accounting fields and reject retired P&L aliases, no-money route checks assert disabled payment/crypto/cashier paths, and the new-user starter-grant test now places a real point-native order and checks the wallet ledger for both starter-grant and prediction-fill evidence with `PTS` fields. A live DB-backed run against auth `18081`, gateway `18180`, player proxy `3022`, and a disposable migrated/seeded Postgres database passed with 7/7 tests. The proof is recorded in `revival/35_CRITICAL_API_JOURNEY.md` and `revival/artifacts/critical_api_journey_20260628_165417.md`. Scenario 12 remains Partial because this API proof does not yet cover the full browser journey, buy NO or sell/close, social comment/share/follow, reward progression/claim, leaderboard appearance, admin close/resolve/settlement in the same deployed-like run, or remaining backend terminology cleanup.

Loop 354 update: public contract anchor preservation now has a maintained gate. `make qa-preservation-contract-anchors` compares the current worktree against `HEAD` for gateway OpenAPI paths, gateway handler route strings, and `PredictionApiClient` async method names. The live run passed with OpenAPI paths growing from 18 to 116, gateway handler route strings staying at 9 with no removals, and prediction client methods growing from 26 to 38, all with 0 unexpected inherited anchor removals. The report is saved at `revival/38_PRESERVATION_CONTRACT_ANCHORS.md` with timestamped artifact `revival/artifacts/preservation_contract_anchors_20260628_180402.md`. Scenario 12 remains Partial because this reduces accidental production-contract rewrite risk but does not complete full browser journey, same-run admin settlement, backend terminology cleanup, complete preservation review, or broader abuse evidence.

Loop 355 update: the DB-backed Playwright critical-path API proof now covers same-run admin close and settlement. Against a fresh migrated/seeded Postgres container, auth on `18081`, gateway on `18180`, and player proxy on `3022`, the suite passed 8/8. The new test registers a fresh user, claims starter points, buys YES, has admin close and resolve the market YES, verifies point-native settlement disbursement and lifecycle audit, then logs back in as the user to verify a `prediction_payout:{marketId}:...` ledger credit and matching portfolio-history settlement row. The proof is saved at `revival/39_ADMIN_SETTLEMENT_API_JOURNEY.md` with timestamped artifact `revival/artifacts/admin_settlement_api_journey_20260628_181350.md`. Scenarios 7, 10, 11, and 12 remain Partial because office-browser admin variants, dual-admin variants, full browser journey, new-user leaderboard appearance, backend terminology cleanup, complete preservation review, and broader abuse evidence remain incomplete.

Loop 356 update: the same critical-path API proof now verifies fresh-user leaderboard appearance after settlement. The existing admin leaderboard recompute route is no longer acknowledgement-only; it calls a synchronous point-native snapshot refresh and returns per-board row counts. Against a fresh migrated/seeded Postgres container, auth on `18081`, gateway on `18180`, and player proxy on `3022`, the suite passed 8/8. The admin settlement test now recomputes `pnl_weekly`, verifies `/api/v1/me/leaderboards` contains the settled user's weekly standing, and verifies public weekly entries include the user row. The proof is saved at `revival/40_LEADERBOARD_APPEARANCE_API_JOURNEY.md` with timestamped artifact `revival/artifacts/leaderboard_appearance_api_journey_20260628_202428.md`. Scenarios 9, 10, 11, and 12 remain Partial because full browser journey, office-browser admin variants, dual-admin variants, backend terminology cleanup, complete preservation review, and broader abuse evidence remain incomplete.

Loop 112 update: a fresh migrated/seeded browser stack with market sync disabled now proves admin close plus settlement-to-ledger for a session user on `MLBB-FINAL-G1`: a 39 YES position resolved YES, credited a 39.00 pt settlement row, zeroed the position, lifted visible balance to `5014.04 pts`, rendered portfolio history with `+14.04 pts` realized P&L and `+39.00 pts` settlement points, and rendered `/account/transactions` with `Settlement points`, `+39 pts`, and `Prediction settlement`. The proof also fixed portfolio history to use settlement credits rather than loyalty accruals, changed settlement notification copy from `100c/contract` style wording to point/share wording, and kept imported unsafe `IMP-*` markets out of the local launch proof. Trading/portfolio/admin lifecycle remain Partial because insufficient-points browser rejection, broader admin/dispute flows, backend terminology cleanup, and live no-money-path safety proof remain incomplete.

Loop 113 update: a fresh migrated/seeded browser stack with market sync disabled now proves a live insufficient-points path without cashier or money-route escape. A clean session user with `5000.00 pts` opened `MLBB-FINAL-G1` at `amount=6000.00`, selected Limit, and the trade ticket rendered a disabled `Not enough points` CTA plus an alert that available points were below the order. SQL for that clean user stayed at one starter-grant ledger row, balance `500000`, zero prediction orders, and zero wallet reservations. The proof also fixed the client-side limit-order balance guard exposed by an earlier rejected submit.

Loop 114 update: a fresh migrated/seeded browser stack with market sync disabled now proves the full market-discovery slice. `/predict` rendered seeded MLBB, Valorant, and Dota open markets with category, volume, liquidity, close-date, price/probability, and watchlist controls; search narrowed to Valorant; sort controls and API responses covered activity, closing-soon, and newest ordering; close-window API proof returned only `MLBB-FINAL-G1` for the one-month window; the `esports` tag returned all three open esports markets; `/series/mlbb-esports-series` rendered backend series metadata and the same open-market set; an authenticated user added `MLBB-FINAL-G1`, saw `Watching`, and the watchlist filter rendered only that market; `/discover` rendered sentiment rows from live markets while the price-history API returned 25 hourly 1-day buckets. The proof also fixed two discovery gaps: market-list payloads now carry category id/slug/name for API-backed card labels, and public `/api/v1/series` plus `/api/v1/tags` bypass auth as read-only discovery taxonomy endpoints.

Loop 115 update: a SQL-backed proof stack now verifies honest market-detail liquidity for both launch execution modes. `/market/MLBB-FINAL-G1` rendered the order-book market with live question, resolution criteria/source/timeline, 1H/6H/1D/1W/ALL history controls, real aggregated order-book depth with 8 levels, recent trades in points, discussion, share action, and related markets; `/api/v1/markets/MLBB-FINAL-G1/orderbook?depth=5` returned four YES bids and four NO bids from the seeded book. `/market/DOTA-GF-MAP1` rendered a launch-safe legacy AMM fixture with explicit `AMM liquidity`, YES 15c/NO 85c, 200 pts liquidity, reserve balance YES 19/NO 42, 200 pts subsidy, curve K 100, preview-backed impact quotes for 1/10/25 YES, related markets, and a disabled `Quote only` trade ticket. The API agreed that DOTA is `executionMode=amm` with `ammYesShares=18.5`, `ammNoShares=42`, `liquidityCents=20000`, and preview quotes returned `executionMode=amm`, filled status, backend average prices, new YES prices, and slippage. Scenario 5 is now Pass; Scenario 3 remains Partial until the full live comment/follow/profile/moderation social-detail path is exercised.

Loop 116 update: a fresh SQL-backed stack now proves the live market-detail social path. The demo user posted `Loop 116 proof comment 1782378484615`, submitted reply `Loop 116 proof reply 1782378515374`, upvoted and reported the comment, and the market detail rendered 2 comments with `Upvote · 1` and `Report · 1`. `/users/u-1` rendered the public profile with the proof comment/reply, leaderboard activity, settlement activity, and trade activity. A second user `u-40f89fc127a4` followed `u-1`; the profile API returned `followerCount=1` and `viewerFollowing=true`, and user activity returned the follow plus proof comment/reply rows. Admin `admin@phoenix.local` listed the open social report, exported it as CSV, resolved it as reviewed with note `Loop 116 moderation proof`, and verified reviewed JSON/CSV. SQL confirmed 2 comments, 1 reaction, 1 reviewed report, and 1 follow row. Scenarios 3 and 8 are now Pass.

Loop 117 update: the same SQL-backed stack now proves the live rewards and leaderboard path through browser, API, and SQL. `/rewards` claimed daily points, a configured point pack, first-prediction mission, and daily-check-in mission; reload then rendered daily claim as `Claimed today`, starter boost as `Claimed`, daily-check-in and first-prediction missions as `Claimed`, visible streak progress at 1 day, earned daily/mission badges, point-pack no-cashout disclosure, and daily reward-limit status. `/leaderboards` rendered `#2 You` on Weekly P&L, and `/account/transactions` rendered the corresponding `Daily points`, `Point pack`, and `Mission reward` rows. API proof showed point-native `PTS` aliases, point-pack `claimed=true`, completed/claimed missions, earned badges, reward-limit accounting, and 1-day streak progress; SQL confirmed one `daily_claim`, one `point_pack_grant`, two `mission_reward` rows, and `u-1` leaderboard snapshots. Scenario 9 remains Partial because live streak reward claiming and broader account-graph/multi-node abuse proof remain incomplete.

Loop 118 update: demo seed mode now creates the previous two UTC days of `daily_claim:u-1:{date}` point-ledger evidence after wallet schema/top-up, so a fresh reviewer stack can unlock a live streak through normal `/rewards` actions. A fresh migrated/seeded stack showed `u-1` historical claims for `2026-06-23` and `2026-06-24`, then browser proof claimed today's daily reward, refreshed the 3-day streak from `0 / 3` to `3 / 3`, claimed the `3-day check-in streak`, rendered it as `Claimed`, earned the Streak builder badge, and kept daily reward-limit accounting point-native. API proof showed `daily_3` `completed=true` and `claimed=true`; SQL confirmed the three `daily_claim` ledger rows plus `streak_reward:u-1:daily_3`. Scenario 9 remains Partial because bonus UI/live proof and broader distributed/account-graph abuse proof remain incomplete.

Loop 119 update: a fresh migrated/seeded auth+gateway stack proved the live admin lifecycle/export workflow through CSRF-protected admin HTTP calls. The run created a launch-safe category, tagged series, event, edited market metadata through `PUT /api/v1/admin/markets/{id}`, opened, paused, resumed, closed, settled YES, created and canceled a second market, replayed settlement disbursements, inspected a user point ledger, and exported lifecycle, market, and risk CSV files. Evidence is saved at `/tmp/taptrade-admin-loop119-proof.json`, `/tmp/taptrade-admin-lifecycle-loop119.csv`, `/tmp/taptrade-admin-markets-loop119.csv`, and `/tmp/taptrade-admin-risk-loop119.csv`. Scenarios 7, 10, and 11 remain Partial because office browser edit controls, dual-admin propose/finalize variants, legacy backend naming, and broader safety proof remain incomplete.

Loop 120 update: office `/prediction-admin/markets` now exposes an Edit Market action/modal wired to `predictionClient.updateMarket`, covering editable metadata, settlement controls, close date, fee, and liquidity fields while preserving event/ticker and leaving status/result to lifecycle transitions. Live office browser proof on a fresh migrated/seeded stack logged in as `admin@phoenix.local`, loaded 15 admin markets, opened the `MLBB-FINAL-G1` Edit Market modal, fixed the datetime-local close-date serialization from `YYYY-MM-DDTHH:mm` to UTC seconds, saved the title through the UI, and verified `PUT /api/v1/admin/markets/{id}` returned 200, the row showed `Listed MLBB team wins game one - Loop 120 browser edit`, and SQL recorded `edited` lifecycle audit rows. Office market invalidation copy now says locked points are returned at entry cost instead of refunded. Source regression and a full office production build passed. Scenarios 7, 10, and 11 remain Partial because dual-admin propose/finalize variants, legacy backend naming, and broader safety proof remain incomplete.

Loop 121 update: launch-loaded locale bundles now have parsed-value safety coverage across English, Indonesian, Malay, Tagalog, Simplified Chinese, and Traditional Chinese. Footer values no longer ship inherited operator, deposit, withdrawal, cashier, or casino copy; leaderboard compatibility `crypto` values render as esports; portfolio values use settled-result and locked-point language; rewards earning copy no longer uses dollar framing; and responsible-play limit/history values render point-use and prediction terms. `qa-regressions-2026-04-18.test.ts` now parses `account`, `bonus`, `deposit-limits`, `footer`, `leaderboards`, `portfolio`, `prediction`, `rewards`, and `rg-history` locale JSON values for every launch language and rejects prohibited money/cashier/crypto/redemption terms. Scenario 12 remains Partial because internal legacy names, backend wallet/cents/payment/compliance contracts, broader abuse proof, and live no-money-path safety proof remain incomplete.

Loop 122 update: the parsed locale safety boundary now covers every JSON bundle under the six supported launch-language locale directories, with an explicit exception only for password-regex syntax. The remaining supported-locale offenders were removed from `account-status-bar`, `api-errors`, `register`, `transaction-history`, and `win-loss-statistics`: account status no longer offers a deposit action, API errors describe point activity instead of payment/deposit/withdrawal, registration no longer ships casino/wagering employee language, transaction history uses prediction placement/settlement and point grant/removal language, and win/loss statistics uses prediction details plus points-used copy. Scenario 12 remains Partial because internal legacy names, backend wallet/cents/payment/compliance contracts, broader abuse proof, and live no-money-path safety proof remain incomplete.

Loop 123 update: English office translation values now have parsed-value safety coverage across every module under `packages/office/translations/en`. Remaining rendered admin translation offenders were cleaned from audit logs, generic errors, fixed-exotics, prediction ops, provider ops, risk summary, and user detail copy so old deposit/withdrawal/payment/wallet/freebet/stake/refund/payout/cents labels now render as point additions/removals, point accounts, bonus rules, points used, returned points, point adjustments, and prediction point amounts. Scenario 12 remains Partial because internal legacy names, backend wallet/cents/payment/compliance contracts, broader abuse proof, and live no-money-path safety proof remain incomplete.

Loop 124 update: gateway launch documentation is now partially cleaned and guarded. `go-platform/README.md` describes TapTrade as a non-redeemable gameplay-points prediction platform, removes the inherited alpha cashier/USDC/live-chain/dollar/deposit/withdrawal documentation block, and states that launch service configuration keeps external-value rails out of the active route tree. `services/gateway/api/openapi.yaml` now describes point-cents gameplay subunits, 0-100 implied probability semantics, 100 point-cent winning-share settlement, maximum point-cents reserved, and legacy compatibility surfaces without documenting cashier, crypto, sportsbook, payout, or dollar-exposure launch paths. `TestLaunchDocsStayPointsOnly` regression-scans the Go platform README and gateway OpenAPI descriptions while allowing only `non-redeemable` denial phrasing and OpenAPI `$ref` syntax. Scenarios 11 and 12 remain Partial because admin/game-economy API docs, internal/backend legacy names, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 125 update: the gateway OpenAPI launch spec now documents the already-real admin market lifecycle slice: `GET/PUT /api/v1/admin/markets/{id}`, `GET /api/v1/admin/markets/{id}/lifecycle` including CSV export, `POST /api/v1/admin/markets/{id}/lifecycle/{action}`, and `POST /api/v1/admin/settlements/replay`. New schemas cover admin market edits, TapTrade lifecycle metadata/actions, lifecycle audit rows, lifecycle transition responses, and settlement replay responses with points-only point-disbursement language. `TestLaunchOpenAPIDocumentsAdminLifecycleSlice` now prevents this admin lifecycle documentation from dropping out of the launch OpenAPI spec, while `TestLaunchDocsStayPointsOnly` keeps the OpenAPI/README wording inside the points-only boundary. Scenario 11 remains Partial because broader game-economy/admin API documentation and backend legacy names remain incomplete; Scenario 12 remains Partial because live no-money-path proof and broader abuse proof remain incomplete.

Loop 126 update: the gateway OpenAPI launch spec now documents the already-real reward/game-economy API slice: `POST /api/v1/wallet/daily-claim`, `GET/POST /api/v1/wallet/point-packs`, `GET/POST /api/v1/wallet/missions`, `GET/POST /api/v1/wallet/streaks`, `GET /api/v1/wallet/badges`, and `GET /api/v1/wallet/reward-limits`. New schemas cover point packs, missions, streaks, badges, reward-limit status, and reward grant responses with `PTS` point aliases. `TestLaunchOpenAPIDocumentsRewardSlice` now prevents those reward route docs from dropping out of the launch OpenAPI spec, while `TestLaunchDocsStayPointsOnly` keeps the OpenAPI/README wording inside the points-only boundary. Scenario 11 remains Partial because broader admin/social/risk/leaderboard/loyalty API docs and backend legacy names remain incomplete; Scenario 12 remains Partial because live no-money-path proof and broader abuse proof remain incomplete.

Loop 127 update: the gateway OpenAPI launch spec now documents the already-real social/comment/profile/follow/activity/moderation API slice: `GET/POST /api/v1/social/markets/{marketId}/comments`, `POST /api/v1/social/comments/{commentId}/react`, `POST /api/v1/social/comments/{commentId}/report`, `GET /api/v1/social/users/{userId}/profile`, `POST /api/v1/social/users/{userId}/follow`, `GET /api/v1/social/users/{userId}/activity`, `GET /api/v1/social/activity`, `GET /api/v1/admin/social/reports`, `GET /api/v1/admin/social/reports?format=csv`, `POST /api/v1/admin/social/reports/{id}/resolve`, `GET /api/v1/admin/social/activity`, and `GET /api/v1/admin/social/activity?format=csv`. New schemas cover comments/replies, report requests, public profiles, activity rows, admin report rows, and report-resolution payloads as metadata-only surfaces, while admin exports are documented as formula-safe. `TestLaunchOpenAPIDocumentsSocialSlice` now prevents those social route docs from dropping out of the launch OpenAPI spec, while `TestLaunchDocsStayPointsOnly` keeps the OpenAPI/README wording inside the points-only boundary. Scenario 8 remains Pass; Scenario 11 remains Partial because risk/leaderboard/loyalty/admin docs and backend legacy names remain incomplete; Scenario 12 remains Partial because live no-money-path proof and broader abuse proof remain incomplete.

Loop 128 update: the gateway OpenAPI launch spec now documents the already-real admin prediction risk API slice: `GET /api/v1/admin/prediction/risk` and `GET /api/v1/admin/prediction/risk?format=csv`. New schemas cover settlement aging, point-cost concentration, and point-accounting invariant rows with point-native fields only; temporary legacy compatibility aliases remain intentionally undocumented in the launch spec. `TestLaunchOpenAPIDocumentsRiskSlice` now prevents risk route docs from dropping out of the launch OpenAPI spec, while `TestLaunchDocsStayPointsOnly` keeps the OpenAPI/README wording inside the points-only boundary. Scenarios 10, 11, and 12 remain Partial because leaderboard/loyalty/reward-cluster/admin docs, backend legacy names, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 129 update: the gateway OpenAPI launch spec now documents the already-real Predict leaderboard API slice: `GET /api/v1/leaderboards`, `GET /api/v1/leaderboards/{id}/entries`, `GET /api/v1/me/leaderboards`, `GET /api/v1/admin/leaderboards`, `GET /api/v1/admin/leaderboards/{id}`, and `POST /api/v1/admin/leaderboards/{id}/recompute`. New schemas cover public board definitions, ranking entries, authenticated viewer standings, admin computed-board rows, and admin entry rows using `PTS`, `pointMetricKey`, and `rewardSummary` launch fields while leaving temporary compatibility aliases undocumented. The public board catalog also now uses point-result and 500+ pts qualification copy instead of profit/loss, trader, or dollar-volume wording, guarded by `TestPredictLeaderboardBoardCopyIsPointsOnly`. `TestLaunchOpenAPIDocumentsLeaderboardSlice` prevents leaderboard route docs from dropping out of the launch OpenAPI spec, while `TestLaunchDocsStayPointsOnly` keeps the OpenAPI/README wording inside the points-only boundary. Scenarios 9, 10, 11, and 12 remain Partial because loyalty/reward-cluster/remaining admin docs, backend legacy names, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 130 update: the gateway OpenAPI launch spec now documents the already-real loyalty XP/rank and reward-cluster admin API slices: `GET /api/v1/loyalty`, `GET /api/v1/loyalty/standing`, `GET /api/v1/loyalty/ledger`, `GET /api/v1/loyalty/tiers`, `GET /api/v1/admin/loyalty/accounts`, `GET /api/v1/admin/loyalty/accounts/{playerId}`, `POST /api/v1/admin/loyalty/adjustments`, `GET /api/v1/admin/loyalty/config`, `PUT /api/v1/admin/loyalty/tiers/{tierCode}`, and `GET /api/v1/admin/wallet/reward-clusters` including CSV export. New schemas cover loyalty standing, loyalty ledger entries, public rank tiers, admin account/detail/adjustment/config rows, editable rank tiers, and hashed reward-cluster summaries using `PTS`, XP/rank, point-delta, and formula-safe export wording while leaving temporary compatibility aliases undocumented. `TestLaunchOpenAPIDocumentsLoyaltyAndRewardClusterSlice` prevents these route docs from dropping out of the launch OpenAPI spec, while `TestLaunchDocsStayPointsOnly` keeps OpenAPI/README wording inside the points-only boundary. Scenarios 9, 10, 11, and 12 remain Partial because remaining admin docs, backend legacy names, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 131 update: the gateway OpenAPI launch spec now documents the already-real responsible-play point-use and prediction-limit API slices: `POST /api/v1/compliance/rg/point-use-limit`, `GET /api/v1/compliance/rg/point-use-limits`, `POST /api/v1/compliance/rg/prediction-limit`, `GET /api/v1/compliance/rg/prediction-limits`, `GET /api/v1/compliance/rg/check-point-use`, `GET /api/v1/compliance/rg/check-prediction`, `POST /api/v1/compliance/rg/cool-off`, `POST /api/v1/compliance/rg/self-exclude`, and `GET /api/v1/compliance/rg/restrictions`. New schemas cover session-bound point-use limits, prediction-size limits, decision payloads, cool-off/self-exclusion status, and restrictions using `PTS`, point-native reason codes, and no point movement wording while leaving inherited compatibility aliases undocumented. `TestLaunchOpenAPIDocumentsResponsiblePlaySlice` prevents these route docs from dropping out of the launch OpenAPI spec, while `TestLaunchDocsStayPointsOnly` keeps OpenAPI/README wording inside the points-only boundary. Scenarios 11 and 12 remain Partial because remaining admin/compatibility docs, backend legacy names, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 132 update: the gateway OpenAPI launch spec now documents the already-real discovery taxonomy API slice: public `GET /api/v1/categories`, `GET /api/v1/categories/{slug}`, `GET /api/v1/series`, and `GET /api/v1/tags`, plus admin `GET/POST /api/v1/admin/categories`, `GET/POST /api/v1/admin/series`, and `GET /api/v1/admin/tags`. New schemas cover category and recurring-series metadata, create payloads, and tag-list responses as discovery metadata with no point movement, with prohibited taxonomy terms rejected before admin category persistence. `TestLaunchOpenAPIDocumentsTaxonomySlice` prevents these taxonomy route docs from dropping out of the launch OpenAPI spec, while `TestLaunchDocsStayPointsOnly` keeps OpenAPI/README wording inside the points-only boundary. Scenarios 10, 11, and 12 remain Partial because remaining admin/compatibility docs, backend legacy names, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 133 update: the gateway OpenAPI launch spec now documents the already-real admin account-review API slice: `GET /api/v1/admin/punters`, `GET /api/v1/admin/punters/{id}`, `GET /api/v1/admin/punters/{id}/settlements`, `GET /api/v1/admin/punters/{id}/wallet`, `PUT /api/v1/admin/punters/{id}/status`, `GET/POST /api/v1/admin/punters/{id}/notes`, and `GET /api/v1/admin/audit-logs`. New schemas cover account list/detail rows, point-account summary fields, immutable point-ledger rows, settlement-history rows, account status updates, admin notes, pagination, and audit logs while keeping known placeholder account actions out of the launch spec. `TestLaunchOpenAPIDocumentsAdminAccountReviewSlice` prevents these account-review route docs from dropping out of the launch OpenAPI spec, while `TestLaunchDocsStayPointsOnly` keeps OpenAPI/README wording inside the points-only boundary. Scenarios 10, 11, and 12 remain Partial because remaining admin/compatibility docs, backend legacy names, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 134 update: the gateway OpenAPI launch spec now documents the already-real admin market-operation API slice: `GET/POST /api/v1/admin/markets`, `GET /api/v1/admin/markets?format=csv`, `POST /api/v1/admin/events`, `POST /api/v1/admin/market-sources`, `GET /api/v1/admin/ai-budget`, and `POST /api/v1/admin/ai-budget/reserve`. New schemas cover market creation, event creation, formula-safe market export rows, source-provenance metadata, redacted AI generation metadata, and AI drafting token-budget status/reservation while keeping market creation metadata-only with no point movement. `TestLaunchOpenAPIDocumentsAdminMarketOperationsSlice` prevents these market-operation route docs from dropping out of the launch OpenAPI spec, while `TestLaunchDocsStayPointsOnly` keeps OpenAPI/README wording inside the points-only boundary. Scenarios 10, 11, and 12 remain Partial because remaining admin/compatibility docs, backend legacy names, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 135 update: the gateway OpenAPI launch spec now documents the already-real settlement and dispute API slice: direct admin settlement, proposed-resolution challenge windows, admin finalization, holder disputes, open-dispute review, admin dispute decisions, and resolution-source health. New schemas cover resolution attestation, settlement headers, point disbursements, proposals, disputes, dispute decisions, and source-health rows using preferred point-native launch aliases. `TestLaunchOpenAPIDocumentsSettlementAndDisputeSlice` prevents these route docs from dropping out of the launch OpenAPI spec, while `TestLaunchDocsStayPointsOnly` keeps OpenAPI/README wording inside the points-only boundary. Scenarios 7, 10, 11, and 12 remain Partial because broader dual-admin live proof, backend legacy names, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 136 update: gateway HTTP tests now prove the proposed-resolution and dispute routes enforce the dual-admin challenge-window contract through handlers rather than only through service calls. The route test covers admin propose, direct-settle bypass rejection, same-admin finalize rejection, holder dispute filing, admin queue review, open-dispute finalization blocking, second-admin dispute rejection, and second-admin finalization with point-disbursement response aliases. Scenarios 7, 10, 11, and 12 remain Partial because live seeded-stack/browser proof, backend legacy names, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 137 update: gateway middleware tests now prove cashier, admin cashier, payment, crypto-payment, webhook, and provider-callback paths are not public and do not skip CSRF in launch mode. The same tests prove `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED=true` only exempts provider callback/webhook paths for non-launch compatibility while interactive legacy routes still require auth and CSRF. Focused `cmd/gateway` tests and default route absence tests passed. Scenarios 11 and 12 remain Partial because live no-money-path browser proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 138 update: bot order routes now use the same point-safe order-denial contract as session orders. A focused route test mints a real bot API key, seeds an open order-book market, denies through the compliance checker, verifies `prediction_limit_exceeded` details without inherited bet wording, and proves the blocked bot order does not persist. Focused bot safety tests passed. Scenarios 11 and 12 remain Partial because live no-money-path browser proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 139 update: bot order routes now also share the session order HTTP validation helper before market jurisdiction lookup or placement. A focused route test mints a real bot API key, posts a capless market buy and an invalid self-match action against missing-market IDs, verifies field-specific `400` validation details, and proves invalid bot orders do not persist. Focused bot validation plus responsible-play/order-error/accounting and launch-doc safety tests passed. Scenarios 11 and 12 remain Partial because live no-money-path browser proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 140 update: gateway OpenAPI now documents the bot/API slice as a points-only automation surface: `POST /api/v1/bot/orders` shares session validation before market lookup, uses the same point-reservation/fill path as session orders, documents validation and point-limit `400` responses, and includes bot-key rate-limit documentation; `GET /api/v1/bot/positions` is documented as a read-only point-backed position surface. `TestLaunchOpenAPIDocumentsBotAPISlice` now guards the route and schema docs beside the launch docs safety scan. Scenarios 11 and 12 remain Partial because live no-money-path browser proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 141 update: gateway OpenAPI now also documents bot-key lifecycle and operator-issued partner-key surfaces: session-user key list/create, owner-scoped revoke, and RBAC-gated admin partner-key issue/list. The docs state that key reads/creates/revokes do not move points, full keys are shown only once, self-serve creation is production-gated, partner issuance is audited, and foreign/unknown revocations avoid a key-existence oracle. `TestLaunchOpenAPIDocumentsBotAPISlice` now guards the key route and schema docs beside the launch docs safety scan. Scenarios 11 and 12 remain Partial because live no-money-path browser proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 142 update: bot/partner key issuance now rejects privileged or unknown scopes before persistence. Self-serve `/api/v1/bot/keys` and RBAC-gated `/api/v1/admin/partner-keys` share scope normalization, default omitted scopes to read-only, accept only `read` and `trade`, and reject `admin` or other wildcard/unknown scopes before any API key is created. Route tests prove invalid self-serve and partner scopes return `400` with no persistence, omitted partner scopes default to `read`, and safe self-serve inputs normalize to `read,trade`; OpenAPI docs now expose only the launch scopes and guard the wildcard-rejection wording. Scenarios 11 and 12 remain Partial because live no-money-path browser proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 143 update: gateway runtime route-domain logging now matches the launch money-route boundary. The initialized route summary excludes `alpha_cashier`, `payments`, and `crypto_payments` in launch mode and includes those domains only under explicit legacy-money opt-in, so startup evidence no longer advertises inactive payment routes. New tests guard both launch and opt-in summaries beside the existing default route absence, public-prefix, CSRF-skip, and deployed-environment boot validation tests. Scenarios 11 and 12 remain Partial because live no-money-path browser/API proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 144 update: gateway infrastructure metrics now match the same launch money-route boundary. `GatewayInfraMetrics()` omits the alpha-cashier audit collector and alpha-cashier/money-path help text when `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED` is unset, while explicit non-launch opt-in restores the legacy collector. Geo-gate metric help text now uses guarded-request wording, and tests prove the launch scrape excludes `alpha_cashier`, cashier, payment, crypto, and money-path diagnostic tokens. Scenarios 11 and 12 remain Partial because live no-money-path browser/API proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 145 update: deployed gateway launch validation no longer requires dormant payment-webhook config when payment routes are absent. `validateGatewayRuntimeConfig` now checks `PAYMENTS_WEBHOOK_SECRET` only for explicit legacy-money route opt-in; production and staging still reject that opt-in, while local compatibility opt-in requires a real non-placeholder secret. Focused tests prove production launch config validates with an empty payment webhook secret, explicit legacy opt-in rejects missing or `whsec_local` secrets, and legacy crypto rail config is still blocked from a passing launch baseline. Scenarios 11 and 12 remain Partial because live no-money-path browser/API proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 146 update: alpha-cashier service enablement is now bound to the same explicit legacy-money route opt-in as the cashier/payment route tree. `validateGatewayRuntimeConfig` rejects `ALPHA_CASHIER_ENABLED=true` by default even in local development unless `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED=true` is also set, while production and staging still reject alpha cashier outright. Focused tests prove the default launch config refuses otherwise-valid alpha-cashier settings and that the only passing local compatibility path requires explicit legacy opt-in plus a real webhook secret. Scenarios 11 and 12 remain Partial because live no-money-path browser/API proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 147 update: gateway launch-adjacent diagnostics and comments no longer use inherited money-route wording for guarded request paths. The alpha-cashier opt-in metrics help describes legacy alpha-cashier audit-log persistence failures, pretrade edge-auth comments describe guarded requests, webhook enqueue comments describe the prediction event path, and route-registration comments describe legacy guarded routes. Focused tests prove the opt-in collector still appears only under explicit legacy opt-in and that its emitted help avoids the old hyphenated money-route token; a targeted gateway source scan found no remaining old token, spaced equivalent, or money-movement phrase matches in launch-adjacent gateway files. Scenarios 11 and 12 remain Partial because live no-money-path browser/API proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 148 update: admin account-review route payloads now expose preferred point-native aliases above legacy compatibility fields. Account list/detail responses include `pointAccountBalanceCents`, `realizedPointsCents`, and `unit: "PTS"`; settlement-history rows include `realizedPointsCents`, `settlementPointsCents`, and `PTS`; and admin point-ledger inspection reuses the point-ledger payload mapper with `amountPointsCents`, `balancePointsCents`, and `PTS`. The launch OpenAPI account-review schemas now document those preferred fields and mark older wallet/P&L/payout/amount/balance fields as transitional. Focused admin route and launch OpenAPI tests passed, and a targeted scan found no remaining wallet-cash/financials-only account-review wording in the touched files. Scenarios 11 and 12 remain Partial because live no-money-path browser/API proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 149 update: portfolio summary API responses now expose preferred point-native aliases above legacy summary fields. `prediction.PortfolioSummary` marshals `totalValuePointsCents`, `portfolioValuePointsCents`, `investedPointsCents`, `unrealizedPointsCents`, `realizedPointsCents`, and `unit: "PTS"` from the existing portfolio summary values while preserving transitional `totalValueCents`/P&L fields. The shared prediction client now normalizes portfolio summaries from those aliases, OpenAPI documents `/api/v1/portfolio/summary` with a `PortfolioSummary` schema and point-native wording, and app/API regressions guard the new fields. Scenarios 6, 11, and 12 remain Partial because broader live portfolio proof, backend legacy naming, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 150 update: order placement payloads added preferred point-native aliases above legacy cost/cash names. Loop 171 later retired the response-level cost/cap compatibility aliases from launch JSON/OpenAPI/exported client outputs, while Loop 225 later moved launch request surfaces to `notionalCapPointsCents` only.

Loop 151 update: portfolio position payloads added preferred point-native aliases above legacy cost/P&L names. Loop 170 later retired the position-level compatibility aliases from launch JSON/OpenAPI/exported client outputs.

Loop 152 update: order preview payloads began exposing preferred point-native aliases above legacy preview cost/result/slippage names. Loop 172 later retired the preview response aliases from launch JSON/OpenAPI/exported client outputs and player preview UI. `/api/v1/orders/preview` remains documented as a non-mutating preview schema, and launch request surfaces now send and document `pricePointsCents` and `notionalCapPointsCents` only. Scenarios 4, 11, and 12 remain Partial because broader live trading variants, live no-money-path proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 153 update: trade tape payloads began exposing preferred point-native aliases above legacy trade price/fee names. Loop 173 later retired those trade response aliases from launch JSON, live fill payloads, OpenAPI, exported shared-client types, normalized outputs, and the player trade-tape UI. `/api/v1/markets/{id}/trades` remains documented as a typed point-native `Trade` array. Scenarios 4, 11, and 12 remain Partial because broader live trading variants, live no-money-path proof, backend legacy naming, and broader abuse proof remain incomplete.

Loop 154 update: central market/discovery/detail payloads began exposing preferred point-native aliases above legacy market price/activity/liquidity names. Loop 174 later retired those central market response aliases from launch JSON, OpenAPI, exported shared-client types, normalized app/office outputs, live market-detail merge behavior, and market UI consumers. Scenarios 11 and 12 remain Partial because backend legacy naming, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 155 update: market price-history chart payloads began exposing preferred point-native aliases and were documented in launch OpenAPI. Loop 175 later retired those history response aliases from launch JSON, OpenAPI, exported shared-client types, normalized player-app outputs, and chart/discovery UI consumers. `/api/v1/markets/{id}/prices` remains documented as a no-point-movement `MarketPriceHistory` response. Scenarios 11 and 12 remain Partial because backend legacy naming, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 156 update: order-book/depth payloads began exposing preferred point-native aliases and were documented in launch OpenAPI. Loop 176 later retired the depth response aliases from launch JSON, OpenAPI, exported shared-client types, normalized outputs, and market-detail order-book UI. `/api/v1/markets/{id}/orderbook` remains documented as a no-point-movement `OrderBook` response. Scenarios 11 and 12 remain Partial because backend legacy naming, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 157 update: live market WebSocket payloads began exposing preferred point-native aliases. Loop 179 later retired the live-frame market price/activity and order-book best-quote aliases from emitted gateway frames. `market:<id>` frames now include `yesPricePointsCents`, `noPricePointsCents`, `lastTradePricePointsCents`, `volumePointsCents`, `openInterestPointsCents`, and `unit: "PTS"` without the legacy market aliases; `orderbook:<id>` hint frames include best-quote point aliases and `unit: "PTS"` without best-quote `*Cents` aliases; and the market detail page normalizes live market-update frames from the point aliases before merging them into local state while retaining private fallback parsing for older frames. Scenarios 11 and 12 remain Partial because backend legacy naming, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 158 update: admin dashboard market-activity payloads began exposing preferred point-native aliases. Loop 177 later retired those dashboard activity response aliases from launch JSON, OpenAPI, exported shared-client types, normalized office outputs, and the office dashboard consumer. Scenarios 10, 11, and 12 remain Partial because broader admin/live variants, backend legacy naming, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 159 update: the admin dashboard point-activity endpoint was documented in launch OpenAPI with preferred point-native aliases. Loop 177 later removed the transitional dashboard activity fields from `/api/v1/admin/dashboard/volume`, `DashboardVolumeStats`, and `DashboardMover`, leaving the route documented as read-only point activity with no point movement. Scenarios 10, 11, and 12 remain Partial because broader admin/live variants, backend legacy naming, live no-money-path proof, and broader abuse proof remain incomplete.

Loop 160 update: admin drift-alert payloads and docs began exposing preferred point-native aliases. Loop 178 later retired those drift response aliases from launch JSON, OpenAPI, exported shared-client types, normalized office outputs, and office market/settlement consumers. Scenarios 10, 11, and 12 remain Partial because broader admin/live variants, backend legacy naming, live no-money-path proof, and broader abuse proof remain incomplete.

## Existing User-Facing Surfaces

| Area | Current State | Real / Mocked / Stubbed / Missing / Broken | Evidence |
|---|---|---:|---|
| Home | App home shows market preview cards and category-oriented prediction content. | Partial | `talon-backoffice/packages/app/app/page.tsx`; homepage examples now use politics, basketball, pageants, and esports/MLBB rather than crypto/Bitcoin, and `page-home` locales use outcome-rule wording instead of payout/payment logic. User-app QA coverage scans homepage source/locales for crypto and cash-value terms. Live browser proof still needs verification. |
| Market discovery | `/predict` loads discovery and categories from `createPredictionClient`, renders featured, trending, and all markets. The all-markets grid now has server-backed search, category filters, close-window filters, activity/closing-soon/newest sorts, persisted Watch/Watching card controls, watchlist-only filtering, backend series links, and backend tag filters. Market cards render API-backed category labels, volume/activity, explicit liquidity, close date, probability/price, and watchlist controls. The launch user app no longer spotlights inherited crypto categories in the featured carousel or category tabs, fallback subcategory taxonomy uses esports niches, gateway category services hide inherited crypto taxonomy from launch category lists, discovery import skips crypto-like upstream rows before promotion, office market creation is manual/binary-only, and launch market creation rejects asset-price settlement sources/rules before persistence. | Real | `talon-backoffice/packages/app/app/predict/page.tsx`; `AllMarketsSection.tsx`; `MarketGrid.tsx`; `MarketCard.tsx`; `marketSubcategories.ts`; `market-watchlist-client.ts`; `PredictionApiClient.getMarkets/getSeries/getTags`; gateway `/api/v1/markets` accepts `q`, `sort`, `seriesId`, `tag`, and close-window filters and returns category id/slug/name; `/api/v1/series` and `/api/v1/tags` expose public taxonomy metadata; `/api/v1/watchlist/markets` stores per-user watched market IDs; `prediction.Service.ListCategories/GetCategory/CreateCategory` filters/rejects launch-prohibited taxonomy; `prediction.Service.CreateMarket` rejects launch-prohibited market sources/rules/copy; `registerPredictionFeedAdapters` only registers the legacy asset-price feed behind `TAPTRADE_LEGACY_ASSET_PRICE_FEEDS_ENABLED=true`; `discover.Classify/Promote` uses `esports` instead of inherited `crypto` and skips launch-prohibited upstream markets; migrations `046_taptrade_launch_taxonomy.sql` and `047_taptrade_launch_translation_cleanup.sql` protect launch taxonomy/translations; `seed_prediction.sql` now seeds esports/manual markets and `PTS` wallets. Loop 114 live proof covered `/predict` render, search, category/tag filters, close-window filter, activity/closing-soon/newest sorts, authenticated watchlist persistence/filtering, public series/tag taxonomy, and complete card metadata. |
| Sentiment/discover | `/discover` renders ranked sentiment rows from discovery data and fetches 1-day market price histories for displayed rows. | Real | `talon-backoffice/packages/app/app/discover/page.tsx`; `PredictionApiClient.getMarketPriceHistory`; gateway `/api/v1/markets/{id}/prices?range=1d`. Movement is computed from history points instead of deterministic deltas, and Loop 114 live proof rendered the sentiment table while `MLBB-FINAL-G1` 1-day history returned 25 hourly buckets. |
| Category route | `/category/[slug]` exists for category-scoped browsing. | Unknown | Route exists at `talon-backoffice/packages/app/app/category/[slug]/page.tsx`; not fully inspected in this pass. |
| Series route | `/series/[slug]` resolves backend series metadata and lists open markets through `seriesId`. | Real | `talon-backoffice/packages/app/app/series/[slug]/page.tsx`; `PredictionApiClient.getSeries`; `PredictionApiClient.getMarkets({ seriesId })`; Loop 114 live proof rendered `/series/mlbb-esports-series` with backend title, description, tags, frequency, and three open markets. |
| Market detail | `/market/[ticker]` loads market, event, trades, categories, related markets, positions, real order-book depth when available, explicit AMM liquidity visualization for AMM markets, websocket updates, market discussion, profile/follow links, activity feed link, and a share action. | Real | `talon-backoffice/packages/app/app/market/[ticker]/page.tsx`; `OrderBook.tsx`; `PredictionApiClient.getOrderBook`; `PredictionMarket.ammLiquidityParam`, `ammYesShares`, `ammNoShares`, and `ammSubsidyPointsCents`; QA regression coverage proves `synthesizeBook` is absent, market detail branches between real order-book data and AMM liquidity, AMM markets render a YES price marker, YES/NO reserve split, subsidy, curve K, and a preview-backed YES impact quote ladder, related markets prefer same event/series/category before generic fallback, and related volume copy uses points. Gateway tests prove AMM previews return read-only curve quotes while AMM order placement stays retired. `MarketDiscussion` wires real comments/replies/reactions/reports/follows/profiles/activity links, and share uses `navigator.share` with clipboard fallback. Loop 115 browser/API proof rendered `MLBB-FINAL-G1` with real order-book depth, history controls, recent trades, resolution metadata, discussion, share, and related markets, and rendered `DOTA-GF-MAP1` with explicit AMM reserves, subsidy, curve K, preview-backed impact quotes, and quote-only disabled trading. Loop 116 browser/API/SQL proof covered comment, reply, reaction, report, public profile, follow, activity, moderation, and CSV export. |
| Trade ticket | Market detail passes preview/place order handlers, idempotency key, buy/sell action, order type, limit price/TIF options, and available positions. | Partial | `market/[ticker]/page.tsx` with `TradeTicket`; user-facing amounts/payouts are points and insufficient points no longer routes to cashier. Gateway service tests now prove order-book buy YES, buy NO issuance, sell YES, reservation/capture/release, seller-credit, cancellation release, and insufficient-points behavior. A temporary migrated/seeded SQL gateway with bot auth placed a live `/api/v1/bot/orders` BUY YES on `MLBB-FINAL-G1`, returned `201`, filled quantity 3, captured 192 points-cents, wrote a `prediction_fill` wallet-ledger debit, updated `wallet_balances`, and returned the updated YES position through `/api/v1/bot/positions`. Loop 111 browser proof covers session BUY YES, SELL YES, BUY NO, visible point-ledger rows, portfolio positions, and activity rows. Loop 113 browser proof covers live insufficient-points rejection for a clean session user: disabled `Not enough points` CTA, no cashier link, no order row, no reservation row, and unchanged starter balance/ledger. SQL-backed activity now surfaces persisted trade fills from `prediction_trades` as point-safe Bought/Sold YES/NO activity. Wallet reservations now write point-ledger `reservation`/`release` markers keyed to `prediction_order`, `/account/transactions` renders order locked/filled/proceeds/unlocked rows through point-safe helpers, and order payloads now expose preferred point-native aliases for total/reserved/captured/released/filled/notional-cap point-cents plus `unit: "PTS"` while preserving transitional compatibility fields. |
| Portfolio | `/portfolio` loads positions, summary, active orders, settled results, user standing, and market hydration. | Partial | `talon-backoffice/packages/app/app/portfolio/page.tsx`; visible values now render as points, portfolio history copy says settled results instead of settled payouts, `/api/v1/portfolio/summary` emits point-native summary fields without `totalValueCents`, `unrealizedPnlCents`, or `realizedPnlCents`, `/portfolio` and `/account` read summary cards from `totalValuePointsCents` and `realizedPointsCents`, `/api/v1/portfolio` position rows emit `totalCostPointsCents`, `realizedPointsCents`, and `unit: "PTS"` without `totalCostCents` or `realizedPnlCents`, `/api/v1/portfolio/history` emits `realizedPointsCents`, `settlementPointsCents`, and `unit: "PTS"` without `pnlCents`/`payoutCents`, and the exported shared `PortfolioSummary`, `Position`, and `SettledPositionResult` types use point-native fields. Loop 112 browser proof verified a settled YES position rendered `+14.04 pts` realized P&L, `+39.00 pts` settlement points, zero open positions, `5014.04 pts` visible balance, and 100.0% accuracy. Broader portfolio coverage and backend compatibility cleanup remain incomplete. |
| Account | `/account` exposes profile, portfolio, point ledger, responsible play, notifications. | Partial | `talon-backoffice/packages/app/app/account/page.tsx`; cashier card removed and balances render as points, but internal wallet naming remains. |
| Registration | `/auth/register` is a two-step account/terms wizard and calls auth registration then login. | Real | `talon-backoffice/packages/app/app/auth/register/page.tsx`; now shows a points-only/no-cashout disclosure, sends accepted terms/disclosure versions to `/api/v1/auth/register`, claims starter points after signup login, and routes to market discovery. The auth service rejects registration without terms plus points-only/no-cashout disclosure acceptance, persists accepted versions/timestamps on `auth_users`, returns them on register, and includes them in `/api/v1/auth/session`. Loop 109 live gateway/auth proof registered a disposable user, verified persisted disclosure versions, claimed starter points, retried idempotently, and read the authenticated PTS ledger credit. Loop 110 browser proof completed signup, landed on `/predict`, showed the 5000.00 pts starter balance, loaded seeded market discovery, and rendered the visible account point-ledger starter row. |
| Login/session | Auth client supports login, refresh, session, register, MFA, terms acceptance. | Partial | `talon-backoffice/packages/app/app/lib/api/auth-client.ts`; real endpoint calls, but local end-to-end not verified. |
| Cashier | User-facing `/cashier` route removed. | Removed from user app | `app/cashier/page.tsx`, `cheque/page.tsx`, `loading.tsx`, and `error.tsx` deleted; old cashier components deleted. Gateway legacy money routes are absent by default; backoffice/provider surfaces remain for a later slice. |
| Transactions | `/account/transactions` is now a point ledger view. | Partial | `talon-backoffice/packages/app/app/account/transactions/page.tsx`; visible filters and CSV export use point language through `app/lib/point-ledger.ts`, with tests proving legacy credit/debit/reservation/release values render as point movements without cash-adjacent terms. Public wallet ledger responses now include `amountPointsCents`, `balancePointsCents`, and `unit: "PTS"` without retired ledger aliases. The user app wallet client now prefers the point aliases, preserves gateway ledger movement types plus idempotency keys, normalizes balance/ledger units as `PTS` instead of `USD`, and prediction-order ledger rows render as Order points locked, Order filled, Order proceeds, and Order points unlocked. Loop 112 SQL and browser proof verified the settlement credit ledger row `prediction_payout:...`, visible transaction movement `Settlement points`, delta `+39 pts`, balance after `5,014.04 pts`, reason `Prediction settlement`, and final SQL balance `501404` point-cents. |
| Responsible play | Responsible-gaming pages and settings exist. | Partial | `responsible-gaming/page.tsx`, `profile/page.tsx`, `account/rg-history/page.tsx`, `account/self-exclude/page.tsx`; visible copy now emphasizes responsible play, point-use limits, and prediction limits. The profile page calls `setPointUseLimits` against `/api/v1/compliance/rg/point-use-limit` and `setPredictionLimits` against `/api/v1/compliance/rg/prediction-limit` using `amountPointsCents`. RG history fetches `/api/v1/compliance/rg/point-use-limits` and `/api/v1/compliance/rg/prediction-limits`, prefers `limitPointsCents` plus `unit: "PTS"` before legacy fallback, and normalizes rows to `point_use_limit`/`Point-Use Limit` and `prediction_limit`/`Prediction Limit`. Gateway check aliases `/api/v1/compliance/rg/check-point-use` and `/api/v1/compliance/rg/check-prediction` now accept point-native amounts, return `PTS`, and normalize denied limit reasons/reason codes to point-use or prediction terminology; `/api/v1/compliance/rg/restrictions` now includes `pointUseLimits` and `predictionLimits` aliases beside legacy fields. Legacy deposit/bet-named routes remain compatibility aliases and internal limit names still use legacy deposit/stake terms. |
| Rewards | `/rewards` loads loyalty standing, ledger, tiers, configured point packs, missions, streaks, badges, and reward-limit status, and shows tier progress, loyalty activity, real daily claim CTA, point-pack CTAs, mission CTAs, streak CTAs, non-redeemable badge status, point-pack no-cashout disclosure, and the daily reward grant limit backed by the wallet ledger. | Partial | `talon-backoffice/packages/app/app/rewards/page.tsx`; `claimDailyPoints` posts to `/api/v1/wallet/daily-claim`; `getPointPacks` and `claimPointPack` call `/api/v1/wallet/point-packs` and `/api/v1/wallet/point-packs/claim`; the point-pack control displays that points are non-redeemable gameplay points with no cashout, withdrawal, crypto, fiat, or prize path; `getMissions` and `claimMission` call `/api/v1/wallet/missions` and `/api/v1/wallet/missions/claim`; `getStreaks` and `claimStreak` call `/api/v1/wallet/streaks` and `/api/v1/wallet/streaks/claim`; `getBadges` calls `/api/v1/wallet/badges`; `getRewardLimitStatus` calls `/api/v1/wallet/reward-limits`; point-pack payloads expose ledger-derived `claimed` state and the rewards page refreshes mission/streak/badge/limit state after claims. Loop 117 live browser/API/SQL proof claimed daily points, a starter boost point pack, first-prediction mission, and daily-check-in mission; rendered claimed controls after reload; rendered 1-day streak progress, earned daily/mission badges, and point-safe ledger rows; and proved reward-limit, point-pack, mission, badge, streak-progress, and leaderboard snapshot API/SQL evidence. Loop 118 live browser/API/SQL proof seeded previous two daily-claim ledger rows, claimed today's daily reward through `/rewards`, refreshed the 3-day streak to `3 / 3`, claimed it, rendered `Claimed`, earned the Streak builder badge, and proved `streak_reward:u-1:daily_3` in the wallet ledger. Gateway tests prove one `daily_claim` ledger credit per UTC day, one `point_pack_grant` ledger credit per user/pack, mission rewards, streak rewards, badge derivation, reward-limit caps, hashed cluster caps, and admin review/export. Loyalty standing and reward payloads expose point-native aliases and `unit: "PTS"` without retired reward response aliases. Bonus UI/live proof and broader account-graph/multi-node abuse proof remain incomplete. |
| Leaderboards | `/leaderboards` loads board definitions, board entries, and viewer standing. | Partial | `talon-backoffice/packages/app/app/leaderboards/page.tsx`; real API-backed. Leaderboard public/admin API responses now include `unit`, `rewardSummary`, and `pointMetricKey` aliases and sanitize fallback seed definitions to `PTS` plus non-redeemable rank/status reward copy; office leaderboard admin forms prefer point aliases while translating legacy metric keys only at the payload boundary. Demo seed mode now recomputes Predict leaderboard snapshots after Phase 5 settlements, so seeded payouts can populate boards before the seed process exits. Needs live seeded evidence for the canonical journey. |
| Profile | `/profile` allows profile and compliance settings. | Partial | `profile/page.tsx`; includes point-use and prediction limits through launch-named client wrappers over inherited responsible-play services. |
| Social/chat | Market discussion now supports comments, replies, reactions, reports, share action, public profiles, follows, trade-fill activity, settlement activity, reward activity, leaderboard movement, and activity feed; office social moderation can review reported comments and export the report queue as formula-safe CSV; office activity export can review and export the merged prediction activity feed; social write bursts are rate-limited per user/action and optionally per client IP/action; global chat client can resolve room, create chat session, and report chat message. | Real | `app/components/prediction/MarketDiscussion.tsx`, `app/lib/api/market-social-client.ts`, `market/[ticker]/page.tsx`, `app/users/[userId]/page.tsx`, `app/activity/page.tsx`, office `app/(dashboard)/social-moderation/page.tsx`, office `app/(dashboard)/prediction-admin/activity/page.tsx`, and gateway `market_social_handlers.go`; SQL activity unions `prediction_trades` into user/global activity as `trade` items, `prediction_payouts` into user activity as settlement rows, `prediction_settlements` into global activity as market-resolution rows, `loyalty_ledger` into reward rows, and `leaderboard_snapshots` into leaderboard-rank rows. Gateway tests prove configured comment/report bursts return `429`, same-IP second-account comment/reaction/report/follow bursts return `429`, different-IP accounts can still write, blocked comments/reactions/reports/follows do not persist, `/api/v1/admin/social/reports?format=csv` emits sanitized report rows, and `/api/v1/admin/social/activity?format=csv` emits sanitized activity rows. Loop 116 live proof covered browser comment/reply/reaction/report, public profile/activity, second-user follow, admin report moderation/CSV export, and SQL rows. |
| Static legal/content pages | About, terms, privacy, TOS, responsible gaming pages exist. | Partial | Static copy now states points are non-redeemable and prohibits cashout/deposit/withdrawal semantics; legal disclaimers intentionally mention prohibited concepts only as prohibitions. |
| Bundled market copy | `market-content` locale fallback bundles provide titles/descriptions when API translations are absent. | Partial | `public/static/locales/*/market-content.json`; inherited crypto/Bitcoin/Solana and dollar-priced fallback values are now replaced with sports/esports/local-culture prediction topics across supported launch locales, and QA parses the JSON values for crypto/cash-value terms. Backend translation migrations `028` and `047` now use launch-safe GTA release copy instead of inherited asset-price translations. |

## Existing Backend/API Surfaces

| Area | Current State | Real / Mocked / Stubbed / Missing / Broken | Evidence |
|---|---|---:|---|
| Gateway health/status | `/healthz`, `/readyz`, `/api/v1/status`. | Real | `go-platform/services/gateway/internal/http/handlers.go`. |
| Auth | `/api/v1/auth/*` registered as public prefix. | Partial | `go-platform/services/gateway/cmd/gateway/main.go`; detailed auth handlers exist in `services/auth/internal/http`. |
| Discovery/categories/events/markets | `/api/v1/discovery`, `/api/v1/categories`, `/api/v1/series`, `/api/v1/tags`, `/api/v1/events`, `/api/v1/markets`. Market listings support search, sort, category, event, series, tag, and close-window filters. Launch category APIs filter inherited `crypto` taxonomy and reject crypto/cash-like admin category creation; discovery import skips crypto-like upstream rows before promotion. | Real | `prediction_handlers.go`; `prediction.Service.ListCategories/GetCategory/CreateCategory`; `discover.Classify/Promote`; `buildMarketWhere`; schema in migrations `014_prediction_schema.sql`, `046_taptrade_launch_taxonomy.sql`, and `047_taptrade_launch_translation_cleanup.sql`; `prediction_series.tags`; gateway launch-taxonomy and discover tests. |
| Market detail subresources | `/api/v1/markets/{id-or-ticker}` supports trades/orderbook/history-style subpaths. | Real | `prediction_handlers.go` route prefix and frontend calls `getMarketTrades`, `getOrderBook`. |
| Orders | `/api/v1/orders`, `/api/v1/orders/preview`, `/api/v1/orders/{id}`. | Real | `prediction_handlers.go`; order validation tests and exchange tests exist. `/api/v1/orders/preview` now returns read-only AMM curve quotes for legacy AMM markets while `PlaceOrder` still rejects retired AMM execution. Order placement accepts preferred `pricePointsCents` and `notionalCapPointsCents`; order responses expose `pricePointsCents`, `totalCostPointsCents`, `reservedPointsCents`, `capturedPointsCents`, `releasedPointsCents`, `filledCostPointsCents`, `notionalCapPointsCents`, and `unit: "PTS"` without `priceCents`, `totalCostCents`, `filledCostCents`, `notionalCapCents`, or retired cash-named aliases. Order preview responses expose point-native quote fields without legacy preview price/cost/fee/result/slippage aliases, and player preview UI consumes the point-native fields. Session order placement, order preview, and bot order placement now reject retired `priceCents`/`notionalCapCents` request bodies before service normalization; lower-level struct compatibility remains private. |
| Portfolio | `/api/v1/portfolio`, `/summary`, `/history`. | Real | `prediction_handlers.go`; consumed by `/portfolio`. Summary rows now expose only point-native summary fields in launch JSON/OpenAPI/shared client output, position rows expose `totalCostPointsCents`, `realizedPointsCents`, and `unit: "PTS"` without `totalCostCents` or `realizedPnlCents`, and settlement history exposes point-native result fields without payout/P&L aliases. |
| Settlement/admin | `/api/v1/admin/markets`, `/api/v1/admin/settlements/{id}`, resolution source/dispute endpoints, launch-facing lifecycle metadata, point-disbursement aliases, dispute void point-return copy, and lifecycle audit rows. | Real | `prediction_handlers.go`, `admin_dispute_handlers.go`, settlement and lifecycle tests. `DescribeTapTradeMarketLifecycle` maps engine statuses to TapTrade stages/actions; admin lifecycle/settlement responses include `taptradeLifecycle`; finalize/settle/void responses include `pointDisbursements`, `settlementPointsCents`, `realizedPointsCents`, `totalSettlementPointsCents`, and `unit: "PTS"` and no longer emit the retired operation-level `payouts` array or operation-row `payoutCents`/`pnlCents` aliases; office dispute-uphold confirmation describes voided markets as returning locked points instead of refunding stakes; `GET /api/v1/admin/markets/{id}/lifecycle` returns persisted `prediction_lifecycle_events` with actor, reason, timestamp, and mapped lifecycle metadata, and `?format=csv` exports formula-safe CSV rows. |
| Wallet/ledger | `/api/v1/wallet/{userId}`, `/ledger`, `/breakdown`, `/starter-grant`, `/daily-claim`, `/point-packs`, `/point-packs/claim`, `/missions`, `/missions/claim`, `/streaks`, `/streaks/claim`, `/badges`, `/reward-limits`, admin credit/debit. | Real but unsafe naming | `wallet_handlers.go`; real ledger storage in `006_wallets_ledger.sql`; public balance, ledger, breakdown, and reward responses now include point-native aliases and `unit: "PTS"` without retired response aliases. User app wallet and bonus clients now expose balance, ledger, starter grant, daily claim, point packs, missions, streaks, badges, reward-limit status, and wallet breakdown only through point-normalized client objects, prefer point aliases, and normalize launch balance/reward/ledger/breakdown units as `PTS`, but backend route and storage naming remains wallet/cents-oriented. |
| Bonuses/campaigns | `/api/v1/bonuses/*`, `/api/v1/admin/campaigns`, `/api/v1/admin/bonuses`. | Partial | `bonus_handlers.go`; legacy player bonus responses now expose `grantedPointsCents`, `remainingPointsCents`, `playRequiredPointsCents`, `playCompletedPointsCents`, `playProgressPct`, and `unit: "PTS"` for active, claim, detail, and progress payloads without the retired amount/wagering response aliases. The user-app bonus client accepts older payload names only as private fallback inputs and exports point-native bonus/progress/breakdown state. Admin campaign responses now expose `budgetPointsCents`, `spentPointsCents`, and sanitized `pointRuleConfig` aliases for reward/trigger contribution amounts without retired budget/spent fields, raw campaign `rules`, raw `ruleConfig`, or retired rule amount keys. The visible progress component uses point-play language. The legacy campaign engine still carries wagering-shaped internal/admin concepts and should not be counted as TapTrade point packs or missions. |
| Loyalty | `/api/v1/loyalty`, `/standing`, `/ledger`, `/tiers` and admin loyalty endpoints. | Real | `predict_loyalty_handlers.go`, `loyalty_handlers.go`, migration `015_loyalty_leaderboards.sql`; admin config/create/update rule payloads now expose and accept `predictionSourceType`, `minQualifiedPointsCents`, and `eligiblePredictionTypes` aliases while preserving inherited `sourceType`, `minQualifiedStakeCents`, and `eligibleBetTypes` compatibility fields. Loyalty ledger entries expose `predictionSourceType`, `predictionSourceId`, and sanitized metadata aliases (`predictionId`, `pointVolumeCents`, prediction-settlement reason text), and office loyalty settings/detail pages prefer prediction-settlement and point-unit reward copy at the payload/display boundary. |
| Leaderboards | `/api/v1/leaderboards`, `/api/v1/leaderboards/{id}/entries`, `/api/v1/me/leaderboards`; admin leaderboard routes. | Real | `predict_leaderboard_handlers.go`, `predict_leaderboards_admin_handlers.go`, `leaderboard_handlers.go`; admin/public leaderboard payloads expose `unit`, `rewardSummary`, and `pointMetricKey` without retired `currency`/`prizeSummary` response aliases. Admin create/update request parsing now rejects those retired write aliases before persistence. |
| Compliance | KYC/geofence/responsible-play handlers and admin KYC decision. | Partial | `internal/compliance`, `kyc_admin_handlers.go`; gateway now exposes point-use and prediction-limit aliases beside legacy compatibility routes, accepts point-native `amountPointsCents`, returns point-native limit/check/restriction fields with `unit: "PTS"`, normalizes limit-denial reasons to point-use/prediction copy, and user-app profile/RG history use those aliases plus point-use/prediction history labels. Launch point-use/prediction mutation and check routes now reject retired `amountCents`, `stakePointsCents`, and `stakeCents` request aliases before service normalization while explicitly named legacy compatibility routes keep transitional parsing. Deeper backend service/type names still need points-only age/geography/responsible-play cleanup. |
| Cashier/crypto | Alpha cashier, legacy payment, and crypto APIs exist in code but are not registered by default in the TapTrade gateway; office cashier UI is retired. | Partial | `internal/http/handlers.go` gates `/api/v1/cashier/alpha/*`, `/api/v1/admin/cashier/alpha/*`, `/api/v1/payments/*`, and `/api/v1/payments/crypto/*` behind `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED=true`; `cmd/gateway/main.go` excludes payment webhook/provider callback auth and CSRF bypasses by default and rejects legacy opt-in or `ALPHA_CASHIER_ENABLED=true` in deployed environments. Office deleted `/cashier`, `cashier-review`, admin payment wallet actions, and cashier locale copy with a source safety scan. |
| Content/CMS | `/api/v1/content`, `/api/v1/banners`, admin content pages/banners. | Real | `content_handlers.go`. |
| Bot API | Bot keys/orders/positions/markets. | Partial | `bot_handlers.go`; must ensure bots cannot bypass points/economy controls. |
| Social comments/follow/activity/moderation | Prediction-native market comments, replies, reactions, reports, public profiles, follows, trade-fill activity, settlement activity, reward activity, leaderboard-rank activity, global activity feed, admin report moderation and CSV export, admin activity review and CSV export, per-user/action write rate limits, and optional per-client-IP/action write rate limits exist. | Partial | `internal/http/market_social_handlers.go` registers `/api/v1/social/markets/{marketId}/comments`, `/api/v1/social/comments/{commentId}/{react,report}`, `/api/v1/social/users/{userId}/{profile,follow,activity}`, `/api/v1/social/activity`, `/api/v1/admin/social/activity`, `/api/v1/admin/social/activity?format=csv`, `/api/v1/admin/social/reports`, `/api/v1/admin/social/reports?format=csv`, and `/api/v1/admin/social/reports/{id}/resolve` with SQL-backed storage when DB exists and memory tests otherwise; SQL user/global activity includes persisted `prediction_trades`, `prediction_payouts`, `prediction_settlements`, `loyalty_ledger`, and `leaderboard_snapshots`; social write limits use `SOCIAL_WRITE_RATE_LIMIT_PER_MIN` / `SOCIAL_WRITE_RATE_LIMIT_BURST` and optional `SOCIAL_WRITE_IP_RATE_LIMIT_PER_MIN` / `SOCIAL_WRITE_IP_RATE_LIMIT_BURST`. Live browser proof remains missing. |

## Existing Data Models

| Model | Fields | Current State | Gaps |
|---|---|---|---|
| `punters` | User identity referenced by wallet, prediction, loyalty. | Real | Full fields not inspected; account creation must grant starter points and disclosure acceptance. |
| `wallets` | `id`, `punter_id`, `balance_cents`, `bonus_balance_cents`, `currency_code`, timestamps. | Real but unsafe naming | Product needs points ledger copy and no `currency_code`/cash-equivalent UI. |
| `ledger_entries` | Wallet ledger entries with type, amount, before/after, reference. | Real | Must guarantee every point movement writes a ledger entry and expose as points only. |
| `prediction_categories` | `slug`, `name`, `icon`, `sort_order`, `active`. | Real | Migration `046_taptrade_launch_taxonomy.sql` seeds `esports` and deactivates inherited `crypto`; service-level launch filters keep inherited crypto taxonomy out of public/admin lists and reject crypto/cash-like category creation. Category/tag management still needs live admin proof. |
| `prediction_series` | Recurring series with category, frequency, tags. | Real | Public series/tag discovery now exists; admin category/tag/series parity still needs verification. |
| `prediction_events` | Event title/status/category/open/close/settle metadata. | Real | Required lifecycle has draft/review/open/paused/closed/resolving/resolved/canceled/invalid/settled; current persisted market enum differs, but a strict `DescribeTapTradeMarketLifecycle` presentation mapping now covers draft/open/paused/closed/resolving/settled/invalid stages for admin surfaces. |
| `prediction_markets` | Ticker/title/status/result/prices/volume/liquidity/AMM state/settlement rules/fee/execution mode. | Real | Status enum lacks exact required states; UI must honestly show order book vs AMM. |
| `prediction_orders` | User, market, side, action, type, price, quantity, fill status, reservation, idempotency, TIF, post-only. | Real | Service tests now cover order-book buy YES, buy NO issuance, sell YES, cancellation of resting buy/sell orders, and insufficient-points rejection; still need close UX, slippage/limit UX, and live API/browser proof. |
| `prediction_positions` | User, market, side, quantity, reserved, avg price, cost, realized P/L. | Real | Service tests cover buy/sell position mutation and reserved-share release on sell cancellation; user-facing labels improved to points in main launch paths, but backend naming remains legacy and live portfolio refresh still needs proof. |
| `prediction_trades` | Market, buyer/seller, side, price, quantity, fees, trade kind, engine kind. | Real | Activity feed/social visibility incomplete. |
| `prediction_settlements`/`prediction_payouts` | Resolution result, attestation, override audit, per-position payout. | Real | Required resolved YES/NO/canceled/invalid state semantics need alignment. |
| `prediction_lifecycle_events` | Market lifecycle audit with actor/reason/metadata. | Real | Loop 119 live proof verifies created/edited/open/halted/closed/settled rows and CSV export for one admin workflow. Loop 311 live proof verifies the dual-admin proposed-resolution, holder-dispute, challenge-window, and second-admin finalization variant against a migrated/seeded stack. Backend/API legacy naming still needs compatibility cleanup. |
| `prediction_collateral_ledger` | Per-market collateral movements. | Real | Must be reconciled with points-only user ledger wording. |
| `loyalty_accounts`/`loyalty_ledger` | Points balance, tier, accrual/promotion ledger. | Real | Configured point packs, daily claim, daily check-in, first-prediction, three-predictions, five-predictions, ten-predictions, settled-result, three-settled-results, five-settled-results, ten-settled-results, weekly check-in, monthly check-in, seasonal check-in, quarterly check-in, and leaderboard debut missions, the 3-day, 7-day, 14-day, 30-day, 60-day, and 90-day check-in streaks, and badge status including leaderboard-debut, prediction-regular, prediction-veteran, prediction-expert, streak-champion, monthly-streak, double-monthly-streak, quarterly-streak, monthly-check-in, seasonal-check-in, quarterly-check-in, settlement-regular, settlement-veteran, and settlement-expert are wallet-ledger backed or leaderboard-derived rather than loyalty-ledger backed; live catalog evidence is still missing. |
| `leaderboard_snapshots` | Board/user/window/rank/metric. | Real | Demo seed mode now runs the Predict recomputer after seeded settlements; live seeded journey evidence that users appear remains pending. |
| `prediction_market_comments` / reactions / reports / follows | Comment id, market id, optional parent id, user id, body, created timestamp, per-user reaction/report rows with review status, and per-user follow rows. | Partial | Migration `044_prediction_social.sql` owns the SQL schema; `sqlMarketSocialStore` still keeps runtime `CREATE/ALTER IF NOT EXISTS` guards for local/legacy DBs; tests cover memory behavior, admin moderation, configured per-user social write rate-limit blocking, and optional per-IP multi-account comment/reaction/report/follow blocking without persisting blocked writes. Needs live SQL migration proof. |
| `prediction_market_watchlist` | User id, market id, created timestamp. | Real | Migration `045_prediction_market_watchlist.sql` and `market_watchlist_handlers.go` provide per-user persistent market favorites/watchlists through `/api/v1/watchlist/markets`. Loop 114 live proof added `MLBB-FINAL-G1` for an authenticated user, rendered `Watching`, and the watchlist filter showed only that market. |
| Cashier tables | Deposit/withdrawal/USDC/reconciliation state. | Broken for TapTrade launch | Must be removed, disabled, or isolated from launch build. |

## Existing Game Economy

| Mechanic | Current State | Risk / Gap |
|---|---|---|
| Starter points | `/api/v1/wallet/starter-grant` exists and signup now calls it after automatic login. | Live gateway/auth/browser proof shows a newly registered session user receiving one idempotent 500000 point-cent starter credit, visible both through authenticated `/api/v1/wallet/{userId}/ledger` and `/account/transactions`. The DB idempotency path now recovers concurrent same-payload starter-grant races without duplicating the ledger row; wallet/cents wording remains internally. |
| Daily claim | `/api/v1/wallet/daily-claim` exists and `/rewards` exposes a claim button for signed-in users, including users with no settled loyalty activity yet. | Real but partial: claim amount is operator-configured via `DAILY_CLAIM_CENTS`; gateway tests prove the endpoint credits only the session user, dedupes by UTC day, writes one `daily_claim` ledger entry, can block a second account from claiming on the same configured device signal without writing a ledger row, and can preserve the same-device cap across route/service restart using hashed non-ledger cluster state. Broader account-graph/multi-node/live abuse proof remains incomplete. |
| Point ledger | Wallet ledger and loyalty ledger exist. | Main account ledger now displays points, has helper-level tests for labels/deltas, gateway balance/ledger/breakdown payloads expose point aliases and `PTS` units, portfolio settlement-history payloads expose `realizedPointsCents`/`settlementPointsCents`/`PTS`, preserves gateway movement types and idempotency keys in the user app client, normalizes launch wallet balances/transactions/breakdowns as `PTS` rather than `USD`, no longer exports user-app payment mutation helpers or cashier/crypto payment clients, and uses a `pointBalance` Redux slice instead of a cashier-named balance slice. `WalletBreakdown` now renders Base Points and Bonus Points from `basePointsCents`/`bonusPointsCents` instead of legacy real-money/fund fields. Wallet reservations now add non-balance-changing `reservation` and `release` ledger rows so resting order locks and cancellation unlocks can be reviewed, and portfolio cancel-order copy says reserved points were unlocked. Backend service names and cents fields remain legacy. |
| Trading points | Orders reserve/capture/release wallet balance. | Trade ticket terminology is points-only; service tests prove buy YES hold/capture/release/seller credit, buy NO complementary issuance with taker+maker reservation capture, sell YES seller credit without seller cash hold, resting buy cancellation releasing held points and responsible-play commitment, resting sell cancellation releasing reserved shares, prediction-limit denials returning prediction wording instead of inherited bet-limit copy, HTTP order errors carrying `prediction_limit_exceeded`/`responsible_play_blocked` reason codes, position mutation, collateral ledger plan emission, and insufficient-points rejection before capture/credit. A live SQL-backed bot API proof now shows a seeded order-book BUY YES writing a `prediction_fill` debit, reducing available points, and increasing the user YES position. Wallet reservation holds/releases now write point-ledger markers, the ledger UI labels order locks, fills, proceeds, and unlocks, and order API payloads/client normalization prefer point-native order-cost aliases. Loop 163 removes `reservedCashCents`, `capturedCashCents`, and `releasedCashCents` from order launch JSON, OpenAPI docs, and exported shared client types while retaining internal DB fields and a private old-response fallback reader. Needs broader live visible session variants, close UX, and remaining compatibility cleanup evidence. |
| XP/tiers | Loyalty points and rank ladder exist. | Predict standing and public tier responses now expose XP/rank aliases without retired tier/threshold response aliases, and the player app uses rank fields with private fallback parsing for old responses. Broader admin terminology cleanup and live reward catalog evidence remain incomplete. |
| Rewards | Rewards page shows loyalty tiers, ledger, daily claim, configured point packs with explicit no-cashout disclosure, daily check-in, first-prediction, three-predictions, five-predictions, ten-predictions, settled-result, three-settled-results, five-settled-results, ten-settled-results, weekly check-in, monthly check-in, seasonal check-in, quarterly check-in, and leaderboard debut missions, 3-day, 7-day, 14-day, 30-day, 60-day, and 90-day check-in streaks, non-redeemable badge status including leaderboard-debut, prediction-regular, prediction-veteran, prediction-expert, streak-champion, monthly-streak, double-monthly-streak, quarterly-streak, monthly-check-in, seasonal-check-in, quarterly-check-in, settlement-regular, settlement-veteran, and settlement-expert, a ledger-backed daily reward grant limit, and optional device/IP distinct-user reward caps backed by hashed wallet-service cluster evidence outside the point ledger, admin-only hashed reward-cluster review/export at `/api/v1/admin/wallet/reward-clusters` plus office `/prediction-admin/reward-clusters`, and DB schema ownership in `048_wallet_reward_clusters.sql`. Reward APIs expose point-native aliases and claimed state for point packs without retired reward response aliases, and the user app client exports point-native reward objects while keeping older payload parsing private; demo seed mode now adds the previous two days of demo-user daily-claim ledger evidence so a reviewer can claim today's daily reward and then a live 3-day streak. Legacy bonus/progress payloads now also expose point aliases and point-play copy. | Loop 117 proves live daily claim, point pack, mission rewards, badge state, leaderboard standing, reward-limit accounting, and no-cashout disclosure. Loop 118 proves live seeded 3-day streak claiming, streak-reward ledger credit, and Streak builder badge earning. Bonus UI proof and broader account-graph/distributed abuse proof remain incomplete. |
| Leaderboard | Predict-native leaderboards exist, and demo seed mode refreshes snapshots after seeded settlements. Full demo seed proof now covers a fresh migrated DB run and a rerun that cleans existing demo ledger/settlement/order/trade state before recomputing leaderboards. | Requires live browser seeded journey evidence and no cash-equivalent prizes. |
| Abuse controls | Compliance, rate limits, idempotency, bot limits, reservations, daily-claim UTC-day idempotency, one-time point-pack idempotency, daily, first-prediction, three-predictions, five-predictions, ten-predictions, settled-result, three-settled-results, five-settled-results, ten-settled-results, weekly-check-in, monthly-check-in, seasonal-check-in, and quarterly-check-in mission reward idempotency, one-time 3-day, 7-day, 14-day, 30-day, 60-day, and 90-day streak reward idempotency, read-only badge derivation, `REWARD_DAILY_GRANT_LIMIT_CENTS` ledger-backed daily reward cap, optional `REWARD_DAILY_MAX_USERS_PER_DEVICE` / `REWARD_DAILY_MAX_USERS_PER_IP` distinct-user reward caps persisted as hashed wallet-service cluster markers outside the point ledger with DB schema ownership in `048_wallet_reward_clusters.sql`, admin-only hashed reward-cluster review/export with an office suspicious-activity view, and social write token-bucket limits per user/action plus optional per client IP/action exist. | Broader account-graph clustering and multi-node/live proof need product-specific implementation. |
| Monetization | User-facing cashier route removed; gateway cashier/payment/crypto rails are absent by default; office cashier surfaces removed. Configured non-redeemable point packs can be granted once per user/pack through point-ledger entries. | Paid point-pack monetization remains unbuilt; backend payment/cents contracts still need points-only cleanup. |

## Existing Admin/Operations Tooling

| Tooling | Current State | Gap |
|---|---|---|
| Backoffice app | `talon-backoffice/packages/office` has prediction/admin dashboard routes, social report moderation/review export, prediction activity review/export, admin market list export, launch-facing lifecycle labels, lifecycle audit review/export, settlement replay controls, dispute uphold copy for returning locked points, taxonomy management, leaderboard admin unit/reward-summary copy, loyalty prediction-settlement copy, point-accounting risk review/export, hashed reward-cluster suspicious-activity review/export via `/prediction-admin/reward-clusters`, and point-ledger user inspection in prediction market/settlement/dispute/risk/user operations, and no launch cashier route. The legacy `/campaigns` office route redirects to `/dashboard`, while gateway admin campaign JSON now exposes point aliases where the legacy API remains registered. | Need verify broader non-risk report flows and continue backend/admin contract naming cleanup where wallet/cents terms remain. |
| Market management | Prediction admin markets route/container exists, uses the admin market list so draft markets are visible, exports the same market list as formula-safe CSV, exposes Open/Pause/Close/Cancel/Invalidate controls with lifecycle-audit reasons, includes an Edit Market modal wired to `PUT /api/v1/admin/markets/{id}`, and shows a Lifecycle Audit modal for persisted state changes with CSV export. Gateway supports `GET/PUT /api/v1/admin/markets/{id}` for admin read/edit without bypassing lifecycle state transitions. | Loop 119 live API proof covers create/edit/open/pause/resume/close/settle/cancel/audit/export; Loop 120 source/build/browser proof covers office edit wiring, successful UI save, persisted market title, and lifecycle audit rows. Dual-control propose/finalize variants remain. |
| Settlement management | Prediction settlements route/container and admin settlement endpoints exist; settlement queue renders lifecycle labels and points-formatted volume/drift copy, consumes point-disbursement response aliases, and exposes Replay Points for incomplete settlement point disbursements. | Loop 119 live API proof covers direct settlement and replay; office browser proof and challenge-window finalization variants remain. |
| Audit logs | Audit routes/components exist, and prediction market lifecycle events are now visible and CSV-exportable from each office market row; settlement replay is audit-recorded as an admin operation. | Loop 119 live proof covers per-market lifecycle audit JSON/CSV; global audit-log visibility for every launch admin workflow still needs review. |
| Risk management | Admin prediction risk route exists and renders settlement aging, cost-basis concentration, reserved points, open point cost, max returned points, resting orders, non-terminal markets, and collateral drift alerts from `/api/v1/admin/prediction/risk` with point-denominated copy. The JSON response now includes only point-native `pointAccounting` fields (`openPositionPointCostCents`, `maxSettlementPointsCents`, `reservedPointsCents`) and concentration fields (`openPointCostCents`, `maxReturnedPointsCents`) for the risk snapshot, matching the launch OpenAPI contract; office `/prediction-admin/risk` consumes that point-native contract and treats missing point-accounting data as an error instead of translating retired money/cash aliases. The same snapshot is exportable from `/api/v1/admin/prediction/risk?format=csv` and office `/prediction-admin/risk` as formula-safe point-accounting CSV. | Loop 119 live API proof covers risk JSON/CSV; Loop 161 source/typecheck proof removes office risk fallback usage of `moneyInvariants`, `reservedCashCents`, `maxSettlementLiabilityCents`, `openCostCents`, and `maxPayoutLiabilityCents`; Loop 162 gateway JSON tests remove those aliases from the risk payload itself; broader suspicious-activity/anti-manipulation checks beyond hashed reward clusters remain. |
| User ledger inspection | User detail profile and legacy wallet table now expose point balance, portfolio points, point movement rows, point-safe ledger type labels, and `Point Ledger` CSV export; the old manual funds transaction modal is retired. | Loop 119 live API proof covers `/api/v1/admin/punters/u-1/wallet?limit=20`; backend route/field names still use wallet/cents terminology. |
| Category/tag management | Admin category/series/tag routes and office taxonomy page exist; admins can create categories and tagged series, then review active tags. Gateway services reject admin-created crypto/cash-like categories for launch taxonomy. | Need live seeded-stack proof and any edit/deactivate workflow required beyond create/list. |
| Reports/export | Reports routes and CSV/export helpers exist in backoffice; per-market lifecycle audit rows, admin market list rows, prediction risk snapshots, hashed reward-cluster evidence, social moderation report queues, and merged prediction activity rows now export as formula-safe CSV, with market-list, reward-cluster, social-report, and activity exports exposed from office `/prediction-admin/markets`, `/prediction-admin/reward-clusters`, `/social-moderation`, and `/prediction-admin/activity`. The admin market-list CSV has live proof from a temporary migrated/seeded gateway returning `prediction-markets.csv` rows. | Need broader live proof for the remaining admin exports and workflows against a seeded stack. |

## Mocked or Hardcoded Functionality

| Feature | Location | What must be made real |
|---|---|---|
| Market detail live proof | `/market/[ticker]` renders real order-book depth or explicit AMM liquidity visualization with price marker, reserve split, subsidy, curve K, and preview-backed impact quotes. | Run browser/API proof for both execution modes, including empty/unavailable order-book states and AMM quote ladder loading/error states. |
| Discovery live proof | `/predict`, `/discover`, `/category/[slug]`, and `/series/[slug]` discovery journeys. | Completed in Loop 114 for market list, search, category/tag filters, close-window filters, activity/closing-soon/newest sorts, watchlist persistence/filtering, public series/tag taxonomy, series route, and history-backed movement; keep as regression scope for future discovery changes. |
| Related markets live proof | `market/[ticker]/page.tsx` now prefers same event, recurring series, and category before generic fallback. | Run browser/API proof on markets with event, series, and category siblings. |
| Static/legal launch copy | Static pages, launch-loaded locale bundles under `app/*/page.tsx` and `public/static/locales/{en,id,ms,tl,zh-Hans,zh-Hant}`, plus office English translation values. | Keep parsed locale values point-only; Loops 121-122 cleaned footer, portfolio, leaderboard, reward, point-limit, account-status, API-error, register, transaction-history, and win/loss-stat values and expanded the locale regression scan to every supported launch-language JSON bundle. Loop 123 added parsed office English translation scans and cleaned remaining rendered admin translation money/sportsbook labels. |
| Legacy sportsbook seed data | `go-platform/services/gateway/seed-data.json`, `seed-data/seed_prediction.sql`, and backend taxonomy/import/feed compatibility. | Use TapTrade prediction seed/demo data only for launch; user-app bundled fallback market copy is now launch-safe, gateway launch category APIs hide/deactivate inherited crypto taxonomy, discovery import skips crypto-like upstream rows, backend translation migrations now use safe GTA release copy, launch market creation rejects asset-price settlement sources/rules/copy, default feed registration excludes the legacy asset-price adapter, and prediction seed data now uses esports/manual markets plus `PTS` wallets while removing old deterministic asset-price seed rows on re-run. Full demo seed mode now tolerates a fresh migrated DB before runtime `wallet_ledger` creation, cleans demo wallet ledger rows on rerun when the table exists, and prints top-up/open-market summaries in `pts`. |
| Cashier UI state | User route/components/clients removed; gateway money routes are launch-disabled by default; office cashier route/container/menu/actions removed. | Replace monetization with a non-redeemable point-pack surface if required, with no cash value and ledger entries. |
| Chat/social | `chat-client.ts` is global-room oriented; market comments UI/API, share action, profiles, follows, trade-fill, settlement, reward, and leaderboard activity feed rows, and office report moderation now exist. | Completed in Loop 116 for market comment, reply, reaction, report, public profile, follow, user activity, moderation resolve, CSV export, and SQL persistence; keep as regression scope for multi-node/social-spam hardening. |

Loop 386 update: the active office user-limit editor no longer uses
stake/loss-shaped active names for the point-use limit. The form field is
`pointUse`, the translation key is `HEADER_CARD_LIMITS_POINT_USE`, and the
enum member is `TapTradePunterLimitsTypesEnum.POINT_USE`, while the inherited
serialized API value remains `"stake"` for compatibility. The focused office
route/source regression passed with 22 tests, the edited-file source scan found
no active `values.losses`, `field="losses"`, `HEADER_CARD_LIMITS_LOSS`,
`TapTradePunterLimitsTypesEnum.STAKE`, or `STAKE =` matches, and the preservation
modification gate wrote
`revival/artifacts/preservation_modification_map_20260629_095303.md`.
Scenarios 10, 11, and 12 remain Partial because this is a narrow office
terminology cleanup, not final backend/API or RC evidence.

Loop 387 update: the office limit-history type now uses point-native enum
member names for responsible-play history rows while preserving inherited
serialized API/history values. `POINT_ADD_AMOUNT` maps to `"DEPOSIT_AMOUNT"`
and `PREDICTION_POINT_AMOUNT` maps to `"STAKE_AMOUNT"`; the rendered translation
values remain `Point add amount` and `Prediction point amount`. The focused
office regression passed with 22 tests, the edited-file source scan found no
active `LimitTypeEnum.DEPOSIT_AMOUNT`, `LimitTypeEnum.STAKE_AMOUNT`,
`DEPOSIT_AMOUNT =`, or `STAKE_AMOUNT =` matches in the office type/history
files, and the preservation modification gate wrote
`revival/artifacts/preservation_modification_map_20260629_095613.md`.
Scenarios 10, 11, and 12 remain Partial because this is a narrow office type
cleanup, not final backend/API or RC evidence.

Loop 388 update: the office limit-history table now maps inherited backend
history values to point-native translation keys before rendering. The component
maps `DEPOSIT_AMOUNT` to `LIMIT_TYPE_POINT_ADD_AMOUNT` and `STAKE_AMOUNT` to
`LIMIT_TYPE_PREDICTION_POINT_AMOUNT`, while preserving the inherited serialized
values for compatibility. The focused route/source regression passed with 22
tests, and scenarios 10, 11, and 12 remain Partial.

Loop 389 update: the Office user-details financial-summary translation keys now
use point-native names for point-summary labels. Lifetime points added,
lifetime points used, and pending point use are keyed by
`HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_POINTS_ADDED`,
`HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_POINTS_USED`, and
`HEADER_CARD_FINANCIAL_SUMMARY_PENDING_POINT_USE` instead of the inherited
deposit/withdrawal-shaped key names. Rendered values are unchanged and remain
point-safe. The focused office route/source regression passed with 22 tests,
and scenarios 10, 11, and 12 remain Partial.

Loop 390 update: the remaining Office English translation values that rendered
`Sportsbook` in account-review/point-ledger surfaces now render legacy
compatibility copy instead. `CELL_PRODUCT_SPORTSBOOK` renders
`Legacy sports feed`, and the user-details financial-summary exposure label
uses `HEADER_CARD_FINANCIAL_SUMMARY_LEGACY_SPORTS_FEED_EXPOSURE` with
`Legacy Sports Feed Open Exposure`. The compatibility resolver for inherited
product rows remains intact. The focused office route/source regression passed
with 23 tests, and scenarios 10, 11, and 12 remain Partial.

Loop 391 update: the dormant Office user bet-cancel component no longer carries
the retired `admin/bets/:id/cancel` operation string. The inherited file path
is preserved as a null compatibility stub, but the component no longer imports
the API hook, uses the `page-bets` namespace, or builds a cancellation payload.
The focused office route/source regression passed with 23 tests, and scenarios
10, 11, and 12 remain Partial.

Loop 392 update: Office English translation keys for prediction trades, open
positions, cancel order, and prediction ledger labels no longer use inherited
bet-shaped key names. Rendered values remain unchanged and point-safe. The
focused office route/source regression passed with 23 tests, and scenarios 10,
11, and 12 remain Partial.

Loop 393 update: the Office README current admin-surface section no longer
describes loyalty and leaderboard administration as `sportsbook-native`. It now
uses point-native TapTrade, point-ledger, and XP/rank wording, and the focused
office route/source regression guards the README section against launch-
prohibited inherited admin-doc wording. The preservation modification gate now
classifies the Office README as an Office admin and operations surface.
Scenarios 10, 11, and 12 remain Partial.

Loop 394 update: active Office navigation and risk source comments no longer
use inherited sportsbook-era wording for the retired risk-management
compatibility paths. The menu compatibility comments, prediction risk page
comment, and risk-management redirect comment now describe retired pre-TapTrade
or legacy compatibility surfaces while preserving behavior. The focused office
route/source regression passed with 25 tests, and scenarios 10, 11, and 12
remain Partial.

Loop 395 update: the Office audit-log scoped-copy URL boundary now ignores
unsupported inherited promo query keys such as `freebetId` and `oddsBoostId`.
Copied audit-log handoff URLs allow only launch-supported audit filters and
paging keys, and scoped-copy telemetry signatures count only launch-supported
filters. The raw inherited audit type fields remain for compatibility. Focused
audit-log Jest tests passed with 28 tests, the Office route/source regression
passed with 25 tests, and scenarios 10, 11, and 12 remain Partial.

## Critical Gaps

1. Continue cleanup of remaining launch-prohibited internal wallet/cents/payment contracts; user-facing cashier routes/components/API clients/store slice are removed, office cashier surfaces are retired, gateway cashier/payment/crypto route registration is off by default, gateway public/CSRF bypass lists, runtime route-domain summaries, and infrastructure metrics now have launch-mode tests proving legacy money paths are not exposed or advertised, launch market creation rejects asset-price settlement sources/rules/copy, launch-loaded locale values now have parsed-value safety coverage, and current gateway launch docs are guarded against money/cashier/crypto wording.
2. Continue trading proof beyond the now-completed session BUY YES/SELL YES/BUY NO, settlement-to-ledger, and insufficient-points browser evidence: broader admin/dispute, rewards/social, and backend terminology cleanup still need live proof.
3. Continue admin lifecycle hardening after Loop 120 office edit wiring: strict state/action mapping, lifecycle audit review/export, settlement replay, category/series/tag creation, point-ledger inspection, risk/market exports, and source/build/browser-tested office edit controls now exist; dual-control propose/finalize variants and backend/admin naming cleanup remain.
4. Keep discovery as a regression baseline after Loop 114: search/category/close-window/activity/closing/new sorts/watchlist/tag/series/history-backed movement now have live proof, so future discovery work should preserve that evidence.
5. Market detail is now accepted for the launch parity scenario: Loop 115 proves live resolution metadata, history controls, honest order-book/AMM liquidity, recent trades, discussion shell, share action, and related markets; Loop 116 proves live comment/reply/reaction/report/profile/follow/moderation and SQL persistence. Keep paused/closed/resolved detail variants in regression scope.
6. Verify remaining trading journey gaps beyond the proved buy/sell/settlement/insufficient-points path: broader close/cancel UX, admin/dispute edge cases, and backend terminology cleanup. Service-level order-book tests now cover buy YES, buy NO issuance, sell YES, cancellation release for held points/reserved shares, position mutation, wallet reservation/capture/release/seller-credit behavior, collateral ledger plan emission, and insufficient-points rejection. Loop 111 browser proof covers session BUY YES, SELL YES, BUY NO, balance refresh, visible positions, point-ledger lock/fill/proceeds/unlock rows, and activity rows on live data; Loop 112 covers settlement-to-ledger; Loop 113 covers clean insufficient-points rejection without ledger/order/reservation mutation.
7. Finish replacing legacy wallet/cents names in API docs/admin/internal surfaces; launch user displays, office user-detail ledger displays, launch-loaded locale bundle values, and the current Go platform README/gateway OpenAPI launch prose now use gameplay point labels in the main market/account/portfolio/admin/docs paths, and the gateway OpenAPI now covers the admin market edit/lifecycle/replay, responsible-play limits/restrictions, reward/game-economy, loyalty XP/rank, reward-cluster review/export, social/comment/moderation/activity, admin prediction risk, and Predict leaderboard API slices.
8. Keep social and bot/API abuse controls as a regression baseline: Loop 116 proves live comments, replies, reactions, reports, profiles, follows, activity, moderation resolve/export, and SQL persistence; Loop 138 proves bot responsible-play/prediction-limit denials use point-safe structured details and stop before order persistence; Loop 139 proves bot orders share session HTTP validation for capless market buys and invalid exchange fields before market lookup or order persistence; Loop 140 documents and guards the bot API validation, point-reservation, rate-limit, and read-only position contracts in launch OpenAPI; Loop 141 documents and guards bot-key list/create/revoke plus RBAC-gated partner-key issue/list as no-point-movement key-management surfaces; Loop 142 rejects wildcard/unknown key scopes before persistence and documents only `read`/`trade` as launch key scopes. Broader multi-node/social-spam proof remains under safety hardening.
9. Add remaining game economy hardening: Loop 117 now proves live browser/API/SQL daily claim, point-pack, mission, badge, leaderboard, reward-limit, claimed-state, and point-ledger behavior. Loop 118 now proves live seeded 3-day streak reward claiming and badge earning. Bonus UI proof, broader account-graph/distributed abuse proof, and multi-node reward-cluster proof remain incomplete.
10. Keep Loop 119 admin lifecycle/export proof and Loop 120 office edit browser proof in regression scope while adding dual-control resolution variants and backend/admin terminology cleanup.

## Recommended Build Order

1. Safety boundary continuation: clean up remaining backend wallet/cents/payment terminology and keep launch safety scans enforced across user and office apps.
2. Settlement trading slice: resolve/settle a traded market, verify closed/settled portfolio history, point-ledger settlement rows, and replay idempotency.
3. Points ledger terminology slice: rename user-visible wallet/money labels to points, update portfolio/transactions/account.
4. Market discovery slice: completed in Loop 114; keep search/filter/sort/watchlist/category/tag/series/history proof in regression coverage.
5. Market detail/trading slice: real depth/history/activity, comments/share, buy/sell/close verification, insufficient-points tests.
6. Admin lifecycle slice: create/edit/open/pause/close/resolve/cancel/settle/replay/audit/export.
7. Rewards/social slice: daily claim, point packs, missions, streaks, badges, follows, activity feed, moderation/reporting, and live social proof.

## Loop 164 Audit Update

Admin settlement and invalidation operation responses now expose `pointDisbursements` as the launch array contract and no longer emit or document the retired operation-level `payouts` array. The shared client keeps only a private old-response fallback, office settlement counts read `pointDisbursements` directly, and internal `prediction_payouts` storage remains a later compatibility-cleanup item.

## Loop 165 Audit Update

Admin settlement and invalidation point-disbursement rows no longer embed the internal `prediction.Payout` JSON shape. Launch operation rows now expose explicit point-native disbursement fields and omit `payoutCents`/`pnlCents`; OpenAPI documents only the point-native row contract; and the shared client exports `SettlementPointDisbursement` while keeping old payout-row parsing local to its compatibility reader.

## Loop 166 Audit Update

Public portfolio settlement history no longer embeds the internal `prediction.Payout` JSON shape. `/api/v1/portfolio/history` rows now expose explicit settlement metadata plus `realizedPointsCents`, `settlementPointsCents`, `paidAt`, and `unit: "PTS"` without `payoutCents` or `pnlCents`; launch OpenAPI documents the new `PortfolioHistoryItem` schema; and the shared client exports a point-native `SettledPositionResult` while keeping old row parsing local to its compatibility reader.

## Loop 167 Audit Update

Admin account-review settlement history no longer embeds the internal `prediction.Payout` JSON shape. `/api/v1/admin/punters/{id}/settlements` rows now expose explicit settlement metadata plus `realizedPointsCents`, `settlementPointsCents`, `paidAt`, and `unit: "PTS"` without `payoutCents` or `pnlCents`; launch OpenAPI documents the point-native `AdminPunterSettlement` schema; and office `PunterProfile` renders account-review history from the point-native fields only.

## Loop 168 Audit Update

Admin account-review list/detail payloads no longer expose `walletBalanceCents` or list-level `realizedPnlCents` in launch JSON or OpenAPI. They now expose point-account and settled-result fields through `pointAccountBalanceCents`, `realizedPointsCents`, and `unit: "PTS"`, and office account-review pages map point balance and portfolio results from the point-native aliases. Position-level compatibility fields remain a separate cleanup item.

## Loop 169 Audit Update

Portfolio summary payloads no longer expose the retired summary compatibility aliases in launch JSON, OpenAPI, exported shared-client types, or normalized player-app outputs. `/api/v1/portfolio/summary` now serializes point-native value/result fields plus `unit: "PTS"` only, `/portfolio` and `/account` render summary cards from those point-native fields, and the shared client keeps old summary parsing local to a private fallback reader. The office users list also now maps account-review rows from `pointAccountBalanceCents` and `realizedPointsCents` instead of the retired list aliases.

## Loop 345 Audit Update

The active deletion surface now has an executable preservation gate. `scripts/qa/preservation-deletion-gate.sh` reads the current git diff and fails on any deleted inherited artifact that is not explicitly classified. The first passing run classified 54 deletions into reviewed groups: player launch-prohibited cashier routes, components, API clients, and locale bundles; retired player sportsbook/cashier helper tests replaced by point-native regressions; office cashier/payment admin surfaces; relocated office audit/user tests; the retired gateway bet replay proof replaced by point-native reconciliation; and a duplicate seed fixture retired during point-native seed cleanup. This does not mark preservation complete, but it prevents additional unreviewed deletion from slipping into the TapTrade branch.

## Loop 346 Audit Update

The live no-money-boundary probe is now part of maintained runtime sign-off instead of a standalone script. `make qa-live-no-money-boundary` runs the player, office, and gateway probe and publishes a report, while the managed runtime profile runs it after all three services answer health checks. The probe verifies positive launch pages, retired player/office money route absence, gateway non-redeemable point mode, disabled legacy money routes, required launch route domains, prohibited gateway domains, and inherited cashier/payment/crypto endpoint absence. Mock-server tests prove the probe passes safe surfaces and fails exposed money routes or unsafe gateway status. Full live-stack execution remains required before Scenario 12 can pass.

## Loop 170 Audit Update

Portfolio position payloads no longer expose the retired position cost/result compatibility aliases in launch JSON, OpenAPI, exported shared-client types, or normalized player-app outputs. `/api/v1/portfolio` rows now serialize `totalCostPointsCents`, `realizedPointsCents`, and `unit: "PTS"` without `totalCostCents` or `realizedPnlCents`; `/portfolio` renders position cost from the point-native field; and the shared client keeps old position parsing local to a private fallback reader.

## Loop 171 Audit Update

Order placement/read payloads no longer expose the retired response-level order cost/cap compatibility aliases in launch JSON, OpenAPI, exported shared-client types, or normalized player-app outputs. `prediction.Order` now serializes `pricePointsCents`, `totalCostPointsCents`, `filledCostPointsCents`, `notionalCapPointsCents`, point reservation/capture/release aliases, and `unit: "PTS"` without `priceCents`, `totalCostCents`, `filledCostCents`, `notionalCapCents`, or retired cash-named aliases; `/portfolio` renders active-order cost from `totalCostPointsCents`; and the shared client keeps old order parsing local to a private fallback reader. Launch request surfaces now send, document, and accept `pricePointsCents` and `notionalCapPointsCents` only; session order, preview, and bot order HTTP decoding rejects old request price/cap aliases while lower-level compatibility remains private; preview response aliases are retired by the Loop 172 update.

## Loop 172 Audit Update

Order preview payloads no longer expose the retired preview response aliases in launch JSON, OpenAPI, exported shared-client types, or normalized player-app outputs. `prediction.OrderPreview` now serializes point-native quote fields plus `unit: "PTS"` without `priceCents`, `totalCostCents`, `feeCents`, result/impact aliases, or slippage aliases; market detail AMM quotes and `TradeTicket` consume the point-native preview fields; and the shared client keeps old preview parsing local to a private fallback reader. Launch request surfaces now send, document, and accept `pricePointsCents` and `notionalCapPointsCents` only; the preview HTTP endpoint rejects retired request price/cap aliases before quote lookup.

## Loop 173 Audit Update

Trade tape payloads no longer expose the retired trade price/fee response aliases in launch JSON, live fill payloads, OpenAPI, exported shared-client types, or normalized player-app outputs. `prediction.Trade` and live `trades:<marketID>` fills now serialize `pricePointsCents`, `feePointsCents`, `notionalPointsCents`, and `unit: "PTS"` without `priceCents` or `feeCents`; `RecentTrades` consumes `pricePointsCents`; and the shared client keeps old trade parsing local to a private fallback reader.

## Loop 174 Audit Update

Central market payloads no longer expose the retired market price/activity/liquidity response aliases in launch JSON, OpenAPI, exported shared-client types, normalized app/office outputs, live market-detail merge behavior, or market UI consumers. `prediction.Market` now serializes point-native market fields plus `unit: "PTS"` without legacy market aliases; `PredictionMarket` exports only point-native market fields; and the shared client keeps old market parsing local to a private fallback reader.

## Loop 175 Audit Update

Market price-history payloads no longer expose the retired history price/activity response aliases in launch JSON, OpenAPI, exported shared-client types, normalized player-app outputs, or chart/discovery UI consumers. `prediction.PricePoint` now serializes point-native history fields plus `unit: "PTS"` without `yesPriceCents` or `volumeCents`; `PricePoint` exports only point-native history fields; and the shared client keeps old history parsing local to a private fallback reader.

## Loop 176 Audit Update

Order-book depth payloads no longer expose the retired depth response aliases in launch JSON, OpenAPI, exported shared-client types, normalized player-app outputs, or market-detail order-book UI. `prediction.OrderBookLevel` now serializes `pricePointsCents`, `shares`, `cumulativeShares`, `notionalPointsCents`, `totalNotionalPointsCents`, and `unit: "PTS"` without `priceCents`, `quantity`, or `total`; `OrderBookLevel` exports only point-native/share-count fields; and the shared client keeps old depth parsing local to a private fallback reader.

## Loop 177 Audit Update

Admin dashboard activity payloads no longer expose retired activity response aliases in launch JSON, OpenAPI, exported shared-client types, normalized office outputs, or the office dashboard UI. `prediction.DashboardVolumeStats` now serializes `totalVolumePointsCents` and `unit: "PTS"` without `totalVolumeCents`; `prediction.DashboardMover` serializes `yesPricePointsCentsStart`, `yesPricePointsCentsNow`, `volumePointsCents`, and `unit: "PTS"` without `yesPriceCentsStart`, `yesPriceCentsNow`, or `volumeCents`; and the shared client keeps old dashboard parsing local to private fallback readers.

## Loop 178 Audit Update

Admin drift-alert payloads no longer expose retired drift response aliases in launch JSON, OpenAPI, exported shared-client types, normalized office outputs, or office market/settlement warning UI. `prediction.CollateralDriftAlert` now serializes `maxDriftPointsCents`, `totalDriftPointsCents`, and `unit: "PTS"` without `maxDriftCents` or `totalDriftCents`; launch OpenAPI removed the retired fields from the drift schema and endpoint wording; and the shared client keeps old drift parsing local to a private fallback reader.

## Loop 179 Audit Update

Live market and order-book WebSocket frames no longer expose the retired live-frame market price/activity or best-quote aliases. `market:<id>` update frames now serialize `yesPricePointsCents`, `noPricePointsCents`, `lastTradePricePointsCents`, `volumePointsCents`, `openInterestPointsCents`, and `unit: "PTS"` without `yesPriceCents`, `noPriceCents`, `lastTradePriceCents`, `volumeCents`, or `openInterestCents`; `orderbook:<id>` hint frames serialize best-quote point aliases without best-quote `*Cents` fields; and the player-app regression keeps gateway live-frame builders point-native while allowing private fallback parsing for older market-detail frames.

## Loop 180 Audit Update

Core wallet read payloads no longer expose retired balance, ledger, or breakdown aliases in launch JSON or normalized player-app outputs. `/api/v1/wallet/{userId}` now serializes `balancePointsCents`, `availablePointsCents`, `reservedPointsCents`, and `unit: "PTS"` without `balanceCents`, `availableCents`, or `reservedCents`; `/api/v1/wallet/{userId}/ledger` serializes `amountPointsCents`, `balancePointsCents`, and `unit: "PTS"` without `amountCents` or `balanceCents`; `/api/v1/wallet/{userId}/breakdown` serializes `basePointsCents`, `bonusPointsCents`, `totalPointsCents`, and `unit: "PTS"` without `realMoneyCents`, `bonusFundCents`, `totalCents`, or `currency`; and the app wallet/breakdown clients keep older read parsing local to private fallback types without reattaching retired fields.

## Loop 181 Audit Update

Reward response payloads no longer expose retired cents aliases in launch JSON or normalized player-app outputs. Starter grant and daily claim responses now serialize `grantPointsCents` or `claimPointsCents`, `balancePointsCents`, and `unit: "PTS"` without `grantCents`, `claimCents`, or `balanceCents`; point-pack, mission, and streak definitions serialize `amountPointsCents` or `rewardPointsCents` without `amountCents` or `rewardCents`; reward claim responses serialize `claimPointsCents`, `balancePointsCents`, and point-native nested rewards; and reward-limit status serializes `limitPointsCents`, `grantedPointsCents`, `remainingPointsCents`, and `unit: "PTS"` without `limitCents`, `grantedCents`, or `remainingCents`. The app wallet client keeps older reward payload parsing local to private raw fallback types and no longer exports or reattaches retired reward aliases.

## Loop 182 Audit Update

Leaderboard definition responses no longer expose retired unit/reward compatibility aliases. Legacy CRUD leaderboard payloads and Predict computed-board admin rows now serialize `unit: "PTS"`, `pointMetricKey`, and `rewardSummary` without `currency` or `prizeSummary`; office leaderboard admin list/detail pages use `unit` and `rewardSummary` form state and payloads directly. Gateway request parsing now rejects old `currency`/`prizeSummary` write inputs before persistence, and launch-facing JSON plus office source regressions guard retired response aliases out.

## Loop 183 Audit Update

Predict loyalty standing and public tier responses no longer expose retired tier/threshold aliases. `/api/v1/loyalty` and `/api/v1/loyalty/standing` now serialize `xp`, `xpPoints`, `rank`, `rankName`, `nextRank`, `nextRankName`, `xpToNextRank`, and `unit: "PTS"` without `tier`, `tierName`, `nextTier`, `nextTierName`, or `pointsToNextTier`; `/api/v1/loyalty/tiers` now serializes `rank`, `rankName`, `minXpPoints`, and `unit: "PTS"` without `tier`, `name`, or `pointsThreshold`. The player app rewards page and header pill consume the rank fields directly while private raw fallback readers may still accept older loyalty responses.

## Loop 184 Audit Update

Admin loyalty account list/detail payloads no longer expose retired account progress aliases in launch JSON or OpenAPI. `/api/v1/admin/loyalty/accounts` and `/api/v1/admin/loyalty/accounts/{playerId}` now serialize `rank`, `rankName`, `nextRank`, `nextRankName`, `xpToNextRank`, and `unit: "PTS"` without `currentTier`, `nextTier`, or `pointsToNextTier`; office loyalty list/detail pages consume rank fields directly and use rank copy while the editable tier-config route remains a separate compatibility/config surface.

## Loop 185 Audit Update

Legacy player bonus payloads no longer expose retired amount or wagering aliases. `/api/v1/bonuses/active`, `/api/v1/bonuses/claim`, `/api/v1/bonuses/{id}`, and `/api/v1/bonuses/{id}/progress` now serialize `grantedPointsCents`, `remainingPointsCents`, `playRequiredPointsCents`, `playCompletedPointsCents`, `playProgressPct`, and `unit: "PTS"` without `grantedAmountCents`, `remainingAmountCents`, `wageringRequiredCents`, `wageringCompletedCents`, `wageringProgressPct`, their snake_case variants, or generic `progressPct`. The user-app bonus client and Redux bonus state now export point-native bonus/progress/breakdown fields only, while old payload names remain private parser fallbacks.

## Loop 186 Audit Update

Legacy admin campaign payloads no longer expose retired budget/spend or raw rule-config fields. `/api/v1/admin/campaigns`, `/api/v1/admin/campaigns/{id}`, and campaign create responses now serialize `budgetPointsCents`, `spentPointsCents`, and `unit: "PTS"` without `budgetCents`, `spentCents`, or the raw campaign `rules` blob; campaign detail rule rows now serialize sanitized `pointRuleConfig` without raw `ruleConfig` or retired rule amount keys such as `max_bonus_cents`, `fixed_amount_cents`, `max_stake_contribution_cents`, and `min_amount_cents`.

## Loop 187 Audit Update

The launch OpenAPI now documents the bonus/campaign compatibility slice that remained real but undocumented after the JSON contract cleanup. Player bonus routes document `PlayerBonus`, `PlayerBonusListResponse`, and `PlayerBonusProgress` with `PTS`, `grantedPointsCents`, `remainingPointsCents`, `playRequiredPointsCents`, `playCompletedPointsCents`, and `playProgressPct` only; admin campaign routes document `AdminCampaign`, `AdminCampaignRule`, lifecycle action responses, and admin bonus reads/grants/forfeit routes with `budgetPointsCents`, `spentPointsCents`, and sanitized `pointRuleConfig` only. `TestLaunchOpenAPIDocumentsBonusCampaignSlice` now guards this route coverage and rejects retired amount/progress, budget/spend, raw rule-config, and rule amount aliases in the documented schemas.

## Loop 188 Audit Update

Admin bonus/campaign request handling now accepts point-native request aliases for the same compatibility slice. Campaign creation can accept `budget_points_cents` and rule `point_rule_config`, normalizing point-rule amount keys into the existing internal rule evaluator/storage keys before validation; admin bonus grant can accept `override_points_cents` before using the existing grant path. Launch OpenAPI now documents `AdminCampaignCreateRequest`, `AdminCampaignRuleInput`, and `AdminBonusGrantRequest` with preferred point aliases only, and the bonus/campaign launch-doc test rejects retired request names from those schemas.

## Loop 189 Audit Update

The player rewards page now has a visible active-bonus surface backed by the real `/api/v1/bonuses/active` route. It loads active bonuses with `getActiveBonuses`, renders them in both pre-first-settle and normal rewards states, and feeds `playRequiredPointsCents`, `playCompletedPointsCents`, `playProgressPct`, `remainingPointsCents`, and `expiresAt` into the existing point-play progress UI. The wallet-path regression now reads `rewards/page.tsx` and guards that the active-bonus panel uses point-play fields rather than retired amount or wagering aliases.

## Loop 190 Audit Update

Demo seed mode now produces data for that active-bonus rewards surface. Phase 0 cleanup removes demo player bonus rows before deleting demo-seed campaign rows, and `RunDemo` calls `RunPhase5BonusDemo` after wallet/reward-history seeding but before market-maker orders. The new seed phase creates one active demo campaign and one active `u-1` player bonus with remaining points and point-play progress, letting `/rewards` render active bonus progress in a freshly demo-seeded stack.

## Loop 191 Audit Update

The active-bonus demo proof is now tighter across seed data and API serialization. `RunPhase5BonusDemo` uses named constants for the demo point-play values, and the seed regression verifies the demo grant remains positive, partially used, and exactly 25% progressed. `TestDemoSeededBonusActiveResponseUsesPointPlayContract` now passes a demo-shaped active bonus through the player bonus response mapper and proves `/api/v1/bonuses/active`-style output stays `PTS` and point-play native without retired amount, wagering, or generic progress aliases.

## Loop 192 Audit Update

The active-bonus proof now reaches the handler boundary for `/api/v1/bonuses/active`. `playerActiveBonusesHandler` depends on the active-bonus listing method it actually calls, allowing a focused `httptest` regression to run the authenticated endpoint path, confirm the session user is used for the list call, and decode the JSON `bonuses` payload. The endpoint regression proves a demo-shaped active bonus still returns `PTS`, demo campaign copy, remaining points, and point-play progress without retired amount, wagering, or generic progress aliases.

## Loop 193 Audit Update

The bonus detail and progress endpoints now have focused handler-boundary coverage. `playerBonusDetailHandler` depends on the player-bonus lookup method it actually calls, so tests can prove an owning session user can read `/api/v1/bonuses/{id}/progress` as point-play progress and that a different session user is rejected with `403 forbidden`. The progress endpoint regression decodes the JSON body and rejects retired wagering or generic progress aliases.

## Loop 194 Audit Update

The bonus claim endpoint now has focused handler-boundary coverage. `claimBonusHandler` depends on the claim method it actually calls, so the endpoint regression proves `/api/v1/bonuses/claim` overwrites any request-body user identity with the authenticated session user, forwards the campaign and trigger reference, returns `201`, and emits the point-play `PTS` bonus response without retired amount, wagering, or generic progress aliases.

## Loop 195 Audit Update

Admin bonus grant and forfeit now have focused handler-boundary coverage. The admin grant regression proves `/api/v1/admin/bonuses/grant` binds `GrantedBy` to the authenticated admin session, accepts the preferred `override_points_cents` request alias, and returns a point-play `PTS` bonus payload without retired amount or progress aliases. The forfeit regression proves `/api/v1/admin/bonuses/{id}/forfeit` uses the requested bonus id, binds `ForfeitedBy` to the authenticated admin session, and returns the forfeit status.

## Loop 196 Audit Update

Windowed market resolution now has a tighter handler-boundary trust regression. The existing proposed-resolution route test now verifies the proposer receives a challenge window, cannot finalize their own proposed result, cannot review a holder dispute against that same proposed result, and leaves the dispute open until a second admin rejects it and finalizes. The proposal and finalization responses are checked for point-only launch contracts: challenge-window metadata plus `PTS` point disbursements, without retired payout/currency aliases.

## Loop 197 Audit Update

Windowed market resolution now also guards the identified-admin requirement at the route boundary. With the dev anonymous-admin bypass enabled, uid-less propose and finalize requests are still forbidden before they can create or act on a resolution proposal. The regression proves a uid-less propose creates no proposal and leaves the market closed, preserving dual-control semantics for human admin resolution actions.

## Loop 198 Audit Update

Settlement audit metadata is now point-native at both the HTTP admin route layer and the prediction settlement callback. Admin finalize and void audit entries use `totalSettlementPointsCents`, `pointDisbursementCount`, and `unit: "PTS"` instead of retired payout metadata keys, and the settlement auditor used by admin/API/worker settlement paths now records the same point-native total and disbursement count. Route and settlement audit tests reject the old payout/currency aliases.

## Loop 199 Audit Update

The launch settlement API docs and exported TypeScript client types no longer expose the transitional settlement total alias. OpenAPI `AdminSettlementRecord` documents `totalSettlementPointsCents` and `unit: "PTS"` without `totalPayoutCents`, the shared `SettlementRecord` type no longer exports `totalPayoutCents`, and the API client keeps old settlement total parsing only in a private legacy response type. OpenAPI and app source regressions now lock that boundary.

## Loop 200 Audit Update

Admin settlement operation JSON now uses an explicit launch response record instead of embedding the raw settlement model. The runtime settlement record keeps result, attestation, settled-by/time, override audit, `positionsSettled`, `totalSettlementPointsCents`, and `unit: "PTS"`, while omitting retired/internal fields such as `totalPayoutCents`, `payoutsTotal`, and `payoutsCompleted`. The route and OpenAPI tests now reject those fields.

## Loop 201 Audit Update

Office user recent-activity normalization no longer converts legacy timeline `currency` values into cash symbols. Go timeline entries now normalize to `unit: "PTS"` even when old payloads provide `USD` or `GBP`, the recent-activity timeline renders point tags such as `25.5 pts` instead of `{currency}{amount}`, and the activity icon no longer uses a dollar glyph. An active Vitest regression now covers legacy currency inputs coercing to `PTS`, and the office launch-safety source scan rejects the retired currency-symbol mapper and dollar icon in this surface.

## Loop 202 Audit Update

The user app no longer ships dormant generic money-formatting helpers. `app/lib/services/currency.ts` and `app/lib/format.ts` were removed after source scans confirmed they were unused, eliminating USD/EUR/GBP symbol maps and `Intl.NumberFormat({ style: "currency" })` helpers from the launch app source. `siteSettingsSlice` was also narrowed to non-money settings only: it no longer models or exports fiat currency, deposit, withdrawal, stake-threshold, or generic threshold actions/selectors. The app source regression now fails if those formatter files or site-settings money contracts return.

## Loop 203 Audit Update

The user app compliance client and profile limits call site now use point-native launch contracts end to end. `SetPointUseLimitsRequest` carries `dailyLimitPoints`, `weeklyLimitPoints`, and `monthlyLimitPoints`; `SetPredictionLimitsRequest` carries `maxOrderPoints`; and the profile page submits those fields instead of inherited snake_case deposit/stake aliases. The compliance client now exports `PointUseLimits` and `PredictionLimits` responses with `unit: "PTS"` and no public currency field, while the app API barrel no longer re-exports `setDepositLimits`, `setStakeLimits`, `SetDepositLimitsRequest`, `SetStakeLimitsRequest`, `DepositLimits`, or `StakeLimits`. The unused `getMonthlyDepositTotal` helper and unused store selectors for deposit/stake limits were retired as part of the same launch app API cleanup.

## Loop 204 Audit Update

The user app bonus wallet-breakdown surface now keeps currency compatibility private instead of exporting it through state. `WalletBreakdown` in the bonus API client and Redux bonus slice exposes `basePointsCents`, `bonusPointsCents`, `totalPointsCents`, and `unit` only. `getWalletBreakdown` may still read old gateway `currency` input when `unit` is absent, but it normalizes the launch object to `unit: "PTS"` semantics and does not reattach a public `currency` field. The wallet-path regression now rejects public breakdown `currency: string` contracts while preserving the older payload fallback as parser-only compatibility.

## Loop 205 Audit Update

The user app wallet balance and ledger client now exports point-unit contracts instead of public currency fields. `Balance` and `Transaction` expose `unit` rather than `currency`; primary `/api/v1/wallet/{userId}` and `/api/v1/wallet/{userId}/ledger` responses normalize from gateway `unit` to `PTS`, and the old plural-wallet balance fallback is still coerced to `unit: "PTS"` without re-exporting its raw `currency` input. The wallet-path regression now slices the exported balance and transaction types to reject `currency: string`.

## Loop 206 Audit Update

The user app profile/preferences client no longer exposes a user currency preference. `UpdatePreferencesRequest` now models only communication toggles, exported `Preferences` responses contain notification fields and `updatedAt` without `currency`, and `normalizePreferences` explicitly drops any old raw `currency` value returned by the gateway. A new source regression covers the exported user-client preference contract plus the notification/profile call sites, proving notification preferences do not submit currency and profile language/timezone preferences remain local-only settings.

## Loop 207 Audit Update

The user app settings store no longer carries the dormant sportsbook odds-format preference path. `DisplayOddsEnum`, `oddsFormat`, `setOddsFormat`, `selectOddsFormat`, `BettingPreferences`, and `selectBettingPreferences` were removed from `settingsSlice` and the store barrel. The unused `lib/utils/odds.ts` formatter and its mirrored `odds.test.ts` were deleted, and the app safety regression now rejects those exports/files so the launch app cannot revive sportsbook odds-format preferences through dead state.

## Loop 208 Audit Update

The responsible-play history page no longer carries visible deposit/stake fallback handling. Because `getLimitsHistory` already normalizes inherited sources to `point_use_limit` and `prediction_limit`, `account/rg-history` now filters and labels only launch terms: point-use, prediction, session, cool-off, and self-exclusion. The compliance regression rejects `deposit_limit`, `stake_limit`, and old deposit/stake substring filters in the page source.

## Loop 209 Audit Update

The launch user-app store no longer carries the unused prediction Redux slice that preserved a retired `stakeUsd` contract. `predictionSlice.ts` was removed, the store no longer registers `predictionReducer`, and the store barrel no longer exports prediction selection/stake helpers. The compliance denial fixture was also narrowed to the active geo/pretrade denial sources by removing legacy payment-handler and withdrawal KYC expected-copy references. App source regressions now guard both removals.

## Loop 210 Audit Update

The launch user-app i18n surface no longer ships the retired `deposit-limits` namespace. `lib/i18n/config.ts` no longer registers that namespace, and the dormant `deposit-limits.json` files were removed from every shipped locale folder. The compliance regression now verifies the namespace and locale files stay absent while the active point-use and prediction-limit route/copy checks remain in place.

## Loop 211 Audit Update

The launch user-app point-ledger renderer no longer preserves explicit `deposit` or `withdrawal` movement type branches. `point-ledger.ts` now labels the current launch movement types directly (`credit`, `debit`, `reservation`, `release`, prediction order/fill/proceeds, settlement, and reward movements), and `point-ledger.test.ts` no longer treats old deposit/withdrawal rows as expected compatibility fixtures. The regression now guards that those raw movement-type branches stay absent.

## Loop 212 Audit Update

The launch user-app test suite no longer preserves the stale `bet-placement.test.ts` mirror of retired stake, decimal-odds, and payout validation. It was replaced with `prediction-order-validation.test.ts`, which covers point amount validation, point-cent limit prices, available gameplay point checks, binary prediction-order economics, and prediction-order idempotency keys. The new regression also guards that the retired fixture and its old contract tokens stay absent.

## Loop 213 Audit Update

The optional full-stack smoke test now exercises the live prediction-order and point-wallet contracts instead of retired bet-placement routes. `stack-smoke.test.ts` calls `/api/v1/orders`, `/api/v1/orders/preview`, and `/api/v1/wallet/{userId}` with point-native payloads and expects `unit: "PTS"`, `balancePointsCents`, and `availablePointsCents`, while rejecting a leaked `balanceCents` field. The stale `/api/v1/bets`, `/bets/place`, `/bets/precheck`, `stake_cents`, and odds precheck surface is no longer part of the launch app smoke contract.

## Loop 214 Audit Update

The gateway no longer ships the old `cmd/reconciliation-report` executable that replayed sportsbook bet lifecycles through `/api/v1/bets/place` and `/api/v1/admin/bets/{id}/lifecycle/*`. Its historical-bets CSV converter and lifecycle fixture were removed with it, eliminating another executable source of `stakeCents`, decimal odds, and bet lifecycle settlement expectations. `cmd/gateway/main_test.go` now guards that the retired command source, test, and fixture stay absent.

## Loop 215 Audit Update

Order-fill live frames and admin wallet mutation responses now use point-native balance and fill-price fields. `portfolio:<userId>` payloads emit `filledPricePointsCents` with `unit: "PTS"`, `wallet:<userId>` payloads emit `balancePointsCents` with `unit: "PTS"`, and admin wallet credit/debit responses plus audit details expose point ledger payloads and `balancePointsCents` instead of returning raw `balanceCents` fields.

## Loop 216 Audit Update

Leaderboard definition responses now keep the launch-facing metric contract point-native. Public and admin leaderboard JSON emits `metricKey` and `pointMetricKey` as matching point aliases such as `net_points` and `point_volume`, while the gateway privately maps those aliases to the inherited scorer keys only inside create/update request handling for service compatibility. The route regression checks every returned board for `PTS`, point metric aliases, non-redeemable reward copy, and absence of retired leaderboard response aliases.

## Loop 217 Audit Update

Admin wallet mutation requests now prefer `amountPointsCents` for credit/debit adjustments. The gateway normalizes that alias before calling the private wallet service, rejects conflicting point/compatibility amount fields with an `amountPointsCents` error detail, and keeps `amountCents` only as old-request compatibility. Admin wallet, auth hardening, and provider-ops audit tests now exercise point-native admin adjustment payloads and point-native audit details.

## Loop 218 Audit Update

The gateway's shared privileged-operation audit wrapper no longer preserves the `recordMoneyAuditEntry` name. Wallet adjustments, settlements, disputes, taxonomy changes, market lifecycle actions, KYC decisions, RBAC changes, partner-key operations, and webhook admin actions now call `recordProviderOpsAuditAction`, with comments describing point-accounting/operator audit and point-wallet/settlement visibility in the office audit log.

## Loop 219 Audit Update

Provider-ops audit entries no longer serialize dormant sportsbook promo fields (`freebetId`, `oddsBoostId`, or `freebetAppliedCents`). The admin promotions usage report remains an honest zero placeholder, but its response now uses point-campaign fields with `unit: "PTS"` instead of old betting promo metrics such as total bets, stake cents, freebet usage, or odds-boost usage.

## Loop 220 Audit Update

The admin wallet reconciliation report now keeps the launch-facing aggregate response point-native. It still reads the real wallet ledger reconciliation summary, but `/api/v1/admin/wallet/reconciliation` and `/admin/wallet/reconciliation` now serialize `totalCreditPointsCents`, `totalDebitPointsCents`, `netMovementPointsCents`, and `unit: "PTS"` instead of forwarding retired `totalCreditsCents`, `totalDebitsCents`, or `netMovementCents` field names from the internal wallet service.

## Loop 221 Audit Update

The launch OpenAPI now documents the admin report slice for wallet reconciliation and point-campaign usage. `/api/v1/admin/wallet/reconciliation` references `AdminWalletReconciliationReport`, `/api/v1/admin/promotions/usage` references `AdminPointCampaignUsageReport`, and the schemas use point-native `PTS` report fields while omitting retired reconciliation and betting-promo aliases.

## Loop 222 Audit Update

The launch OpenAPI bot-key security scheme now matches the runtime key-scope boundary. `BotApiKey` docs advertise only `read, trade` scopes, while bot-key and partner-key request schemas continue to enumerate only `read` and `trade` and document wildcard/privileged-scope rejection before persistence.

## Loop 223 Audit Update

The launch OpenAPI admin account-review point-ledger schema no longer carries the retired `amountCents` or `balanceCents` compatibility aliases. `AdminPointLedgerEntry` documents only point-native `amountPointsCents`, `balancePointsCents`, and `unit: "PTS"` for ledger deltas and balances, and the account-review launch-doc regression now guards that the retired ledger aliases stay absent from the documented schema.

## Loop 224 Audit Update

The HTTP pretrade compliance tests no longer preserve cashier deposit-intent paths as launch-adjacent fixtures. Geo allowlist and KYC coverage now runs against `/api/v1/orders` with the trade surface, covering blocked/missing country signals, allowlisted country pass, unverified-user KYC denial, and approved-user pass. Nearby compliance-gate comments now describe guarded surfaces instead of withdrawal or external-value behavior.

## Loop 225 Audit Update

Launch order request surfaces now use point-native market-buy caps. The trade ticket, market-detail preview/place-order handlers, idempotency signature helper, exported `PlaceOrderRequest`, and launch OpenAPI all send or document `notionalCapPointsCents` only. The shared prediction client no longer exposes a request shim for `notionalCapCents`, and gateway capless market-buy validation now returns a point-native `notionalCapPointsCents` field detail.

## Loop 226 Audit Update

Launch order limit-price surfaces now use point-native `pricePointsCents`. The gateway order JSON mapper, launch OpenAPI `Order` and `PlaceOrderRequest` schemas, exported `PredictionOrder` and `PlaceOrderRequest` types, player trade ticket, market-detail preview/place-order handlers, idempotency signature helper, validation errors, and session/preview/bot order HTTP request decoders no longer expose, accept, or require `priceCents`; lower-level private parsing and shared-client old-response fallback may still read that retired alias.

## Loop 227 Audit Update

Launch order average-fill response surfaces now use point-native `averageFillPricePointsCents`. The gateway `prediction.Order` custom JSON, launch OpenAPI `Order` schema, exported `PredictionOrder` type, and shared-client normalized order object now expose the average fill through the point-native alias. The Go order backing field no longer has a public JSON tag, and `averageFillPriceCents` remains only as private old-response fallback input, the already-governed order-preview backing compatibility field, and regression negative assertions.

## Loop 228 Audit Update

Launch order read JSON no longer exposes the wallet-named reservation identifier. `prediction.Order.WalletReservationID` remains as an internal DB/service field, but it is now hidden from default JSON and omitted from the custom launch order mapper. Gateway JSON tests, launch OpenAPI docs tests, and app source regressions now keep `walletReservationId` out of public order JSON, documented order schemas, exported `PredictionOrder` types, and normalized player-app order objects.

## Loop 229 Audit Update

Portfolio position and settled-history price fields now use point-native launch aliases. `prediction.Position` JSON emits `avgPricePointsCents`; portfolio history, settlement operation, and admin account-review settlement DTOs emit `entryPricePointsCents` and `exitPricePointsCents`; launch OpenAPI and shared TypeScript client contracts expose those aliases while keeping old field reads private; and the portfolio page renders average/entry/exit prices through point formatting instead of bare cent glyphs.

## Loop 230 Audit Update

Responsible-play prediction-check responses now use the shared point-native amount field only. `/api/v1/compliance/rg/check-prediction` still accepts old query aliases as private compatibility input, but response JSON and launch OpenAPI now expose `amountPointsCents` with `unit: "PTS"` and omit retired `stakePointsCents`/`stakeCents` aliases. Gateway compliance and launch-doc tests guard the boundary.

## Loop 231 Audit Update

The user-app bonus progress contribution type no longer exports a stake-named amount field. `PlayContribution` now exposes `playAmountPointsCents` and `contributionPointsCents`, while `stakePointsCents`/`stakeCents` remain only in the private legacy response type that normalizes older gateway payloads into the point-play contract. The wallet-path regression now slices the exported type and rejects public `stakePointsCents`.

## Loop 232 Audit Update

Admin campaign rule configs now expose contribution caps with point-play naming. The HTTP `pointRuleConfig` sanitizer maps the inherited internal `max_stake_contribution_cents` key to `max_play_contribution_points_cents` for launch responses, while campaign-create normalization accepts `max_play_contribution_points_cents` first and keeps the older stake-named point alias as private compatibility input only. Launch OpenAPI now documents the point-play key and rejects the stake-named point alias in the campaign schemas.

## Loop 233 Audit Update

Admin campaign rule types now use point-play wording at the launch boundary. Campaign-create requests can send `rule_type: "play"` and the model normalizer converts it to the existing internal `wagering` evaluator rule before persistence. Admin campaign rule responses convert internal `wagering` rows back to `ruleType: "play"`, and launch OpenAPI now documents only `eligibility`, `trigger`, `reward`, and `play` as accepted rule types.

## Loop 234 Audit Update

Bonus domain events now use point-native amount payloads. `bonus.granted` publishes `amount_points_cents` with `unit: "PTS"` for both player claims and admin grants, and `bonus.expired` publishes `forfeited_points_cents` with `unit: "PTS"`; retired event keys `amount_cents` and `forfeited_amount` remain only in negative regression assertions.

## Loop 235 Audit Update

Player bonus and admin campaign responses now map inherited promo campaign types to point-native launch values. Old internal values such as `freebet_grant`, `freebet`, `cash`, and `deposit_match` are converted to `point_grant` or `point_match` at the HTTP boundary, and launch OpenAPI documents only `signup_bonus`, `custom`, `point_grant`, and `point_match` for bonus/campaign type fields.

## Loop 236 Audit Update

Bonus campaign creation now normalizes retired promo campaign type inputs to point-native values before persistence, and bonus claim/admin-grant paths normalize old persisted campaign rows before creating player bonus records. The dormant freebet granter hook and freebet issuance branch were removed from the TapTrade bonus service, so old promo campaign rows no longer create a freebet side effect when claimed.

## Loop 237 Audit Update

Admin bonus/campaign request handling now rejects conflicting retired and point-native amount aliases before persistence or campaign lookup. Campaign creation fails when `budget_cents` and `budget_points_cents` disagree, admin grants fail when `override_amount_cents` and `override_points_cents` disagree, and validation errors point admins at the point-native fields. Loop 273 later removed those retired alias fallbacks from the admin campaign create and admin bonus grant HTTP request boundary.

## Loop 238 Audit Update

Admin campaign rule-config writes now reject conflicting retired and point-native nested amount aliases before normalization or persistence. Reward amount keys and point-play contribution-cap keys must agree exactly when old and point-native aliases are both present, and errors name the point-native field such as `fixed_amount_points_cents` or `max_play_contribution_points_cents`.

## Loop 239 Audit Update

Admin bonus/campaign HTTP error responses now expose point-native conflict fields in the standard error envelope. Campaign budget conflicts, nested rule-config amount conflicts, and admin bonus override conflicts return bad-request errors with `details.field` set to the relevant point-native field such as `budget_points_cents`, `fixed_amount_points_cents`, or `override_points_cents`.

## Loop 240 Audit Update

Admin leaderboard create/update now rejects unsafe reward-summary copy before persistence. Launch-facing `rewardSummary` and legacy `prizeSummary` inputs containing cash, prize, payout, crypto, fiat, deposit, withdrawal, USD/dollar, or redemption wording return a standard bad-request error with `details.field: "rewardSummary"` instead of storing or echoing external-value leaderboard reward copy.

## Loop 241 Audit Update

Admin leaderboard create/update now rejects unsafe launch-visible leaderboard copy before persistence across `slug`, `name`, `description`, and `rewardSummary`/legacy `prizeSummary`. Prohibited cash, prize, payout, crypto, fiat, deposit, withdrawal, USD/dollar, or redemption wording returns a standard bad-request error with `details.field` set to the offending field, so unsafe leaderboard URLs or display text cannot be stored and echoed through public/admin leaderboard APIs.

## Loop 242 Audit Update

Admin leaderboard create/update now treats redeemable-offer wording as launch-prohibited even when the copy says `redeemable` rather than `redeem`. The guard still allows explicit `non-redeemable` disclosure wording, so admins can describe point-status rewards safely while redeemable leaderboard display copy is rejected before persistence with a structured field error.

## Loop 243 Audit Update

Bonus campaign creation now rejects launch-prohibited campaign display copy before persistence. Admin-authored `name` and `description` fields containing cash, deposit, crypto, fiat, freebet, prize, payout, sportsbook, stake, wager, redemption, or redeemable-offer wording return a structured bad-request error with `details.field` set to the offending field, while explicit `non-redeemable` point-play disclosure copy remains allowed.

## Loop 244 Audit Update

Admin campaign rule responses now sanitize inherited reward-config `type` values inside `pointRuleConfig`. Retired values such as `freebet`, `cash`, and `odds_boost` map to `point_grant`, and `deposit_match` maps to `point_match`, so launch admin JSON no longer echoes those old promo mechanics from rule config payloads.

## Loop 245 Audit Update

Bonus campaign activation domain events now sanitize inherited promo campaign types before publication. The `campaign.activated` payload maps old values such as `freebet_grant`, `freebet`, `cash`, `odds_boost`, and `deposit_match` to point-native `point_grant` or `point_match` values for both `type` and `campaign_type`, and includes `unit: "PTS"` so old campaign rows cannot reintroduce promo mechanics through activation events.

## Loop 246 Audit Update

Admin bonus campaign trigger rule configs now have a launch-safe event boundary. Campaign creation rejects unsafe trigger `event` values such as `deposit` or `bet` before persistence with a structured field error, and admin campaign rule responses map old stored event values to point-native aliases such as `manual_review`, `prediction_order`, or `point_grant` instead of echoing inherited money or betting terminology through `pointRuleConfig.event`.

## Loop 247 Audit Update

Admin bonus campaign eligibility rule configs now have a launch-safe activity boundary. Campaign creation rejects retired `min_deposits` keys before persistence with a point-native field error, and admin campaign rule responses map old stored `min_deposits` to `min_point_activity_count` and `tier_min` to `rank_min` instead of echoing inherited eligibility terminology through `pointRuleConfig`.

## Loop 248 Audit Update

Admin bonus campaign eligibility rule configs now normalize preferred point-native activity and rank aliases before private evaluator storage. Campaign creation rejects retired `tier_min` rank keys before persistence with a point-native field error, while preferred `min_point_activity_count` and `rank_min` request keys are converted to the internal compatibility fields used by the existing rule evaluator.

## Loop 249 Audit Update

Direct bonus claims now fail closed when a campaign eligibility rule requires verified point activity or rank review. Instead of silently ignoring stored activity/rank eligibility constraints on the player claim path, the service now returns a point-native error directing the campaign through admin grant or explicit eligibility verification.

## Loop 250 Audit Update

Player bonus claim errors for activity/rank eligibility review now stay on a launch-safe API surface. The claim endpoint returns `403` with point-native review wording and no backend admin method names or wiring instructions when a direct claim needs eligibility evidence that is not available on the player claim path.

## Loop 251 Audit Update

Manual bonus forfeiture now publishes the same point-native event amount contract used by bonus expiry. The `bonus.forfeited` event includes `forfeited_points_cents`, `unit: "PTS"`, reason, and actor metadata, while retired generic amount keys remain absent from regression coverage.

## Loop 252 Audit Update

Manual bonus forfeiture now fails closed when the point-wallet forfeiture mutation fails. The service returns a point-native error before updating the player bonus to forfeited or publishing `bonus.forfeited`, preventing lifecycle/event state from claiming points were removed when the wallet mutation did not succeed.

## Loop 253 Audit Update

Bonus forfeiture event amounts now come from the actual wallet ledger entry returned by the point-wallet forfeiture mutation. Manual and expiry forfeiture events publish the actual `forfeited_points_cents` removed from the wallet, so capped or zero wallet removals are not overstated by the player-bonus remaining amount.

## Loop 254 Audit Update

Bonus campaign validation now keeps admin-facing reward and point-play rule errors in launch-safe wording. Reward bounds return reward-point messages, and public `play` multiplier validation no longer echoes the internal inherited wagering term through the admin campaign API.

## Loop 255 Audit Update

Admin bonus forfeiture now returns an explicit point-native response body. The forfeit mutation responds with `status: "forfeited"` and `unit: "PTS"`, and the launch OpenAPI documents that response through a dedicated `AdminBonusForfeitResponse` schema.

## Loop 256 Audit Update

Admin point-play campaign lifecycle actions now return explicit point-native status responses. Activate, pause, and close responses include `unit: "PTS"`, and the launch OpenAPI documents the same unit on `AdminCampaignActionResponse`.

## Loop 257 Audit Update

Bonus campaign close events now publish the same point-native lifecycle context as activation events. The `campaign.closed` payload includes mapped `type` and `campaign_type` values, `status: "closed"`, and `unit: "PTS"` instead of only a campaign id.

## Loop 258 Audit Update

Bonus campaign pause now publishes a point-native lifecycle event instead of only mutating campaign status. The `campaign.paused` payload includes mapped `type` and `campaign_type` values, `status: "paused"`, and `unit: "PTS"`.

## Loop 259 Audit Update

Bonus campaign activation events now include explicit lifecycle status. The `campaign.activated` payload includes mapped `type` and `campaign_type` values, `status: "active"`, and `unit: "PTS"`, matching the pause and close event contract shape.

## Loop 260 Audit Update

Scheduled expired-campaign closure now publishes point-native close events. The repository returns the campaigns it closes, and the service emits one `campaign.closed` payload per expired campaign with mapped type aliases, `status: "closed"`, and `unit: "PTS"`.

## Loop 261 Audit Update

Campaign lifecycle event publication now uses one nil-safe point-native publisher. Manual activate, pause, close, and scheduled expired-campaign close all route through the same event helper, preserving mapped lifecycle payloads without making status transitions depend on event-bus wiring.

## Loop 262 Audit Update

Bonus grant, manual-forfeit, and expiry event publication now uses one nil-safe point-native publisher. The service keeps the existing `bonus.granted`, `bonus.forfeited`, and `bonus.expired` PTS payload contracts while avoiding event-bus wiring as a post-wallet-mutation failure point.

## Loop 263 Audit Update

Admin campaign rule responses now sanitize the old stored `max_stake_contribution_points_cents` compatibility key. The HTTP `pointRuleConfig` mapper emits `max_play_contribution_points_cents` for launch admin clients and omits the retired stake-named alias, matching the existing request-side point-play compatibility rule.

## Loop 264 Audit Update

Admin campaign rule responses now prefer already-present launch aliases over retired compatibility aliases. If an old stored rule config contains both `max_play_contribution_points_cents` and a stake-named contribution alias, `pointRuleConfig` preserves the preferred point-play value and keeps the retired alias out of admin JSON.

## Loop 265 Audit Update

Admin campaign reward rule writes now normalize retired promo `type` values before persistence. Rule configs authored with old values such as `freebet`, `cash`, `odds_boost`, or `deposit_match` are stored as point-native `point_grant` or `point_match`, reducing the need for read-time sanitization of newly authored campaigns.

## Loop 266 Audit Update

Admin campaign rule responses now filter inherited point-play mechanics that should not be launch-facing. Old stored rule config keys such as `min_odds_decimal`, `parlay_multiplier`, and `excluded_sports` are omitted from `pointRuleConfig` so admin JSON stays focused on point-native rule fields.

## Loop 267 Audit Update

Admin campaign rule creation now rejects inherited point-play mechanics before they can be persisted. Newly authored `point_rule_config` payloads containing `min_odds_decimal`, `parlay_multiplier`, or `excluded_sports` fail at the admin API boundary with a structured field error instead of relying on response sanitization later.

## Loop 268 Audit Update

Admin campaign rule creation now treats `point_rule_config` as authoritative when both preferred and legacy rule bodies are present. Normalization and launch validation read the point-native payload first, preventing legacy `rule_config` from overriding preferred point amounts, reward types, or point-play validation behavior.

## Loop 269 Audit Update

Direct player bonus claims now fail closed for explicit trigger rules, including manual-review triggers. Campaigns configured with trigger events such as `manual`, `prediction_order`, or `point_grant` must be satisfied through verified point activity or admin review rather than self-claimed through the player claim endpoint.

## Loop 270 Audit Update

Bonus claim and admin-grant wallet-credit failures now compensate repository state after player-bonus creation. If the point wallet credit fails, the service releases the reserved campaign claim/budget counters and marks the created bonus non-active before returning the error, keeping bonus state aligned with the point ledger.

## Loop 271 Audit Update

Admin wallet credit/debit request decoding now rejects retired `amountCents` and `amount_cents` request bodies. Admin point adjustments must use `amountPointsCents`; valid point-native requests still succeed, while retired alias requests fail with a point-native field error before any wallet mutation can run.

## Loop 272 Audit Update

Admin leaderboard create/update request decoding now rejects retired leaderboard write inputs before persistence. New boards must use `unit: "PTS"`, `rewardSummary`, and point-native metric aliases; retired `currency`, `prizeSummary`, `net_profit_cents`, `stake_cents`, and non-PTS units fail with point-native field errors while old stored definitions remain sanitized on read.

## Loop 273 Audit Update

Admin campaign create and admin bonus grant request decoding now rejects retired write inputs before service normalization or persistence. New campaign/bonus writes must use `budget_points_cents`, `rules[].point_rule_config`, point-native rule amount keys, point-native campaign and reward type values, and `override_points_cents`; retired `budget_cents`, raw `rule_config`, retired rule amount keys, retired promo types, stake-named contribution aliases, and `override_amount_cents` fail with point-native field errors while internal storage compatibility remains private.

## Loop 274 Audit Update

Order request decoding now rejects retired request aliases at the launch HTTP boundary. Session order placement, order preview, and bot order placement fail `priceCents` and `notionalCapCents` request bodies with point-native field details before service normalization, while the lower-level `PlaceOrderRequest` compatibility parser remains private to non-launch callers and old internal tests.

## Loop 275 Audit Update

Responsible-play request decoding now rejects retired request aliases on launch routes before service normalization. `/point-use-limit`, `/prediction-limit`, `/check-point-use`, and `/check-prediction` require `amountPointsCents`; launch requests using `amountCents`, `stakePointsCents`, or `stakeCents` fail with point-native field details, while explicitly named legacy compatibility routes still parse their old aliases during the transition.

## Loop 276 Audit Update

Admin loyalty rule create/update now rejects retired request aliases before service normalization. `/api/v1/admin/loyalty/rules` and `/api/v1/admin/loyalty/rules/{ruleId}` accept the launch-facing `predictionSourceType`, `minQualifiedPointsCents`, and `eligiblePredictionTypes` contract, while `sourceType`, `minQualifiedStakeCents`, `eligibleSportIds`, and `eligibleBetTypes` fail with point-native field details. Admin loyalty config/rule responses now use an explicit point-native rule payload with `unit: "PTS"` instead of embedding the legacy canonical rule JSON, and launch OpenAPI documents the rule routes without those retired aliases. Scenarios 9, 10, 11, and 12 remain Partial because live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and account-graph/multi-node abuse proof are still incomplete.

## Loop 277 Audit Update

Loyalty ledger read payloads now use an explicit point-native response shape instead of embedding the canonical ledger row. Player loyalty ledger, admin account-detail ledger rows, and admin adjustment responses expose `predictionSourceType`, `predictionSourceId`, sanitized metadata, and `unit: "PTS"` without launch JSON keys `sourceType` or `sourceId`; seeded settlement proof rows also avoid old `bet_settlement`, `bet:`, `betId`, and `stakeCents` values. Launch OpenAPI now documents `LoyaltyLedgerEntry` and `AdminLoyaltyLedgerEntry` with the point-native prediction source fields only. Scenarios 9, 10, 11, and 12 remain Partial because live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and account-graph/multi-node abuse proof are still incomplete.

## Loop 278 Audit Update

The legacy public loyalty account route now emits the same launch standing shape as the Predict-native loyalty route. `/api/v1/loyalty` returns explicit `userId`, XP/rank fields, optional `lastActivity`, and `unit: "PTS"` instead of the canonical account JSON with `currentTier`, `nextTier`, `pointsToNextTier`, or timestamp aliases. Scenarios 9, 11, and 12 remain Partial because live bonus proof, broader backend/API terminology cleanup, live no-money-path proof, and account-graph/multi-node abuse proof are still incomplete.

## Loop 279 Audit Update

The legacy public loyalty tiers route now emits the same launch tier shape as the Predict-native loyalty route. `/api/v1/loyalty/tiers` returns `rank`, `rankName`, `minXpPoints`, benefits, and `unit: "PTS"` instead of canonical tier JSON with `tierCode`, `displayName`, `minLifetimePoints`, `minRolling30dPoints`, or `active`. Scenarios 9, 11, and 12 remain Partial because live bonus proof, broader backend/API terminology cleanup, live no-money-path proof, and account-graph/multi-node abuse proof are still incomplete.

## Loop 280 Audit Update

Admin leaderboard entry recording now has an explicit point-native activity source contract. `/api/v1/admin/leaderboards/{id}/entries` accepts `activitySourceType` and `activitySourceId`, rejects retired `sourceType` and `sourceId`, returns a PTS event payload without canonical source aliases, and is documented in launch OpenAPI. Scenarios 9, 10, 11, and 12 remain Partial because live bonus proof, broader admin/backend terminology cleanup, broader backend/API cleanup, live no-money-path proof, and account-graph/multi-node abuse proof are still incomplete.

## Loop 281 Audit Update

Legacy leaderboard standing reads now use explicit PTS response payloads instead of returning canonical standing structs. Public leaderboard entries, public detail top entries, admin detail entries, recompute entries, and viewer-entry responses sanitize old stored event metadata from `betId`, `stakeCents`, `payoutCents`, `sourceType`, and `sourceId` into prediction/activity point aliases; new admin score writes reject those retired metadata keys. Scenarios 9, 10, 11, and 12 remain Partial because live bonus proof, broader admin/backend terminology cleanup, broader backend/API cleanup, live no-money-path proof, and account-graph/multi-node abuse proof are still incomplete.

## Loop 282 Audit Update

Public Predict leaderboard board definitions now expose sharpness qualification volume through `minVolumePointsCents` instead of the retired `minVolumeCents` alias. Runtime JSON, launch OpenAPI, and the exported player-app leaderboard client type use the point-native threshold field, with tests proving the old public alias is absent. Scenarios 9, 11, and 12 remain Partial because live bonus proof, broader backend/API terminology cleanup, live no-money-path proof, and account-graph/multi-node abuse proof are still incomplete.

## Loop 283 Audit Update

Public Predict leaderboard board definitions now use the same launch aliases as other leaderboard rank surfaces. `/api/v1/leaderboards` maps service catalog rows to explicit board payloads with `metricKey`, `pointMetricKey`, `rewardSummary`, and `unit: "PTS"`, while launch OpenAPI and the player-app leaderboard client/UI no longer consume `metricLabel` or `qualificationMsg`; the UI fallback labels now say Net points instead of profit/P&L. Scenarios 9, 11, and 12 remain Partial because live bonus proof, broader backend/API terminology cleanup, live no-money-path proof, and account-graph/multi-node abuse proof are still incomplete.

## Loop 284 Audit Update

Player leaderboard locale bundles now use point-result copy instead of inherited P&L/profit labels. English, Indonesian, Malay, Tagalog, Simplified Chinese, and Traditional Chinese `leaderboards.json` values now render Weekly Points or equivalent point-result labels plus Net points metric labels, the page fallback changed to Weekly Points, and a locale regression now scans the leaderboard namespace for P&L/profit/profit-translation wording. Scenarios 9 and 12 remain Partial because live bonus proof, broader backend/API terminology cleanup, live no-money-path proof, and account-graph/multi-node abuse proof are still incomplete.

## Loop 285 Audit Update

Portfolio, account, and result-stat locale bundles now use point-result copy instead of inherited P&L/profit labels. Supported English, Indonesian, Malay, Tagalog, Simplified Chinese, and Traditional Chinese `portfolio.json`, `account.json`, and `win-loss-statistics.json` values no longer render P&L or translated profit/loss wording, and `/portfolio` fallback labels now say Realized point result, Weekly point result, and Point result. The locale regression now scans those three namespaces for P&L/profit/profit-translation wording. Scenarios 6 and 12 remain Partial because broader portfolio-history coverage, backend terminology cleanup, live no-money-path proof, and account-graph/multi-node abuse proof are still incomplete.

## Loop 286 Audit Update

Portfolio sharpness metrics and leaderboard sharpness descriptions now use point-efficiency wording instead of ROI, return-on-risk, or translated investment-return wording. Supported English, Indonesian, Malay, Tagalog, Simplified Chinese, and Traditional Chinese `portfolio.json` and `leaderboards.json` values now render point-efficiency labels/descriptions, and `/portfolio` fallback copy uses point efficiency. The locale regression now scans those two namespaces for ROI/return-on-risk wording. Scenarios 6, 9, and 12 remain Partial because broader portfolio-history coverage, live bonus proof, backend terminology cleanup, live no-money-path proof, and account-graph/multi-node abuse proof are still incomplete.

## Loop 287 Audit Update

Office account-review and risk-report copy now stays inside the points-only launch boundary. `PunterSearch` renders point balance/result columns and point units instead of dollar balance/P&L columns, the English risk summary translation renders Platform point result instead of Platform profit, and the QA regression now reads those office source files directly. The shared prediction client settlement-history fallback also now returns numeric point-native entry/exit fields, preserving private old-row compatibility while keeping office production builds on the launch contract.

## Loop 288 Audit Update

Office risk-summary rendered values now avoid inherited betting and odds-boost wording. English report labels now describe Total predictions, Prediction count, point boosts, and bonus types instead of Total bets, Bet count, Bets with odds boost, or odds-boost usage, with a direct QA regression covering those rendered values while the old translation keys remain private compatibility identifiers.

## Loop 289 Audit Update

Office leaderboard creation now uses point-safe example copy. The admin leaderboard slug placeholder changed from `weekly-profit-race` to `weekly-points-race`, and the office app-router regression now guards the point-safe placeholder while rejecting the inherited profit example.

## Loop 290 Audit Update

Office audit-log rendered values now use prediction and point-boost wording on the active admin audit surface. The English audit-log translation renders `Prediction placed`, `Prediction precheck failed`, `Point boost`, `Point boost rule ID`, and `Legacy sports feed` instead of bet, odds-boost, and sportsbook labels, with a focused office regression guarding those values.

## Loop 291 Audit Update

Office provider-ops rendered intervention labels now use prediction wording on the launch-adjacent provider operations surface. The English source translation and static locale render Prediction ID, Prediction settlement intervention, Open prediction intervention audit logs, and Prediction status instead of inherited bet labels, with a focused office regression guarding those values while the compatibility keys remain private.

## Loop 292 Audit Update

Remaining English office translation values now avoid standalone bet and cashed-out wording across retired sportsbook-era modules plus shared error and transaction copy. Page-bets, page-fixed-exotics, page-fixtures-details, page-markets-details, error, and page-transactions rendered values now use prediction or closed wording while compatibility keys remain private, and the office app-router regression scans all English office translation values for the retired terms.

## Loop 293 Audit Update

English office translation values now avoid sportsbook odds wording across retired sportsbook-era modules plus shared error copy. Page-bets, page-fixed-exotics, page-markets, page-markets-details, and error rendered values now use price wording while compatibility keys remain private, and the office app-router regression scans all English office translation values for odds and odd wording.

## Loop 294 Audit Update

English office translation values now avoid inherited bettable market-state wording across market list/detail and shared error copy. Page-markets, page-markets-details, and error rendered values now use prediction-open/closed wording while compatibility keys remain private, and the office app-router regression scans all English office translation values for bettable wording.

## Loop 295 Audit Update

The gateway public status endpoint now reports the launch boundary directly. `/api/v1/status` returns non-redeemable point mode, default disabled legacy money routes, and point-safe launch route-domain labels that exclude alpha-cashier, payment, and crypto-payment domains. The OpenAPI launch schema documents this status payload, and focused gateway tests cover the default route absence plus status response.

## Loop 296 Audit Update

Inherited Alpha Cashier and payment modules remain preserved behind explicit local compatibility opt-in, but the launch route boundary now has broader automated coverage. Gateway tests prove the player wallet challenge/connect/list, deposit submit, withdrawal request/cancel, admin deposits/reconciliation/withdrawals/audit-events/approval, payment, crypto-payment, webhook, and provider-callback paths are absent by default, are not public, and do not skip CSRF in launch mode; explicit opt-in only grants public/CSRF exemptions to provider callbacks and webhooks.

## Loop 297 Audit Update

Office user-limit controls now render point units instead of inherited dollar units. The point-add and point-use/loss limit sections preserve their existing internal `deposits`/`losses` form keys, but the visible unit formatting uses `pts` suffixes, and the office route regression rejects `unit="$"` on that admin surface.

## Loop 298 Audit Update

Player discovery helper fallbacks no longer carry crypto-era category mappings. Category pills, top-mover category inference, market-image hue fallback, and featured-carousel comments now use launch-safe esports/category wording, while the existing explicit crypto slug filter remains in place to block inherited taxonomy rows from public discovery.

## Loop 299 Audit Update

Added `docs/preservation-audit.md` after reviewing the current deleted artifact classes. The audit records a preservation-first policy: launch-facing cashier/payment/crypto routes, clients, locale bundles, and money-value UI stay absent from shipped surfaces, while inherited private modules and compatibility contracts should be preserved behind launch boundaries. It also marks the removed reconciliation report command as a required point-native replacement before Scenario 12 can pass, because restoring the old command unchanged would reintroduce retired bet routes and `amountCents` request contracts.

## Loop 300 Audit Update

Added the first point-native replacement for the removed reconciliation report command at `cmd/prediction-reconciliation-report`. The new command validates PTS ledger fixtures, computes credits, debits, net movement, entry/user counts, and final point balances, and rejects retired fixture vocabulary such as `stakeCents`, `amountCents`, `betId`, deposit/withdraw/cashier/crypto wording, and similar money-path terms. This repairs part of the proof-tool loss without restoring retired `/bets` or money-contract replay paths; Scenario 12 remains Partial pending live route/runtime reconciliation evidence.

## Loop 301 Audit Update

Strengthened the new point-native reconciliation proof so it is contract-bound instead of fixture-only. The command test now reads gateway OpenAPI plus prediction and wallet handlers and requires the launch order, wallet, and settlement fields used by the proof: `pricePointsCents`, `notionalCapPointsCents`, `amountPointsCents`, `pointDisbursements`, `settlementPointsCents`, `totalSettlementPointsCents`, `prediction_order`, and `prediction_settlement`. Scenario 12 remains Partial because the proof still needs to move from contract/fixture evidence to live persisted settlement and ledger evidence.

## Loop 302 Audit Update

Added a generic player app route-manifest safety regression for prohibited money-path segments. The regression walks all app route source files rather than only checking known deleted cashier pages, and production build evidence now includes direct inspection of `.next` route manifests with zero cashier, deposit, withdrawal, crypto, fiat, payment, cashout, redeem, or prize route entries. Scenario 12 remains Partial because this strengthens the player route surface only; live end-to-end no-money-path proof and persisted settlement/ledger proof remain open.

## Loop 303 Audit Update

Added the same route-manifest safety proof to the office/admin app. The focused office App Router regression now rejects prohibited money-path segments across every office `page.ts(x)` and `route.ts(x)` file, and production build-manifest inspection found zero prohibited cashier, deposit, withdrawal, crypto, fiat, payment, cashout, redeem, or prize route entries. Scenario 12 remains Partial because this proves shipped admin/player route surfaces, but not yet full live gateway/admin/player runtime behavior or persisted settlement-ledger reconciliation.

## Loop 304 Audit Update

Added `cmd/launch-boundary-report` as a runnable gateway launch-boundary proof artifact. It instantiates the real gateway router in launch mode, verifies `/api/v1/status` reports non-redeemable points and disabled legacy money routes, and probes 21 inherited cashier/payment/crypto-payment paths to prove they return 404 by default. This strengthens gateway runtime-route evidence while preserving inherited private money modules behind explicit local compatibility opt-in.

## Loop 305 Audit Update

Added persisted settlement-ledger proof through the production gateway wallet adapter. `internal/http/prediction_settlement_wallet_persistence_test.go` seeds a closed point market in a migrated Postgres database, settles it through `prediction.NewSettlementEngine` plus `NewPredictionWalletAdapter(wallet.Service)`, and verifies the settlement row, payout rows, winner wallet-ledger credits, winner point balances, and no losing-position settlement credit. This moves reconciliation evidence beyond fixture math while preserving the inherited settlement engine and wallet service.

## Loop 306 Audit Update

Added live no-money-boundary proof across running player, office, and gateway surfaces. `scripts/qa/live-no-money-boundary.mjs` probes positive launch pages, retired player/office money paths, gateway status, and inherited gateway cashier/payment/crypto-payment paths; player and office proxies now return `404` for retired money routes before auth redirects. The live run passed with 70 checks and 0 failures.

## Loop 307 Audit Update

Added DB-backed multi-instance reward-cluster proof. Two independent wallet services sharing one Postgres store now prove hashed device/IP reward-cluster evidence blocks a second user across service instances, allows same-user retries, keeps raw device/IP values out of storage and admin summaries, and leaves blocked users without point-ledger rows.

## Loop 308 Audit Update

Added DB-backed bonus-claim ledger proof through the real bonus handler, repository, service, and wallet adapter. `internal/http/bonus_wallet_persistence_test.go` creates and activates a launch-safe point-play campaign, posts `/api/v1/bonuses/claim` as an authenticated session user, and verifies persisted `player_bonuses`, `wallet_ledger`, and `wallet_balances` rows while rejecting body-user spoofing and duplicate second credits. Scenario 9 still needs bonus browser UI proof and broader account-graph abuse coverage, but the bonus claim path is now persisted and ledger-backed.

## Loop 309 Audit Update

Added reviewer-visible active-bonus rewards UI coverage without adding a mock display path. The rewards smoke test now requires the seeded demo `/api/v1/bonuses/active` payload to contain `Demo Point-Play Bonus`, `unit: "PTS"`, remaining/required/completed point-play fields, and no retired bonus aliases, then requires `/rewards` to show the active point-play bonus panel and `Play progress` value. A rendered React regression covers `ActiveBonusesControl` directly and rejects money/stake/deposit/withdraw/fiat/crypto wording. Scenario 9 remains Partial because the live Playwright run is still blocked by local auth/gateway 500s during demo login, so the full rewards browser proof is not yet proven on a healthy stack.

## Loop 310 Audit Update

Cleared the Loop 309 live-browser blocker with an isolated proof stack instead of changing production behavior. A disposable Postgres database on host port 56546 was migrated through gateway schema version 48 and seeded with demo mode, auth and gateway were started on `18081`/`18080` against that database, the player proxy on `3010` returned `/api/v1/status/` with non-redeemable point mode, and `npx playwright test tests/smoke/rewards.smoke.spec.ts --project=desktop-chromium` passed. Scenario 9 remains Partial because broader account-graph abuse coverage and backend terminology cleanup are still incomplete.

## Loop 311 Audit Update

Added live seeded-stack proof for the windowed admin resolution flow while preserving the existing RBAC and settlement architecture. `cmd/windowed-resolution-live-proof` runs against a migrated/seeded Postgres plus real auth and gateway services with admin anonymous bypass disabled; it inserts only the missing second disposable staff identity and grants the existing `operations-manager` role. The proof closed and proposed `FED-CUT-MAY26`, filed a holder dispute as the demo user, blocked proposer self-review/finalize and open-dispute finalization, finalized as a second authorized admin, and verified PTS settlement fields without retired payout/currency aliases. Scenario 7 remains Partial because backend/API legacy wallet/cents naming and broader compatibility cleanup are still incomplete.

## Loop 312 Audit Update

Closed a launch-facing dispute contract alias without rewriting the inherited resolution store. The private `prediction_disputes.bond_cents` column and `prediction.Dispute.BondCents` domain field remain in place, while the HTTP dispute response boundary now maps to `bondPointsCents` and `unit: "PTS"` for user dispute reads/creates, admin dispute queue reads, and admin dispute resolution responses. OpenAPI, office dispute queue typing, office route-safety regression, and the live windowed-resolution proof guard now reject the retired public `bondCents` alias. Scenarios 7, 11, and 12 remain Partial because broader backend/API legacy wallet/cents naming is still incomplete.

## Loop 313 Audit Update

Admin market create/update payloads now reject the retired launch request alias `ammSubsidyCents` while preserving the inherited private `AMMSubsidyCents` field and `amm_subsidy_cents` storage. Gateway HTTP decoding, launch OpenAPI, exported shared-client request types, and the office market edit request path now use `ammSubsidyPointsCents`; old response/read compatibility remains private in the shared client and prediction domain.

## Loop 314 Audit Update

Office account-review point-ledger rendering now follows the gateway's point-native admin wallet ledger contract. `PunterProfile` accepts and renders `amountPointsCents` and `balancePointsCents` only, while the user-detail page maps current gateway rows and keeps older `amountCents`/`balanceCents` fallback reads private at the route boundary. The admin account-review API and OpenAPI already expose `amountPointsCents`, `balancePointsCents`, and `unit: "PTS"` for `/api/v1/admin/punters/{id}/wallet`.

## Loop 315 Audit Update

Player market-card activity rendering now stays on the point-native prop contract. `MarketCard` exposes `volumePointsCents`, and its discovery/category callers pass `m.volumePointsCents` directly; the old `volumeCents` name remains outside the active card component contract. The rewards active-bonus panel was also moved from the Next.js page module into a dedicated client component so `/rewards` keeps the same point-play UI without exporting a non-page field that breaks production builds.

## Loop 316 Audit Update

Player market-card liquidity rendering now follows the same point-native component boundary as volume. `MarketCard` exposes `liquidityPointsCents` for the liquidity metadata cell, and discovery/category callers pass `m.liquidityPointsCents` directly. The card regression now guards against reintroducing either retired `volumeCents` or `liquidityCents` public props.

## Loop 317 Audit Update

The player trade ticket still presents the same estimated point outcome, but no longer labels the review rows through payout-named keys or comments. `TradeTicket` now uses `pointsIfCorrect`, `POTENTIAL_POINTS`, and `POINTS_IF_SIDE`, and launch prediction locale values describe correct contracts settling at 100 points each. The ticket preview regression guards against restoring the old payout key names or winning-contract wording on the active trading surface.

## Loop 318 Audit Update

Order preview response contracts now describe the maximum correct-outcome point result through `maxResultPointsCents` at the launch boundary. Gateway JSON marshaling and OpenAPI expose the new field, exported shared-client `OrderPreview` types consume it, and the player QA regression rejects the retired public `maxProfitPointsCents`/`maxProfitCents` aliases. The inherited private preview math still uses `MaxProfit`, and the shared client can privately read older rows for compatibility, preserving production internals behind the launch adapter.

## Loop 319 Audit Update

Player notification preferences no longer use retired betting/odds local category keys or subscription/billing copy on the launch-facing account page. The local-only controls now use `market_results` and `price_alerts`, describe new topics or series, point bonus updates, missions, community events, followed markets, and closing windows. The page still honestly states notification preferences are not persisted yet, and the regression guards against restoring the retired local keys or copy.

## Loop 320 Audit Update

Supported launch `communication-settings` locale bundles now match the point-play notification preference language. The shipped values use market updates, prediction activity, resolved markets, and followed-event market alerts instead of inherited subscription, betting, match-resolution, or made-bets copy. The compatibility keys remain in place, but the parsed values are guarded across English, Indonesian, Malay, Tagalog, Simplified Chinese, and Traditional Chinese.

## Loop 321 Audit Update

Supported launch locale bundles now remove the remaining standalone sportsbook-era bet/odds rendered values in header, language/time, about, esports, sidebar, wallet-preference, and win/loss-stat namespaces. Compatibility keys such as `STREAM_BETS_LINK`, `ODDS_FORMAT`, and `BET_HISTORY` remain private/stable identifiers for older callers, but rendered values now say live predictions, price format, prediction history, and prediction limits. The broad parsed-locale guard now rejects standalone bet, betting, odds, and sportsbook values across all supported launch-language JSON bundles.

## Loop 322 Audit Update

Added a preservation checkpoint to `docs/preservation-audit.md` based on the actual current deleted-file diff. The checkpoint distinguishes launch-prohibited player money surfaces, launch-adjacent office money-admin surfaces, the higher-risk deleted reconciliation proof command, and retired tests. It records current replacement evidence for each class, including player/office route regressions, point-ledger admin account review, the point-native reconciliation command/fixture, and persisted settlement-ledger proof. This keeps the production-artifact preservation concern visible as a release gate rather than relying on memory of why files disappeared.

## Loop 323 Audit Update

Supported launch `page-esports-bets` and `win-loss-statistics` locale values now remove another rendered sportsbook/cash-ledger cluster. The shipped values use events, long-term markets, probability, point price, share price, category, and point-ledger entry wording instead of inherited matches, outrights, decimal/American/fractional odds-format labels, sport, and financial transaction labels. A focused parsed-locale regression guards those values across all six supported launch languages while leaving compatibility keys stable.

## Loop 324 Audit Update

Visible mock seed copy and admin placeholders are part of the launch surface. Player chat seed messages now avoid inherited sportsbook usernames, crypto asset tickers, dollar-price thresholds, and commodity-price examples, while keeping the existing chat component behavior intact. Office loyalty settings now uses `point_bonus_rate` as the example metadata key instead of `cashback_rate`. Regressions cover both surfaces so these mock/placeholder values cannot quietly drift back into money-value or sportsbook copy.

## Loop 325 Audit Update

Player footer and geolocation denial copy now follow the same point-native launch boundary as the rest of the active UI. The footer no longer says `sports bets`, the geolocation fallback no longer says betting is unavailable, and the permission-denied copy now refers to submitting a prediction order. Nearby account and trade-ticket comments were also updated away from inherited bet/sportsbook/dollar-default wording so future edits are less likely to reintroduce the old product model.

## Loop 326 Audit Update

Office account-review trade history now uses point-native tab state as well as point-native rendered copy. The visible tab already said `Trade History`, but `PunterProfile` still used `"bets"` as the active tab key. That local state is now typed as `PunterProfileTab` with `"trades"`, and the office route regression rejects the old `bets` tab key on the active account-review component.

## Loop 327 Audit Update

Office user-limit editing now separates the launch-facing form vocabulary from the inherited limit enum. The active admin form uses local `pointUse` state, renders `Point Use`, and submits the visible `losses` form field; only the final payload adapter maps that value back to `TapTradePunterLimitsTypesEnum.STAKE` for the existing API contract. This preserves the production contract while moving the admin surface away from stake wording.

## Loop 328 Audit Update

Office recent-activity rows now normalize legacy activity type strings into prediction-native output enum values. The model exports `PREDICTION_ORDER` and `PREDICTION_RESULT` instead of `BET_PLACEMENT` and `BET_WON`, and the renderer consumes only those prediction-native values. The compatibility mapper still recognizes old `BET_*` input strings so inherited payloads can be read without re-exposing those names through the active admin model.

## Loop 329 Audit Update

The recent-activity reducer regression is now runnable under the office package's configured Vitest suite. The old `lib/slices/__tests__/usersRecentActivitySlices.test.ts` file was excluded by config and still carried stale dollar/deposit/bet fixtures in the tracked baseline; it has been replaced with `tests/users-recent-activity-slices.test.ts`, which proves list and detail reducers emit prediction-native PTS activity rows from legacy timeline inputs.

## Loop 330 Audit Update

Office audit-log display now treats inherited `bet.*` audit actions as legacy input at the resolver boundary. `bet.placed` and `bet.precheck.failed` normalize to prediction-order display actions for category/action labels, active English translation keys use `CELL_ACTION_PREDICTION_ORDER_*`, and the useful resolver coverage now lives in configured `tests/audit-log-resolvers.test.ts` instead of an excluded `__tests__` file.

## Loop 331 Audit Update

Office audit-log reducer coverage is now in the configured test suite. Excluded `lib/slices/__tests__/logsSlice.test.ts` and `lib/slices/__tests__/usersDetailsAuditSlice.test.ts` were replaced by `tests/audit-log-slices.test.ts`, which keeps old `bet.placed` rows as searchable compatibility input while proving the active display resolver maps them to prediction-order labels. The migrated user-detail fixture now uses prediction-order entity and product metadata instead of stale `BET` and `SPORTSBOOK` values.

## Loop 332 Audit Update

Deterministic seed source hygiene now treats stray seed files as a launch-surface risk. The unreferenced duplicate `read-model.seed 2.json` with old Premier League/La Liga odds and stake fixtures was removed, and `prepare-deterministic-seeds.sh` now fails if additional `*.seed*.json` files appear beside the three canonical source files. The inherited `BET_STORE_FILE` env name remains for compatibility, but the generated report now describes it as legacy compatibility order state instead of bet state.

## Loop 333 Audit Update

The release-facing Go reconciliation Make targets no longer point at the deleted retired bet replay command. `go-reconciliation-report` now runs `cmd/prediction-reconciliation-report` against the point-native prediction reconciliation fixture, and the historical bet CSV targets remain only as compatibility aliases that state replay is retired for launch before running the point-native report. The historical-directory wrapper now records retired CSV replay rows instead of invoking the deleted command.

## Loop 334 Audit Update

The active `qa-e2e-critical` release hook no longer replays the old `/api/v1/bets` place/settle path. The script now runs the maintained launch-boundary and point-native prediction reconciliation proof commands, writes reviewable artifacts, and records that the retired legacy bet replay is no longer a launch gate. This keeps the release hook runnable without restoring the launch-incompatible bet/stake flow.

## Loop 335 Audit Update

The active `qa-capability-slo` release hook no longer proves readiness through the inherited cents-funded bet placement, cashout quote, or match-tracker latency harness. The script now runs the same launch-safe proof family as the critical gate: `cmd/launch-boundary-report` plus `cmd/prediction-reconciliation-report`, with artifacts for the gate summary, no-money route boundary, and PTS reconciliation. The old placement/cashout performance probe is explicitly retired as a launch gate rather than silently restored.

## Loop 336 Audit Update

The mandatory `qa-regression-pack` release hook no longer uses sportsbook bet lifecycle tests as launch-readiness proof. It now runs point-native prediction order lifecycle, point wallet ledger, HTTP launch-boundary/admin-wallet, settlement replay, and prediction reconciliation report contract tests. The old `internal/bets` and HTTP `TestPlaceBet*`/`TestAdminSettle*` suites remain inherited code/tests, but they are no longer the canonical TapTrade release gate.

## Loop 337 Audit Update

The optional pre-commit hook no longer runs stale TapTrade Sportsbook health checks that require launch-prohibited or launch-incompatible surfaces such as cashier pages, deposit/withdrawal copy, betslips, stake inputs, betting clients, cashier review, or pending withdrawals. It now delegates to the maintained point-native regression pack and launch-boundary/reconciliation proof gate, so local governance follows the same TapTrade evidence model as the release gates.

## Loop 338 Audit Update

The official `verify-sportsbook` Make target is now a compatibility name for the TapTrade player verifier. The script no longer builds `phoenix-frontend-brand-viegg`; it validates `talon-backoffice/packages/app` with scoped typecheck, the app package's production build, and upstream-leak scanning. This keeps existing automation target names stable while moving the launch-facing player proof onto the actual TapTrade app surface.

## Loop 339 Audit Update

The official `verify-api-contract-fixtures` Make target now validates TapTrade API/client contracts instead of the inherited sportsbook response-shape fixture suite. The script no longer installs or tests `phoenix-frontend-brand-viegg`; it installs `talon-backoffice`, builds `@taptrade-ui/api-client`, and runs the focused player-app contract tests that guard prediction-client base URLs, refresh/retry behavior, point-native order validation, trade-ticket preview economics, wallet/reward endpoint paths, and point-ledger rendering.

## Loop 340 Audit Update

The sports-named QA targets now preserve automation compatibility without probing retired sports/odds routes. `qa-sports-route-smoke` runs TapTrade discovery and market contract tests against `talon-backoffice/packages/app`, and `qa-sports-regression` repeats that smoke before running the TapTrade API/client contract verifier. The release readiness runtime target now enables the TapTrade discovery/API compatibility gate instead of a multi-sport sportsbook runtime gate.

## Loop 341 Audit Update

The managed local runtime stack no longer starts `phoenix-frontend-brand-viegg` as the launch player surface. `scripts/local-stack.sh` now starts `talon-backoffice/packages/app` as `taptrade-player`, keeps a legacy sportsbook pid cleanup path only for old running processes, and reports `taptrade-player` in status/log handling. The runtime-profile release gate now waits for the TapTrade player status URL and enables the TapTrade discovery/API compatibility gate with TapTrade-named env vars.

## Loop 342 Audit Update

Release security evidence now follows the current TapTrade surface map instead of the retired sportsbook app tree. SBOM generation covers TapTrade Backoffice, TapTrade Player App, Go platform modules/services, and inherited backend dependency declarations; blocked backend classpath resolution now leaves a real error artifact when Java/SBT startup is unavailable. Secret scanning covers backend, TapTrade, and Go platform. Dependency vulnerability and modernization baselines now audit TapTrade plus `talon-backoffice/packages/app`, parse actual yarn audit advisory summaries, and publish TapTrade player outdated-dependency artifacts. The regenerated vulnerability baseline records 8 critical and 90 high yarn audit findings, making dependency triage an explicit launch follow-up rather than hiding it behind a missing-payload note.

## Loop 343 Audit Update

The first launch-app dependency vulnerability cluster is remediated rather than only documented. The root TapTrade workspace now resolves `i18next-fs-backend` to patched version `2.6.6`, removing the `next-i18next > i18next-fs-backend` high/critical findings from both TapTrade and TapTrade player audit logs. The regenerated dependency baseline now reports 7 critical and 89 high findings, down from 8 critical and 90 high. During verification, the office frontend gate exposed stale build-wrapper assumptions; `verify-taptrade.sh` no longer passes the retired OpenSSL legacy provider flag to Node and explicitly builds with webpack under Next 16, allowing the office production verifier to pass.

## Loop 344 Audit Update

The office `.docx` terms-and-conditions import path now uses a patched XML parser through a narrow dependency resolution. The inherited `mammoth` integration remains in place, while the transitive `@xmldom/xmldom` package is resolved to `0.8.13`. The regenerated dependency baseline reports 7 critical and 85 high findings, down from 7 critical and 89 high, with no remaining `@xmldom/xmldom` audit findings. Office and player production verifiers both pass against the updated lockfile.

## Loop 351 Audit Update

The prediction critical-path API spec now matches the point-only launch boundary. It registers users with terms and no-cashout disclosure acceptance, checks portfolio summaries for point-native accounting, verifies money/crypto/cashier routes are absent, and extends the new-user starter-grant path through a real PTS order plus wallet-ledger evidence. A DB-backed live run passed through the player app same-origin proxy, proving this API slice against real auth, gateway, migrated seed data, wallet storage, order placement, KYC approval, and no-money route absence.

## Loop 352 Audit Update

The preservation audit now covers modified inherited artifacts, not only deleted paths. `scripts/qa/preservation-modification-gate.sh` classifies modified tracked files by risk and surface, counts additions/deletions/churn per path, highlights high-risk contract and large-change files, and writes `revival/36_PRESERVATION_MODIFICATION_MAP.md` plus timestamped artifacts. The current run classified all 386 modified tracked artifacts, identified 85 high-risk contract files and 34 large-change files, and reported 0 unclassified modified artifacts. This improves reviewability of the broad diff, but it is not proof that every inherited production contract is preserved.

## Loop 353 Audit Update

The critical-path API proof now exercises a longer real authenticated journey against a fresh DB-backed stack. The new-user test proves starter-grant idempotency, YES and NO CLOB market buys, point-ledger starter/fill/reward rows, first-prediction mission completion and claim, market comment creation, follow persistence, user activity feed rows for comment/follow/trade, public PTS leaderboard board availability, and no-money route absence through the player same-origin proxy. The proof is saved as `revival/37_EXTENDED_CRITICAL_API_JOURNEY.md` plus timestamped artifact `revival/artifacts/extended_critical_api_journey_20260628_175403.md`. This strengthens the real API/data surface, but browser journey proof and same-run admin close/resolve/settlement still remain incomplete.
## Loop 357 Audit Update

The live critical-path API proof now covers the dual-admin proposed-resolution path against a fresh migrated/seeded stack. Admin A can close and propose, but cannot directly settle around the active challenge flow, cannot finalize their own proposal, and cannot resolve the resulting holder dispute. Admin B can review/reject the dispute and finalize the proposed result, producing `PTS` point-disbursement aliases and a user settlement-ledger credit without retired payout/currency aliases. Auth for this proof must run in DB mode (`AUTH_STORE_MODE=db`) so seeded `admin_users` staff accounts participate in the inherited RBAC/admin directory rather than an in-memory-only auth map. Market lifecycle, settlement, and admin operations remain Partial because office-browser admin variants, complete export review, backend terminology cleanup, and full-browser canonical journey proof are still incomplete.

## Loop 358 Audit Update

The player browser journey now has a maintained Playwright proof. A fresh user can register through the UI, accept the points-only no-cashout disclosure, receive starter points, browse/search/watch markets, open `VAL-MASTERS-FINAL`, inspect resolution/liquidity/trade controls, buy YES and NO through the rendered trade ticket, comment/upvote, follow a public profile, view portfolio and point ledger, claim an available reward, see settlement history after admin close/settlement/recompute, appear on the leaderboard, see the activity feed row, and receive 404s for retired money routes. This does not mean the inherited system was rewritten wholesale: the active preservation path keeps private production contracts where useful, removes launch-prohibited public money surfaces, and requires point-native replacements for retired proof tools. Scenario 12 remains Partial because office-browser admin variants, backend terminology cleanup, high-risk modification review, dependency/security risk, and final RC audit remain incomplete.

## Loop 359 Audit Update

The office admin lifecycle flow now has a maintained browser proof against a fresh DB-backed stack. The Playwright spec logs into TapTrade Office, opens a synthetic draft prediction market from the rendered admin table, closes it through the destructive confirmation modal with an audit reason, verifies the lifecycle audit modal, and confirms retired office money routes return 404. The proof also found and fixed a real office auth regression: `authToken` from `/api/auth/login` must be scoped to `path: "/"` so the dashboard proxy can see it after login. Scenario 10 and Scenario 12 are stronger, but remain Partial because final RC still needs backend terminology cleanup, full preservation review, remaining security/dependency triage, and broader final audit.

## Loop 360 Audit Update

Backend terminology cleanup moved another active source cluster to point-native wording. Prediction void-refund ledger credits now say `returning locked points` instead of `returning stake`, wallet production safety logging refers to production point ledgers instead of real money, and wallet reservation/bonus/play-through comments now describe point operations and gameplay points. This is intentionally not a storage-contract rename; inherited compatibility names remain where deeper renames would add risk. Scenario 12 remains Partial because broader backend terminology cleanup, complete preservation review, dependency/security risk, and final RC audit remain incomplete.

## Loop 361 Audit Update

The active frontend dependency baseline now has the `form-data` high/critical
advisory cluster removed without replacing inherited Jest/jsdom/request tooling.
The TapTrade workspace root resolution pins `form-data` to `2.5.6`,
`yarn why form-data` resolves the inherited test path to that patched version,
`make security-deps` regenerated the official baseline, and both TapTrade and
TapTrade player app audit logs have zero `form-data` findings. Scenario 12
remains Partial because the official audit baseline still reports `critical 2`
and `high 80`, backend JVM SCA evidence is still missing, and final
preservation/RC audit remains incomplete. The preservation modification gate was
rerun after the dependency change and classified 392 modified artifacts with
zero unclassified modified paths.

## Loop 362 Audit Update

The active frontend dependency baseline now reports zero critical advisories.
The remaining critical cluster was under inherited Lerna publish/version tooling:
`lerna -> @lerna/version -> @lerna/github-client -> git-url-parse -> git-up ->
parse-url`. Root Yarn resolutions move `parse-url` to `8.1.0` and `parse-path`
to `7.1.0` while leaving Lerna and the workspace scripts in place. `yarn lerna
list --all --json`, a direct CommonJS `parse-url` smoke test, the API-client
build, and `make security-deps` passed. Scenario 12 remains Partial because the
official baseline still reports `high 78`, backend JVM SCA evidence is still
missing, and final preservation/RC audit remains incomplete. The preservation
modification gate was rerun after this dependency change and classified 392
modified artifacts with zero unclassified modified paths.

## Loop 364 Audit Update

The active frontend dependency baseline no longer reports the `ws` high-advisory
cluster. A same-major root Yarn resolution moves `ws` to `7.5.11` under
mock-server and Jest/jsdom tooling paths while leaving those inherited paths in
place. Direct WebSocket echo and jsdom smokes passed, and `make security-deps`
lowered the official baseline to `critical 0, high 48`. Scenario 12 remains
Partial because high advisories, backend JVM SCA evidence, and final
preservation/RC audit remain incomplete. The preservation modification gate was
rerun after this dependency change and classified 392 modified artifacts with
zero unclassified modified paths.

## Loop 365 Audit Update

The active frontend dependency baseline no longer reports the `undici`
high-advisory cluster. A same-major root Yarn resolution moves `undici` to
`7.28.0` under jsdom, cheerio, Enzyme-adjacent, and isomorphic-dompurify paths
while leaving those inherited tools in place. Direct jsdom, cheerio, and undici
MockAgent smokes passed, and `make security-deps` lowered the official baseline
to `critical 0, high 42`. Scenario 12 remains Partial because high advisories,
backend JVM SCA evidence, and final preservation/RC audit remain incomplete. The
preservation modification gate was rerun after this dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

## Loop 366 Audit Update

The active frontend dependency baseline no longer reports the `trim-newlines`
high-advisory cluster. A root Yarn resolution moves `trim-newlines` to `3.0.1`
under commitlint, Lerna, conventional-changelog, get-pkg-repo, and meow paths
while leaving those inherited release and developer tools in place. Direct
`trim-newlines`, commitlint, Lerna, API-client build, and `make security-deps`
checks passed, lowering the official baseline to `critical 0, high 36`.
Scenario 12 remains Partial because high advisories, backend JVM SCA evidence,
and final preservation/RC audit remain incomplete. The preservation modification
gate was rerun after this dependency change and classified 392 modified
artifacts with zero unclassified modified paths.

## Loop 367 Audit Update

The active frontend dependency baseline no longer reports the
`http-cache-semantics` high-advisory cluster. A root Yarn resolution moves the
inherited Lerna nested edge from `3.8.1` to `4.2.0`, matching the patched version
already used by Office `got` cache paths. Direct cache-policy, module-load,
Lerna, API-client build, and `make security-deps` checks passed, lowering the
official baseline to `critical 0, high 33`. Scenario 12 remains Partial because
high advisories, backend JVM SCA evidence, and final preservation/RC audit
remain incomplete. The preservation modification gate was rerun after this
dependency change and classified 392 modified artifacts with zero unclassified
modified paths.

## Loop 368 Audit Update

The active frontend dependency baseline no longer reports the `merge`
high-advisory cluster. A root Yarn resolution moves the inherited
`@taptrade-ui/utils -> watch -> exec-sh` edge from `1.2.1` to `2.1.1` while
leaving that developer tooling chain in place. Direct merge, `exec-sh`, Lerna,
API-client build, and `make security-deps` checks passed, lowering the official
baseline to `critical 0, high 31`. Scenario 12 remains Partial because high
advisories, backend JVM SCA evidence, and final preservation/RC audit remain
incomplete. The preservation modification gate was rerun after this dependency
change and classified 392 modified artifacts with zero unclassified modified
paths.

## Loop 369 Audit Update

The active frontend dependency baseline no longer reports the `dot-prop`
high-advisory cluster. Targeted Yarn path resolutions move the vulnerable
commitlint `dot-prop@3.0.0` callers to `4.2.1` while preserving already-safe
Lerna `dot-prop@5.3.0` callers. Direct dot-prop, commitlint, Lerna, API-client
build, and `make security-deps` checks passed, lowering the official baseline
to `critical 0, high 29`. Scenario 12 remains Partial because high advisories,
backend JVM SCA evidence, and final preservation/RC audit remain incomplete. The
preservation modification gate was rerun after this dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

## Loop 370 Audit Update

The active frontend dependency baseline no longer reports the `semver`
high-advisory cluster. Targeted Yarn path resolutions move the vulnerable
commitlint `semver@6.3.0` caller to `6.3.1` and the mock-server/nodemon
`semver@7.0.0` caller to `7.7.3` while preserving those inherited tooling paths.
Direct semver, commitlint, nodemon/simple-update-notifier, Lerna, API-client
build, and `make security-deps` checks passed, lowering the official baseline
to `critical 0, high 27`. Scenario 12 remains Partial because high advisories,
backend JVM SCA evidence, and final preservation/RC audit remain incomplete. The
preservation modification gate was rerun after this dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

## Loop 371 Audit Update

The active frontend dependency baseline no longer reports the `fast-uri`
high-advisory cluster. A targeted Yarn path resolution moves the inherited
`eslint -> table -> ajv` edge from `fast-uri@3.1.0` to `3.1.2` while preserving
that tooling path. Direct fast-uri, AJV URI-format validation, ESLint execution,
API-client build, and `make security-deps` checks passed, lowering the official
baseline to `critical 0, high 25`. Scenario 12 remains Partial because high
advisories, backend JVM SCA evidence, and final preservation/RC audit remain
incomplete. The preservation modification gate was rerun after this dependency
change and classified 392 modified artifacts with zero unclassified modified
paths.

## Loop 372 Audit Update

The active frontend dependency baseline no longer reports the `tmp`
high-advisory cluster. A targeted Yarn path resolution moves the inherited
`lerna -> @lerna/prompt -> inquirer -> external-editor -> tmp` edge to
`tmp@0.2.7` while preserving that inherited workspace tooling path. The current
advisory database showed `tmp@0.2.6` was still vulnerable, so the accepted patch
is `0.2.7`. Direct tmp, external-editor, Lerna, API-client build, and
`make security-deps` checks passed, lowering the official baseline to
`critical 0, high 22`. Scenario 12 remains Partial because high advisories,
backend JVM SCA evidence, and final preservation/RC audit remain incomplete. The
preservation modification gate was rerun after this dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

## Loop 373 Audit Update

The active frontend dependency baseline no longer reports the `lodash`
high-advisory cluster. A targeted Yarn path resolution moves the inherited
`@commitlint/cli` lodash subtree to `lodash@4.18.1` while preserving commitlint
and release-governance tooling. Direct lodash, commitlint, Lerna, API-client
build, and `make security-deps` checks passed, lowering the official baseline
to `critical 0, high 17`. Scenario 12 remains Partial because high advisories,
backend JVM SCA evidence, and final preservation/RC audit remain incomplete. The
preservation modification gate was rerun after this dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

## Loop 374 Audit Update

The active frontend dependency baseline no longer reports the `braces`
high-advisory cluster. A targeted Yarn path resolution moves inherited
`micromatch -> braces` callers under Jest/sane and Lerna/globby/fast-glob to
`braces@3.0.3`. Because this is a major-version override for older glob
callers, the loop proved direct braces, micromatch, fast-glob, globby, Lerna,
supported player-app tests, API-client build, and API-client test entrypoint
before accepting the remediation. `make security-deps` lowered the official
baseline to `critical 0, high 5`. Scenario 12 remains Partial because high
advisories, backend JVM SCA evidence, and final preservation/RC audit remain
incomplete. The preservation modification gate was rerun after this dependency
change and classified 392 modified artifacts with zero unclassified modified
paths.

## Loop 375 Audit Update

The remaining frontend high advisories are now explicitly scoped residuals
rather than unexplained audit output. `ip` has three findings through inherited
Lerna add/publish fetch paths, and `lodash.set` has two findings through
inherited Lerna version/publish GitHub client paths. Both advisory payloads
report `patched_versions: <0.0.0`, so no preservation-safe Yarn resolution was
applied. The residual report is
`revival/59_FRONTEND_RESIDUAL_SECURITY_ADVISORIES.md`, with artifact
`revival/artifacts/frontend_residual_security_advisories_20260629_102847.md`.
The JVM baseline preflight script now tolerates missing Java/SBT diagnostics
and writes a fresh blocker report at `revival/12_JVM_DEPENDENCY_BASELINE.md`;
this workspace still lacks an installed Java runtime and `sbt`, so backend SCA
remains incomplete. The preservation modification gate was rerun after this
slice and classified 394 modified artifacts with zero unclassified modified
paths. Scenario 12 remains Partial pending residual advisory governance,
backend SCA, final preservation review, and RC audit.

## Loop 376 Audit Update

Residual frontend advisory governance is now executable. New
`scripts/qa/frontend-residual-advisory-gate.sh` parses the regenerated TapTrade and
TapTrade player app audit logs and fails on any critical row or any high row
outside the two reviewed inherited Lerna residual clusters. `make
qa-frontend-residual-advisories` passed after `make security-deps`, proving the
fresh logs still contain only `ip` (3 rows) and `lodash.set` (2 rows), both with
no patched upstream range and Lerna-only paths. The gate writes
`revival/60_FRONTEND_RESIDUAL_ADVISORY_GATE.md` plus artifact
`revival/artifacts/frontend_residual_advisory_gate_20260629_083726.md`, is
listed in the Makefile, runs in the launch pre-commit hook, and is part of the
launch-readiness gate. Scenario 12 remains Partial because this is governance
around no-fix residuals, not remediation or backend JVM SCA completion.

## Loop 377 Audit Update

Backend JVM dependency risk now has direct OSV evidence despite missing Java and
SBT. `make security-jvm-osv-direct` runs
`scripts/security/jvm-osv-direct-baseline.sh`, parses declared Maven
coordinates from the backend SBT files, and queries OSV. The clean report
`revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md` parsed 113 coordinates,
found 9 direct coordinates with OSV findings, and reported 18 unique OSV ids.
This identifies direct-risk areas such as Logback, WireMock, Akka Management,
RabbitMQ AMQP client, Akka Stream Kafka, Commons Text, Keycloak 17.0.1, and
Swagger UI. Scenario 12 remains Partial because this is a direct-dependency
baseline only; full transitive JVM SCA and eviction evidence still require Java
and SBT or another resolver-backed SCA tool.

## Loop 378 Audit Update

Two direct backend JVM dependency findings were remediated from the direct OSV
baseline. `commons-text` was updated from 1.9 to 1.10.0 and
`logback-classic` from 1.2.11 to 1.2.13 after OSV fixed-version review and
Maven artifact availability checks. The refreshed report
`revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md` now parses 113 coordinates,
finds 7 direct coordinates with OSV findings, and reports 16 unique OSV ids;
the prior clean direct baseline found 9 coordinates and 18 ids. The
preservation modification gate passed with 395 modified artifacts classified
and zero unclassified modified paths. Scenario 12 remains Partial because this
is still direct-dependency evidence only, not full SBT resolution, compile
proof, or transitive JVM SCA.

## Loop 379 Audit Update

One test-scoped backend JVM dependency finding was remediated from the direct
OSV baseline. `wiremock-jre8-standalone` was updated from 2.33.2 to 2.35.1
after OSV fixed-version review and Maven artifact availability checks. The
refreshed report `revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md` now parses
113 coordinates, finds 6 direct coordinates with OSV findings, and reports 15
unique OSV ids. Scenario 12 remains Partial because this is still direct
dependency evidence only; Java/SBT-backed compile, tests, eviction review, and
transitive JVM SCA remain unavailable.

## Loop 380 Audit Update

One backend documentation-surface JVM dependency finding was remediated from the
direct OSV baseline. `swagger-ui` was updated from 4.1.2 to 4.1.3 after OSV
fixed-version review, Maven artifact availability checks, and a webjar
`index.html` comparison that showed no diff between 4.1.2 and 4.1.3. The
refreshed report `revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md` now parses
113 coordinates, finds 5 direct coordinates with OSV findings, and reports 14
unique OSV ids. Scenario 12 remains Partial because Java/SBT-backed compile,
runtime docs rendering, eviction review, and transitive JVM SCA remain
unavailable.

## Loop 381 Audit Update

The remaining direct JVM OSV findings are now executable-governed residuals
rather than free-form audit output. New
`scripts/qa/jvm-direct-residual-advisory-gate.sh` reads the latest direct OSV
JSON artifact and fails if any package, version, or GHSA id differs from the
reviewed five-coordinate residual set. The gate is exposed as
`make security-jvm-direct-residual-advisories`, included in `security-baseline`,
added to the launch pre-commit hook, and added to launch-readiness after
`make security-jvm-osv-direct`. It passed against
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_091524.json` and
wrote `revival/65_JVM_DIRECT_RESIDUAL_ADVISORY_GATE.md` plus artifact
`revival/artifacts/jvm_direct_residual_advisory_gate_20260629_091647.md`.
Scenario 12 remains Partial because residual governance is not transitive SCA,
compile proof, or runtime compatibility proof.

## Loop 382 Audit Update

Backend JVM toolchain absence is now release-blocking in automation. New
`make security-jvm-required` runs the SBT dependency baseline in strict mode,
while `make security-jvm` remains available for report generation. The launch
readiness gate now runs the strict target before the direct OSV baseline and
residual advisory gate. In this workspace, the refreshed SBT baseline still
reports `sbt_not_found`, no Java runtime, and exit code 127, so launch
readiness is expected to be NO-GO until the backend JVM graph can be resolved.
Scenario 12 remains Partial because this proves the blocker, not the dependency
graph, compile result, or transitive SCA.

## Loop 383 Audit Update

Final RC completion status is now executable. New
`scripts/qa/rc-completion-audit-gate.sh` reads the canonical `spec.md`
progress matrix and fails unless all 12 scenarios are `Pass` with evidence.
The target `make qa-rc-completion-audit` is wired into launch readiness and
writes `revival/67_RC_COMPLETION_AUDIT_GATE.md` plus timestamped artifacts.
The current run failed as intended with 5 `Pass` scenarios and 7 `Partial`
scenarios: 4, 6, 7, 9, 10, 11, and 12. This is a governance change only; it
does not alter inherited production logic, point sources, ledger mechanics,
settlement behavior, or route contracts.

## Loop 396 Audit Update

Office audit-log expanded diff rendering now has a point-native display
boundary. `components/audit-logs/index.tsx` formats `dataBefore` and
`dataAfter` through a display-only sanitizer so unsupported inherited promo
keys render as `pointGrantId`, `pointRuleId`, and
`pointGrantAppliedPointsCents`. Raw audit row types, API query behavior,
copied handoff URLs, and telemetry signatures remain preserved for
compatibility. The focused sanitizer Vitest passed with 2 tests, the existing
audit-log Jest suite passed with 28 tests, the Office route/source Vitest
passed with 25 tests, and `make qa-preservation-modifications` passed with
406 modified artifacts and zero unclassified paths. Scenarios 10, 11, and 12
remain Partial because broader backend/API terminology cleanup and final RC
evidence remain incomplete.

## Loop 397 Audit Update

The active Go gateway Makefile setup/help text now uses TapTrade-native
developer guidance. It renders `TapTrade Prediction Gateway - Make Commands`,
creates `taptrade_predict`, and uses `taptrade_predict` DSN examples instead of
the inherited sportsbook database/service name. The existing launch-doc safety
test now includes `services/gateway/Makefile`; the focused Go test passed, the
Makefile help output was inspected, `git diff --check` passed, and
`make qa-preservation-modifications` passed with 407 modified artifacts and
zero unclassified paths after classifying the gateway Makefile as Go platform
documentation/tooling. Scenarios 10, 11, and 12 remain Partial because this is
documentation/tooling cleanup, not broader backend/API terminology cleanup or
final RC evidence.

## Loop 398 Audit Update

The active Go gateway Makefile seed path now uses the TapTrade launch seed
command. `make seed` invokes `go run ./cmd/seed -mode base` instead of the
removed historical `migrations/seed.sql` path, while `make demo-data` remains
on `go run ./cmd/seed -mode demo`. The focused Makefile seed regression in the
launch-doc test passed, the seed command tests passed, and
`make qa-preservation-modifications` passed with 407 modified artifacts and
zero unclassified paths. Scenarios 10, 11, and 12 remain Partial because this
is seed-tooling cleanup, not broader backend/API terminology cleanup or final
RC evidence.

## Loop 399 Audit Update

The active gateway demo backoffice seed no longer writes launch-visible audit
rows with removed crypto market examples or payout/price-cent detail keys.
Phase 6 halt/resume audit rows now reference the launch-seeded
`MLBB-FINAL-G1` market with official-source review/confirmation reasons;
settlement audit details use `settlementPointsCents`; and market-create audit
details use `yesPricePointsCents`. Phase 4/5 executable demo plans no longer
include removed ETH/BTC market prefixes. The seed regression passed, the
focused launch-doc regression passed, `git diff --check` passed, and
`make qa-preservation-modifications` passed with 409 modified artifacts and
zero unclassified paths. Scenarios 10, 11, and 12 remain Partial because this
is demo admin-audit seed cleanup, not broader backend/API terminology cleanup
or final RC evidence.

## Loop 400 Audit Update

The active gateway demo seed command and cleanup comments now use point-native
operator wording around preserved settlement internals. Phase 5 seed output now
prints `settlement credits created` and per-market `settlementCredits=`;
cleanup comments describe reserved points and point releases instead of stuck
cash, reserved cash, or cash refunds; and cleanup error context says settlement
credit rows/wallet entries instead of demo payouts. Focused seed regressions
cover those operator-facing phrases, the focused seed test command passed, the
full seed package tests passed, `git diff --check` passed, and
`make qa-preservation-modifications` passed with 409 modified artifacts and
zero unclassified paths. Scenarios 10, 11, and 12 remain Partial because this
is seed/operator wording cleanup around preserved internal contracts, not
broader backend/API terminology cleanup or final RC evidence.

## Loop 401 Audit Update

The active gateway market-maker demo seed now uses point-native operator
wording. Phase 1 comments describe point balances, point-cents, and resting
point bids instead of dollar/cash/stake examples; phase 1 error output uses
`point-cents` instead of a cent symbol; and the orphan-reservation cleanup
comment describes insufficient points instead of insufficient funds. Focused
seed regressions cover those source/output labels, the focused seed test
command passed, the full seed package tests passed, `git diff --check` passed,
and `make qa-preservation-modifications` passed with 410 modified artifacts
and zero unclassified paths. Scenarios 10, 11, and 12 remain Partial because
this is seed market-maker wording cleanup, not broader backend/API terminology
cleanup or final RC evidence.

## Loop 402 Audit Update

Launch readiness now includes the preservation deletion, modification, and
public contract-anchor gates. This makes inherited-artifact deletion review,
broad modified-file classification, and public contract-anchor comparison
mandatory in release GO/NO-GO evidence instead of only pre-commit evidence.
The script syntax check passed; deletion preservation passed with 54 classified
deleted artifacts and zero unclassified paths; contract anchors passed with no
unexpected removed public anchors; modification preservation passed with 410
classified modified artifacts and zero unclassified paths; and `git diff
--check` passed. Scenarios 10, 11, and 12 remain Partial because this is
release-governance hardening, not complete behavioral proof that every
inherited production contract is preserved.

## Loop 403 Audit Update

Launch readiness now includes the reward/social abuse-boundary proof. The
release gate runs `make qa-abuse-boundary`, which passed and refreshed
`revival/34_ABUSE_BOUNDARY_PROOF.md` plus artifact
`revival/artifacts/abuse_boundary_20260629_162224.md`. The proof covers hashed
reward-cluster persistence/review, device/IP second-account blocking, and
same-user plus same-IP multi-account throttles for social writes. The launch
script syntax check, preservation modification gate, and `git diff --check`
passed. Scenario 12 remains Partial because this makes the proof mandatory in
release readiness, but is not the fully deployed-like authenticated canonical
journey or complete safety/terminology proof.

## Loop 384 Audit Update

The active office user-detail ledger mapper no longer accepts retired admin
ledger aliases. `/users/[id]` now maps account-review wallet rows from
`amountPointsCents` and `balancePointsCents` only, and the office route/source
regression asserts the route does not contain `amountCents` or `balanceCents`.
The focused Vitest suite `tests/app-router-legacy-routes.test.ts` passed with
22 tests. The refreshed RC completion audit still failed with scenarios 4, 6,
7, 9, 10, 11, and 12 Partial. Scenarios 10, 11, and 12 remain Partial because
broader backend/API terminology cleanup remains.

## Loop 404 Audit Update

The shared `@taptrade-ui/api-client` wallet exports are now point-native.
`WalletBalance`, `WalletLedgerEntry`, `WalletMutationRequest`, and
`WalletMutationResponse` no longer expose `amountCents`, `balanceCents`,
`availableCents`, or `reservedCents`; they expose point-cent fields and `PTS`
unit values instead. The older cent fields remain only inside private legacy
payload normalizers in `client.ts`. Focused wallet regression, shared
API-client build, launch-doc point-only test, focused exported-type scan,
`git diff --check`, and preservation modification classification passed.
Scenarios 6, 11, and 12 remain Partial because broader API terminology cleanup
and canonical-journey proof remain incomplete.

## Loop 405 Audit Update

The shared `@taptrade-ui/api-client` audit-log export is now point-native.
`AuditLogEntry` no longer exposes `freebetId`, `oddsBoostId`, or
`freebetAppliedCents`; it exposes `pointGrantId`, `pointRuleId`, and
`pointGrantAppliedPointsCents`. Older promo fields remain only inside a
private legacy normalizer in `client.ts`. Focused wallet/API contract
regression, shared API-client build, launch-doc point-only test, focused
exported-type scan, `git diff --check`, and preservation modification
classification passed. Scenarios 10, 11, and 12 remain Partial because broader
admin/API terminology cleanup and canonical-journey proof remain incomplete.

## Loop 406 Audit Update

The shared `@taptrade-ui/api-client` order-book hint export is now point-native.
`OrderBookHint` no longer exposes `bestYesBidCents`, `bestYesAskCents`,
`bestNoBidCents`, or `bestNoAskCents`; it exposes the point-native best-quote
fields and `PTS` unit metadata. Launch-facing shared API-client comments no
longer describe the entrypoint as sportsbook exports. Focused wallet/API
contract regression, shared API-client build, launch-doc point-only test,
focused exported-file scan, `git diff --check`, and preservation modification
classification passed. Scenarios 11 and 12 remain Partial because broader
API/data terminology cleanup and canonical-journey proof remain incomplete.

## Loop 407 Audit Update

The shared `@taptrade-ui/api-client` portfolio-history export is now
point-native by name as well as by fields. `SettledPayout` was renamed to
`SettledPositionResult`, and the player portfolio page now stores history rows
with that type. Private legacy normalizers still read older `pnlCents` and
`payoutCents` payloads without re-exporting the payout-named contract. Focused
QA regression, wallet/API contract regression, shared API-client build, app
scoped typecheck, launch-doc point-only test, focused exported-file scan, `git
diff --check`, and preservation modification classification passed. Scenarios
6, 11, and 12 remain Partial because broader portfolio-history evidence,
API/data cleanup, and canonical-journey proof remain incomplete.

## Loop 408 Audit Update

Public market payloads now use `settlementPoolPointsCents` instead of the
payout-named `settledPayoutPoolPointsCents` at the launch JSON, OpenAPI, and
shared API-client boundary. The inherited database/internal field and older
payload names remain only inside internal storage or private compatibility
normalizers. Focused Go market JSON, launch-doc point-only, player QA
regression, wallet/API contract regression, shared API-client build, app
scoped typecheck, focused public-contract scan, `git diff --check`, and
preservation modification classification passed. Scenarios 11 and 12 remain
Partial because broader API/data cleanup and canonical-journey proof remain
incomplete.

## Loop 409 Audit Update

The broad inherited-system diff now has a production preservation dossier in
the launch readiness path. `make qa-preservation-production-dossier` generates
`revival/93_PRODUCTION_PRESERVATION_DOSSIER.md`, counts tracked change
magnitude, lists high-risk auth, gateway, wallet, prediction, OpenAPI, and
shared-client review queues, and verifies compatibility anchors such as
`PhoenixApiClient`, the new `TapTradeApiClient` alias, private legacy wallet and
audit normalizers, historical reconciliation Make aliases, and TapTrade discovery
QA aliases. Launch readiness now runs this dossier after deletion,
modification, and public contract-anchor preservation gates. The dossier,
existing preservation gates, focused player regressions, shared API-client
build, Go launch-doc point-only test, script syntax checks, and `git diff
--check` passed. Scenario 12 remains Partial because the dossier improves
reviewability of broad production-artifact changes but does not replace human
review, remaining security evidence, or the final RC completion audit.

## Loop 410 Audit Update

The production preservation dossier now classifies untracked artifacts instead
of only counting them. The gate groups untracked gateway HTTP/admin behavior and
tests, prediction-engine tests, point-reconciliation commands, launch proof
commands, schema/seed files, verification scripts, player and office surfaces,
browser/regression proofs, market visual assets, and revival evidence reports.
Any untracked path outside those buckets now fails
`make qa-preservation-production-dossier`. The refreshed dossier classified all
506 untracked entries with zero unclassified paths and wrote
`revival/artifacts/production_preservation_dossier_20260629_170920.md`.
Scenario 12 remains Partial because this closes one preservation visibility gap,
not the human review, security, or final RC proof gaps.

## Loop 411 Audit Update

The progress matrix now reflects scenario-owned evidence more accurately.
Scenarios 4, 6, 7, 9, and 10 were promoted to Pass because their acceptance
requirements already have direct live browser/API/SQL evidence: trading,
portfolio/ledger, lifecycle/resolution, game-economy rewards/ranks, and
admin-operations flows are covered. The remaining blockers cited by those rows
belong to API/data cleanup and safety/release hardening, so they now stay under
scenarios 11 and 12. The Scenario 11 matrix row also had an unescaped markdown
table delimiter repaired so RC audit output shows its actual Gap and Next
cells. The refreshed RC audit now fails with 10 Pass and 2 Partial rows:
scenarios 11 and 12.

## Loop 412 Audit Update

Scenario 11 now has a focused API/data surface gate instead of relying only on
the long narrative evidence row. `make qa-scenario-11-api-surface` writes
`revival/94_SCENARIO_11_API_SURFACE_GATE.md` and verifies every explicit
Scenario 11 API requirement against launch OpenAPI operations or documented
query parameters, plus required shared client/service methods for central
prediction, order, portfolio, settlement, taxonomy, and wallet-ledger flows.
This pass covers market list/search/detail, categories/series/tags, price
history, order book/depth, order create/cancel/list, portfolio positions,
social activity/comments/reactions/reports/follows, leaderboards, reward wallet
APIs, admin resolve/settle/replay, point ledger, and admin
market/taxonomy/user/risk/social/report/reconciliation surfaces. The launch
OpenAPI now also documents the already-real wallet balance, wallet breakdown,
wallet ledger, starter-grant, and market search/filter query contracts.
Scenario 11 is now Pass; Scenario 12 remains Partial because safety,
compliance, preservation, dependency, live no-money, abuse-boundary, and
deployed-like canonical-journey proof remain incomplete.

## Loop 413 Audit Update

One API-visible safety wording leak was removed from the wallet ledger surface.
`/api/v1/wallet/starter-grant` now writes the starter grant ledger reason as
`starter point grant` instead of money-style wording, and
`TestStarterGrantLedgerReasonIsPointNative` claims the starter grant, reads the
authenticated wallet ledger, and rejects money/cash/deposit/withdraw/crypto/
fiat/redeem/prize terms in that ledger reason. The reward/social abuse-boundary
gate was also refreshed on the current worktree with
`revival/artifacts/abuse_boundary_20260629_172850.md`. Scenario 12 remains
Partial because this closes one API-visible terminology leak and refreshes the
same-process abuse proof, but does not replace multi-node/live abuse evidence,
deployed-like canonical journey proof, dependency/release hardening, or final
preservation signoff.

## Loop 414 Audit Update

Admin wallet adjustment reasons are now guarded before they can become
API-visible wallet ledger rows or provider-ops audit details. The admin
credit/debit request decoder trims `reason` and rejects launch-prohibited
money/redemption wording with a point-native `field: reason` error while still
allowing explicit non-redeemable point-support wording.
`TestAdminWalletMutationReasonRejectsMoneyWording` covers safe copy, unsafe
credit and debit copy, non-echoed unsafe error bodies, and no rejected-credit
ledger persistence. The focused wallet HTTP tests passed, and preservation
evidence was refreshed: deletion classification, modification classification,
public contract anchors, the production preservation dossier, and the
abuse-boundary gate all passed on the current worktree. Scenario 12 remains
Partial because this closes another API-visible ledger/audit wording path and
keeps the inherited-system rewrite risk visible, but does not complete human
preservation review, multi-node/live abuse proof, deployed-like canonical
journey proof, dependency/release hardening, or final RC evidence.

## Loop 415 Audit Update

The launch-facing reason guard now covers admin market lifecycle and settlement
routes in addition to admin wallet adjustments. Lifecycle action reasons,
proposed-resolution reasons, direct-settlement reasons, and settlement
`overrideReason` values are trimmed and rejected before service calls when they
contain launch-prohibited money or redemption wording. The focused route tests
prove unsafe lifecycle, proposed-resolution, and direct-settlement override
reasons fail before market lookup, do not echo unsafe text, and do not persist
lifecycle or settlement rows. Preservation modification, public contract
anchor, abuse-boundary, and RC-audit evidence were refreshed; the RC audit
still fails exactly on Scenario 12 Partial. Scenario 12 remains Partial because
this closes another API-visible admin reason path, but does not complete human
preservation review, multi-node/live abuse proof, deployed-like canonical
journey proof, dependency/release hardening, or final RC evidence.

## Loop 416 Audit Update

Admin Predict loyalty adjustment reasons now use the same launch-facing reason
guard before the adjustment service can write XP/rank ledger metadata. The
focused regression proves unsafe loyalty adjustment reasons fail with
`field: reason`, do not echo the unsafe admin value, and do not change the
account point balance. Preservation modification, public contract anchor,
production preservation dossier, abuse-boundary, and RC-audit evidence were
refreshed; the RC audit still fails exactly on Scenario 12 Partial. Scenario
12 remains Partial because this closes one more admin-entered reason path, but
does not complete human preservation review, multi-node/live abuse proof,
deployed-like canonical journey proof, dependency/release hardening, or final
RC evidence.

## Loop 417 Audit Update

Admin dispute-resolution notes now use the shared launch-facing reason guard
before `ResolveDispute` can persist `resolutionNote` or return it through
holder/admin dispute APIs. The focused regression proves unsafe dispute review
notes fail with `field: note`, do not echo unsafe text, and do not mutate
dispute state. User-filed dispute reasons remain user-generated moderation
content, not product copy. Preservation modification, public contract anchor,
production preservation dossier, abuse-boundary, and RC-audit evidence were
refreshed; the RC audit still fails exactly on Scenario 12 Partial. Scenario
12 remains Partial because this closes another admin-entered note path, but
does not complete human preservation review, multi-node/live abuse proof,
deployed-like canonical journey proof, dependency/release hardening, or final
RC evidence.

## Loop 418 Audit Update

Admin KYC decision reasons now use the shared launch-facing reason guard before
the DB-backed KYC service can persist an approval/rejection decision. The route
decoder trims `userId` and `reason`, rejects unsafe money/redemption wording
with `field: reason`, and does not echo the unsafe admin value. The focused
regression registers the KYC admin route with a nil service and proves unsafe
copy returns 400 before any service call could be made; the decode regression
also proves safe `non-redeemable` account-review wording is accepted and
trimmed. The touched KYC route comment was moved away from inherited
external-value gate wording without changing the persistent service contract.
Preservation modification, public contract anchor, production preservation
dossier, abuse-boundary, and RC-audit evidence were refreshed; the RC audit
still fails exactly on Scenario 12 Partial. Scenario 12 remains Partial because
this closes another persisted admin-entered reason path, but does not complete
human preservation review, multi-node/live abuse proof, deployed-like canonical
journey proof, dependency/release hardening, or final RC evidence.

## Loop 419 Audit Update

Admin social-report resolution notes now use the shared launch-facing reason
guard before moderation state can be persisted or exported. The handler trims
`note`, keeps the existing length guard, rejects unsafe money/redemption wording
with `field: note`, and only calls `ResolveReport` after validation. The
focused regression proves an unsafe social review note fails with 400, is not
echoed, and leaves the report open without a review note. User-filed social
report reasons remain user-generated moderation content rather than product
copy. Preservation modification, public contract anchor, production
preservation dossier, abuse-boundary, and RC-audit evidence were refreshed; the
RC audit still fails exactly on Scenario 12 Partial. Scenario 12 remains
Partial because this closes another persisted/exported admin review note path,
but does not complete human preservation review, multi-node/live abuse proof,
deployed-like canonical journey proof, dependency/release hardening, or final
RC evidence.

## Loop 420 Audit Update

Admin CRM punter-note content now uses the shared launch-facing reason guard
before `user_notes` persistence. The handler trims `content`, keeps the existing
required-content check, rejects unsafe money/redemption wording with
`field: content`, and only calls `AddPunterNote` after validation. The focused
regression proves unsafe punter-note content fails with 400, is not echoed, and
is not passed to the repository fake or persisted in returned notes.
Preservation modification, public contract anchor, production preservation
dossier, abuse-boundary, and RC-audit evidence were refreshed; the RC audit
still fails exactly on Scenario 12 Partial. Scenario 12 remains Partial because
this closes another persisted admin-authored note path, but does not complete
human preservation review, multi-node/live abuse proof, deployed-like canonical
journey proof, dependency/release hardening, or final RC evidence.

## Loop 385 Audit Update

The active office user-limit editor now models the point-add limit with
point-native UI/form names. The editor uses `pointAdd` for editable state and
form values, `HEADER_CARD_LIMITS_POINT_ADD` for copy, and
`TapTradePunterLimitsTypesEnum.POINT_ADD` for the compatibility enum member while
leaving the inherited serialized API value `"deposits"` unchanged. The focused
office route/source regression passed with 22 tests. Scenarios 10, 11, and 12
remain Partial because broader backend/API terminology cleanup remains.

## Loop 363 Audit Update

The active frontend dependency baseline no longer reports the inherited `tar`
high-advisory cluster. Root Yarn resolution moves `tar` from vulnerable
`4.4.19` to `7.5.11` under Lerna, pacote, and node-gyp tooling paths while
leaving those tools in place. Direct tar create/extract proof and
`yarn lerna run --scope @taptrade-ui/api-client build` passed before the audit
baseline was accepted. Scenario 12 remains Partial because the official
baseline still reports `high 54`, backend JVM SCA evidence is still missing,
and final preservation/RC audit remains incomplete. The preservation
modification gate was rerun after this dependency change and classified 392
modified artifacts with zero unclassified modified paths.

## Loop 421 Audit Update

Admin bonus grant and forfeit reasons now use the shared launch-facing reason
guard before bonus services can persist metadata, fold text into point-credit
ledger reasons, or store forfeit state. The grant decoder trims `reason`,
keeps the existing retired `override_amount_cents` rejection, rejects unsafe
money/redemption wording with `field: reason`, and only calls the grant service
after validation. The forfeit route trims and validates `reason` before setting
the session admin actor and calling `ForfeitPlayerBonus`. Focused regressions
prove unsafe grant and forfeit reasons fail with 400, are not echoed, and do
not call the fake services. Preservation modification, public contract anchor,
production preservation dossier, abuse-boundary, and RC-audit evidence were
refreshed; the RC audit still fails exactly on Scenario 12 Partial. Scenario 12
remains Partial because this closes another persisted admin-authored reason
path, but does not complete human preservation review, multi-node/live abuse
proof, deployed-like canonical journey proof, dependency/release hardening, or
final RC evidence.

## Loop 422 Audit Update

The older admin loyalty adjustment route now uses the shared launch-facing
reason guard before the in-memory loyalty service can create an account or
point-ledger entry. The handler trims `reason`, rejects unsafe money/redemption
wording with `field: reason`, and calls `service.Adjust` only after validation.
The focused regression proves an unsafe adjustment reason fails with 400, is
not echoed, and leaves the target account absent from admin detail lookup.
Preservation modification, public contract anchor, production preservation
dossier, abuse-boundary, and RC-audit evidence were refreshed; the RC audit
still fails exactly on Scenario 12 Partial. Scenario 12 remains Partial because
this closes another persisted admin-authored loyalty ledger reason path, but
does not complete human preservation review, multi-node/live abuse proof,
deployed-like canonical journey proof, dependency/release hardening, or final
RC evidence.

## Loop 423 Audit Update

The older admin loyalty tier editor now validates launch-facing tier copy
before persisting config. `displayName` and visible `benefits` values pass
through the shared wording guard before `service.UpdateTier` runs. The focused
regression proves unsafe benefit copy fails with 400, is not echoed, and does
not appear in the public tier payload after rejection. Preservation
modification, public contract anchor, production preservation dossier,
abuse-boundary, and RC-audit evidence were refreshed; the RC audit still fails
exactly on Scenario 12 Partial. Scenario 12 remains Partial because this closes
another persisted admin-authored loyalty tier copy path, but does not complete
human preservation review, multi-node/live abuse proof, deployed-like canonical
journey proof, dependency/release hardening, or final RC evidence.

## Loop 424 Audit Update

CMS page create and update requests now validate launch-facing page copy before
the DB-backed content service can persist it. Admin page `title`, `content`,
`meta_title`, and `meta_description` fields pass through the shared wording
guard before `CreatePage` or `UpdatePage` is called. Nil-service regressions
prove unsafe create/update copy fails with 400 before any service call could be
made, identifies the unsafe field, and does not echo the admin-supplied money
or redemption wording. Preservation modification, public contract anchor,
production preservation dossier, abuse-boundary, and RC-audit evidence were
refreshed; the RC audit still fails exactly on Scenario 12 Partial. Scenario 12
remains Partial because this closes another public CMS copy persistence path,
but does not complete human preservation review, multi-node/live abuse proof,
deployed-like canonical journey proof, dependency/release hardening, or final
RC evidence.

## Loop 425 Audit Update

CMS banner create and update requests now validate public banner copy and
destination links before persistence. Admin banner `title` and `link_url`
values pass through the shared wording guard before `CreateBanner` or
`UpdateBanner` is called. Nil-service regressions prove unsafe banner title
copy and retired money-path links fail with 400 before any service call could
be made, identify the unsafe field, and do not echo the admin-supplied value.
Preservation modification, public contract anchor, production preservation
dossier, abuse-boundary, and RC-audit evidence were refreshed; the RC audit
still fails exactly on Scenario 12 Partial. Scenario 12 remains Partial because
this closes another public CMS banner persistence path, but does not complete
human preservation review, multi-node/live abuse proof, deployed-like canonical
journey proof, dependency/release hardening, or final RC evidence.

## Loop 426 Audit Update

Custom RBAC role creation now validates office-visible role copy before the
RBAC service can persist it. Role `name` and `description` values pass through
the shared wording guard before `CreateRole` is called. The focused regression
proves unsafe role description copy fails with 400, identifies `description`,
does not echo the admin-supplied value, and does not appear in the role list
after rejection. Preservation modification, public contract anchor, production
preservation dossier, abuse-boundary, and RC-audit evidence were refreshed; the
RC audit still fails exactly on Scenario 12 Partial. Scenario 12 remains
Partial because this closes another persisted operator-copy path, but does not
complete human preservation review, multi-node/live abuse proof, deployed-like
canonical journey proof, dependency/release hardening, or final RC evidence.

## Loop 427 Audit Update

Admin partner API key creation now validates office-visible partner key names
before key generation or persistence. The partner key `name` value passes
through the shared wording guard after trimming and before scope normalization
or `CreateAPIKey` runs. The focused regression proves unsafe partner key names
fail with 400, identify `name`, do not echo the admin-supplied value, and do
not persist a key. Preservation modification, public contract anchor,
production preservation dossier, abuse-boundary, and RC-audit evidence were
refreshed; the RC audit still fails exactly on Scenario 12 Partial. Scenario 12
remains Partial because this closes another persisted operator-copy path, but
does not complete human preservation review, multi-node/live abuse proof,
deployed-like canonical journey proof, dependency/release hardening, or final
RC evidence.

## Loop 428 Audit Update

Admin partner webhook endpoint creation now validates persisted operator
destinations for launch-prohibited route wording after SSRF/public-host URL
validation and before endpoint persistence. The new destination guard checks
the URL path, query, and fragment while leaving hostnames to the existing
network-safety validator, so arbitrary partner domains are not rejected as
copy. The focused regression proves an unsafe `/cashier/deposit` webhook path
fails with 400, identifies `url`, does not echo the admin-supplied value, and
does not persist an endpoint. Preservation modification, public contract
anchor, production preservation dossier, abuse-boundary, and RC-audit evidence
were refreshed; the RC audit still fails exactly on Scenario 12 Partial.
Scenario 12 remains Partial because this closes another persisted operator
destination path, but does not complete human preservation review,
multi-node/live abuse proof, deployed-like canonical journey proof,
dependency/release hardening, or final RC evidence.

## Loop 429 Audit Update

Self-serve bot API key creation now validates persisted key names before scope
normalization, key generation, or persistence. The bot key `name` value passes
through the shared wording guard after trimming and before `CreateAPIKey` can
write user-visible key metadata. The focused regression proves an unsafe
self-serve key name fails with 400, identifies `name`, does not echo the
user-supplied value, and does not persist a key. Preservation modification,
public contract anchor, production preservation dossier, abuse-boundary, and
RC-audit evidence were refreshed; the RC audit still fails exactly on Scenario
12 Partial. Scenario 12 remains Partial because this closes another persisted
account-copy path, but does not complete human preservation review,
multi-node/live abuse proof, deployed-like canonical journey proof,
dependency/release hardening, or final RC evidence.

## Loop 430 Audit Update

Admin loyalty accrual rule creation and update now validate persisted rule
names before the loyalty service can write rule configuration. The rule `name`
value passes through the shared wording guard after trimming and before
`CreateRule` or `UpdateRule` is called. The focused regression proves an unsafe
rule name fails with 400, identifies `name`, does not echo the admin-supplied
value, and does not appear in the admin loyalty config after rejection.
Preservation modification, public contract anchor, production preservation
dossier, abuse-boundary, and RC-audit evidence were refreshed; the RC audit
still fails exactly on Scenario 12 Partial. Scenario 12 remains Partial because
this closes another persisted economy-rule copy path, but does not complete
human preservation review, multi-node/live abuse proof, deployed-like
canonical journey proof, dependency/release hardening, or final RC evidence.

## Loop 431 Audit Update

The active DB-backed Predict loyalty tier editor now validates persisted tier
copy before the Predict loyalty admin service can write tier configuration.
Tier `displayName` and visible `benefits` values pass through the shared
wording guard before `UpdateTier` is called. The focused regression proves an
unsafe benefit value fails with 400, identifies `benefits`, does not echo the
admin-supplied value, and is rejected before the fake repository persistence
path can run. Preservation modification, public contract anchor, production
preservation dossier, abuse-boundary, and RC-audit evidence were refreshed;
the RC audit still fails exactly on Scenario 12 Partial. Scenario 12 remains
Partial because this closes another persisted economy-tier copy path, but does
not complete human preservation review, multi-node/live abuse proof,
deployed-like canonical journey proof, dependency/release hardening, or final
RC evidence.

## Loop 432 Audit Update

Admin discovery taxonomy creation now validates persisted public taxonomy copy
before category or series rows can be written. Category `name` values and
series `title`, `description`, and `tags` values pass through the shared
wording guard before `CreateCategory` or `CreateSeries` is called. The focused
regression proves unsafe category names and unsafe series title, description,
or tag copy fail with 400, identify the affected field, do not echo the
admin-supplied value, and do not persist into the taxonomy repo fake.
Preservation modification, public contract anchor, production preservation
dossier, abuse-boundary, and RC-audit evidence were refreshed; the RC audit
still fails exactly on Scenario 12 Partial. Scenario 12 remains Partial because
this closes another public discovery taxonomy copy path, but does not complete
human preservation review, multi-node/live abuse proof, deployed-like
canonical journey proof, dependency/release hardening, or final RC evidence.

## Loop 433 Audit Update

Admin event creation now validates persisted public event copy before event
rows can be written. Event `title` and `description` values pass through the
shared wording guard before `CreateEvent` is called. The focused regression
proves unsafe event title or description copy fails with 400, identifies the
affected field, does not echo the admin-supplied value, and does not persist
into the event repo fake. Preservation modification, public contract anchor,
production preservation dossier, abuse-boundary, and RC-audit evidence were
refreshed; the RC audit still fails exactly on Scenario 12 Partial. Scenario
12 remains Partial because this closes another public market-grouping copy
path, but does not complete human preservation review, multi-node/live abuse
proof, deployed-like canonical journey proof, dependency/release hardening, or
final RC evidence.

## Loop 434 Audit Update

Gateway-only live no-money-boundary evidence was refreshed on the current
worktree. A foreground gateway run with `GATEWAY_AUTH_ENABLED=false` and no DB
available reported `pointMode: non_redeemable_points`, legacy money routes
disabled, required launch domains present, and prohibited money domains absent.
`make qa-live-no-money-boundary` was run with `PLAYER_BASE_URL=` and
`OFFICE_BASE_URL=` explicitly omitted, probing only
`GATEWAY_BASE_URL=http://127.0.0.1:18180`; it passed 32/32 checks and returned
404 for inherited cashier, payment, withdrawal, webhook, and crypto endpoints.
The artifact is
`revival/artifacts/live_no_money_boundary_20260630_103652.md`. Scenario 12
remains Partial because this is gateway-only runtime evidence, not full
player/office route proof, authenticated canonical journey proof, human
preservation review, multi-node/live abuse proof, dependency/release
hardening, or final RC evidence.

## Loop 435 Audit Update

Full player, office, and gateway live no-money-boundary evidence now passes on
the current worktree. The player and office Next dev servers were started in
foreground sessions after one-time locale generation, and the foreground Go
gateway ran with `PORT=18180`, `GATEWAY_AUTH_ENABLED=false`, and the read-model
seed file. `make qa-live-no-money-boundary` ran against
`PLAYER_BASE_URL=http://127.0.0.1:3022`,
`OFFICE_BASE_URL=http://127.0.0.1:3020`, and
`GATEWAY_BASE_URL=http://127.0.0.1:18180`; it passed 70/70 checks. The player
rendered `/`, `/predict`, `/rewards`, and `/leaderboards` below 500 and
returned 404 for retired cashier, cashout, crypto, deposit, fiat, payment,
prize, redeem, redemption, and withdrawal routes. The office rendered `/` and
`/auth/login` below 500 and returned 404 for the same retired money routes. The
gateway reported non-redeemable point mode, disabled legacy money routes,
required launch domains present, prohibited money domains absent, and 404 for
all inherited cashier/payment/crypto endpoints. The passing artifact is
`revival/artifacts/live_no_money_boundary_20260630_105447.md`. Scenario 12
remains Partial because this clears the full live route-boundary proof, but
human preservation review, multi-node/live abuse proof, dependency/release
hardening, and final RC evidence still remain.

## Loop 436 Audit Update

The maintained abuse-boundary gate now includes DB-backed multi-instance reward
cluster proof. `make qa-abuse-boundary` starts a temporary Postgres 16
container, runs `TestRewardClusterDBStoreBlocksAcrossServiceInstances` with
`WALLET_DB_DSN` against that shared store, and cleans the container afterward.
The test opens two independent wallet service instances, records hashed device
and IP reward-cluster evidence through the first instance, verifies a same-user
retry through the second instance stays allowed, verifies a second user on the
same device cluster is blocked, verifies admin summaries expose only hashed
signals and the original allowed user, and verifies raw device/IP values are
not stored. The same gate still proves migration ownership, same-process
daily-claim and point-pack cluster blocking, route-restart persistence,
admin hashed review/export, same-user social burst limiting, and same-IP
multi-account throttles for comments, reports, reactions, and follows. The
passing artifact is `revival/artifacts/abuse_boundary_20260630_090055.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_090216.md`. Scenario 12
remains Partial because this clears the reward-cluster shared-store/
multi-instance proof, but human preservation review, broader live
social/account-graph abuse proof, dependency/release hardening, and final RC
evidence still remain.

## Loop 437 Audit Update

Dependency/release-hardening evidence was refreshed with current timestamped
artifacts instead of stale fixed-name audit logs. `security-deps` now writes
timestamped TapTrade and TapTrade player yarn-audit logs, and the frontend residual
advisory gate now consumes the latest available audit logs by default. The
fresh dependency baseline reports TapTrade and TapTrade player at critical 0, high
5, moderate 76, low 14, with 2 unique advisory ids per scope; the high rows
remain the reviewed inherited Lerna `ip` and `lodash.set` residuals. The
frontend residual gate passed on the fresh logs and the JVM direct OSV baseline
was refreshed from OSV with 113 parsed coordinates, 5 coordinates with direct
findings, and 14 unique OSV ids. The JVM direct residual gate passed against
the refreshed JSON artifact. Evidence:
`revival/artifacts/talon_yarn_audit_20260630_090648.log`,
`revival/artifacts/taptrade_player_yarn_audit_20260630_090648.log`,
`revival/artifacts/frontend_residual_advisory_gate_20260630_090658.md`,
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_090606.md`,
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_090606.json`,
and `revival/artifacts/jvm_direct_residual_advisory_gate_20260630_090609.md`.
Scenario 12 remains Partial because this makes residual dependency governance
fresh and executable, but full resolver-backed JVM/transitive SCA, human
preservation review, broader live social/account-graph abuse proof, and final
RC evidence still remain.

## Loop 438 Audit Update

Preservation deletion evidence now requires replacement anchors instead of only
classification labels. The deletion gate validates that deleted cashier,
payment, crypto, deposit, withdrawal, and Office money surfaces remain covered
by the live no-money-boundary proof harness; retired player money helpers are
covered by point-ledger and wallet-client tests; relocated Office audit and
activity tests still exist; and retired bet replay proof is replaced by the
point-native prediction reconciliation command and fixture.

Evidence refreshed on the current worktree:
`revival/artifacts/preservation_deletion_map_20260630_091216.md`,
`revival/artifacts/preservation_modification_map_20260630_091234.md`,
`revival/artifacts/preservation_contract_anchors_20260630_091234.md`, and
`revival/artifacts/production_preservation_dossier_20260630_091327.md`.
The production dossier records the rewrite-sized tracked diff, 78 high-risk
review queue entries, and 647 classified untracked artifacts. `git diff
--check` passed, all local-stack services were stopped, and the RC audit still
failed correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_091544.md`. Scenario 12
remains Partial because this is stronger machine-checkable preservation
evidence, not human preservation sign-off, broader live social/account-graph
abuse proof, full resolver-backed JVM/transitive SCA, or final RC evidence.

## Loop 439 Audit Update

Backend launch-facing lifecycle copy and nearby production comments were
tightened to point-native wording. The settled market lifecycle description now
uses "point disbursements" instead of "payouts", and a focused prediction test
guards lifecycle descriptions against launch-prohibited money/cash/payout/bet
terms. Wallet reservation defaults now fall back to `prediction_order`, and
prediction exchange/settlement comments now describe held points instead of
cash reservations.

Verification passed with
`go test ./services/gateway/internal/prediction ./services/gateway/internal/wallet -count=1`,
`git diff --check`, and a targeted scan for the cleaned phrases returning no
matches in prediction/wallet production code. Refreshed evidence:
`revival/artifacts/preservation_modification_map_20260630_092125.md`,
`revival/artifacts/production_preservation_dossier_20260630_092125.md`, and
`revival/artifacts/rc_completion_audit_gate_20260630_092353.md`. Scenario 12
remains Partial because this closes a backend point-native copy/default slice,
not human preservation review, broader live social/account-graph abuse proof,
full resolver-backed JVM/transitive SCA, or final RC evidence.

## Loop 440 Audit Update

The abuse-boundary proof now includes DB-backed multi-instance social graph
evidence. A new `GATEWAY_DB_DSN`-gated test opens two independent SQL social
stores against the same Postgres database and proves shared comments,
reactions, reports, report resolution, follows, public profiles, user activity,
and global activity. Duplicate cross-instance reactions and follows remain
idempotent through the SQL primary keys.

The maintained gate now starts an isolated Postgres container for this proof.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_093100.md`, with the social proof log
at
`revival/artifacts/abuse_boundary_20260630_093100_dbbacked_multiinstance_social_graph_controls.log`.
`make qa-preservation-production-dossier` also passed at
`revival/artifacts/production_preservation_dossier_20260630_093447.md`, keeping
the inherited-system review queue current at 82 high-risk entries and 657
classified untracked artifacts.
`git diff --check` passed, and the RC audit still failed correctly with Scenario
12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_093413.md`. Scenario 12
remains Partial because this proves shared social graph persistence and
idempotency, not human preservation review, cross-node social rate-limit
enforcement, full resolver-backed JVM/transitive SCA, or final authenticated RC
journey evidence.

## Loop 441 Audit Update

The social write limiter is now shared across gateway instances when a DB is
wired. The runtime uses a SQL-backed token bucket for social writes in DB mode
and keeps the inherited in-memory token bucket for no-DB tests and local memory
mode. Migration `049_prediction_social_write_limits.sql` owns the persistent
table, and `TestSocialWriteLimiterMigrationOwnsPersistentStore` guards that
anchor.

`TestMarketSocialSQLWriteLimiterBlocksAcrossRouteInstances` opens two
independent social route instances against one Postgres database and proves
same-user plus same-IP comment bursts are blocked across instances without
persisting blocked comments. `make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_094247.md`; the DB social proof log
is
`revival/artifacts/abuse_boundary_20260630_094247_dbbacked_multiinstance_social_graph_controls.log`.
`go test ./services/gateway/internal/http -count=1` and `git diff --check`
passed. `make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_094321.md`, keeping
the inherited-system review queue current at 83 high-risk entries and 663
classified untracked artifacts. `make qa-rc-completion-audit` still failed
correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_094605.md`. Scenario 12
remains Partial because this clears the cross-instance social limiter proof
path, not human preservation review, remaining backend legacy-contract cleanup,
full resolver-backed JVM/transitive SCA, or final authenticated RC journey
evidence.

## Loop 442 Audit Update

The canonical player browser journey proof is now a maintained QA target rather
than only a stale manual command in an evidence report. `scripts/qa/canonical-browser-journey.sh`
probes the running player app and same-origin gateway status endpoint, runs
`talon-backoffice/e2e/prediction/canonical-browser.ui.spec.ts` through
Playwright, and writes `revival/42_CANONICAL_BROWSER_JOURNEY.md` plus
timestamped artifacts under `revival/artifacts/`. The Makefile exposes it as
`make qa-canonical-browser-journey`.

Verification this loop covered the wrapper and wiring:
`bash -n scripts/qa/canonical-browser-journey.sh` passed, `make -n
qa-canonical-browser-journey` printed the expected script invocation, and
`scripts/local-stack.sh status` showed backend, gateway, office, and player
stopped. `make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_095420.md`,
classifying the new QA wrapper as reviewable verification infrastructure.
`make qa-rc-completion-audit` still failed correctly with Scenario 12 Partial
at `revival/artifacts/rc_completion_audit_gate_20260630_095420.md`. Scenario 12
remains Partial because the authenticated canonical journey still must be
executed against a fresh seeded running stack; this loop only made that proof
reproducible and artifact-producing.

## Loop 443 Audit Update

The canonical player browser journey now has a disposable seeded-stack runner
and fresh passing evidence. `scripts/qa/canonical-browser-stack.sh` starts an
ephemeral Postgres container, migrates and demo-seeds the gateway DB, starts
DB-backed auth, DB-backed gateway, and the TapTrade player app, waits for the
same-origin player `/api/v1/status` proxy, and then runs the maintained
canonical browser journey gate.

`make qa-canonical-browser-stack` passed at
`revival/artifacts/canonical_browser_stack_20260630_100541.md`. The nested
browser journey gate passed at
`revival/artifacts/canonical_browser_journey_20260630_100649.md`, with the
Playwright log showing setup plus UI specs both passed. The Playwright proof
now uses the current open seeded order-book market `MLBB-FINAL-G1` instead of
the demo-settled `VAL-MASTERS-FINAL` fixture. `make
qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_101039.md`, and
`make qa-rc-completion-audit` still failed correctly with Scenario 12 Partial
at `revival/artifacts/rc_completion_audit_gate_20260630_101039.md`. Scenario
12 remains Partial because fresh authenticated canonical browser evidence is
now present, but human preservation review, remaining backend legacy-contract
cleanup, and full resolver-backed JVM/transitive SCA evidence still remain.

## Loop 444 Audit Update

The production preservation dossier now makes the high-risk inherited-contract
review queue more explicit instead of only listing paths. `scripts/qa/preservation-production-dossier.sh`
adds a `Review Focus` column for each high-risk changed artifact, distinguishing
auth/session compatibility, public API/client compatibility, gateway
route/authz/audit behavior, prediction lifecycle/settlement invariants, wallet
ledger idempotency/reservation semantics, and deleted fixture replacement
evidence. The report also adds a human review checklist for those domains.

`bash -n scripts/qa/preservation-production-dossier.sh` passed, and `make
qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_101602.md` with
83 high-risk review queue entries and 679 classified untracked artifacts.
Scenario 12 remains Partial because this improves reviewability of the broad
rewrite-sized diff, but it does not replace human preservation review,
remaining backend legacy-contract cleanup, or full resolver-backed
JVM/transitive SCA.

## Loop 445 Audit Update

Admin CRM note categories now share the same launch-facing copy boundary as
note content. `POST /api/v1/admin/punters/{id}/notes` trims `category` and
rejects cash/deposit/withdrawal/crypto/fiat/prize/payout/redeemable-style
wording before `AddPunterNote` can persist or echo it. The new
`TestAdminPunterAddNoteRejectsMoneyWordingCategory` proves unsafe category
text returns 400 with `field: category`, is not echoed, and writes no note.

`go test ./services/gateway/internal/http -run 'TestAdminPunterAddNote' -count=1`
passed, `make qa-preservation-modifications` passed at
`revival/artifacts/preservation_modification_map_20260630_102120.md`, `make
qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_102120.md`, and
`make qa-rc-completion-audit` still failed correctly with Scenario 12 Partial
at `revival/artifacts/rc_completion_audit_gate_20260630_102215.md`. Scenario
12 remains Partial because this closes one more operator-supplied backend copy
path, not the remaining human preservation review, backend legacy-contract
cleanup, or full resolver-backed JVM/transitive SCA.

## Loop 446 Audit Update

Resolver-backed JVM evidence is now present instead of blocked on local Java/SBT
availability. A workspace-local Java 17 plus SBT toolchain ran
`make security-jvm-required`, producing
`revival/artifacts/backend_sbt_update_2026-06-30.log` and refreshing
`revival/12_JVM_DEPENDENCY_BASELINE.md` with successful SBT update/eviction
evidence. `make security-sbom` refreshed `revival/21_SBOM_BASELINE.md` with
`revival/artifacts/sbom_20260630_122817/`, including an ok
`phoenix-backend (resolved classpath)` artifact.

Direct JVM OSV evidence and governance were also refreshed:
`make security-jvm-osv-direct` wrote
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_102806.md` and
JSON, and `make security-jvm-direct-residual-advisories` passed at
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_102808.md`.
The new `make security-jvm-osv-resolved-classpath` target queries OSV for the
SBT-resolved `phoenix-backend / Compile / externalDependencyClasspath` graph and
wrote `revival/68_JVM_OSV_RESOLVED_CLASSPATH_BASELINE.md` plus
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_103139.md` and
JSON. That resolved baseline found 233 package/version coordinates, 31
coordinates with OSV findings, and 77 unique OSV ids. Scenario 12 remains
Partial because the resolved findings now need remediation, compatibility
validation, or explicit residual-risk acceptance, alongside human preservation
review and remaining backend legacy-contract cleanup. The refreshed RC audit
still fails only on Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_103847.md`.

## Loop 447 Audit Update

Resolved JVM classpath OSV findings now have an executable residual-governance
gate. `scripts/qa/jvm-resolved-residual-advisory-gate.sh` reads the latest
`jvm_osv_resolved_classpath_baseline_*.json` artifact and fails any resolved
coordinate with OSV findings unless it matches an explicit reviewed residual
policy at `revival/jvm_resolved_residual_allowlist.json` or the path supplied
through `JVM_RESOLVED_RESIDUAL_ADVISORY_POLICY`. The Makefile exposes the gate
as `make security-jvm-resolved-residual-advisories`, and launch readiness now
runs it after the resolved-classpath baseline and direct residual gate.

The current run failed as intended because no resolved residual policy exists
yet. It wrote `revival/69_JVM_RESOLVED_RESIDUAL_ADVISORY_GATE.md` and
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_104108.md`,
listing the same unresolved classpath risk area surfaced by the baseline.
Preservation evidence was refreshed at
`revival/artifacts/preservation_modification_map_20260630_104207.md` and
`revival/artifacts/production_preservation_dossier_20260630_104207.md`, and the
RC audit still fails only on Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_104226.md`.
Scenario 12 remains Partial until the resolved JVM findings are remediated or
explicitly accepted through reviewed residual policy entries, and until human
preservation review plus remaining backend legacy-contract cleanup are closed.

## Loop 448 Audit Update

The first compile-verified JVM remediation batch reduced the resolved backend
classpath risk without changing product behavior. The batch keeps the existing
Akka Management and SnakeYAML residuals in place because Akka Management
`1.6.1` did not resolve from the configured repositories and SnakeYAML `2.x`
caused this SBT/Coursier stack to request missing Android-classifier artifacts.
BouncyCastle same-artifact overrides were also removed because they still
reported OSV findings and would have turned a transitive residual into a direct
one.

The accepted batch upgraded RabbitMQ, Akka Stream Kafka, Jackson, Guava,
OkHttp/Okio, Jakarta Mail, commons-beanutils/io/net/compress/lang3, Avro,
RESTEasy multipart, PostgreSQL, and snappy-java through direct versions or
dependency overrides. `make security-jvm-required` passed, `make
security-jvm-osv-resolved-classpath` passed at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_105239.md`
with 236 resolved coordinates, 15 coordinates with OSV findings, and 42 unique
OSV ids, and `make security-jvm-osv-direct` passed at
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_105251.md` with
128 parsed coordinates, 3 direct findings, and 12 unique OSV ids. The direct
residual gate passed at
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_105254.md`.
The resolved residual gate still fails, now at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_105835.md`, on
the remaining 15 coordinates. Backend compile passed with saved log
`revival/artifacts/backend_compile_20260630_105900.log`, and SBOM evidence was
refreshed under `revival/artifacts/sbom_20260630_125842/`.
Preservation evidence was refreshed at
`revival/artifacts/preservation_modification_map_20260630_110208.md` and
`revival/artifacts/production_preservation_dossier_20260630_110208.md`, and the
RC audit still fails only on Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_110235.md`.

Scenario 12 remains Partial because the remaining resolved JVM findings still
need remediation or reviewed residual policy entries, and human preservation
review plus remaining backend legacy-contract cleanup also remain.

## Loop 449 Audit Update

The second JVM remediation batch reduced the resolved backend classpath
findings again without adding new direct residual risk. Clean overrides for
Apache MIME4J, Apache POI OOXML, and Jawn were kept after resolver and compile
verification. Akka HTTP `10.5.3` was rejected because it introduced a Scala XML
eviction conflict against inherited Scalate/Spoiwo dependencies, while Kafka
`3.9.1` and LZ4 `1.8.1` were removed because they still had OSV findings and
failed the direct residual gate as new unreviewed direct findings.

`make security-jvm-required` passed. The resolved OSV baseline at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_131538.md`
now reports 237 resolved coordinates, 12 coordinates with OSV findings, and 39
unique OSV ids. The direct OSV baseline at
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_131548.md`
reports 131 parsed coordinates, 3 direct findings, and 12 unique OSV ids, with
direct residual governance passing at
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_131549.md`.
The resolved residual gate still fails at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_131550.md` on
the remaining 12 coordinates. Backend compile passed with saved log
`revival/artifacts/backend_compile_20260630_130435.log`, and SBOM evidence was
refreshed under `revival/artifacts/sbom_20260630_145448/`. Preservation
evidence was refreshed at
`revival/artifacts/preservation_modification_map_20260630_125930.md` and
`revival/artifacts/production_preservation_dossier_20260630_125955.md`; the RC
completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_130002.md`.

Scenario 12 remains Partial because those remaining resolved JVM findings still
need remediation or reviewed residual policy entries, and human preservation
review plus remaining backend legacy-contract cleanup also remain.

## Loop 450 Audit Update

The remaining resolved JVM residuals now have a durable origin and candidate
triage artifact at `revival/70_JVM_RESOLVED_RESIDUAL_TRIAGE.md`. The triage
records why the obvious narrow candidates are not launch-ready: Scala patch
movement is blocked by the pinned SemanticDB/Scalafix artifact line, Circe YAML
`0.15.2` fails strict resolution through the missing SnakeYAML Android
classifier artifact, newer SSHJ moves EdDSA risk into still-flagged
BouncyCastle artifact families, same-artifact BouncyCastle upgrades remain
OSV-positive, and clean Keycloak core versions require an auth/session
migration while `keycloak-adapter-core` has no matching current artifact line.

The refreshed final-state JVM gates are:
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_131538.md`,
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_131548.md`,
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_131549.md`, and
the expected failing
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_131550.md`.
Scenario 12 remains Partial because the triage artifact does not accept any
residual for launch; it only makes the remaining remediation/migration choices
reviewable.

## Loop 475 Audit Update

Bot and partner API-key list reads now have the same read-side launch-copy
boundary as the other admin/user-supplied text surfaces. `/api/v1/bot/keys`
and `/api/v1/admin/partner-keys?userId=...` redact legacy unsafe stored key
names before response serialization while preserving raw `prediction.APIKey`
records in the backing stores. Focused regressions prove unsafe imported-style
cash/crypto key names do not leak and that raw key names remain unchanged for
operator review and compatibility.

The full gateway HTTP package passed at
`revival/artifacts/api_key_name_read_redaction_boundary_20260630_204246.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_184318.md`,
`revival/artifacts/preservation_deletion_map_20260630_184337.md`,
`revival/artifacts/preservation_modification_map_20260630_184339.md`, and
`revival/artifacts/production_preservation_dossier_20260630_184354.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_184535.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 478 Audit Update

Leaderboard definition read payloads now redact another restored/imported
copy path. Public and admin leaderboard definition responses sanitize copied
`slug`, `name`, `description`, and `rewardSummary` values before
serialization. The regression seeds unsafe cash/crypto/USD payout copy directly
into the leaderboard service to mimic legacy state, confirms the response is
redacted, and confirms the raw service definition stays unchanged for
preservation review.

The full gateway HTTP package passed at
`revival/artifacts/leaderboard_definition_read_redaction_boundary_20260630_205939.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_190000.md`,
`revival/artifacts/preservation_deletion_map_20260630_190026.md`,
`revival/artifacts/preservation_modification_map_20260630_190027.md`, and
`revival/artifacts/production_preservation_dossier_20260630_190048.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_190229.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 477 Audit Update

Partner webhook admin endpoints now guard another launch-facing compatibility
seam. Admin webhook registration still uses the inherited webhook engine and
store, but the admin route now rejects launch-prohibited event identifiers such
as `withdrawal.status` before persistence. Webhook endpoint list responses also
redact unsafe legacy URL paths and event strings before serialization, while
the raw `webhooks.Endpoint` values remain unchanged in the backing store for
operator review and compatibility.

The full gateway HTTP package passed at
`revival/artifacts/webhook_launch_copy_boundary_20260630_205452.log`. Abuse
and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_185511.md`,
`revival/artifacts/preservation_deletion_map_20260630_185536.md`,
`revival/artifacts/preservation_modification_map_20260630_185538.md`, and
`revival/artifacts/production_preservation_dossier_20260630_185554.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_185708.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

## Loop 476 Audit Update

RBAC role read payloads now have a response-only launch-copy boundary.
`/api/v1/admin/roles` redacts unsafe legacy role names and descriptions before
serialization, and `/api/v1/admin/users` redacts embedded role reference names
while leaving staff user names untouched. The regression seeds legacy
cash/crypto role copy and proves the HTTP responses are redacted, the backing
fake repository remains raw, and the helper deep-copies role refs rather than
mutating inherited RBAC records.

The full gateway HTTP package passed at
`revival/artifacts/rbac_role_read_redaction_boundary_20260630_204935.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_184953.md`,
`revival/artifacts/preservation_deletion_map_20260630_185015.md`,
`revival/artifacts/preservation_modification_map_20260630_185016.md`, and
`revival/artifacts/production_preservation_dossier_20260630_185033.md`. The
RC completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_185141.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.
