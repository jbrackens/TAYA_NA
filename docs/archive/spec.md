> **ARCHIVED 2026-09-06.** Legacy master spec, untouched since the 2026-07-06
> rebrand sweep. Superseded by CLAUDE.md, DESIGN.md, PRODUCT-USER-JOURNEYS.md,
> and docs/. Historical reference only.

# TapTrade Spec

## 1. Product Definition

TapTrade is a points-based prediction market app. Users create an account, receive non-redeemable gameplay points, browse markets, buy/sell YES/NO positions, track a portfolio and point ledger, participate socially, earn XP/ranks/rewards, and see markets resolved by admins or declared sources.

Loop 518 evidence note: the required Scenario 12 signoff files now exist as
pending reviewer templates instead of missing paths:
`revival/signoffs/security_residual_acceptance.md` and
`revival/signoffs/production_preservation_signoff.md`. They are prefilled with
the current residual, preservation, signoff-gate, and RC artifacts, plus the
decision areas reviewers must complete. `make qa-scenario-12-signoff` still
fails correctly at
`revival/artifacts/scenario_12_signoff_gate_20260701_084755.md` because both
templates remain `Status: pending` and lack reviewer/date fields. The
production dossier refreshed at
`revival/artifacts/production_preservation_dossier_20260701_084732.md`, and
the RC audit still fails correctly because Scenario 12 is Partial. Scenario
12 remains Partial until those pending templates are completed by accountable
reviewers or remediation changes the required decision.

Loop 517 evidence note: Scenario 12 signoff is now executable instead of only
documented in prose. `make qa-scenario-12-signoff` runs
`scripts/qa/scenario-12-signoff-gate.sh` and fails until
`revival/signoffs/security_residual_acceptance.md` and
`revival/signoffs/production_preservation_signoff.md` exist with accepted or
approved status, named reviewer, ISO date, and references to the current
security residual packet, production contract review pack, and production
preservation dossier. The gate failed correctly at
`revival/artifacts/scenario_12_signoff_gate_20260701_083415.md` because both
signoff files are missing. Launch readiness now runs this gate before the RC
audit. The production dossier refreshed at
`revival/artifacts/production_preservation_dossier_20260701_083425.md`, and
the RC audit still fails correctly at
`revival/artifacts/rc_completion_audit_gate_20260701_083425.md`. Scenario 12
remains Partial until the required signoffs are recorded or remediation
changes the signoff requirements.

Loop 516 evidence note: a security residual acceptance packet was created at
`revival/artifacts/security_residual_acceptance_packet_20260701_082738.md`.
It packages the current frontend, direct JVM, and resolved JVM residual gate
evidence into launch-owner/security review form, listing each residual class,
required decision, compatibility constraints, and approval checklist. The
packet is explicitly unsigned and does not accept residual risk. The production
dossier was refreshed at
`revival/artifacts/production_preservation_dossier_20260701_082831.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_082943.md`.
Scenario 12 remains Partial until a launch-owner/security reviewer accepts or
requires remediation for the residuals and human preservation signoff is
complete.

Loop 515 evidence note: residual dependency/security governance was refreshed
against current artifacts. `make qa-frontend-residual-advisories` passed at
`revival/artifacts/frontend_residual_advisory_gate_20260701_082427.md`: both
TapTrade and TapTrade player audit logs have zero critical rows and only reviewed
Lerna-path high residuals for `ip` and `lodash.set`. `make
security-jvm-direct-residual-advisories` passed at
`revival/artifacts/jvm_direct_residual_advisory_gate_20260701_082427.md` with
four direct JVM coordinates matching the reviewed residual set. `make
security-jvm-resolved-residual-advisories` passed at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260701_082427.md`
with eight resolved classpath coordinates matching the reviewed residual
policy. The production dossier was refreshed at
`revival/artifacts/production_preservation_dossier_20260701_082448.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_082559.md`.
These gates prove no new unreviewed residual advisory drift in the current
artifacts, but they do not replace launch-owner/security residual acceptance
or remediation; Scenario 12 remains Partial.

Loop 514 evidence note: inherited production-contract anchor coverage was
expanded before further feature work. `make qa-preservation-contract-anchors`
now compares Gateway OpenAPI paths, root handler route strings, combined core
Gateway route strings from root/wallet/prediction handlers, inherited
`PhoenixApiClient` methods, `PredictionApiClient` methods, and player wallet
client exported functions against `HEAD`. Legacy player wallet `deposit`,
`withdraw`, and payment `getTransactionStatus` removals are classified as
launch-prohibited removals; all other inherited anchor removals fail the gate.
The strengthened gate passed at
`revival/artifacts/preservation_contract_anchors_20260701_081950.md` with
zero unexpected removals across all six anchor sets. The production dossier
was refreshed at
`revival/artifacts/production_preservation_dossier_20260701_082018.md` and
still reports the broad diff as human-review risk, not completion evidence.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_082230.md`. Scenario 12
remains Partial until launch-owner/security residual acceptance or remediation
and human preservation signoff are complete.

Loop 513 evidence note: production-contract preservation review is now
front-loaded into a compact reviewer pack at
`revival/artifacts/production_contract_review_pack_20260701_081231.md`.
The pack answers the inherited-system concern directly: the current diff is
not treated as a safe rewrite, and high-risk production contracts still require
human signoff. It summarizes the 544-file tracked diff, separates
launch-required public money-path deletions from high-risk backend/client/admin
contract movement, lists top churn files, and defines signoff questions for
auth/session, gateway route/authz/audit behavior, prediction settlement,
wallet ledger invariants, public OpenAPI/shared clients, and office/admin
operations. Preservation gates still passed at
`revival/artifacts/preservation_deletion_map_20260701_081349.md`,
`revival/artifacts/preservation_modification_map_20260701_081356.md`, and
`revival/artifacts/production_preservation_dossier_20260701_081419.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_081548.md`. Scenario 12
remains Partial because this artifact makes the review sharper but does not
replace launch-owner/security residual-policy acceptance or human preservation
review of high-risk inherited production-contract entries.

Loop 512 evidence note: active wallet/admin point-account mutation errors now
avoid rendered `wallet` copy for invalid mutation requests and generic mutation
failures. `mapWalletError` still preserves inherited internal wallet service
sentinels, but callers now see `invalid point account mutation request` and
`point account mutation failed`. Focused proof passed with
`TestWalletErrorsUsePointNativeCopy` and neighboring wallet ledger/balance
regressions; the full gateway HTTP package passed at
`revival/artifacts/gateway_http_wallet_mutation_error_boundary_20260701_100453.log`,
and the wallet package passed as a neighboring sanity check. Abuse and
preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_080532.md`,
`revival/artifacts/preservation_deletion_map_20260701_080532.md`,
`revival/artifacts/preservation_modification_map_20260701_080532.md`, and
`revival/artifacts/production_preservation_dossier_20260701_080533.md`; the
RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_080837.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
human preservation review of high-risk inherited production-contract entries
still remain.

Loop 511 evidence note: active wallet/admin point-account error copy now avoids
cash-like `funds` wording. `mapWalletError(wallet.ErrInsufficientFunds)` now
renders `insufficient points` while preserving the inherited internal error
contract. Focused proof passed with `TestWalletErrorsUsePointNativeCopy` and
neighboring wallet ledger/balance regressions; the full gateway HTTP package
passed at
`revival/artifacts/gateway_http_wallet_error_copy_boundary_20260701_095821.log`,
and the wallet package passed as a neighboring sanity check. Abuse and
preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_075845.md`,
`revival/artifacts/preservation_deletion_map_20260701_075845.md`,
`revival/artifacts/preservation_modification_map_20260701_075845.md`, and
`revival/artifacts/production_preservation_dossier_20260701_075845.md`; the
RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_080148.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
human preservation review of high-risk inherited production-contract entries
still remain.

Loop 510 evidence note: preserved alpha cashier admin error responses now avoid
legacy external-chain copy for invalid broadcast transaction hashes.
`mapAlphaCashierAdminError(alphacashier.ErrTxHashInvalid)` preserves the
inherited `txHash` field contract but no longer renders `EVM transaction hash`
wording to callers. Focused proof passed with
`TestAlphaCashierAdminErrorsUseLaunchNeutralCopy` and neighboring alpha
cashier admin boundary tests; the full gateway HTTP package passed at
`revival/artifacts/gateway_http_alpha_admin_error_boundary_20260701_095242.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_075309.md`,
`revival/artifacts/preservation_deletion_map_20260701_075309.md`,
`revival/artifacts/preservation_modification_map_20260701_075309.md`, and
`revival/artifacts/production_preservation_dossier_20260701_075309.md`; the
RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_075426.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
human preservation review of high-risk inherited production-contract entries
still remain.

Loop 509 evidence note: preserved alpha cashier admin reconciliation
compatibility reads now render a copied summary payload instead of the raw
service summary. `/api/v1/admin/cashier/alpha/reconciliation` still preserves
the inherited route and `ReconciliationSummary` fields for compatibility, but
the HTTP response redacts unsafe legacy token values such as
`tokenSymbol: "USDC"` without mutating the raw service result. Focused proof
passed with `TestAlphaCashierAdminReconciliationRouteRedactsLegacyUnsafeValues`
and neighboring alpha cashier admin boundary tests; the full gateway HTTP
package passed at
`revival/artifacts/gateway_http_alpha_reconciliation_boundary_20260701_094545.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_074610.md`,
`revival/artifacts/preservation_deletion_map_20260701_074611.md`,
`revival/artifacts/preservation_modification_map_20260701_074611.md`, and
`revival/artifacts/production_preservation_dossier_20260701_074611.md`; the
RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_074813.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
human preservation review of high-risk inherited production-contract entries
still remain.

Loop 508 evidence note: preserved alpha cashier deposit/release compatibility
rows now redact unsafe legacy token values at the response boundary without
rewriting inherited structs or raw repository records. User
`/api/v1/cashier/alpha/deposit-intents` and
`/api/v1/cashier/alpha/withdrawal-requests` reads, plus admin
`/api/v1/admin/cashier/alpha/deposits` and
`/api/v1/admin/cashier/alpha/withdrawals` reads, copy row payloads before
rendering and redact unsafe `tokenSymbol: "USDC"` values alongside existing
`failureReason` and `reviewNote` redaction. Focused user/admin regression
tests passed, the alpha cashier package passed at
`revival/artifacts/alpha_cashier_row_token_boundary_20260701_093818.log`, and
the full gateway HTTP package passed at
`revival/artifacts/gateway_http_alpha_row_token_boundary_20260701_093818.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_073848.md`,
`revival/artifacts/preservation_deletion_map_20260701_073849.md`,
`revival/artifacts/preservation_modification_map_20260701_073849.md`, and
`revival/artifacts/production_preservation_dossier_20260701_073849.md`; the
RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_074047.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
human preservation review of high-risk inherited production-contract entries
still remain.

Loop 507 evidence note: the preserved alpha cashier admin audit-event
compatibility route now redacts unsafe legacy audit identifiers at the response
boundary. `/api/v1/admin/cashier/alpha/audit-events` still accepts inherited
filters and leaves raw stored `subjectType`/`eventType` values intact, but
rendered `subjectType` and `eventType` values such as `deposit_intent`,
`withdrawal_request`, and `alpha_cashier.*` are copied/redacted alongside the
already-redacted audit payload strings. Focused proof passed with
`TestAlphaCashierAdminRoutesExposeDepositsAndAudit` and
`TestAlphaCashierAdminRoutesRedactLegacyUnsafeReadPayloads`; the full gateway
HTTP package passed at
`revival/artifacts/gateway_http_alpha_audit_identifier_boundary_20260701_073044.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_072910.md`,
`revival/artifacts/preservation_deletion_map_20260701_072920.md`,
`revival/artifacts/preservation_modification_map_20260701_072921.md`, and
`revival/artifacts/production_preservation_dossier_20260701_072935.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_073124.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
human preservation review of high-risk inherited production-contract entries
still remain.

Loop 506 evidence note: the preserved alpha cashier user config compatibility
route now renders a copied config payload instead of raw `svc.Config()`.
Unsafe legacy string values such as `tokenSymbol: "USDC"` are redacted at the
response boundary while inherited compatibility field names and raw service
config remain intact. Focused proof passed with
`TestAlphaCashierUserConfigRedactsLegacyUnsafeValues`; package proof passed at
`revival/artifacts/alpha_cashier_user_config_redaction_boundary_20260701_072126.log`,
and the gateway HTTP package passed at
`revival/artifacts/gateway_http_after_alpha_config_boundary_20260701_072132.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_072126.md`,
`revival/artifacts/preservation_deletion_map_20260701_072137.md`,
`revival/artifacts/preservation_modification_map_20260701_072138.md`, and
`revival/artifacts/production_preservation_dossier_20260701_072152.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_072354.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
human preservation review of high-risk inherited production-contract entries
still remain.

Loop 505 evidence note: the preserved alpha cashier admin preflight
compatibility route now renders a copied launch-safe report instead of the raw
service report. Unsafe legacy operational copy in preflight check messages,
metadata string values, and token/network fields is redacted at the response
boundary while `svc.Preflight` remains raw for internal preservation and
operations review. The shared alpha-cashier unsafe-copy detector now also
flags `cashier` text. Focused proof passed with
`TestAlphaCashierAdminPreflightRoute`; package proof passed at
`revival/artifacts/alpha_cashier_preflight_redaction_package_20260701_071142.log`,
and the gateway HTTP package passed at
`revival/artifacts/gateway_http_alpha_preflight_boundary_20260701_071150.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_071555.md`,
`revival/artifacts/preservation_deletion_map_20260701_071605.md`,
`revival/artifacts/preservation_modification_map_20260701_071606.md`, and
`revival/artifacts/production_preservation_dossier_20260701_071620.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_071755.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
human preservation review of high-risk inherited production-contract entries
still remain.

Loop 504 evidence note: the preserved legacy alpha cashier user compatibility
routes now copy legacy deposit/release rows before rendering and redact unsafe
restored `failureReason` and `reviewNote` text without mutating raw repository
state. User-route legacy errors now use launch-neutral point-route copy while
retaining inherited request/JSON field names for compatibility. Focused proof
passed with
`TestAlphaCashierUserRoutesRedactLegacyUnsafeReadPayloads` and
`TestAlphaCashierUserErrorsUseLaunchNeutralCopy`; package proof passed at
`revival/artifacts/alpha_cashier_user_redaction_boundary_20260701_070138.log`,
and the gateway HTTP package passed at
`revival/artifacts/gateway_http_after_alpha_user_boundary_20260701_070147.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_070720.md`,
`revival/artifacts/preservation_deletion_map_20260701_070737.md`,
`revival/artifacts/preservation_modification_map_20260701_070738.md`, and
`revival/artifacts/production_preservation_dossier_20260701_070757.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_070800.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
human preservation review of high-risk inherited production-contract entries
still remain.

Loop 503 evidence note: the preserved alpha cashier admin compatibility routes
now copy legacy deposit, release, and audit rows before rendering and redact
unsafe restored `failureReason`, `reviewNote`, and audit payload string values
without mutating raw repository state. Admin approve/reject review notes are
validated for point-native wording before service persistence or ledger release.
Focused proof passed with
`TestAlphaCashierAdminRoutesRedactLegacyUnsafeReadPayloads` and
`TestAlphaCashierAdminReviewNoteRejectsMoneyWordingBeforeService`, and the full
gateway HTTP package passed at
`revival/artifacts/alpha_cashier_admin_redaction_boundary_20260701_065248.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_065309.md`,
`revival/artifacts/preservation_deletion_map_20260701_065325.md`,
`revival/artifacts/preservation_modification_map_20260701_065330.md`, and
`revival/artifacts/production_preservation_dossier_20260701_065351.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_065358.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 502 evidence note: admin resolution-source health responses now copy
`feed.SourceHealth` rows and redact unsafe legacy adapter `lastError` text
before rendering `/api/v1/admin/resolution-sources`, while preserving source
IDs, health counters, timestamps, and the reporter's raw snapshot for
operational/preservation review. Focused proof passed with
`TestResolutionSourceHealthRouteRedactsUnsafeLastErrorOnRead`, and the full
gateway HTTP package passed at
`revival/artifacts/resolution_source_health_redaction_boundary_20260701_063848.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_063912.md`,
`revival/artifacts/preservation_deletion_map_20260701_063931.md`,
`revival/artifacts/preservation_modification_map_20260701_063933.md`, and
`revival/artifacts/production_preservation_dossier_20260701_063947.md`; the
RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_063956.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 501 evidence note: admin CMS page/banner JSON responses now redact unsafe
stored page copy, nested block strings, banner titles, and retired money-path
links before rendering, matching the public CMS read boundary while preserving
raw `content.Page` and `content.Banner` values for internal review. Focused
CMS tests and the full gateway HTTP package passed at
`revival/artifacts/admin_content_read_redaction_boundary_20260701_062957.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_063021.md`,
`revival/artifacts/preservation_deletion_map_20260701_063037.md`,
`revival/artifacts/preservation_modification_map_20260701_063038.md`, and
`revival/artifacts/production_preservation_dossier_20260701_063053.md`; the
RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_063101.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 500 evidence note: admin lifecycle audit JSON and CSV exports now redact
unsafe stored `metadata` string values before rendering, matching the existing
stored `reason` boundary while preserving raw lifecycle rows for internal
review. Focused lifecycle tests and the full gateway HTTP package passed at
`revival/artifacts/lifecycle_audit_metadata_redaction_boundary_20260701_062418.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260701_062441.md`,
`revival/artifacts/preservation_deletion_map_20260701_062458.md`,
`revival/artifacts/preservation_modification_map_20260701_062459.md`, and
`revival/artifacts/production_preservation_dossier_20260701_062514.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_062522.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 499 evidence note: legacy loyalty ledger metadata payloads now redact
unsafe stored metadata values after preserving the existing inherited
`bet`-to-prediction normalization. Raw `LoyaltyLedgerEntry.Metadata` remains
unchanged for compatibility/internal review, while public/admin ledger payloads
no longer render unsafe restored copy. Focused proof passed at
`revival/artifacts/loyalty_ledger_metadata_redaction_boundary_20260701_061557.log`,
and the full gateway HTTP package passed. Abuse and preservation gates passed
at `revival/artifacts/abuse_boundary_20260701_061618.md`,
`revival/artifacts/preservation_deletion_map_20260701_061630.md`,
`revival/artifacts/preservation_modification_map_20260701_061631.md`, and
`revival/artifacts/production_preservation_dossier_20260701_061644.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_061653.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 498 evidence note: leaderboard public/admin standing and event metadata
payloads now redact unsafe stored metadata values after preserving the existing
legacy normalization for `bet` labels and retired amount keys. Focused proof
passed at
`revival/artifacts/leaderboard_metadata_redaction_boundary_20260701_061135.log`,
and the full gateway HTTP package passed. Abuse and preservation gates passed
at `revival/artifacts/abuse_boundary_20260701_061200.md`,
`revival/artifacts/preservation_deletion_map_20260701_061210.md`,
`revival/artifacts/preservation_modification_map_20260701_061211.md`, and
`revival/artifacts/production_preservation_dossier_20260701_061228.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260701_061309.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 497 evidence note: admin Predict loyalty account detail responses now
redact legacy unsafe stored ledger `metadata.reason` text before rendering,
matching the public loyalty ledger boundary while preserving raw
`PredictLedgerEntry.Reason` values in service/repo state for internal review.
Focused proof passed at
`revival/artifacts/predict_loyalty_admin_ledger_reason_redaction_boundary_20260630_204050.log`,
and the full gateway HTTP package passed. Abuse and preservation gates passed
at `revival/artifacts/abuse_boundary_20260630_204129.md`,
`revival/artifacts/preservation_deletion_map_20260630_204140.md`,
`revival/artifacts/preservation_modification_map_20260630_204140.md`, and
`revival/artifacts/production_preservation_dossier_20260630_204154.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_204201.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 496 evidence note: after the inherited production-system preservation
concern, the active diff was reclassified as a human review problem rather
than more feature work. Current evidence shows `543 files changed, 35443
insertions(+), 14070 deletions(-)`. The deletion and modification gates
classify the current broad diff, but they do not by themselves prove
production preservation. A focused review queue now exists at
`Taya_Na_Predict/apps/taptrade-platform/revival/artifacts/preservation_human_review_queue_20260630_203609.md`,
covering launch-prohibited deletions separately from high-risk inherited
contracts that need owner/security review: gateway HTTP/admin handlers,
prediction engine/persistence, point-wallet ledger math, auth/session behavior,
public API/client compatibility, JVM runtime/dependency compatibility, office
admin operations, and player launch surfaces. Fresh preservation gates passed
at `revival/artifacts/preservation_deletion_map_20260630_203720.md`,
`revival/artifacts/preservation_modification_map_20260630_203721.md`, and
`revival/artifacts/production_preservation_dossier_20260630_203734.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_203744.md`. Scenario 12
remains Partial.

Loop 495 evidence note: admin lifecycle audit JSON and CSV exports now redact
legacy unsafe stored `reason` text before rendering while preserving the stored
audit rows for internal review. Safe lifecycle reasons still render unchanged,
and CSV formula escaping remains intact for safe values. The full gateway HTTP
package passed at
`revival/artifacts/lifecycle_audit_reason_redaction_boundary_20260630_222946.log`.
Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_202957.md`,
`revival/artifacts/preservation_deletion_map_20260630_203007.md`,
`revival/artifacts/preservation_modification_map_20260630_203008.md`, and
`revival/artifacts/production_preservation_dossier_20260630_203021.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_203024.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 494 evidence note: player point-ledger presentation now removes the old
legacy settlement phrase as a direct maintained source literal while preserving
runtime compatibility for historical ledger descriptions/idempotency keys with
that fingerprint. Those historical rows still render as `Settlement points`
with `Prediction settlement` detail copy, and the focused source guard rejects
reintroducing the direct phrase in the helper. The point-ledger tests passed at
`revival/artifacts/point_ledger_legacy_settlement_boundary_20260630_222304.log`,
and the launch-facing app/office source scan for that phrase found no matches
outside test directories. Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_202314.md`,
`revival/artifacts/preservation_deletion_map_20260630_202325.md`,
`revival/artifacts/preservation_modification_map_20260630_202326.md`, and
`revival/artifacts/production_preservation_dossier_20260630_202340.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_202342.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 483 evidence note: user profile display-copy responses now protect another
launch-facing profile seam while preserving session identity data. Profile GET
responses redact unsafe derived `username` display copy but leave `user_id`,
`email`, KYC status, and timestamps intact. Profile PUT remains a
non-persistent echo, but copies and recursively redacts unsafe string values in
maps and arrays before serialization. Focused regressions verify response
redaction without mutating raw profile/update inputs. The full gateway HTTP
package passed at
`revival/artifacts/user_profile_display_copy_redaction_boundary_20260630_212440.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_192454.md`,
`revival/artifacts/preservation_deletion_map_20260630_192455.md`,
`revival/artifacts/preservation_modification_map_20260630_192455.md`, and
`revival/artifacts/production_preservation_dossier_20260630_192455.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_192520.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 482 evidence note: social profile display names now redact unsafe display
copy while preserving profile identifiers and counters. Public profile reads
and follow responses serialize `displayName` through the points-only boundary,
leaving `userId`, follower/following counts, and activity metadata intact.
Focused coverage verifies redaction without mutating the raw
`publicUserProfile` value. The full gateway HTTP package passed at
`revival/artifacts/social_profile_display_name_redaction_boundary_20260630_212058.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_192111.md`,
`revival/artifacts/preservation_deletion_map_20260630_192111.md`,
`revival/artifacts/preservation_modification_map_20260630_192111.md`, and
`revival/artifacts/production_preservation_dossier_20260630_192111.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_192135.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 481 evidence note: Predict leaderboard entry display names now redact
unsafe user-supplied copy while preserving raw ranking rows. Public entries,
viewer-rank payloads, `/api/v1/me/leaderboards`, and admin standings serialize
`displayName` through the points-only boundary. Focused regressions verify
public/admin redaction without mutating raw `leaderboards.PredictEntry` values.
The full gateway HTTP package passed at
`revival/artifacts/leaderboard_entry_display_name_redaction_boundary_20260630_211646.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_191700.md`,
`revival/artifacts/preservation_deletion_map_20260630_191700.md`,
`revival/artifacts/preservation_modification_map_20260630_191700.md`, and
`revival/artifacts/production_preservation_dossier_20260630_191700.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_191726.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 480 evidence note: bonus/campaign read payloads now redact unsafe restored
campaign display copy while preserving raw inherited reward records. Player
bonus responses redact unsafe `campaignName` / `campaign_name` values derived
from metadata, and admin campaign responses redact unsafe `name` and
`description` fields. Focused regressions verify response redaction without
mutating raw `PlayerBonus.Metadata` or `bonus.Campaign` state. The full
gateway HTTP package passed at
`revival/artifacts/campaign_read_redaction_boundary_20260630_211234.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_191248.md`,
`revival/artifacts/preservation_deletion_map_20260630_191248.md`,
`revival/artifacts/preservation_modification_map_20260630_191248.md`, and
`revival/artifacts/production_preservation_dossier_20260630_191248.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_191315.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 479 evidence note: Predict-native admin leaderboard rows now redact
legacy unsafe display copy while preserving inherited/generated board
definitions. The admin `boardRow` response keeps stable operational IDs and
point metric aliases, but redacts unsafe restored `name`, `description`, and
`rewardSummary` text. A focused regression verifies the unsafe admin payload is
redacted and the original board definition is not mutated. The full gateway
HTTP package passed at
`revival/artifacts/predict_leaderboard_admin_read_redaction_boundary_20260630_210807.log`.
Abuse and preservation evidence was refreshed at
`revival/artifacts/abuse_boundary_20260630_190823.md`,
`revival/artifacts/preservation_deletion_map_20260630_190823.md`,
`revival/artifacts/preservation_modification_map_20260630_190823.md`, and
`revival/artifacts/production_preservation_dossier_20260630_190823.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_190906.md`.

Scenario 12 remains Partial because launch-owner/security residual-policy
acceptance or remediation and human preservation review of high-risk inherited
production-contract entries still remain.

Loop 478 evidence note: leaderboard definition reads now redact legacy unsafe
display copy while preserving raw service definitions. Both public and admin
leaderboard definition payloads route copied `slug`, `name`, `description`,
and `rewardSummary` values through the leaderboard launch-copy redaction
boundary before serialization. The regression seeds an unsafe active
definition directly into the leaderboard service to mimic restored/imported
state, proves the list response redacts cash/crypto/USD payout copy, and
proves the raw service definition remains unchanged. The full gateway HTTP
package passed at
`revival/artifacts/leaderboard_definition_read_redaction_boundary_20260630_205939.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_190026.md`,
`revival/artifacts/preservation_modification_map_20260630_190027.md`,
`revival/artifacts/production_preservation_dossier_20260630_190048.md`, and
`revival/artifacts/abuse_boundary_20260630_190000.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_190229.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 477 evidence note: partner webhook admin reads/writes now guard
launch-prohibited destination and event copy while preserving inherited webhook
storage and dispatcher contracts. Admin registration already rejected unsafe
money-path URLs; it now also rejects launch-prohibited event identifiers such
as the inherited `withdrawal.status` subscription without echoing the unsafe
identifier or persisting the endpoint. `/api/v1/admin/webhook-endpoints` list
responses redact copied unsafe legacy URLs and event strings before
serialization, while raw `webhooks.Endpoint` URL/event values remain unchanged
in storage for operator review. The internal webhook event constant remains in
the engine for compatibility; the launch admin boundary is closed. The full
gateway HTTP package passed at
`revival/artifacts/webhook_launch_copy_boundary_20260630_205452.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_185536.md`,
`revival/artifacts/preservation_modification_map_20260630_185538.md`,
`revival/artifacts/production_preservation_dossier_20260630_185554.md`, and
`revival/artifacts/abuse_boundary_20260630_185511.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_185708.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 476 evidence note: RBAC role reads now redact legacy unsafe role display
copy while preserving raw access-control records. `/api/v1/admin/roles`
redacts copied role `name` and `description` values, and
`/api/v1/admin/users` redacts copied embedded role reference names before
response serialization. Staff user names are intentionally left unchanged to
avoid altering real identities. The redaction helper deep-copies role refs so
the backing RBAC repository values remain raw for operator review and inherited
contract compatibility. The full gateway HTTP package passed at
`revival/artifacts/rbac_role_read_redaction_boundary_20260630_204935.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_185015.md`,
`revival/artifacts/preservation_modification_map_20260630_185016.md`,
`revival/artifacts/production_preservation_dossier_20260630_185033.md`, and
`revival/artifacts/abuse_boundary_20260630_184953.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_185141.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 475 evidence note: bot and partner API-key list reads now redact legacy
unsafe stored key names while preserving raw inherited key records. The
self-serve `/api/v1/bot/keys` GET response and admin
`/api/v1/admin/partner-keys?userId=...` response route copied API-key names
through the shared points-only launch redaction helper before serialization,
without changing repository `prediction.APIKey` values or key auth material.
Focused regressions prove imported-style cash/crypto key names are redacted in
responses, owner scoping remains intact, unsafe names are not leaked, and the
fake backing stores still contain their original names. The full gateway HTTP
package passed at
`revival/artifacts/api_key_name_read_redaction_boundary_20260630_204246.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_184337.md`,
`revival/artifacts/preservation_modification_map_20260630_184339.md`,
`revival/artifacts/production_preservation_dossier_20260630_184354.md`, and
`revival/artifacts/abuse_boundary_20260630_184318.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_184535.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 474 evidence note: admin social moderation report reads and CSV exports
now redact legacy unsafe stored report reason, review note, and comment body
text while preserving raw moderation storage. `/api/v1/admin/social/reports`
applies `adminSocialReportPayloads` before JSON serialization or CSV export,
so imported reports with cash/crypto/prize wording are replaced with the shared
points-only redaction string while report IDs, actors, status, timestamps, and
reviewer fields remain intact. The full gateway HTTP package passed at
`revival/artifacts/social_report_read_redaction_boundary_20260630_183535.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_183609.md`,
`revival/artifacts/preservation_modification_map_20260630_183611.md`,
`revival/artifacts/production_preservation_dossier_20260630_183627.md`, and
`revival/artifacts/abuse_boundary_20260630_183555.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_183640.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 473 evidence note: KYC read payloads now redact legacy unsafe rejection
copy while preserving raw KYC status/document storage. Compliance `/kyc/status`
responses now copy `RejectionReasons` through a local points-only redaction
helper, and `/kyc/documents` responses redact copied `RejectReason` values.
The new compliance helper is explicitly classified by the production
preservation dossier as high-risk compliance behavior so the added file remains
visible to inherited-contract review. The full compliance and gateway HTTP
packages passed at
`revival/artifacts/kyc_read_redaction_boundary_20260630_182922.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_183002.md`,
`revival/artifacts/preservation_modification_map_20260630_183217.md`,
`revival/artifacts/production_preservation_dossier_20260630_183237.md`, and
`revival/artifacts/abuse_boundary_20260630_182948.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_183240.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 472 evidence note: admin punter note payloads now redact legacy unsafe
stored `category` and `content` text on read while preserving raw `user_notes`
rows. `/api/v1/admin/punters/{id}/notes` and the post-create note list now
serialize through `adminPunterNotePayloads`, so legacy/imported note text is
replaced with the shared points-only redaction string while IDs, author,
punter, and timestamp fields remain intact. The full gateway HTTP package
passed at
`revival/artifacts/admin_note_read_redaction_boundary_20260630_182445.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_182519.md`,
`revival/artifacts/preservation_modification_map_20260630_182521.md`,
`revival/artifacts/production_preservation_dossier_20260630_182538.md`, and
`revival/artifacts/abuse_boundary_20260630_182506.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_182547.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 471 evidence note: SQL-backed admin audit-log details now redact legacy
unsafe stored strings on read while preserving raw `audit_logs` rows. The
admin audit endpoint sanitizes copied DB `Details` before merging with
provider-ops audit entries, reusing the same recursive JSON string redaction
and non-JSON fallback from the provider-ops boundary. Safe operational fields
such as idempotency keys remain intact. The full gateway HTTP package passed
at `revival/artifacts/admin_audit_read_redaction_boundary_20260630_182026.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_182106.md`,
`revival/artifacts/preservation_modification_map_20260630_182107.md`,
`revival/artifacts/production_preservation_dossier_20260630_182123.md`, and
`revival/artifacts/abuse_boundary_20260630_182046.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_182147.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 470 evidence note: provider-ops audit details now redact legacy unsafe
stored strings on admin audit-log reads while preserving raw audit storage for
operator review. `providerOpsAuditAsAdminLogs` still maps the inherited
provider-ops audit store into the admin audit-log shape, but valid JSON details
are recursively redacted string-by-string and non-JSON details are encoded
after redaction. Safe fields such as idempotency keys remain intact. The full
gateway HTTP package passed at
`revival/artifacts/provider_ops_audit_read_redaction_boundary_20260630_181602.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_181655.md`,
`revival/artifacts/preservation_modification_map_20260630_181701.md`,
`revival/artifacts/production_preservation_dossier_20260630_181720.md`, and
`revival/artifacts/abuse_boundary_20260630_181634.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_181729.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 469 evidence note: settlement record payloads now redact legacy unsafe
stored `OverrideReason` text on read while preserving raw settlement storage,
settlement result metadata, total settlement point amounts, and `PTS` response
units. The full gateway HTTP package passed at
`revival/artifacts/settlement_override_read_redaction_boundary_20260630_180823.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_180837.md`,
`revival/artifacts/preservation_modification_map_20260630_180837.md`,
`revival/artifacts/production_preservation_dossier_20260630_180904.md`, and
`revival/artifacts/abuse_boundary_20260630_180836.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_180904.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 468 evidence note: dispute response payloads now redact legacy unsafe
stored `Reason` and `ResolutionNote` text on read while preserving raw dispute
storage, dispute lifecycle state, bond point amounts, and `PTS` response units.
The full gateway HTTP package passed at
`revival/artifacts/dispute_read_redaction_boundary_20260630_180416.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_180430.md`,
`revival/artifacts/preservation_modification_map_20260630_180430.md`,
`revival/artifacts/production_preservation_dossier_20260630_180455.md`, and
`revival/artifacts/abuse_boundary_20260630_180430.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_180455.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 467 evidence note: wallet ledger response payloads now redact legacy
unsafe stored `Reason` values on read while preserving raw ledger rows,
idempotency keys, and point-accounting behavior. The full gateway HTTP package
passed at
`revival/artifacts/wallet_ledger_read_redaction_boundary_20260630_175618.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_175646.md`,
`revival/artifacts/preservation_modification_map_20260630_175618.md`,
`revival/artifacts/production_preservation_dossier_20260630_175646.md`, and
`revival/artifacts/abuse_boundary_20260630_175618.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_175744.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

Loop 466 evidence note: private Predict loyalty standing and ledger payloads
now redact legacy unsafe rank display and ledger reason text on read. The raw
loyalty account/ledger data remains available to storage/admin review, but
`rankName`, `nextRankName`, and ledger `reason` are serialized through the
shared points-only launch-boundary helper for `/api/v1/loyalty`,
`/api/v1/loyalty/standing`, and `/api/v1/loyalty/ledger`. The full gateway HTTP
package passed at
`revival/artifacts/loyalty_read_redaction_boundary_20260630_175145.log`.
Preservation and abuse gates passed at
`revival/artifacts/preservation_deletion_map_20260630_175118.md`,
`revival/artifacts/preservation_modification_map_20260630_175118.md`,
`revival/artifacts/production_preservation_dossier_20260630_175145.md`, and
`revival/artifacts/abuse_boundary_20260630_175145.md`. The RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_175313.md`. Scenario 12
remains Partial pending launch-owner/security residual-policy acceptance or
remediation and human review of high-risk inherited production-contract
entries.

## 2. Non-Negotiable Launch Constraints

- No fiat deposits.
- No crypto deposits.
- No withdrawals or cashouts.
- No cash-equivalent balances.
- No redeemable prizes.
- No copy implying points have monetary value.
- Every point movement has a ledger entry.
- Any legacy wallet/cents/internal accounting must be hidden behind points-only product language.

## 3. Canonical User Journey

Create account -> receive starter points -> browse markets -> search/filter markets -> open a market -> read resolution rules -> inspect price/depth/history/activity -> buy YES -> buy NO or sell/close -> view portfolio -> inspect point ledger -> comment/share/follow activity -> claim or progress toward a reward -> appear on leaderboard -> admin closes market -> admin resolves market -> settlement updates balances and ledger -> user sees final result and history -> no withdrawal/cashout/crypto/fiat path exists anywhere.

## 4. Feature Parity Benchmark

Parity Release Candidate v1 requires Kalshi/Polymarket-style market discovery, market detail, trading, portfolio, settlement, admin operations, social activity, and leaderboard/reward loops, constrained to non-redeemable gameplay points.

## 5. Functional Requirements

- Account creation and login.
- Starter point grant with no-cashout disclosure.
- Discovery with categories, tags/series, search, filters, trending/activity sort, closing soon sort, newest sort, and watchlist/favorites.
- Market cards showing probability/price, close date, category, activity, and liquidity.
- Market detail with question, source, timeline, resolution criteria, YES/NO prices, price history, liquidity/depth, trades/activity, comments, share, and related markets.
- Buy YES, buy NO, sell/close, order preview, confirmation, rejection handling, and activity updates.
- Portfolio with available/locked/total points, positions, orders, P/L in points, history, and full point ledger.
- Social comments, replies, reactions, reports, public profiles, follows, shares, and activity feed.
- Rewards: starter points, daily claim, point packs, XP, levels/ranks, missions, streaks, leaderboards, badges/cosmetics, abuse controls.

## 6. Data Model Requirements

- Users with account status, disclosure acceptance, profile, and public profile fields.
- Point accounts with available points, locked points, total earned, and immutable ledger.
- Markets grouped by category, series, event, and tags.
- Market lifecycle audit log.
- Orders, trades, positions, price history, depth snapshots, activity feed.
- Comments, replies, reactions, reports, follows, shares.
- Rewards, missions, streaks, point packs, badges/cosmetics, XP, ranks.
- Admin audit logs, moderation queue, suspicious activity signals, export jobs.

## 7. API Requirements

- List/search markets.
- Get market.
- List categories/tags/series.
- Get price, history, depth/order book.
- Create prediction/trade/order.
- Cancel order when applicable.
- Get user positions.
- Get user orders.
- Get user activity.
- Get comments and create comment/reply/reaction/report.
- Follow user and get activity feed.
- Get leaderboard and viewer rank.
- Get rewards/missions/streaks/daily claim/point packs.
- Resolve market.
- Settle/replay settlement.
- Get point ledger.
- Admin market/category/tag/liquidity/user/report/export APIs.

## 8. UI/Page Requirements

- `/auth/register`, `/auth/login`.
- `/predict` market discovery.
- `/discover` activity/trending discovery.
- `/category/[slug]`, `/series/[slug]`, tag filters.
- `/market/[ticker]`.
- `/portfolio`.
- `/account/points` or equivalent point ledger.
- `/rewards`.
- `/leaderboards`.
- `/profile/[handle]`.
- Admin pages for markets, categories/tags, liquidity, users, ledger inspection, reports, settlement, audit logs, exports.
- No launch navigation to cashier, deposits, withdrawals, crypto, fiat, redeemable prizes, or cashout.

## 9. Game Economy Requirements

See `docs/taptrade-economy-rules.md`. All user-facing amounts are points. Starter grant, daily claim, point packs, XP, missions, streaks, leaderboards, badges/cosmetics, and admin adjustments must use idempotent ledger entries and abuse controls.

## 10. Market Lifecycle Requirements

Required states:

- Draft
- Review
- Open
- Paused
- Closed
- Resolving
- Resolved YES
- Resolved NO
- Canceled
- Invalid
- Settled

Existing implementation states may be mapped only if the UI/admin/API contract clearly exposes the required semantics and audit log.

## 11. Trading/Liquidity Requirements

Launch must use explicit per-market liquidity:

- `order_book`: price-time-priority CLOB-style book with bids/asks, limit/market orders, TIF, reservations, cancellation, and real depth display.
- `amm`: virtual liquidity curve with price impact and AMM depth display.

The current backend supports both `order_book` and `amm`; the UI must not display synthesized order-book levels as real exchange depth.

## 12. Portfolio/Ledger Requirements

- Total points.
- Available points.
- Locked points.
- Open positions.
- Average entry.
- Current price.
- Unrealized P/L in points.
- Closed positions.
- Settled markets.
- Order history.
- Full point ledger.
- Settlement and canceled-market point-return entries.

## 13. Social Layer Requirements

- Market comments.
- Replies or threads.
- Reactions/upvotes.
- Report content.
- Public user profile.
- Follow/view user activity.
- Share market.
- Activity feed with trades, comments, follows, rewards, leaderboard movement, and settlement events.

## 14. Admin/Ops Requirements

- Market management.
- Category/tag management.
- Liquidity seeding.
- User point ledger inspection.
- Suspicious activity view.
- Report moderation.
- Settlement tools.
- Trigger/replay settlement.
- Audit log for all admin actions.
- Exportable activity/market data.

## 15. Safety, Compliance, and Trust Requirements

- No withdrawals.
- No crypto wallet.
- No fiat custody.
- No cash-equivalent wording.
- No redeemable prize mechanics.
- Virtual currency terms.
- Age gate if required.
- Geographic controls if required.
- Responsible-play limits.
- Moderation/reporting.
- Audit logs.
- Anti-manipulation checks.
- Bot/spam controls.

## 16. Seed/Demo Data Requirements

Seed/demo data must support the full canonical journey:

- Demo users with starter points, positions, orders, ledger entries, rewards, missions, and leaderboard rows.
- Demo markets in every lifecycle state.
- Open markets with real order book or AMM depth.
- Trades, price history, activity, comments, and related markets.
- Admin-ready markets for close/resolve/settle/replay.
- No seed data that exposes fiat deposits, crypto deposits, withdrawals, or redeemable prizes in launch mode.

## 17. Acceptance Scenarios

1. New-user onboarding: account creation, starter points, points-only explanation, no-cashout disclosure, initial ledger entry, route to market discovery.
2. Market discovery: market list, categories, tags/series, search, filters, trending/activity sort, closing soon sort, new markets sort, watchlist/favorites, complete market cards.
3. Market detail: question, resolution criteria/source/timeline, YES/NO prices, history, depth, recent trades/activity, comments, share, related markets.
4. Points-based prediction/trading: buy YES/NO, sell/close, estimated cost/payout/max loss/slippage or limit, confirmation, insufficient-points rejection, balance/position/activity/ledger updates.
5. Liquidity model: one explicit model per market and honest UI representation.
6. Portfolio and positions: balances, locked points, open/closed positions, current price, P/L, order history, ledger.
7. Market lifecycle and resolution: admin create/edit/open/pause/close/resolve/cancel/replay settlement/audit.
8. Social layer: comments, replies, reactions, reports, profiles, follows, share, feed.
9. Game economy and monetization: starter points, daily claim, point packs, XP, ranks, missions, streaks, leaderboard, badges/cosmetics, abuse controls, disclosures, ledger.
10. Admin and market operations: market/category/liquidity/user/report/settlement/export tooling.
11. API/data surface: all required internal/public endpoints or service methods.
12. Safety, compliance, and trust boundary: no deposit/withdraw/crypto/fiat/cash-equivalent/redeemable path; responsible-play/moderation/audit/bot controls.

## 18. Completion Rubric

TapTrade Parity Release Candidate v1 is complete only when all 12 scenarios are `Pass` with evidence, the canonical journey works end to end with real app behavior, every point movement writes a ledger entry, admin settlement works with audit logs, demo seed data supports review, and no prohibited money/crypto/redemption route or copy remains in launch user surfaces.

## 19. Out of Scope for Launch

- Fiat custody.
- Crypto custody.
- Withdrawals.
- Cashout.
- Redeemable prizes.
- Real-money balances.
- Secondary marketplace for points.
- Any claim that points have monetary value.

## 20. Progress Matrix

| Scenario | Status | Current Evidence | Gap | Next Action |
|---|---:|---|---|---|
| 1. New-user onboarding | Pass | `/auth/register` creates/logs in account, shows points-only no-cashout disclosure, sends `terms_accepted`, `terms_version`, `launch_disclosure_accepted`, and `launch_disclosure_version` to `/api/v1/auth/register`, claims starter points after signup login, and defaults safe return paths to `/predict`; the auth service rejects registration without terms plus points-only/no-cashout disclosure acceptance, persists the accepted versions on `auth_users`, returns acceptance timestamps on register, and includes the persisted acceptance fields in `/api/v1/auth/session`; `/api/v1/wallet/starter-grant` is idempotent and ledger-backed. Loop 109 live gateway/auth proof registered `goal-proof-1782370540@taptrade.local`, authenticated session user `u-6e7e36c0e45d`, verified persisted `taptrade-launch-v1` and `points-no-cashout-v1` acceptance, posted `/api/v1/wallet/starter-grant` twice with balance remaining 500000 points-cents, and read one authenticated `/api/v1/wallet/u-6e7e36c0e45d/ledger` PTS credit row keyed `starter_grant:u-6e7e36c0e45d`. Loop 110 browser proof registered `browser-proof-1782371044096@taptrade.local`, rendered the points-only/no-cashout disclosure, redirected to `/predict`, showed seeded discovery with `MLBB-FINAL-G1`, displayed `5000.00 pts` balance, and rendered `/account/transactions` with one `Starter points` row `+5,000 pts`, `5,000 pts` after, and reason `Starter point grant`. | No scenario-1 blocker remains. Broader canonical journey, trading, admin, safety, and deployment-hardening scenarios remain incomplete. | Continue with session-authenticated trading-to-ledger, portfolio refresh, social/rewards, admin lifecycle, and live no-money-path proof. |
| 2. Market discovery | Pass | `/predict`, `/discover`, `/category/[slug]`, `/series/[slug]`; discovery/category/series/tag APIs. `/api/v1/markets` now supports server-backed `q` search, `sort=activity`, `sort=closing_soon`, `sort=newest`, `seriesId`, `tag`, and close-window filters; market payloads now include category id/slug/name so cards can render API-backed category labels. `/api/v1/series` and `/api/v1/tags` expose backend taxonomy metadata as public discovery reads; `/api/v1/watchlist/markets` supports authenticated list/add/remove backed by `prediction_market_watchlist`; `/predict` all-markets grid exposes in-page search, category filters, close-window filters, an explicit sort menu, persisted Watch/Watching card controls, a watchlist-only filter, series links, and tag filter buttons. Market cards render probability/price, category, volume/activity, explicit liquidity, close date, and watchlist controls. `/predict` no longer spotlights the inherited crypto category in its featured carousel or all-markets category tabs, and the fallback subcategory taxonomy now uses esports niches instead of crypto niches. Gateway category services now filter inherited `crypto` taxonomy from public/admin category lists, `/api/v1/categories/crypto` resolves as not found, admin category creation rejects crypto/cash-like terms, and migration `046_taptrade_launch_taxonomy.sql` seeds `esports` while deactivating inherited `crypto`. Discovery import classification now uses `esports` instead of `crypto` in the closed synthetic category set, skips crypto-like upstream rows before promotion, and keeps backend translation seeds on launch-safe GTA release copy through migrations `028` and `047`. Office market creation now exposes only manual settlement and binary-outcome rules, gateway `CreateMarket` rejects asset-price settlement sources/rules and launch-prohibited copy, default feed registration omits the legacy asset-price adapter unless `TAPTRADE_LEGACY_ASSET_PRICE_FEEDS_ENABLED=true`, and dev prediction seed data now uses esports/manual markets with `PTS` wallets while cleaning old deterministic asset-price seed rows on re-run. Loop 114 live proof used a fresh migrated/seeded stack and browser/API evidence: `/predict` rendered the seeded MLBB/Valorant/Dota open markets with category/volume/liquidity/close metadata; search narrowed to Valorant; sort controls selected closing-soon/newest/activity while API responses proved the sorted result sets; the one-month close-window API returned only `MLBB-FINAL-G1`; the `esports` tag returned all three open esports markets; `/series/mlbb-esports-series` rendered backend metadata and three open markets; a session user added `MLBB-FINAL-G1`, saw `Watching`, and the watchlist filter rendered only that market; `/discover` rendered history-backed movement rows and `/api/v1/markets/MLBB-FINAL-G1/prices?range=1d` returned 25 hourly buckets. Gateway tests cover search predicates, sort clauses, series/tag SQL filters, public taxonomy auth bypass, per-user watchlist add/list/remove, launch taxonomy filtering/rejection, launch-safe importer classification, launch-prohibited market creation rejection, and default asset-price feed absence; user-app/office tests cover the API params, category metadata/card wiring, watchlist UI/client wiring, series/tag UI wiring, history-backed `/discover` movement, launch-safe discovery category wiring, and office market modal safety copy/options. | No scenario-2 blocker remains. Broader market detail, trading edge cases, rewards, social, admin lifecycle, and safety terminology scenarios remain incomplete. | Continue with live market detail/liquidity, rewards/leaderboard, broader social, admin lifecycle/export, and backend terminology cleanup proof. |
| 3. Market detail | Pass | `/market/[ticker]` loads market/event/trades/depth/positions, shows resolution rules, exposes a browser share action with clipboard fallback, and renders `MarketDiscussion` backed by prediction-native comment/reply/reaction/report APIs plus links into public profiles and activity feed. Market detail no longer synthesizes order-book rows: order-book markets render fetched `/orderbook` data only, while AMM markets render an explicit AMM liquidity view with YES/NO price, liquidity, pool/curve values, a YES price marker, YES/NO reserve split, AMM subsidy, curve K, and a preview-backed YES impact quote ladder. Related markets now prefer same event, recurring series, and category before generic fallback, excluding the current market and deduping results. Loop 115 browser/API proof rendered `/market/MLBB-FINAL-G1` with market question, resolution criteria/source/timeline, YES/NO prices, 1H/6H/1D/1W/ALL history controls, 8 real aggregated order-book levels, recent trades in points, discussion shell, share action, and related markets; `/api/v1/markets/MLBB-FINAL-G1/orderbook?depth=5` returned four YES bids and four NO bids. The same proof rendered `/market/DOTA-GF-MAP1` with explicit AMM depth and a disabled `Quote only` ticket. Loop 116 browser/API/SQL proof posted `Loop 116 proof comment 1782378484615`, submitted reply `Loop 116 proof reply 1782378515374`, clicked upvote and report to visible counts of 1, opened `/users/u-1` showing comment/reply activity, proved a second user followed `u-1`, and proved admin moderation/export for the reported comment. User-app regression tests lock the order-book/AMM branches, preview-backed AMM quote ladder, related-market selection, points-only volume copy, AMM reserve fields, AMM quote-only ticket, share action, and social UI wiring; gateway tests prove AMM previews return read-only curve quotes while AMM order placement remains retired. | No scenario-3 blocker remains. Paused/closed/resolved detail variants remain useful regression coverage but are not blocking the market-detail acceptance scenario. | Preserve market-detail/liquidity/social proof while continuing trading edge cases, rewards/leaderboard, admin lifecycle, API naming, and safety-boundary work. |
| 4. Points-based prediction/trading | Pass | Order preview/place APIs, TradeTicket integration, idempotency, balance refresh; TradeTicket now displays point amounts and insufficient-points state without cashier link. Gateway service tests now prove order-book buy YES hold/capture/release/seller credit, buy NO complementary issuance with taker+maker reservation capture, sell YES seller credit without seller cash hold, resting buy cancellation releasing held points and responsible-play commitment, resting sell cancellation releasing reserved shares, prediction-limit denials returning prediction wording instead of inherited bet-limit copy, HTTP order errors carrying `prediction_limit_exceeded`/`responsible_play_blocked` reason codes, position mutation, collateral ledger plan emission, and insufficient-points rejection before capture/credit. A temporary migrated/seeded SQL gateway with bot auth placed a live `/api/v1/bot/orders` BUY YES market order on seeded `MLBB-FINAL-G1`, returned `201`, filled quantity 3 at 64 points-cents, wrote `prediction_fill:4c02bbba-051e-48ee-bd0e-de931752275c`, debited 192 points-cents, updated `wallet_balances` to 483337 points-cents, and increased the authenticated bot positions read from 68 to 71 YES. SQL-backed social activity now includes persisted trade fills from `prediction_trades`, so buyer/seller user activity and global activity can show non-monetary Bought/Sold YES/NO entries after fills. Wallet reservations now write non-balance-changing point-ledger markers for `reservation` and `release` with `prediction_order` reference keys, while capture/proceeds ledger rows keep `prediction_fill` metadata. `/account/transactions` preserves ledger idempotency metadata and renders order locked/filled/proceeds/unlocked rows with points-only labels. Gateway wallet/http tests, backend JSON tests for point-native order aliases, user-app regression tests, and `point-ledger.test.ts` cover the marker contract, point-native order payload aliases, and visible labels. Loop 111 browser proof registered `trading-proof-1782372060968@taptrade.local`, opened `MLBB-FINAL-G1`, bought 39 YES for 24.96 pts after a 25 pt reservation and 0.04 pt release, sold 8 YES for 4.80 pts proceeds, bought 12 NO for 4.80 pts after a 5 pt reservation and 0.20 pt release, and showed the top-bar balance moving from `5000.00 pts` to `4975.04 pts`. Loop 113 browser proof registered `insufficientfixed1782375227830` / `u-0c1dd4208a0b`, returned to `MLBB-FINAL-G1` with `amount=6000.00`, switched to Limit, and rendered a disabled `Not enough points` CTA plus alert while SQL stayed at one starter ledger row, balance `500000`, zero orders, and zero reservations. Order responses now expose `pricePointsCents`, `averageFillPricePointsCents`, `totalCostPointsCents`, `reservedPointsCents`, `capturedPointsCents`, `releasedPointsCents`, `filledCostPointsCents`, `notionalCapPointsCents`, and `unit: "PTS"` without response-level `priceCents`, `averageFillPriceCents`, `totalCostCents`, `filledCostCents`, `notionalCapCents`, `walletReservationId`, or retired cash-named aliases. Order preview responses now expose point-native quote fields without legacy price/cost/fee/result/slippage aliases, and TradeTicket plus AMM quote ladders consume those point-native fields; Launch app preview/place-order requests and launch OpenAPI docs now use `pricePointsCents` for limit prices and `notionalCapPointsCents` for market-buy caps only, and Loop 274 session/preview/bot order HTTP decoding rejects retired `priceCents` and `notionalCapCents` request bodies before service normalization. Trade tape and live fill payloads now expose point-native fill price/fee/notional fields without legacy trade price/fee aliases, and `RecentTrades` consumes `pricePointsCents`. Position and settlement-history price fields now expose `avgPricePointsCents`, `entryPricePointsCents`, and `exitPricePointsCents`; the portfolio UI renders them with point formatting instead of bare cent glyphs while private shared-client fallback code may still read older rows. | No scenario-4 blocker remains. Remaining admin/dispute/rewards/social proof and backend/API naming cleanup are tracked under scenarios 7, 9, 10, 11, and 12. | Preserve trading proof in regression scope while continuing API/data cleanup and safety-boundary hardening. |
| 5. Liquidity model | Pass | Backend has explicit per-market `execution_mode` values: `order_book` and `amm`. New market creation defaults to order-book markets, demo trading skips legacy AMM markets, and one launch-safe seeded AMM fixture (`DOTA-GF-MAP1`) exists only for honest quote/detail proof. Market detail renders real `/orderbook` data only for order-book markets and explicit AMM liquidity visualization for AMM markets, including current YES price marker, YES/NO reserve split, subsidy, curve K, and a quote ladder backed by `/api/v1/orders/preview`. Loop 115 live proof verified `MLBB-FINAL-G1` as an order-book market with 8 rendered aggregated levels and `/api/v1/markets/MLBB-FINAL-G1/orderbook?depth=5` returning four YES bids plus four NO bids; verified `DOTA-GF-MAP1` as `executionMode=amm` with `ammYesShares=18.5`, `ammNoShares=42`, `ammLiquidityParam=100`, `ammSubsidyCents=20000`, and `liquidityCents=20000`; verified preview-backed AMM quotes for 1/10/25 YES returning `executionMode=amm`, filled status, backend average prices, total costs, new YES prices, and slippage; and verified the rendered AMM trade ticket is disabled as `Quote only` with copy that new orders use order-book markets. Gateway tests prove AMM previews return read-only LMSR curve quotes while `PlaceOrder` still rejects retired AMM execution; user-app regression tests prove the ladder uses `api.previewOrder` rather than local synthetic depth and that AMM tickets short-circuit submit. | No scenario-5 blocker remains. Future market-detail/admin variants should preserve the explicit per-market execution model and quote-only AMM behavior. | Keep liquidity proof in regression scope while continuing social, rewards, admin lifecycle, API naming, and safety-boundary work. |
| 6. Portfolio and positions | Pass | `/portfolio` loads positions, orders, history, summary, and user standing; portfolio, leaderboard, discovery, top-bar, and account balance displays now render `pts` instead of dollar amounts, and portfolio history copy says settled results instead of settled payouts. Cancelled open orders now toast that reserved points were unlocked instead of saying reserved cash was released. Gateway service tests now prove position mutations for order-book secondary and complementary issuance fills, plus reserved-share release on resting sell cancellation. A temporary migrated/seeded SQL gateway bot-auth proof showed `/api/v1/bot/positions` reflecting the live order result for `user-001`, with `MLBB-FINAL-G1` YES quantity increasing to 71 and wallet ledger/balance rows updating in the same DB. `/api/v1/portfolio/summary` now emits point-native `totalValuePointsCents`, `portfolioValuePointsCents`, `investedPointsCents`, `unrealizedPointsCents`, `realizedPointsCents`, and `unit: "PTS"` fields without `totalValueCents`, `unrealizedPnlCents`, or `realizedPnlCents`; the shared prediction client privately reads older summary responses but exports normalized summaries with point-native fields only, and `/portfolio` plus `/account` render summary cards from those fields. `/api/v1/portfolio` position rows now emit `totalCostPointsCents`, `realizedPointsCents`, and `unit: "PTS"` without `totalCostCents` or `realizedPnlCents`; the shared prediction client privately reads older position responses but exports normalized positions with point-native fields only, and `/portfolio` renders position cost from `totalCostPointsCents`. `/api/v1/portfolio/history` now emits point-native `realizedPointsCents`, `settlementPointsCents`, and `unit: "PTS"` fields without `pnlCents`/`payoutCents`, and the exported shared `SettledPositionResult` type no longer exposes payout-named launch contracts or retired aliases. Portfolio history now renders `realizedPointsCents` and `settlementPointsCents` directly instead of joining loyalty accruals or falling back to payout/P&L aliases. `/account/transactions` now uses shared point-ledger helpers covered by tests for labels, deltas, currency-free formatting, and prediction-order locked/filled/proceeds/unlocked/settlement labels. Public wallet balance, ledger, breakdown, and reward responses now emit point-native fields (`balancePointsCents`, `availablePointsCents`, `reservedPointsCents`, `amountPointsCents`, `basePointsCents`, `bonusPointsCents`, `totalPointsCents`, `grantPointsCents`, `claimPointsCents`, `rewardPointsCents`, `limitPointsCents`, `grantedPointsCents`, `remainingPointsCents`) plus `unit: "PTS"` without retired balance, ledger, real-money, bonus-fund, total, currency, or reward aliases. The wallet and bonus clients preserve gateway ledger movement types and idempotency keys, normalize wallet balance/ledger/breakdown/reward objects as `PTS` instead of `USD`, keep old read/reward-field parsing private, and no longer reattach retired read or reward aliases; `WalletBreakdown` renders Base Points and Bonus Points from point-native fields. Wallet reservations now write `reservation`/`release` ledger rows with unchanged total balance so resting orders and cancellations can appear in the visible point ledger. Loop 111 browser proof showed `/portfolio` with two `MLBB-FINAL-G1` positions for the session user: 31 YES at 64c cost 19.84 pts and 12 NO at 40c cost 4.80 pts, invested total 24.64 pts, and `/account/transactions` with visible `Order points locked`, `Order filled`, `Order proceeds`, `Order points unlocked`, and `Starter points` rows. SQL confirmed `wallet_balances.balance_cents=497504`, matching positions, and ledger idempotency keys for reservation, fill, release, and proceeds. Loop 112 browser proof then settled a fresh 39 YES position, rendered `/portfolio` with `5014.04 pts`, invested `0.00 pts`, realized point result `+14.04 pts`, open positions `0`, accuracy `100.0%`, and history `+39.00 pts` settlement points; `/account/transactions` rendered `Settlement points`, `+39 pts`, `5,014.04 pts`, and `Prediction settlement`; SQL confirmed the settlement credit, zeroed YES position, and final balance `501404` point-cents. Loop 285 cleaned supported portfolio, account, and result-stat locale labels plus portfolio fallback strings from P&L/profit wording to point-result copy, with a regression covering `portfolio`, `account`, and `win-loss-statistics` namespaces across supported launch languages. Loop 286 cleaned portfolio sharpness metric labels from ROI to point-efficiency wording across supported launch languages and page fallback copy. | No scenario-6 blocker remains. Remaining backend legacy wallet/cents cleanup is tracked under scenarios 11 and 12. | Preserve portfolio/ledger proof in regression scope while continuing API/data cleanup and safety-boundary hardening. |
| 7. Market lifecycle and resolution | Pass | Loop 119 live API proof on a fresh migrated/seeded stack added `PUT /api/v1/admin/markets/{id}` market editing and proved admin-authenticated, CSRF-protected create/edit/open/pause/resume/close/resolve/settle/cancel/replay/audit/export behavior. The saved proof at `/tmp/taptrade-admin-loop119-proof.json` shows admin session role `admin`, created taxonomy category `loop119-admin-20260625100219`, tagged series, event, market `L119-LIFE-20260625100219`, edited title `Loop 119 lifecycle proof market edited`, lifecycle audit events `created`, `edited`, `open`, `halted`, `open`, `closed`, `settled`, direct settlement result `yes` with `unit: "PTS"`, canceled market `L119-CANCEL-20260625100219` status `voided`, replay summary `Replayed incomplete settlement point disbursements`, risk snapshot keys, and 20 point-ledger rows from admin user-ledger inspection. CSV artifacts `/tmp/taptrade-admin-lifecycle-loop119.csv`, `/tmp/taptrade-admin-markets-loop119.csv`, and `/tmp/taptrade-admin-risk-loop119.csv` prove formula-safe lifecycle, market, and risk exports. Admin market/settlement/dispute routes, settlement tables, lifecycle audit. Gateway now has a `DescribeTapTradeMarketLifecycle` mapping from engine statuses (`unopened`, `halted`, `proposed_resolution`, `voided`) to launch-facing stages (`draft`, `paused`, `resolving`, `invalid`) with allowed actions, tradeable/terminal flags, and reason/audit requirements. Admin lifecycle/settlement responses include `taptradeLifecycle`, gateway tests prove close/void responses carry mapped stages, and office market/settlement screens render mapped labels plus Open/Pause/Close/Cancel/Invalidate/Settle actions. Admin finalize, settle, and void responses now include point-native `pointDisbursements`, `settlementPointsCents`, `realizedPointsCents`, `totalSettlementPointsCents`, and `unit: "PTS"` aliases, no longer emit the retired operation-level `payouts` compatibility array, and no longer serialize `payoutCents` or `pnlCents` inside admin operation disbursement rows. `GET /api/v1/admin/markets/{id}/lifecycle` now exposes the persisted lifecycle audit trail with actor, reason, timestamp, and mapped TapTrade lifecycle metadata; `?format=csv` exports the same mapped audit rows with spreadsheet-formula-safe text cells; `/api/v1/admin/settlements/replay` resumes incomplete point disbursements through the existing idempotent settlement replay engine; and office market/settlement screens have audit export plus Replay Points controls. Office dispute-uphold confirmation copy now describes voided markets as returning locked points rather than refunding stakes. Loop 120 added an office Edit Market action and modal wired to `predictionClient.updateMarket`, preserving event/ticker while editing title, description, settlement controls, close date, fee, and liquidity parameters; office source tests and the production office build passed. Loop 120 browser proof on a fresh migrated/seeded stack logged into office, loaded 15 admin markets, opened `MLBB-FINAL-G1`, caught and fixed datetime-local close-date serialization to UTC seconds, saved `Listed MLBB team wins game one - Loop 120 browser edit` through the UI, observed the gateway `PUT /api/v1/admin/markets/{id}` 200, and verified SQL market state plus two `edited` lifecycle audit rows. Loop 311 added `cmd/windowed-resolution-live-proof` and ran it against an isolated migrated/seeded stack with auth middleware and RBAC enabled: `admin@taptrade.local` closed and proposed `FED-CUT-MAY26`, `demo@taptrade.local` filed a holder dispute, proposer self-review/finalize and open-dispute finalize were blocked, `admin2@taptrade.local` with the existing `operations-manager` role rejected the dispute and finalized, the market reached `settled`/`yes`, and the finalization response returned `unit: "PTS"`, `pointDisbursements`, and `totalSettlementPointsCents=23300` without retired payout/currency aliases. | No scenario-7 blocker remains. Remaining backend/API legacy naming is tracked under scenarios 11 and 12. | Preserve lifecycle/resolution proof in regression scope while continuing API/data cleanup and safety-boundary hardening. |
| 8. Social layer | Pass | `MarketDiscussion` renders on `/market/[ticker]`; `market-social-client.ts` calls `/api/v1/social/markets/{marketId}/comments` plus `/api/v1/social/comments/{commentId}/{react,report}`. Gateway social handlers support list/create comments, replies via `parentId`, idempotent per-user reactions, per-user reports, public profiles, idempotent follows, per-user activity, and global activity with SQL-backed storage when DB is present and in-memory behavior in tests. Social comment, reaction, report, and follow writes pass through per-user/action and optional per-client-IP/action token-bucket guards. SQL activity unions persisted `prediction_trades`, `prediction_payouts`, `prediction_settlements`, `loyalty_ledger`, and `leaderboard_snapshots` into point-safe activity feeds. Loop 111 browser proof showed `/activity` rendering live trade rows after session trades. Loop 116 browser/API/SQL proof used a fresh SQL-backed stack to post a market comment, submit a reply, upvote, report, open the public profile showing comment/reply plus leaderboard/settlement/trade activity, create a second user `u-40f89fc127a4`, follow `u-1`, confirm `viewerFollowing=true` and `followerCount=1`, list the follow/comment/reply rows through `/api/v1/social/users/u-1/activity`, list/export the reported comment through admin `/api/v1/admin/social/reports`, resolve it as `reviewed` with note `Loop 116 moderation proof`, and confirm SQL rows in `prediction_market_comments`, `prediction_market_comment_reactions`, `prediction_market_comment_reports`, and `prediction_user_follows`. Market detail exposes a real share action using `navigator.share` with clipboard fallback, links comment authors to `/users/[userId]`, and links to `/activity`. Gateway, user-app, and office tests cover comments, replies, reactions, reports, social write rate limits, share action, profile/follow/activity endpoints, moderation queue/resolve/export, formula-safe social report CSV output, trade, settlement, reward, and leaderboard activity wiring, and page labels. | No scenario-8 blocker remains. DB-backed multi-instance social graph persistence and cross-instance social write limiter enforcement are now covered by Scenario 12 evidence. | Keep social proof in regression scope while continuing rewards/leaderboard, admin lifecycle/export, API naming, and safety-boundary work. |
| 9. Game economy and monetization | Pass | Loop 310 proves live active-bonus rewards browser proof on an isolated migrated/seeded stack: Playwright setup authenticated demo@taptrade.local, proxied /api/v1/status/ returned non-redeemable point mode, and tests/smoke/rewards.smoke.spec.ts passed while requiring the seeded demo bonus API payload and visible rewards panel. Loop 309 adds reviewer-visible active-bonus UI coverage: the rewards smoke now requires the demo user `/api/v1/bonuses/active` response to contain the seeded `Demo Point-Play Bonus` with `unit: "PTS"`, remaining/required/completed point-play fields, no retired bonus aliases, and a visible `/rewards` active point-play bonus panel with a Play progress bar at 25%; `ActiveBonusesControl` now has a rendered React regression proving the panel displays the campaign, 150 pts remaining, point-play progress, and no money/stake/withdrawal wording. Loop 308 adds DB-backed HTTP proof that a real /api/v1/bonuses/claim request against a migrated Postgres database creates one active player_bonuses row, one bonus wallet-ledger credit with idempotency key bonus-grant:<bonusId>, one bonus_balance update, binds the claim to the session user instead of a body-supplied user, returns only point-native PTS response fields, and rejects duplicate claims without a second ledger credit. Loop 286 keeps sharpness ranking copy away from investment-return wording by replacing ROI/return-on-risk labels with point-efficiency wording across supported portfolio and leaderboard locale values plus the portfolio fallback. Loop 284 keeps launch leaderboard locale labels on point-result wording by replacing Weekly P&L/profit labels with Weekly Points/Net points across supported player locales and page fallbacks. Loop 283 keeps public Predict leaderboard board definitions on launch rank aliases by replacing metricLabel and qualificationMsg JSON with metricKey, pointMetricKey, rewardSummary, and unit PTS. Loop 282 keeps Predict leaderboard board definitions on a point-native volume threshold alias by exposing `minVolumePointsCents` and removing the retired public `minVolumeCents` JSON/OpenAPI/client field. Loop 281 keeps public and admin leaderboard standing reads on point-native metadata by sanitizing legacy event metadata and PTS standing payloads. Loop 280 keeps admin leaderboard score writes on point-native activity metadata by requiring activitySourceType/activitySourceId and returning PTS event payloads. Loop 279 brings the legacy public loyalty tiers route back into the point-native rank contract by replacing canonical tier JSON with explicit PTS tier fields. Loop 278 brings the legacy public loyalty standing route back into the point-native XP/rank contract by replacing canonical account JSON with explicit PTS standing fields. Loop 277 keeps loyalty ledger read surfaces on point-native prediction metadata by removing embedded `sourceType`/`sourceId` from player and admin loyalty ledger rows and adding `unit: "PTS"`. Loop 276 keeps admin loyalty rule writes and responses on point-native prediction fields by rejecting retired source, stake, sport, and bet aliases, returning `unit: "PTS"`, and documenting the rule routes in launch OpenAPI. Loop 273 keeps newly authored bonus/campaign admin writes on launch request fields by rejecting retired budget, rule-config, promo-type, stake-contribution, and override inputs. Loop 272 keeps newly authored leaderboard reward/status boards on launch request fields by rejecting retired `currency`, `prizeSummary`, and storage metric inputs. Loop 271 keeps admin wallet point mutations on the launch `amountPointsCents` request contract by rejecting retired `amountCents` or `amount_cents` bodies. Loop 270 compensates failed wallet credits after bonus creation by releasing campaign claim/budget counters and marking the created bonus non-active. Loop 269 blocks direct player claims for manually triggered or activity-triggered bonus campaigns unless verified point activity or admin review occurs outside the direct claim path. Loop 268 makes preferred `point_rule_config` authoritative over legacy `rule_config` when both are present on campaign rule writes. Loop 267 rejects newly authored inherited point-play mechanics such as `min_odds_decimal`, `parlay_multiplier`, and `excluded_sports` before campaign rule persistence. Loop 266 filters inherited point-play rule mechanics such as `min_odds_decimal`, `parlay_multiplier`, and `excluded_sports` out of admin campaign rule responses. Loop 265 normalizes retired reward-config promo `type` values such as `freebet`, `cash`, `odds_boost`, and `deposit_match` before campaign rule persistence. Loop 264 preserves preferred `max_play_contribution_points_cents` values when old stored rule configs also include retired stake-named contribution aliases. Loop 263 maps old stored `max_stake_contribution_points_cents` campaign rule configs to `max_play_contribution_points_cents` in admin responses without echoing the retired stake-named alias. Loop 262 centralizes bonus grant, forfeit, and expiry event publishing behind a nil-safe point-native publisher. Loop 261 centralizes campaign lifecycle event publishing behind a nil-safe point-native publisher. Loop 260 makes scheduled expired-campaign closes publish point-native `campaign.closed` events for each closed campaign. Loop 259 adds explicit active status to `campaign.activated` point-native domain events. Loop 258 publishes `campaign.paused` domain events with mapped campaign type aliases, paused status, and `unit: "PTS"`. Loop 257 makes `campaign.closed` domain events point-native with mapped campaign type aliases, closed status, and `unit: "PTS"`. Loop 256 adds `unit: "PTS"` to admin point-play campaign lifecycle action responses and launch docs. Loop 255 adds `unit: "PTS"` to the admin bonus-forfeit API response and documents the point-native forfeit response contract. Loop 254 keeps bonus campaign validation errors point-native for reward point and point-play rules, preventing admin-facing game-economy validation responses from leaking inherited wagering or generic cents wording. Loyalty tiers/ledger/rewards and leaderboards exist. Loop 253 now publishes manual and expiry bonus-forfeit event amounts from the actual point-wallet ledger entry, so capped or zero wallet removals are not overstated in game-economy events. Loop 252 now fails closed on manual bonus forfeits when the point-wallet removal fails, preventing bonus status/event updates from claiming points were removed without the wallet mutation. Loop 251 now publishes manual bonus-forfeit domain events with `forfeited_points_cents` and `unit: "PTS"` plus audit metadata, matching bonus-expiry events and guarding against retired generic amount keys. Loop 250 now returns point-safe player-claim API errors for activity/rank eligibility review failures without leaking backend admin method wording. Loop 249 now fails closed when direct bonus claims encounter activity/rank eligibility that requires verified point activity or rank review. Loop 248 now normalizes preferred bonus eligibility `min_point_activity_count` and `rank_min` keys into private evaluator storage and rejects retired `tier_min` keys on campaign creation. Loop 247 now rejects retired bonus eligibility `min_deposits` keys on campaign creation and maps old stored eligibility keys to point-native admin `pointRuleConfig` aliases. Loop 246 now rejects unsafe bonus trigger `event` values such as `deposit` or `bet` on campaign creation and maps old stored trigger event values to point-native admin `pointRuleConfig.event` aliases. Loop 245 now maps bonus campaign activation domain-event `type` and `campaign_type` payload values through the point-native campaign mapper and adds `unit: "PTS"`, preventing old persisted promo campaign types from reappearing in activation events. Loop 244 now maps inherited bonus reward-config type values such as `freebet`, `cash`, `odds_boost`, and `deposit_match` to point-native `point_grant` or `point_match` values in admin campaign rule responses. Loop 243 rejects admin-created bonus campaign `name` and `description` copy with cash, deposit, crypto, fiat, freebet, prize, payout, sportsbook, stake, wager, redemption, or redeemable-offer wording before persistence, while allowing explicit `non-redeemable` point-play disclosure copy. Loop 242 rejects admin-created or admin-updated leaderboard `slug`, `name`, `description`, and `rewardSummary`/legacy `prizeSummary` copy containing cash, prize, payout, crypto, fiat, deposit, withdrawal, USD/dollar, redemption, or redeemable-offer wording before persistence, allows explicit `non-redeemable` disclosure copy, and keeps existing read-side mapping for old persisted inherited summaries. `/api/v1/wallet/daily-claim` now grants configured non-redeemable daily gameplay points to the session user only, uses a per-user UTC-day idempotency key, writes a single wallet ledger `credit` entry with reason `daily_claim`, and is covered by gateway tests. `/api/v1/wallet/point-packs` lists operator-configured one-time gameplay point packs and `/api/v1/wallet/point-packs/claim` credits only the session user with idempotency key `point_pack:{user}:{pack}` and wallet-ledger reason `point_pack_grant`; gateway tests prove duplicate claims do not add points twice. The `/rewards` point-pack surface now displays an explicit points-only disclosure that point packs are non-redeemable gameplay points with no cashout, withdrawal, crypto, fiat, or prize path; user-app source regression locks that copy. `/api/v1/wallet/missions` now exposes ledger-derived daily check-in, first-prediction, three-predictions, five-predictions, ten-predictions, settled-result, three-settled-results, five-settled-results, ten-settled-results, weekly check-in, monthly check-in, seasonal check-in, quarterly check-in, and leaderboard debut missions completed by today's `daily_claim`, existing `reservation:prediction_order:*`/`prediction_fill:*` ledger evidence for first, three-, five-, and ten-prediction milestones, existing `prediction_payout:*` settlement ledger evidence for one-, three-, five-, and ten-settlement-result milestones, seven consecutive `daily_claim:{user}:{date}` ledger keys for weekly check-in, thirty consecutive `daily_claim:{user}:{date}` ledger keys for monthly check-in, sixty consecutive `daily_claim:{user}:{date}` ledger keys for seasonal check-in, and ninety consecutive `daily_claim:{user}:{date}` ledger keys for quarterly check-in, and existing `leaderboard_snapshots` standing evidence from the Predict leaderboard service for leaderboard debut; `/api/v1/wallet/missions/claim` credits only the session user with `mission_reward` ledger rows using per-mission idempotency keys (`mission_reward:{user}:daily_check_in:{date}`, `mission_reward:{user}:first_prediction_order`, `mission_reward:{user}:three_predictions`, `mission_reward:{user}:five_predictions`, `mission_reward:{user}:ten_predictions`, `mission_reward:{user}:settled_result`, `mission_reward:{user}:three_settled_results`, `mission_reward:{user}:five_settled_results`, `mission_reward:{user}:ten_settled_results`, `mission_reward:{user}:weekly_check_in`, `mission_reward:{user}:monthly_check_in`, `mission_reward:{user}:seasonal_check_in`, `mission_reward:{user}:quarterly_check_in`, and `mission_reward:{user}:leaderboard_debut`). Gateway tests prove duplicate mission claims do not add points twice and leave one mission ledger row per one-time milestone. `/api/v1/wallet/streaks` now derives 3-day, 7-day, 14-day, 30-day, 60-day, and 90-day check-in streaks from existing `daily_claim:{user}:{date}` ledger keys, and `/api/v1/wallet/streaks/claim` credits only the session user with idempotency keys `streak_reward:{user}:daily_3`, `streak_reward:{user}:daily_7`, `streak_reward:{user}:daily_14`, `streak_reward:{user}:daily_30`, `streak_reward:{user}:daily_60`, and `streak_reward:{user}:daily_90`; gateway tests prove duplicate streak claims do not add points twice and leave one streak ledger row per milestone. Reward payloads now include point-native aliases and `unit: "PTS"` for starter grants, daily claims, point packs, mission rewards, streak rewards, reward balances, and reward-limit status without retired reward response aliases. Loyalty standing now also exposes point-native XP/rank aliases (`xp`, `xpPoints`, `rank`, `rankName`, `nextRank`, `nextRankName`, `xpToNextRank`, and `unit: "PTS"`) without retired `tier`, `tierName`, `nextTier`, `nextTierName`, or `pointsToNextTier` response aliases, loyalty tier rows expose `rank`, `rankName`, `minXpPoints`, and `unit: "PTS"` without retired `tier`, `name`, or `pointsThreshold` response aliases, and admin loyalty account list/detail responses expose `rank`, `rankName`, `nextRank`, `nextRankName`, `xpToNextRank`, and `unit: "PTS"` without retired account progress aliases; the player and office apps consume rank fields directly while old-response parsing remains private where still needed. The legacy `/api/v1/bonuses/active`, `/api/v1/bonuses/claim`, `/api/v1/bonuses/{id}`, and `/api/v1/bonuses/{id}/progress` surface now emits point/play aliases (`grantedPointsCents`, `remainingPointsCents`, `playRequiredPointsCents`, `playCompletedPointsCents`, `playProgressPct`) and `unit: "PTS"` without retired amount, wagering, or generic progress response aliases; the user app bonus client keeps older payload parsing private, exports point-native bonus/progress/breakdown state only, exports recent bonus contribution amounts as `playAmountPointsCents` instead of `stakePointsCents`, and the progress component renders point-play copy instead of visible wagering text. Bonus claim, admin-grant, manual-forfeit, and expiry domain events now use `amount_points_cents` or `forfeited_points_cents` plus `unit: "PTS"` instead of retired generic amount event keys. Player bonus and admin campaign response types now map inherited promo type strings to point-native `point_grant` or `point_match` values. Campaign creation and bonus claim/grant paths now normalize retired promo campaign types before persistence or player-bonus creation, and the dormant freebet issuance hook has been removed from the bonus service. Admin campaign budget and bonus override requests now reject mismatched retired/point-native amount aliases before persistence or campaign lookup, and nested campaign rule-config reward/play contribution aliases now reject mismatched point-native versus retired values before storage, and HTTP errors now include point-native `details.field` values for those conflicts. `/api/v1/wallet/badges` now derives non-redeemable badge/cosmetic status from existing daily-claim, mission-reward, monthly-check-in mission-reward, seasonal-check-in mission-reward, quarterly-check-in mission-reward, leaderboard-snapshot standing evidence, 3-day, 7-day, 14-day, 30-day, 60-day, and 90-day streak-reward, prediction-order, prediction-veteran, prediction-expert, settled-result, settlement-regular, settlement-veteran, and settlement-expert evidence; gateway tests prove badge earned state comes from ledger or Predict leaderboard evidence and requires authentication. `/api/v1/wallet/reward-limits` now exposes the authenticated user's UTC-day reward grant status, and reward claims enforce `REWARD_DAILY_GRANT_LIMIT_CENTS` across `daily_claim`, `point_pack_grant`, `mission_reward`, and `streak_reward` rows while allowing idempotent retries; gateway tests prove over-cap grants are blocked without extra ledger rows. Reward grants also enforce optional per-day distinct-user caps per configured device header and per client IP (`REWARD_DAILY_MAX_USERS_PER_DEVICE`, `REWARD_DAILY_MAX_USERS_PER_IP`) through wallet-service cluster evidence stored outside the point ledger as hashed device/IP markers; idempotent same-user retries remain allowed, and gateway tests prove device daily-claim blocking, same-user retry, IP point-pack blocking, route/service restart persistence for same-device caps, no raw device ID in the file-backed cluster state, migration-owned DB storage via `048_wallet_reward_clusters.sql`, admin review/export through `/api/v1/admin/wallet/reward-clusters` with hashed signal summaries, sorted user IDs, formula-safe CSV, an office `/prediction-admin/reward-clusters` surface, and no point-ledger row for a blocked account. Demo seeding now runs the same Predict leaderboard recomputer once after Phase 5 settlements and seeds the previous two days of demo-user daily-claim ledger evidence after wallet schema/top-up, so `leaderboard_snapshots` are refreshed from seeded `prediction_payouts` and a reviewer can claim today's daily reward to unlock a live 3-day streak; gateway tests lock the recompute and reward-history seed ordering. `/rewards` now exposes daily claim, point-pack, mission, streak, badge/cosmetic, loyalty XP/rank standing, and daily reward-limit surfaces wired through `claimDailyPoints`, `getPointPacks`, `claimPointPack`, `getMissions`, `claimMission`, `getStreaks`, `claimStreak`, `getBadges`, and `getRewardLimitStatus`, including the pre-first-settle state; user-app tests lock the endpoint/helper/UI wiring, point-native reward alias preference, loyalty XP/rank type surface, bonus alias preference, point-play progress copy, and point-ledger labels. Loop 118 live proof on a fresh stack seeded two historical daily-claim rows (`2026-06-23`, `2026-06-24`), then the browser claimed today's daily reward on `/rewards`, watched the 3-day streak move from `0 / 3` to `3 / 3`, claimed the 3-day streak reward, rendered that row as `Claimed`, earned the Streak builder badge, and API/SQL proof showed `daily_3` completed/claimed with a `streak_reward:u-1:daily_3` PTS ledger credit. | No scenario-9 blocker remains. Backend terminology cleanup, preservation review, and final authenticated release hardening are tracked under scenario 12. | Preserve reward/economy proof in regression scope while continuing safety-boundary hardening. |
| 10. Admin and market operations | Pass | Loop 281 rejects retired leaderboard event metadata keys at admin entry recording and keeps standings responses sanitized for old stored events. Loop 280 requires admin leaderboard entry recording to use activitySourceType/activitySourceId instead of retired sourceType/sourceId and documents that route in launch OpenAPI. Loop 277 removes retired loyalty ledger source aliases from admin adjustment and account-detail ledger responses while preserving point-native prediction source metadata. Loop 276 requires admin loyalty rule create/update requests to use `predictionSourceType`, `minQualifiedPointsCents`, and `eligiblePredictionTypes`, and removes retired rule aliases from admin loyalty rule JSON. Loop 273 requires admin campaign create and admin bonus grant requests to use launch point-play fields instead of retired campaign/bonus aliases. Loop 272 requires admin leaderboard create/update requests to use `unit: "PTS"`, `rewardSummary`, and point-native metric aliases instead of retired admin fields. Loop 271 requires admin wallet credit/debit mutations to use `amountPointsCents`, preventing admin point adjustments from relying on the retired generic amount alias. Loop 270 keeps admin bonus grants from leaving active bonus rows or spent/claim counters behind when wallet crediting fails. Loop 269 preserves manually triggered bonus campaigns for reviewed admin/activity flows by preventing player self-claim bypasses. Loop 268 prevents legacy admin `rule_config` request bodies from overriding preferred `point_rule_config` during campaign creation. Loop 267 rejects admin campaign rule configs that try to author inherited odds/parlay/sports-exclusion mechanics before persistence. Loop 266 keeps admin campaign rule JSON from echoing old sportsbook-shaped point-play mechanics. Loop 265 keeps admin-authored reward rule configs from storing retired promo type values. Loop 264 keeps preferred point-play campaign rule values from being overwritten by retired aliases in admin responses. Loop 263 keeps admin campaign rule responses point-play native for old stored contribution-cap aliases. Loop 262 keeps admin bonus grant/forfeit event publication from depending on event-bus wiring after point mutations. Loop 261 keeps admin campaign lifecycle mutations from depending on event-bus wiring after status changes. Loop 260 keeps scheduled campaign-expiry close events aligned to the point-native lifecycle contract. Loop 259 keeps admin campaign-activation events aligned to the explicit point-native lifecycle contract. Loop 258 keeps admin campaign-pause events aligned to the point-native lifecycle contract. Loop 257 keeps admin campaign-close events aligned to the point-native lifecycle contract. Loop 256 keeps admin campaign activate/pause/close responses point-native with `unit: "PTS"`. Loop 255 makes admin bonus-forfeit responses explicitly point-native with `unit: "PTS"`. Loop 254 keeps admin bonus-campaign rule validation responses aligned to launch-facing point-play copy. Loop 253 keeps admin/expiry bonus-forfeit event amounts aligned to the actual point-wallet amount removed. Loop 252 keeps admin bonus forfeiture lifecycle changes behind a successful point-wallet removal before status/event publication. Backoffice has prediction admin markets, settlements, disputes, risk, users, audit logs, point-ledger inspection, and social report moderation. Admin leaderboard create/update now rejects prohibited external-value `slug`, `name`, `description`, and reward-summary copy before persistence and returns a structured bad-request `details.field` for the offending field. Gateway alpha cashier admin routes are now absent by default in TapTrade launch mode, and office `/cashier` route/menu/container/payment-action surfaces are retired. Office prediction markets now use the admin market list so draft markets are visible for open/cancel review, display launch-facing lifecycle labels, expose a per-market lifecycle audit modal with CSV export, export the admin market list itself as formula-safe `prediction-markets.csv`, use points-formatted volume/drift copy in market and settlement operations, consume point-native settlement disbursement aliases, provide a Replay Points control for incomplete settlement point disbursements, and now include a source/build/browser-tested Edit Market modal wired to the admin market update API. Office disputes and market invalidation confirmations now explain void operations as returning locked points, with confirm text guarded against refund/stake copy. `/api/v1/admin/categories`, `/api/v1/admin/series`, and `/api/v1/admin/tags` now provide admin-managed discovery taxonomy, and office `/prediction-admin/taxonomy` can create categories and tagged series without moving points. Office user detail now labels balances, portfolio value, settled trade results, and ledger rows as points, exports `Point Ledger` CSVs, and no longer ships the old manual funds transaction modal or payment-method ledger column. Office `/prediction-admin/risk` now renders real `/api/v1/admin/prediction/risk` exposure and settlement-aging data as point-accounting invariants, reserved points, open point cost, and max returned points instead of USD/cash copy, consumes point-native risk response fields with temporary legacy fallbacks, and exports the same risk snapshot through `?format=csv` as formula-safe point-accounting CSV. Admin campaign/bonus JSON responses now include `unit: "PTS"`, `budgetPointsCents`, `spentPointsCents`, point-normalized rule-config aliases, the launch-facing `play` rule type, point-native trigger event aliases, point-native eligibility aliases, and point-native campaign type values such as `point_grant`/`point_match`; campaign activation domain events now map inherited promo campaign types to point-native `point_grant`/`point_match` aliases with `unit: "PTS"`; campaign creation also normalizes retired promo campaign type inputs before persistence, rejects unsafe campaign `name` and `description` copy, maps retired reward-config type values to point-native response aliases, rejects conflicting budget or rule-config point amount aliases, and returns point-native or launch-copy conflict fields in HTTP error details while retaining other legacy fields temporarily; helper tests prove the aliases. `/api/v1/admin/wallet/reward-clusters` now gives admins a read-only suspicious reward-cluster review/export surface with `PTS` unit, hashed device/IP signal summaries, distinct-user counts, sorted user IDs, formula-safe CSV, and no raw signal values; office `/prediction-admin/reward-clusters` renders the same evidence with date/limit controls and CSV export. Admin loyalty account list/detail responses now use XP/rank progress fields (`rankName`, `nextRankName`, `xpToNextRank`, `unit: "PTS"`) in gateway JSON, OpenAPI, and office list/detail pages without the retired account progress aliases. `/api/v1/admin/social/reports?format=csv` exports moderated report rows with formula-safe text cells, and office `/social-moderation` exposes the export next to the review queue. | No scenario-10 blocker remains. Legacy campaign/admin naming and backend contract cleanup are tracked under scenarios 11 and 12. | Preserve admin-operations proof in regression scope while continuing API/data cleanup and safety-boundary hardening. |
| 11. API/data surface | Pass | Loop 283 aligns public Predict leaderboard board runtime JSON, launch OpenAPI, and player-app client/UI consumption on metricKey, pointMetricKey, rewardSummary, and unit PTS instead of retired metricLabel and qualificationMsg aliases. Loop 282 aligns the public Predict leaderboard board runtime JSON, launch OpenAPI schema, and exported player-app leaderboard client on `minVolumePointsCents` for point-volume qualification thresholds. Loop 281 serializes legacy leaderboard standings through explicit PTS payloads and maps old metadata keys to predictionId/pointVolumeCents/settlementPointsCents/activitySource aliases. Loop 280 documents and guards admin leaderboard entry recording with activitySourceType/activitySourceId request/response fields and unit PTS, without retired sourceType/sourceId aliases. Loop 279 aligns runtime /api/v1/loyalty/tiers JSON with the launch LoyaltyTier schema, exposing rank/rankName/minXpPoints without retired tierCode/displayName/minLifetimePoints aliases. Loop 278 aligns runtime /api/v1/loyalty JSON with the launch LoyaltyStanding schema, exposing xp/xpPoints/rank fields without retired currentTier/nextTier/pointsToNextTier aliases. Loop 277 updates player and admin loyalty ledger JSON plus launch OpenAPI schemas to expose `predictionSourceType`, `predictionSourceId`, and `unit: "PTS"` without retired `sourceType` or `sourceId`. Loop 276 documents admin loyalty rule create/update routes and schemas in launch OpenAPI and removes loyalty rule write/response fallbacks for retired source, stake, sport, and bet aliases. Loop 275 removes launch responsible-play request fallbacks for `amountCents`, `stakePointsCents`, and `stakeCents` while preserving explicitly named legacy compatibility routes. Loop 274 removes session order, preview, and bot order HTTP request fallback for retired `priceCents` and `notionalCapCents`; retired alias bodies now return 400 with point-native field details before service normalization. Loop 273 removes admin campaign/bonus HTTP write fallbacks for `budget_cents`, `rule_config`, retired rule amount keys, retired promo type values, and `override_amount_cents`. Loop 272 removes admin leaderboard write fallback for retired `currency`, `prizeSummary`, `net_profit_cents`, and `stake_cents` request inputs. Loop 271 removes the admin wallet mutation request fallback from `amountCents` to `amountPointsCents`; retired alias bodies now return 400 with point-native field details. Loop 270 keeps bonus claim/grant mutation error paths consistent with wallet-credit failure by compensating repository state before returning. Loop 269 returns point-safe 403 player claim errors for trigger-gated campaigns that require verified point activity or admin review. Loop 268 keeps launch admin campaign rule writes aligned to `point_rule_config` precedence when mixed legacy/preferred payloads are submitted. Loop 267 adds write-time validation for inherited point-play rule mechanics, returning a structured admin API error before persistence. Loop 266 removes inherited point-play keys from launch admin campaign rule response payloads. Loop 265 makes point-native reward-config `type` values authoritative at the write boundary, not just response mapping. Loop 264 makes preferred point-native rule-config aliases authoritative when both preferred and retired aliases are present in stored admin campaign rules. Loop 263 prevents old stored `max_stake_contribution_points_cents` rule-config keys from leaking through admin campaign JSON and maps them to the launch `max_play_contribution_points_cents` API field. Loop 262 routes `bonus.granted`, `bonus.forfeited`, and `bonus.expired` through a shared nil-safe point-native publisher. Loop 261 routes `campaign.activated`, `campaign.paused`, and `campaign.closed` through a shared nil-safe point-native publisher. Loop 260 makes the scheduled campaign-expiry close path emit point-native `campaign.closed` payloads instead of returning only a count. Loop 259 makes `campaign.activated` event payloads emit explicit active status with point-native type aliases and `unit: "PTS"`. Loop 258 makes `campaign.paused` event payloads emit point-native type aliases, status, and `unit: "PTS"`. Loop 257 makes `campaign.closed` event payloads emit point-native type aliases, status, and `unit: "PTS"`. Loop 256 documents and returns `unit: "PTS"` on `AdminCampaignActionResponse`. Loop 255 documents and returns a point-native `AdminBonusForfeitResponse` with status plus `unit: "PTS"`. Loop 254 keeps admin campaign validation API errors on point-native reward point and point-play wording instead of inherited wagering or generic cents text. Loop 253 makes `bonus.forfeited` and `bonus.expired` payloads report the actual wallet-forfeited point amount rather than the requested bonus remaining amount. Loop 252 makes the manual bonus-forfeit service/API fail closed with a point-native error when the wallet point removal fails, before emitting status/event changes. Gateway exposes many prediction, wallet, loyalty, leaderboard, admin endpoints. Public wallet balance and ledger read responses now emit point-native fields (`balancePointsCents`, `availablePointsCents`, `reservedPointsCents`, `amountPointsCents`, `balancePointsCents`) and `unit: "PTS"` without retired `balanceCents`, `availableCents`, `reservedCents`, or `amountCents` aliases; the player wallet client keeps older read parsing private. Wallet breakdown read responses now emit `basePointsCents`, `bonusPointsCents`, `totalPointsCents`, and `unit: "PTS"` without retired `realMoneyCents`, `bonusFundCents`, `totalCents`, or `currency` aliases; normalized player-app breakdown outputs no longer reattach those fields. Portfolio history responses now emit `entryPricePointsCents`, `exitPricePointsCents`, `realizedPointsCents`, `settlementPointsCents`, and `unit: "PTS"` without `entryPriceCents`, `exitPriceCents`, `pnlCents`, or `payoutCents`; the shared prediction client privately reads older history rows but exports normalized rows with point-native fields only. Admin settlement/finalize/void responses now include `pointDisbursements`, `settlementPointsCents`, `realizedPointsCents`, `totalSettlementPointsCents`, and `unit: "PTS"` with the shared prediction client normalizing settlement responses from those aliases while keeping `payouts` and old row aliases only as private old-response fallbacks; launch JSON, OpenAPI docs, and normalized client outputs no longer emit or reattach the operation-level `payouts` array or admin operation row `payoutCents`/`pnlCents` aliases. Reward wallet responses now emit point-native aliases (`grantPointsCents`, `claimPointsCents`, `balancePointsCents`, `amountPointsCents`, `rewardPointsCents`, `limitPointsCents`, `grantedPointsCents`, `remainingPointsCents`) with `unit: "PTS"` and no retired reward response aliases; leaderboard definition responses now emit `unit: "PTS"`, `pointMetricKey`, and `rewardSummary` without retired `currency` or `prizeSummary` aliases; the player wallet client keeps older reward parsing private. Legacy bonus player responses now include `grantedPointsCents`, `remainingPointsCents`, `playRequiredPointsCents`, `playCompletedPointsCents`, `playProgressPct`, point-native bonus type values, and `unit: "PTS"` in active, claim, detail, and progress payloads without retired amount/wagering/promo-type response aliases; bonus claim/admin-grant paths normalize old persisted promo campaign types before creating player bonus rows, and bonus claim/admin-grant/expiry domain events now publish point-native `amount_points_cents` or `forfeited_points_cents` with `unit: "PTS"` instead of retired generic event amount keys, and campaign activation domain events now expose point-native campaign type aliases with `unit: "PTS"`; old payload names are private player-app parser fallbacks only, and the exported player-app `PlayContribution` contract now uses `playAmountPointsCents` while retaining `stakePointsCents`/`stakeCents` only as private legacy input aliases. Legacy admin campaign responses now emit `budgetPointsCents`, `spentPointsCents`, launch-facing `ruleType: "play"`, and sanitized `pointRuleConfig` fields including point-native reward-config `type`, trigger `event`, and eligibility values, while admin campaign creation rejects unsafe `name` and `description` copy before storage such as `max_bonus_points_cents`, `fixed_amount_points_cents`, `max_play_contribution_points_cents`, and `min_points_cents` without retired `budgetCents`, `spentCents`, raw campaign `rules`, raw `ruleConfig`, public `wagering` rule type, or retired rule amount keys. Loyalty admin account list/detail responses now emit `rank`, `rankName`, `nextRank`, `nextRankName`, `xpToNextRank`, and `unit: "PTS"` without retired account progress aliases, and office loyalty list/detail pages consume those rank fields directly. Loyalty admin config/create/update responses now include `predictionSourceType`, `minQualifiedPointsCents`, and `eligiblePredictionTypes` aliases, accept those aliases on rule writes, and loyalty ledger entry payloads include `predictionSourceType`, `predictionSourceId`, and sanitized metadata aliases such as `predictionId` and `pointVolumeCents` while preserving temporary compatibility fields where required. The user app wallet and bonus clients now prefer those point aliases, preserve gateway ledger `credit`/`debit` movement types, filter point additions by `credit` instead of converting them to deposit/withdrawal terminology, normalize launch wallet balance/reward/ledger/breakdown/bonus units as `PTS` instead of `USD`, no longer export payment mutation helpers from the launch user-app API barrel, and no longer ship cashier/crypto payment API clients. Gateway now exposes `/api/v1/compliance/rg/point-use-limit`, `/api/v1/compliance/rg/point-use-limits`, `/api/v1/compliance/rg/prediction-limit`, `/api/v1/compliance/rg/prediction-limits`, `/api/v1/compliance/rg/check-point-use`, and `/api/v1/compliance/rg/check-prediction` as launch responsible-play aliases beside legacy compatibility routes; point-use and prediction-limit requests accept `amountPointsCents`, responses/checks include `unit: "PTS"` plus point-native requested/amount/limit/remaining/used aliases, prediction checks no longer emit retired `stakePointsCents` or `stakeCents` response aliases, denied checks return point-native `reasonCode` values (`point_use_limit_exceeded`, `prediction_limit_exceeded`) with point-use/prediction reason copy, `/api/v1/compliance/rg/restrictions` now includes `pointUseLimits` and `predictionLimits` aliases, the user app compliance client calls the launch set/list paths, prefers `limitPointsCents` in history, normalizes history to `point_use_limit` and `prediction_limit`, and retains older exports only as compatibility wrappers. Gateway legacy money routes now require `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED=true`; default route tests prove `/api/v1/cashier/alpha/*`, `/api/v1/admin/cashier/alpha/*`, `/api/v1/payments/{deposit,withdraw,methods,status,webhook}`, and `/api/v1/payments/crypto/*` are absent in launch mode, and Loop 137 gateway middleware tests prove those legacy money paths are neither public nor CSRF-exempt by default while opt-in only exempts provider callback/webhook paths and still keeps interactive legacy routes authenticated. Office source no longer ships `/cashier`, `cashier-review`, `admin/cashier/alpha`, or `admin/payments/transactions` call sites, with a launch-source safety scan. `/api/v1/wallet/daily-claim`, `/api/v1/wallet/point-packs`, `/api/v1/wallet/point-packs/claim`, `/api/v1/wallet/missions`, `/api/v1/wallet/missions/claim`, `/api/v1/wallet/streaks`, `/api/v1/wallet/streaks/claim`, `/api/v1/wallet/badges`, and `/api/v1/wallet/reward-limits` now supply real daily, point-pack, mission, streak, badge/cosmetic, and reward-limit endpoints with ledger evidence. `/api/v1/admin/wallet/reward-clusters` exposes admin-only hashed reward-cluster summaries for suspicious-activity review and `?format=csv` export without returning raw device/IP signals, and office `/prediction-admin/reward-clusters` consumes those endpoints. `/api/v1/markets` now supports public `q`, `sort=activity / closing_soon / newest`, `seriesId`, and `tag`; `/api/v1/events` supports `seriesId`; `/api/v1/series` and `/api/v1/tags` expose discovery taxonomy; `/api/v1/watchlist/markets` supports authenticated market watchlist list/add/remove. Admin taxonomy APIs now add `/api/v1/admin/categories`, `/api/v1/admin/series`, and `/api/v1/admin/tags`, with shared API-client create/list helpers. `/api/v1/social/markets/{marketId}/comments`, `/api/v1/social/comments/{commentId}/{react,report}`, `/api/v1/social/users/{userId}/{profile,follow,activity}`, `/api/v1/social/activity`, `/api/v1/admin/social/reports`, `/api/v1/admin/social/reports?format=csv`, and `/api/v1/admin/social/reports/{id}/resolve` now provide prediction-native comments/replies/reactions/reports/profiles/follows/activity, moderation, and formula-safe social report export, including trade, settlement, reward, and leaderboard source rows from existing domain tables. Admin lifecycle transition/finalize/settle responses now include launch-facing `taptradeLifecycle` metadata, `GET /api/v1/admin/markets/{id}` reads an admin market, `PUT /api/v1/admin/markets/{id}` edits market metadata/settlement controls without bypassing the lifecycle FSM, `GET /api/v1/admin/markets/{id}/lifecycle` exposes lifecycle audit rows, `?format=csv` exports them, `/api/v1/admin/settlements/replay` exposes idempotent settlement point-disbursement replay, and the shared API client exposes market update, lifecycle mapping, audit fetch/export, settlement, and replay helpers. Loop 119 live proof saved at `/tmp/taptrade-admin-loop119-proof.json` and CSV artifacts under `/tmp/taptrade-admin-*-loop119.csv` exercised the admin APIs end to end. Loop 120 verified the office market edit UI consumes `predictionClient.updateMarket` and keeps invalidation copy point-return based through source tests, a full office production build, and browser proof of a successful admin edit save against SQL-backed gateway state. `/api/v1/admin/prediction/risk` now includes point-native `pointAccounting` fields (`openPositionPointCostCents`, `maxSettlementPointsCents`, `reservedPointsCents`) plus point-native concentration fields (`openPointCostCents`, `maxReturnedPointsCents`), while keeping `moneyInvariants`, `openCostCents`, and `maxPayoutLiabilityCents` as temporary legacy aliases; `?format=csv` exports the real prediction risk snapshot as point-accounting CSV with formula-safe text cells. Order placement/read payloads now emit and document `pricePointsCents`, `averageFillPricePointsCents`, `totalCostPointsCents`, `reservedPointsCents`, `capturedPointsCents`, `releasedPointsCents`, `filledCostPointsCents`, `notionalCapPointsCents`, and `unit: "PTS"` without `priceCents`, `averageFillPriceCents`, `totalCostCents`, `filledCostCents`, `notionalCapCents`, `walletReservationId`, or retired cash-named aliases; exported shared-client types and normalized outputs no longer expose or reattach those aliases while private compatibility fallback code may read older responses. Launch OpenAPI `PlaceOrderRequest`, exported `PlaceOrderRequest`, player-app preview/place-order handlers, order idempotency signatures, and session/preview/bot order HTTP decoders now send, document, and accept `pricePointsCents` and `notionalCapPointsCents` only; old request price/cap inputs remain only lower-level private compatibility. Order preview payloads now emit and document point-native quote fields such as `pricePointsCents`, `totalCostPointsCents`, `feePointsCents`, `maxProfitPointsCents`, `maxLossPointsCents`, `totalCostWithFeesPointsCents`, and `estimatedSlippagePointsCents` without legacy preview response aliases; exported shared-client types and normalized outputs no longer expose or reattach those aliases while private compatibility fallback code may read older preview responses. Trade tape payloads and live fill frames now emit and document `pricePointsCents`, `feePointsCents`, `notionalPointsCents`, and `unit: "PTS"` without `priceCents` or `feeCents`; exported shared-client types, normalized outputs, and `RecentTrades` no longer expose, reattach, or consume those aliases while private compatibility fallback code may read older trade responses. Central market payloads now emit and document point-native price/activity/liquidity fields without legacy market response aliases; exported `PredictionMarket` types, normalized outputs, live market-detail merges, and player/office market UI consumers no longer expose, reattach, or consume those aliases while private compatibility fallback code may read older market responses. Live `market:<id>` update frames and `orderbook:<id>` hint frames now emit point-native market price/activity and best-quote aliases with `unit: "PTS"` without retired live-frame market `*Cents` or best-quote `*Cents` aliases; the player-app source regression guards gateway live-frame builders while older live frames may be read only by private market-detail fallback code. Order-book depth payloads now emit and document `pricePointsCents`, `shares`, `cumulativeShares`, `notionalPointsCents`, `totalNotionalPointsCents`, and `unit: "PTS"` without `priceCents`, `quantity`, or `total`; exported `OrderBookLevel` types, normalized outputs, and market-detail order-book UI consume those point-native/share-count fields while private compatibility fallback code may read older depth responses. Admin dashboard activity payloads now emit and document `totalVolumePointsCents`, `yesPricePointsCentsStart`, `yesPricePointsCentsNow`, `volumePointsCents`, and `unit: "PTS"` without `totalVolumeCents`, `yesPriceCentsStart`, `yesPriceCentsNow`, or `volumeCents`; exported dashboard types, normalized office outputs, and the office dashboard consume those point-native fields while private compatibility fallback code may read older dashboard responses. Admin drift-alert payloads now emit and document `maxDriftPointsCents`, `totalDriftPointsCents`, and `unit: "PTS"` without `maxDriftCents` or `totalDriftCents`; exported drift-alert types, normalized office outputs, and office market/settlement drift warnings consume those point-native fields while private compatibility fallback code may read older drift responses. Position payloads now emit and document `avgPricePointsCents`, `totalCostPointsCents`, `realizedPointsCents`, and `unit: "PTS"` without `avgPriceCents`, `totalCostCents`, or `realizedPnlCents`; exported shared-client types and normalized outputs no longer expose or reattach those aliases while private compatibility fallback code may read older responses. Admin wallet reconciliation reports now expose ledger aggregates through `totalCreditPointsCents`, `totalDebitPointsCents`, `netMovementPointsCents`, and `unit: "PTS"` without retired aggregate response names, and the launch OpenAPI now documents those report endpoints and point-campaign placeholder schemas without retired report aliases. Admin leaderboard write APIs now validate launch-facing `slug`, `name`, `description`, and `rewardSummary`/legacy `prizeSummary` copy and reject external-value terms with `details.field` set to the offending field before storage. Bot and partner key OpenAPI docs now advertise only read/trade scopes at the security-scheme and request-schema layers, while wildcard or privileged scope rejection remains documented. Admin account-review point-ledger OpenAPI docs now expose only amountPointsCents/balancePointsCents and omit retired amountCents/balanceCents aliases. Loop 412 adds `make qa-scenario-11-api-surface`, wired into launch readiness, with report `revival/94_SCENARIO_11_API_SURFACE_GATE.md` and artifact `revival/artifacts/scenario_11_api_surface_gate_20260629_172417.md`; the gate verifies every Scenario 11 API requirement has OpenAPI operations or documented query parameters and required shared client/service methods, including market list/search/detail, categories/series/tags, price history, order book, order create/cancel/list, portfolio positions, social activity/comments/reactions/reports/follows, leaderboards, reward wallet APIs, admin resolve/settle/replay, point ledger, and admin market/taxonomy/user/risk/social/report/reconciliation surfaces. | No scenario-11 blocker remains. Remaining backend safety terminology, abuse hardening, preservation, dependency, deployed-like journey, and no-money runtime proof stay under Scenario 12. | Continue Scenario 12 safety, compliance, preservation, dependency, live no-money, abuse-boundary, and authenticated canonical-journey hardening. |
| 12. Safety, compliance, and trust boundary | Partial | Loop 520 provides a bounded reviewer handoff at `revival/artifacts/scenario_12_reviewer_handoff_20260701_084500.md` and keeps pending reviewer templates at `revival/signoffs/security_residual_acceptance.md` and `revival/signoffs/production_preservation_signoff.md`, prefilled with current review artifacts and required decision areas. `make qa-scenario-12-signoff` still fails correctly at `revival/artifacts/scenario_12_signoff_gate_20260701_084755.md` because both files remain pending and lack named reviewer/ISO date signoff fields. The production dossier refreshed at `revival/artifacts/production_preservation_dossier_20260701_084732.md`. Existing safety evidence also includes Loop 517 executable Scenario 12 signoff gate, Loop 516 unsigned security residual packet, Loop 515 residual gates, Loop 514 expanded contract anchors, the Loop 513 production-contract review pack, full live no-money route-boundary proof, abuse-boundary proof, Scenario 11 API coverage, and Loop 504-512 compatibility/read/error redaction evidence. | `make qa-rc-completion-audit` still fails correctly because Scenario 12 is Partial. The remaining blockers are pending security residual acceptance/remediation signoff and pending production preservation signoff. | Accountable reviewers must complete or reject the pending signoff templates, or remediation must change the required decision; then rerun Scenario 12 signoff, launch readiness, and RC audit. |

Loop 124 evidence note: gateway launch documentation now has a points-only boundary. `go-platform/README.md` removes inherited alpha cashier/USDC/live-chain/dollar/deposit/withdrawal documentation and states that launch services keep external-value rails out of the active route tree. `go-platform/services/gateway/api/openapi.yaml` now describes non-redeemable gameplay points, point-cents subunits, 0-100 implied probability pricing, 100 point-cent winning-share settlement, maximum point-cents reserved, and legacy compatibility surfaces without documenting cashier, crypto, sportsbook, payout, or dollar-exposure launch behavior. `TestLaunchDocsStayPointsOnly` regression-scans the Go platform README and gateway OpenAPI docs while allowing only `non-redeemable` denial phrasing and OpenAPI `$ref` syntax. Scenarios 11 and 12 remain Partial pending remaining admin/game-economy API docs, internal/backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 345 evidence note: preservation now has a reviewable deletion gate instead of relying only on narrative audit notes. `scripts/qa/preservation-deletion-gate.sh` inspects the active git diff for deleted inherited artifacts and fails if any deletion is not classified as launch-prohibited public money-path removal, point-native proof replacement, duplicate seed cleanup, or test relocation. `make qa-preservation-deletions` is wired into the Makefile and pre-commit hook, and the current run classified all 54 deleted artifacts: player cashier routes/components/API clients/locale bundles, retired player sportsbook/cashier helpers/tests, office cashier/payment admin surfaces, relocated office tests, the retired gateway bet replay proof, and a duplicate seed fixture. Scenario 12 remains Partial because this prevents silent unreviewed deletion but does not yet prove the full live no-money-path, settlement, reward, admin, and abuse boundary.

Loop 346 evidence note: the previously standalone live no-money-path probe is now a maintained runtime gate. `scripts/qa/live-no-money-boundary.sh` wraps `frontend/scripts/qa/live-no-money-boundary.mjs`, writes `revival/32_LIVE_NO_MONEY_BOUNDARY.md` plus timestamped artifacts, and is exposed as `make qa-live-no-money-boundary`. `scripts/release/runtime-gate-profile.sh` now runs that probe after player, office, and gateway health checks pass, using the actual runtime ports; `scripts/release/profiles/runtime-gate.env` enables it by default. The Node probe tests passed for both safe mock surfaces and intentionally exposed money routes. Scenario 12 remains Partial because this turn did not run the full live stack and broader abuse/backend-terminology proof remains incomplete.

Loop 349 evidence note: the deletion-preservation gate now writes a durable reviewer-facing map. `make qa-preservation-deletions` passed with 54 classified deleted inherited artifacts and zero unclassified deletions, and wrote `revival/33_PRESERVATION_DELETION_MAP.md` plus timestamped artifact `revival/artifacts/preservation_deletion_map_20260628_163229.md`. The map lists each deleted path beside its preservation decision, separating launch-prohibited public money paths from point-native proof replacements, relocated tests, and duplicate seed cleanup. Scenario 12 remains Partial because this is preservation audit evidence, not proof of the authenticated canonical journey, backend terminology cleanup, or abuse-control completeness.

Loop 350 evidence note: reward and social abuse-control proof is now a maintained launch gate. `make qa-abuse-boundary` runs focused gateway tests for reward-cluster persistent migration ownership, device/IP reward cluster blocking, blocked-claim no-ledger behavior, hashed admin reward-cluster review/export, same-user social burst throttling, and same-IP multi-account throttles for comments, reports, reactions, and follows. The run passed and wrote `revival/34_ABUSE_BOUNDARY_PROOF.md` plus `revival/artifacts/abuse_boundary_20260628_163608.md`; the pre-commit launch hook now runs this gate between the launch-boundary/reconciliation proof and preservation deletion classification. Scenario 12 remains Partial because backend terminology cleanup and the fully deployed-like authenticated canonical journey remain incomplete.

Loop 125 evidence note: gateway OpenAPI now documents the real admin market lifecycle slice proved in earlier loops: `GET/PUT /api/v1/admin/markets/{id}`, `GET /api/v1/admin/markets/{id}/lifecycle`, `GET /api/v1/admin/markets/{id}/lifecycle?format=csv`, `POST /api/v1/admin/markets/{id}/lifecycle/{action}`, and `POST /api/v1/admin/settlements/replay`. New schemas document admin market edit payloads, TapTrade lifecycle metadata/actions, lifecycle audit rows, lifecycle transition responses, and settlement replay responses using points-only point-disbursement language. `TestLaunchOpenAPIDocumentsAdminLifecycleSlice` now guards those docs, and the focused OpenAPI YAML parse plus launch-doc safety test passed. Scenario 11 remains Partial pending broader game-economy/admin API docs and backend legacy names; Scenario 12 remains Partial pending live no-money-path proof and broader abuse proof.

Loop 126 evidence note: gateway OpenAPI now documents the real reward/game-economy API slice proved in earlier loops: `POST /api/v1/wallet/daily-claim`, `GET /api/v1/wallet/point-packs`, `POST /api/v1/wallet/point-packs/claim`, `GET /api/v1/wallet/missions`, `POST /api/v1/wallet/missions/claim`, `GET /api/v1/wallet/streaks`, `POST /api/v1/wallet/streaks/claim`, `GET /api/v1/wallet/badges`, and `GET /api/v1/wallet/reward-limits`. New schemas document point packs, missions, streaks, badges, reward-limit status, and reward grant responses using `PTS` point aliases and session-user-only reward language. `TestLaunchOpenAPIDocumentsRewardSlice` now guards those docs, and the focused OpenAPI YAML parse plus launch-doc safety test passed. Scenarios 9, 11, and 12 remain Partial pending broader live proof, remaining API docs, backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 127 evidence note: gateway OpenAPI now documents the real social API slice proved in Loop 116 and guarded by gateway tests: `GET/POST /api/v1/social/markets/{marketId}/comments`, `POST /api/v1/social/comments/{commentId}/react`, `POST /api/v1/social/comments/{commentId}/report`, `GET /api/v1/social/users/{userId}/profile`, `POST /api/v1/social/users/{userId}/follow`, `GET /api/v1/social/users/{userId}/activity`, `GET /api/v1/social/activity`, `GET /api/v1/admin/social/reports`, `GET /api/v1/admin/social/reports?format=csv`, `POST /api/v1/admin/social/reports/{id}/resolve`, `GET /api/v1/admin/social/activity`, and `GET /api/v1/admin/social/activity?format=csv`. New schemas document social comments/replies, report requests, public profiles, activity rows, admin social reports, and report resolution requests as metadata-only surfaces with formula-safe admin exports and no point movement. `TestLaunchOpenAPIDocumentsSocialSlice` now guards those docs, and the focused OpenAPI YAML parse plus launch-doc safety test passed. Scenario 8 remains Pass; Scenarios 11 and 12 remain Partial pending remaining risk/leaderboard/loyalty/admin docs, backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 128 evidence note: gateway OpenAPI now documents the real admin prediction risk API proved in Loop 119 and guarded by gateway tests: `GET /api/v1/admin/prediction/risk` and `GET /api/v1/admin/prediction/risk?format=csv`. New schemas document settlement-aging rows, point-cost concentration rows, and point-accounting invariants with point-native fields only, while leaving temporary legacy compatibility aliases out of the launch spec. `TestLaunchOpenAPIDocumentsRiskSlice` now guards those docs, and the focused OpenAPI YAML parse plus launch-doc safety test passed. Scenarios 10, 11, and 12 remain Partial pending remaining leaderboard/loyalty/reward-cluster/admin docs, backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 129 evidence note: gateway OpenAPI now documents the real Predict leaderboard API slice: `GET /api/v1/leaderboards`, `GET /api/v1/leaderboards/{id}/entries`, `GET /api/v1/me/leaderboards`, `GET /api/v1/admin/leaderboards`, `GET /api/v1/admin/leaderboards/{id}`, and `POST /api/v1/admin/leaderboards/{id}/recompute`. New schemas document public board definitions, ranking entries, authenticated viewer standings, admin computed-board rows, and admin entry rows using point-native `PTS`, `pointMetricKey`, and `rewardSummary` fields while leaving temporary compatibility fields out of the launch spec. The public board catalog no longer describes weekly/sharpness/category boards with profit/loss, trader, or dollar-volume copy; `TestPredictLeaderboardBoardCopyIsPointsOnly` now guards the board catalog. `TestLaunchOpenAPIDocumentsLeaderboardSlice` now guards the OpenAPI docs, and the focused OpenAPI YAML parse plus launch-doc safety test passed. Scenarios 9, 10, 11, and 12 remain Partial pending loyalty/reward-cluster/remaining admin docs, backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 130 evidence note: gateway OpenAPI now documents the real loyalty XP/rank and reward-cluster admin slices: `GET /api/v1/loyalty`, `GET /api/v1/loyalty/standing`, `GET /api/v1/loyalty/ledger`, `GET /api/v1/loyalty/tiers`, `GET /api/v1/admin/loyalty/accounts`, `GET /api/v1/admin/loyalty/accounts/{playerId}`, `POST /api/v1/admin/loyalty/adjustments`, `GET /api/v1/admin/loyalty/config`, `PUT /api/v1/admin/loyalty/tiers/{tierCode}`, and `GET /api/v1/admin/wallet/reward-clusters` including CSV export. New schemas document loyalty standing, loyalty ledger entries, public tiers, admin loyalty account/detail/adjustment/config rows, editable rank tiers, and hashed reward-cluster summaries using point-native `PTS`, XP/rank, point-delta, and formula-safe export wording while leaving temporary compatibility fields out of the launch spec. `TestLaunchOpenAPIDocumentsLoyaltyAndRewardClusterSlice` now guards those docs, and the focused gateway test, OpenAPI YAML parse, and launch-doc safety scan passed. Scenarios 9, 10, 11, and 12 remain Partial pending remaining admin docs, backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 131 evidence note: gateway OpenAPI now documents the real responsible-play point-use and prediction-limit launch routes: `POST /api/v1/compliance/rg/point-use-limit`, `GET /api/v1/compliance/rg/point-use-limits`, `POST /api/v1/compliance/rg/prediction-limit`, `GET /api/v1/compliance/rg/prediction-limits`, `GET /api/v1/compliance/rg/check-point-use`, `GET /api/v1/compliance/rg/check-prediction`, `POST /api/v1/compliance/rg/cool-off`, `POST /api/v1/compliance/rg/self-exclude`, and `GET /api/v1/compliance/rg/restrictions`. New schemas document session-bound point-use limits, prediction-size limits, decision payloads with `point_use_limit_exceeded` and `prediction_limit_exceeded`, cool-off/self-exclusion statuses, and restrictions using `PTS` fields while leaving inherited compatibility alias routes out of the launch spec. `TestLaunchOpenAPIDocumentsResponsiblePlaySlice` now guards those docs, and the focused HTTP/compliance tests, OpenAPI YAML parse, and launch-doc safety scan passed. Scenarios 11 and 12 remain Partial pending remaining admin/compatibility docs, backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 132 evidence note: gateway OpenAPI now documents the real launch taxonomy API slice: public `GET /api/v1/categories`, `GET /api/v1/categories/{slug}`, `GET /api/v1/series`, and `GET /api/v1/tags`, plus admin `GET/POST /api/v1/admin/categories`, `GET/POST /api/v1/admin/series`, and `GET /api/v1/admin/tags`. New schemas document category, series, category-create, series-create, and tag-list payloads as launch-safe discovery metadata that does not move points, with prohibited taxonomy terms rejected before category persistence. `TestLaunchOpenAPIDocumentsTaxonomySlice` now guards those docs beside the existing launch-doc safety scan. Scenarios 10, 11, and 12 remain Partial pending remaining admin/compatibility docs, backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 133 evidence note: gateway OpenAPI now documents the real admin account-review API slice: `GET /api/v1/admin/punters`, `GET /api/v1/admin/punters/{id}`, `GET /api/v1/admin/punters/{id}/settlements`, `GET /api/v1/admin/punters/{id}/wallet`, `PUT /api/v1/admin/punters/{id}/status`, `GET/POST /api/v1/admin/punters/{id}/notes`, and `GET /api/v1/admin/audit-logs`. New schemas document account identity/detail rows, point-account summary fields, immutable point-ledger rows, settlement-history rows, status updates, admin notes, pagination, and audit-log rows while leaving known placeholder account actions out of the launch spec. `TestLaunchOpenAPIDocumentsAdminAccountReviewSlice` now guards those docs beside the existing launch-doc safety scan. Scenarios 10, 11, and 12 remain Partial pending remaining admin/compatibility docs, backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 134 evidence note: gateway OpenAPI now documents the real admin market-operation API slice: `GET/POST /api/v1/admin/markets`, `GET /api/v1/admin/markets?format=csv`, `POST /api/v1/admin/events`, `POST /api/v1/admin/market-sources`, `GET /api/v1/admin/ai-budget`, and `POST /api/v1/admin/ai-budget/reserve`. New schemas document market creation, event creation, source-provenance metadata, redacted AI generation metadata, AI drafting token-budget status/reservation, and market list/export responses while preserving the launch rules that market creation records metadata only and does not move points. `TestLaunchOpenAPIDocumentsAdminMarketOperationsSlice` now guards those docs beside the existing launch-doc safety scan. Scenarios 10, 11, and 12 remain Partial pending remaining admin/compatibility docs, backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 135 evidence note: gateway OpenAPI now documents the real settlement and dispute API slice: `POST /api/v1/admin/settlements/{marketId}`, `POST /api/v1/admin/markets/{id}/propose`, `POST /api/v1/admin/markets/{id}/finalize`, `GET/POST /api/v1/disputes`, `GET /api/v1/admin/disputes`, `POST /api/v1/admin/disputes/{id}/resolve`, and `GET /api/v1/admin/resolution-sources`. New schemas document admin resolution attestation, settlement records, point disbursements, proposed-resolution challenge windows, holder disputes, admin dispute decisions, and source-health rows with preferred `PTS` point aliases while leaving transitional compatibility fields documented only as non-preferred. `TestLaunchOpenAPIDocumentsSettlementAndDisputeSlice` now guards those docs beside the launch-doc safety scan and settlement/dispute service tests. Scenarios 7, 10, 11, and 12 remain Partial pending broader dual-admin live proof, backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 136 evidence note: gateway HTTP route tests now exercise the dual-control proposed-resolution flow end to end through the real handlers: admin-1 proposes a closed market, direct admin settlement is rejected while the market is in the challenge flow, the proposing admin cannot finalize, a position holder files a dispute, the admin open-dispute queue returns that dispute, open disputes block finalization, admin-2 rejects the dispute, and admin-2 finalizes with `unit: "PTS"`, `pointDisbursements`, `settlementPointsCents`, `totalSettlementPointsCents`, and settled TapTrade lifecycle metadata. The in-memory admin test repo now preserves user positions plus settlement headers and point-disbursement rows so the route-level test validates response aliases, market state, and proposal state. Scenarios 7, 10, 11, and 12 remain Partial pending live seeded-stack/browser proof, backend legacy names, live no-money-path proof, and broader abuse proof.

Loop 137 evidence note: gateway boot/middleware tests now pin the launch no-money-path boundary at the public-prefix and CSRF-skip layer. `TestLegacyMoneyPathsAreNotPublicOrCSRFSkippedByDefault` proves cashier, admin cashier, payment, crypto-payment, webhook, and provider-callback paths are neither public nor CSRF-exempt when `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED` is unset. `TestLegacyMoneyOptInOnlyExemptsProviderCallbacks` proves the non-launch opt-in only exempts provider callback/webhook paths while interactive legacy money routes still require auth and CSRF. The focused `cmd/gateway` tests and route absence tests passed. Scenarios 11 and 12 remain Partial pending live no-money-path proof, backend legacy names, broader abuse proof, and remaining compatibility cleanup.

Loop 138 evidence note: bot order routes now use the same order-placement error mapper as session orders, so responsible-play and prediction-limit denials return point-safe structured details instead of a flattened generic bot error. `TestBotOrderPathUsesPointSafeOrderDenialContract` mints a real API key, seeds an open order-book market, denies the order through the compliance checker, verifies the response has `reasonCode: "prediction_limit_exceeded"`, checks the message avoids inherited bet wording, and proves no order was persisted. Focused bot, order-error, geo-gate, key self-serve, and rate-limit tests passed. Scenarios 11 and 12 remain Partial pending live no-money-path proof, backend legacy names, broader abuse proof, and remaining compatibility cleanup.

Loop 139 evidence note: bot order routes now share the session order HTTP validation helper before market jurisdiction lookup or placement. `TestBotOrderPathUsesSessionOrderHTTPValidation` mints a real API key and proves capless market buys plus invalid self-match actions return the same field-specific `400` validation details as session orders, using missing-market IDs to verify the request is rejected before market lookup and with zero persisted orders. Focused bot validation, responsible-play/order-error, geo-gate, key self-serve, rate-limit, responsible-play accounting, and launch-doc safety tests passed. Scenarios 11 and 12 remain Partial pending live no-money-path proof, backend legacy names, broader abuse proof, and remaining compatibility cleanup.

Loop 140 evidence note: the launch OpenAPI spec now documents the bot/partner API slice with the same point-safe constraints proven by the route tests. `/api/v1/bot/orders` documents shared session validation for required fields, limit prices, exchange controls, and market-buy notional caps before market lookup, the same point-reservation/fill path as session orders, `400` validation or `prediction_limit_exceeded` denial details, and bot-key rate limiting; `/api/v1/bot/positions` documents read-only point-backed positions. `PlaceOrderRequest` now includes `selfMatchAction`, and `BotOrderResponse`/`BotPositionsResponse` schemas are guarded by `TestLaunchOpenAPIDocumentsBotAPISlice` alongside the launch docs safety scan and focused bot tests. Scenarios 11 and 12 remain Partial pending live no-money-path proof, backend legacy names, broader abuse proof, and remaining compatibility cleanup.

Loop 141 evidence note: the launch OpenAPI bot/API docs now cover the bot-key lifecycle and operator-issued partner-key surfaces. `/api/v1/bot/keys` documents session-user key metadata reads and self-serve creation as no-point-movement operations, with full keys returned only once, read-scope defaults, 90-day expiry, and production self-serve gating; `/api/v1/bot/keys/{id}` documents owner-scoped revocation with no key-existence oracle; `/api/v1/admin/partner-keys` documents RBAC-gated operator issue/list flows with audit-event wording and no point movement. New schemas `BotAPIKey`, `BotAPIKeyCreateRequest`, `BotAPIKeyCreateResponse`, `BotAPIKeyRevokeResponse`, `AdminPartnerKeyCreateRequest`, and `AdminPartnerKeyListResponse` are guarded by `TestLaunchOpenAPIDocumentsBotAPISlice`. OpenAPI parsing, the full launch OpenAPI marker suite, focused bot tests, and partner admin key tests passed. Scenarios 11 and 12 remain Partial pending live no-money-path proof, backend legacy names, broader abuse proof, and remaining compatibility cleanup.

Loop 142 evidence note: bot and partner key issuance now rejects privileged or unknown scopes before persistence. `POST /api/v1/bot/keys` and `POST /api/v1/admin/partner-keys` share `normalizeBotKeyScopes`, default omitted scopes to `read`, normalize safe `read`/`trade` inputs, and reject `admin` or other wildcard/unknown scopes before creating an API key. `TestBotKeySelfServeRejectsPrivilegedOrUnknownScopes` proves invalid self-serve scopes return `400` with no key persistence and safe scopes normalize to `read,trade`; `TestPartnerAdminIssueKey` now proves admin/unknown partner scopes return `400`, do not persist, and omitted scopes default to `read`. OpenAPI request/response scope enums now document only `read` and `trade`, and `TestLaunchOpenAPIDocumentsBotAPISlice` guards the wildcard-scope rejection wording. Scenarios 11 and 12 remain Partial pending live no-money-path proof, backend legacy names, broader abuse proof, and remaining compatibility cleanup.

Loop 143 evidence note: the gateway runtime route-domain summary now matches the launch money-route boundary. `gatewayRouteDomains(false)` omits `alpha_cashier`, `payments`, and `crypto_payments` from the initialized route-domain list, while `gatewayRouteDomains(true)` includes them only for the explicit legacy-money opt-in. The startup log now uses this summary instead of always advertising `payments`, and `TestLaunchRouteDomainSummaryExcludesLegacyMoneyDomains` plus `TestLegacyRouteDomainSummaryRequiresExplicitOptIn` guard the runtime manifest wording beside the existing route-absence, public-prefix, CSRF-skip, and deployed-env boot-validation tests. Scenarios 11 and 12 remain Partial pending live browser/API no-money-path proof, backend legacy names, broader abuse proof, and remaining compatibility cleanup.

Loop 144 evidence note: gateway infrastructure metrics now follow the same launch no-money-path boundary as route registration and startup summaries. `GatewayInfraMetrics()` no longer emits the `gateway_alpha_cashier_audit_write_failures_total` collector or alpha-cashier/money-path help text in launch mode, and the geo-gate metric help text now uses guarded-request wording. `TestLaunchInfraMetricsExcludeLegacyMoneyCollector` proves the launch metrics scrape omits `alpha_cashier`, cashier, payment, crypto, and money-path tokens; `TestLegacyInfraMetricsRequiresExplicitOptIn` proves the alpha-cashier collector returns only when `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED=true`; the focused HTTP, launch-doc, and gateway boot/middleware tests passed. Scenarios 11 and 12 remain Partial pending live browser/API no-money-path proof, backend legacy names, broader abuse proof, and remaining compatibility cleanup.

Loop 145 evidence note: gateway deployed launch validation no longer requires dormant payment-webhook configuration when legacy money routes are absent. `validateGatewayRuntimeConfig` now validates `PAYMENTS_WEBHOOK_SECRET` only when `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED=true`; production/staging still reject that legacy route opt-in before boot, and local compatibility opt-in now requires a real non-placeholder webhook secret. `TestValidateGatewayRuntimeConfigDoesNotRequirePaymentWebhookSecretForLaunch` proves a passing production launch config validates with an empty `PAYMENTS_WEBHOOK_SECRET`; `TestValidateGatewayRuntimeConfigRequiresWebhookSecretOnlyForLegacyMoneyOptIn` proves missing or `whsec_local` secrets fail only when the legacy route tree is explicitly enabled; the crypto-rail boot test now uses a fully passing launch baseline plus one legacy crypto env override, so it verifies the intended rejection. Scenarios 11 and 12 remain Partial pending live browser/API no-money-path proof, backend legacy names, broader abuse proof, and remaining compatibility cleanup.

Loop 146 evidence note: gateway runtime validation now ties `ALPHA_CASHIER_ENABLED=true` to the same explicit legacy-money route boundary. `validateGatewayRuntimeConfig` still rejects alpha cashier in production/staging, and now also rejects local alpha-cashier enablement unless `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED=true` is set, preventing a custodial rail from being configured outside the route tree that exposes and audits it. `TestValidateGatewayRuntimeConfigRequiresLegacyRouteOptInForAlphaCashier` proves the default launch config refuses alpha cashier even with otherwise-valid alpha settings; `TestValidateGatewayRuntimeConfigAllowsAlphaCashierOnlyWithLegacyRouteOptIn` proves the local compatibility path needs both explicit legacy opt-in and a real webhook secret before a valid alpha-cashier config can boot. Scenarios 11 and 12 remain Partial pending live browser/API no-money-path proof, backend legacy names, broader abuse proof, and remaining compatibility cleanup.

Loop 147 evidence note: gateway launch-adjacent diagnostics no longer use inherited money-route wording for guarded request paths. The legacy alpha-cashier opt-in metric help now describes legacy alpha-cashier audit-log persistence failures without the old hyphenated money-route token, pretrade edge-auth comments describe guarded requests, webhook enqueue comments describe the prediction event path, and the route registration comment describes legacy guarded routes. `TestLegacyInfraMetricsRequiresExplicitOptIn` now proves the opt-in metric still appears only under `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED=true` and that its emitted help avoids the inherited token. A focused source scan over `cmd/gateway`, `internal/http`, gateway OpenAPI, and the Go platform README found no old hyphenated money-route token, no spaced equivalent, and no money-movement phrase matches. Scenarios 11 and 12 remain Partial pending live browser/API no-money-path proof, backend legacy names, broader abuse proof, and remaining compatibility cleanup.

Loop 148 evidence note: admin account-review API payloads and launch OpenAPI schemas now prefer point-native fields over legacy compatibility names. `GET /api/v1/admin/punters` and `GET /api/v1/admin/punters/{id}` expose `pointAccountBalanceCents`, `realizedPointsCents`, and `unit: "PTS"` beside transitional compatibility fields; `GET /api/v1/admin/punters/{id}/settlements` exposes `realizedPointsCents`, `settlementPointsCents`, and `PTS`; and `GET /api/v1/admin/punters/{id}/wallet` reuses the point-ledger mapper so admin review rows include `amountPointsCents`, `balancePointsCents`, and `PTS`. `TestAdminPunter*` route tests and `TestLaunchOpenAPIDocumentsAdminAccountReviewSlice` now guard those aliases, while the launch docs safety scan still passes. Scenarios 10, 11, and 12 remain Partial pending live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 149 evidence note: portfolio summary API payloads, shared clients, and launch OpenAPI docs now prefer point-native fields over legacy summary names. `prediction.PortfolioSummary` marshals `totalValuePointsCents`, `portfolioValuePointsCents`, `investedPointsCents`, `unrealizedPointsCents`, `realizedPointsCents`, and `unit: "PTS"` while preserving transitional `totalValueCents`, `unrealizedPnlCents`, and `realizedPnlCents`; the shared prediction client normalizes `getPortfolioSummary()` from those aliases; `/api/v1/portfolio/summary` now documents the `PortfolioSummary` schema and no-point-movement wording. Backend JSON/OpenAPI tests and app source regressions passed. Scenarios 6, 11, and 12 remain Partial pending broader live portfolio proof, backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 150 evidence note: order placement payloads and launch OpenAPI docs began preferring point-native order-cost fields over legacy compatibility names. Loop 171 later retired the response-level order cost/cap aliases from launch JSON, OpenAPI, exported shared-client types, normalized outputs, and the portfolio order UI; Loop 225 later removed `notionalCapCents` from launch OpenAPI, exported request types, player-app preview/place-order calls, and idempotency signatures. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, remaining backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 151 evidence note: portfolio position payloads, shared clients, and launch OpenAPI docs began preferring point-native fields over legacy position cost/result names. Loop 170 later retired the response-level position aliases from launch JSON, OpenAPI, exported shared-client types, normalized outputs, and the portfolio position UI. Scenarios 6, 11, and 12 remain Partial pending broader live portfolio variants, remaining backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 62 evidence note: office leaderboard admin create/edit forms now display `net_points`, `PTS`, and Reward Summary labels while translating inherited `net_profit_cents` only at the compatibility payload boundary. Office loyalty settings/detail pages now display prediction-settlement and point-unit reward copy while translating inherited `bet_settlement` only at the compatibility boundary. Scenarios 9, 10, and 12 remain Partial pending seeded/live proof and broader backend naming cleanup.

Loop 63 evidence note: leaderboard admin/public API responses began exposing point-native `unit`, `rewardSummary`, and `pointMetricKey` aliases, accepting `unit`/`rewardSummary` on admin create/update, and sanitizing fallback seed definitions to `PTS` plus non-redeemable rank/status reward copy. Loop 182 later retired the response-level `currency`/`prizeSummary` aliases from leaderboard JSON and office leaderboard admin source. Scenarios 9, 10, 11, and 12 remain Partial pending live seeded proof and broader backend naming cleanup.

Loop 64 evidence note: loyalty admin config/create/update responses now expose point-native `predictionSourceType`, `minQualifiedPointsCents`, and `eligiblePredictionTypes` aliases, accept those aliases on rule create/update, and expose `predictionSourceType` on loyalty ledger entries while preserving temporary `sourceType`, `minQualifiedStakeCents`, and `eligibleBetTypes` compatibility fields. Office loyalty settings now normalizes and sends those aliases, and detail ledger labels prefer the prediction source alias. Scenarios 9, 10, 11, and 12 remain Partial pending live seeded proof and broader backend naming cleanup.

Loop 65 evidence note: loyalty ledger payloads now expose `predictionSourceId` and sanitized metadata aliases (`predictionId`, `pointVolumeCents`, prediction-settlement reason text) for settlement accrual rows, and office loyalty detail displays the prediction source id above inherited `sourceId`. Scenarios 9, 10, 11, and 12 remain Partial pending live seeded proof and broader backend naming cleanup.

Loop 66 evidence note: public homepage market teasers now use esports/MLBB examples instead of crypto/Bitcoin keys and all `page-home` locale trust copy uses outcome-rule wording instead of payout/payment logic. The user-app QA regression suite now scans homepage source/locales against crypto and cash-value terms. Scenario 12 remains Partial pending broader live proof, backend naming cleanup, and abuse-control hardening.

Loop 67 evidence note: bundled `market-content` fallback values now replace inherited crypto/Bitcoin/Solana and dollar-priced market copy with sports/esports/local-culture prediction topics across English, Indonesian, Malay, Tagalog, Simplified Chinese, and Traditional Chinese. `/predict` no longer uses crypto in the featured carousel or category tab order, category tabs filter inherited crypto categories from launch discovery, and the fallback subcategory taxonomy now uses esports niches. User-app regressions parse market-content JSON values and check launch-safe discovery category wiring. Scenarios 2 and 12 remain Partial pending live discovery proof and backend taxonomy/seed cleanup.

Loop 68 evidence note: gateway category services now filter inherited `crypto` taxonomy from public and admin category lists, return not found for `/api/v1/categories/crypto`, reject admin-created crypto/cash-like categories, and migration `046_taptrade_launch_taxonomy.sql` seeds `esports` while deactivating inherited `crypto`. Gateway HTTP tests cover the launch taxonomy boundary. Scenarios 2 and 12 remain Partial pending live discovery proof, deeper import/seed compatibility cleanup, and broader safety hardening.

Loop 69 evidence note: discovery import classification now removes the `crypto` synthetic category, adds `esports`, skips crypto-like upstream markets before promotion, and uses ordered category substring aliases so esports cannot be misclassified as sports. Backend translation migrations now use launch-safe GTA release copy and migration `047_taptrade_launch_translation_cleanup.sql` overwrites previously migrated unsafe asset-price translations. Gateway discover tests and targeted migration scans cover the importer and translation cleanup. Scenarios 2 and 12 remain Partial pending live discovery proof, settlement-source cleanup in the next loop, and broader safety hardening.

Loop 70 evidence note: launch market creation now rejects non-manual settlement sources, price-threshold rules, and launch-prohibited market copy before persistence; default feed registration omits the legacy asset-price adapter unless `TAPTRADE_LEGACY_ASSET_PRICE_FEEDS_ENABLED=true`; office market creation is manual/binary-only with esports outcome examples; and dev prediction seed data now uses esports/manual markets plus `PTS` wallets while cleaning old deterministic asset-price seed rows on re-run. Gateway and office tests plus targeted source scans cover the boundary. Scenarios 2 and 12 remain Partial pending live discovery/safety proof, backend terminology cleanup, and broader abuse hardening.

Loop 71 evidence note: reward-granting wallet routes now support optional per-day distinct-user caps per device header and per client IP (`REWARD_DAILY_MAX_USERS_PER_DEVICE`, `REWARD_DAILY_MAX_USERS_PER_IP`). The guard applies to daily claim, point-pack, mission, and streak grants, allows idempotent same-user retries, and records clusters only after successful or idempotent grant attempts. Gateway tests prove same-device second-account daily claims are blocked without ledger rows, same-user retries still succeed, and same-IP point-pack second-account grants are blocked until a different IP signal is used. Scenarios 9 and 12 remain Partial pending broader account-graph/distributed abuse proof, live rewards proof, backend terminology cleanup, and broader bot/spam hardening.

Loop 72 evidence note: gateway social writes now use a per-user/action token-bucket guard for comments, reactions, reports, and follows, configured by `SOCIAL_WRITE_RATE_LIMIT_PER_MIN` and `SOCIAL_WRITE_RATE_LIMIT_BURST`. Gateway tests prove configured comment/report bursts return `429` and the blocked second write is not persisted. Scenarios 8 and 12 remain Partial pending live social-flow proof, distributed social spam proof, backend terminology cleanup, and live safety proof.

Loop 73 evidence note: auth registration now requires explicit TapTrade terms plus points-only/no-cashout disclosure acceptance, persists accepted versions and timestamps on `auth_users`, returns those fields on register, and carries them into `/api/v1/auth/session`. The user-app registration form now sends `terms_accepted`, `terms_version`, `launch_disclosure_accepted`, and `launch_disclosure_version` alongside the existing post-signup starter-point claim. Auth-service tests prove missing disclosure is rejected and accepted disclosure appears in register/session responses; user-app QA source tests prove the registration page sends the backend fields. Scenario 1 remains Partial pending live registration-to-visible-ledger proof and deployed auth DB migration proof.

Loop 74 evidence note: wallet missions now include a one-time first-prediction mission completed from existing prediction-order/fill wallet ledger evidence (`reservation:prediction_order:*` or `prediction_fill:*`) and claimed once with idempotency key `mission_reward:{user}:first_prediction_order`. Non-redeemable badges now include a first-prediction cosmetic derived from the same existing ledger evidence without moving points. Gateway tests prove the first-prediction mission completes from ledger evidence, duplicate claims do not double-credit, one mission ledger row is written, and badge state reflects prediction-order evidence; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, seeded leaderboard proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 75 evidence note: wallet missions now also include a one-time settled-result mission completed from existing `prediction_payout:*` settlement ledger evidence and claimed once with idempotency key `mission_reward:{user}:settled_result`. Non-redeemable badges now include a settled-result cosmetic derived from the same settlement ledger evidence without moving points. Gateway tests prove the settled-result mission completes from payout ledger evidence, duplicate claims do not double-credit, one mission ledger row is written, and badge state reflects settlement payout evidence; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, seeded leaderboard proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 76 evidence note: demo seed mode now runs a synchronous Predict leaderboard snapshot recompute immediately after Phase 5 settlements. The one-shot recompute uses the same recomputer as the gateway background worker and active prediction categories from the SQL repository, so seeded `prediction_payouts` can produce `leaderboard_snapshots` without waiting for a long-running server tick. Gateway tests prove the one-shot recompute fires static and category boards, and seed tests guard the Phase 5 -> leaderboard recompute -> Phase 6 ordering. Scenario 9 remains Partial pending live seeded leaderboard/rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 77 evidence note: wallet streaks now include a 7-day check-in streak completed from consecutive `daily_claim:{user}:{date}` ledger evidence and claimed once with idempotency key `streak_reward:{user}:daily_7`. Non-redeemable badges now include a weekly-streak cosmetic derived from the same 7-day streak reward ledger evidence without moving points. Gateway tests prove weekly streak completion, duplicate-claim idempotency, one ledger row, and point-native response aliases; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 78 evidence note: wallet missions now include a one-time weekly check-in mission completed from seven consecutive `daily_claim:{user}:{date}` ledger entries and claimed once with idempotency key `mission_reward:{user}:weekly_check_in`. Gateway tests prove the weekly mission completes from daily-claim streak evidence, duplicate claims do not double-credit, one mission ledger row is written, and point-native response aliases are returned; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 79 evidence note: wallet missions now include a one-time three-predictions mission completed from three distinct `reservation:prediction_order:*` or `prediction_fill:*` wallet-ledger evidence keys and claimed once with idempotency key `mission_reward:{user}:three_predictions`. Gateway tests prove the mission exposes 3/3 progress, duplicate claims do not double-credit, one mission ledger row is written, and point-native response aliases are returned; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 80 evidence note: wallet badges now include a non-redeemable prediction-regular cosmetic badge completed from three distinct `reservation:prediction_order:*` or `prediction_fill:*` wallet-ledger evidence keys. Gateway tests prove the badge catalog expands to seven badges, includes cosmetic/source metadata, derives prediction-regular earned state from ledger evidence, and still requires authentication; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 81 evidence note: wallet missions now include a one-time three-settled-results mission completed from three distinct `prediction_payout:*` wallet-ledger evidence keys and claimed once with idempotency key `mission_reward:{user}:three_settled_results`. Wallet badges now include a non-redeemable settlement-regular cosmetic badge derived from the same three settlement payout evidence keys. Gateway tests prove mission progress, duplicate-claim idempotency, one mission ledger row, point-native response aliases, the expanded eight-badge catalog, and authenticated badge access; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 82 evidence note, superseded by Loop 183: loyalty standing and tier payloads first added point-native XP/rank aliases (`xp`, `xpPoints`, `rank`, `rankName`, `nextRank`, `nextRankName`, `xpToNextRank`, `minXpPoints`, and `unit: "PTS"`). Loop 183 retired the public standing/tier response aliases that Loop 82 temporarily mirrored. Scenario 9 remains Partial pending broader account-graph/distributed abuse proof, bonus UI/live proof, backend terminology cleanup, and live safety-boundary proof.

Loop 83 evidence note: wallet missions now include a one-time five-predictions mission completed from five distinct `reservation:prediction_order:*` or `prediction_fill:*` wallet-ledger evidence keys and claimed once with idempotency key `mission_reward:{user}:five_predictions`. Wallet badges now include a non-redeemable prediction-veteran cosmetic badge derived from the same five prediction-order evidence keys. Gateway tests prove mission progress, duplicate-claim idempotency, one mission ledger row, point-native response aliases, the expanded nine-badge catalog, and authenticated badge access; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 84 evidence note: wallet missions now include a one-time five-settled-results mission completed from five distinct `prediction_payout:*` wallet-ledger evidence keys and claimed once with idempotency key `mission_reward:{user}:five_settled_results`. Wallet badges now include a non-redeemable settlement-veteran cosmetic badge derived from the same five settlement payout evidence keys. Gateway tests prove mission progress, duplicate-claim idempotency, one mission ledger row, point-native response aliases, the expanded ten-badge catalog, and authenticated badge access; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 85 evidence note: wallet missions now include a one-time ten-predictions mission completed from ten distinct `reservation:prediction_order:*` or `prediction_fill:*` wallet-ledger evidence keys and claimed once with idempotency key `mission_reward:{user}:ten_predictions`. Wallet badges now include a non-redeemable prediction-expert cosmetic badge derived from the same ten prediction-order evidence keys. Gateway tests prove mission progress, duplicate-claim idempotency, one mission ledger row, point-native response aliases, the expanded eleven-badge catalog, and authenticated badge access; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 86 evidence note: wallet missions now include a one-time ten-settled-results mission completed from ten distinct `prediction_payout:*` wallet-ledger evidence keys and claimed once with idempotency key `mission_reward:{user}:ten_settled_results`. Wallet badges now include a non-redeemable settlement-expert cosmetic badge derived from the same ten settlement payout evidence keys. Gateway tests prove mission progress, duplicate-claim idempotency, one mission ledger row, point-native response aliases, the expanded twelve-badge catalog, and authenticated badge access; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 87 evidence note: wallet streaks now include a 14-day check-in streak completed from consecutive `daily_claim:{user}:{date}` ledger evidence and claimed once with idempotency key `streak_reward:{user}:daily_14`. Wallet badges now include a non-redeemable streak-champion cosmetic badge derived from that 14-day streak reward ledger evidence. Gateway tests prove fortnight streak completion, duplicate-claim idempotency, one streak ledger row, point-native response aliases, the expanded thirteen-badge catalog, and authenticated badge access; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 88 evidence note: wallet streaks now include a 30-day check-in streak completed from consecutive `daily_claim:{user}:{date}` ledger evidence and claimed once with idempotency key `streak_reward:{user}:daily_30`. Wallet badges now include a non-redeemable monthly-streak cosmetic badge derived from that 30-day streak reward ledger evidence. Gateway tests prove monthly streak completion, duplicate-claim idempotency, one streak ledger row, point-native response aliases, the expanded fourteen-badge catalog, and authenticated badge access; gateway HTTP and user-app reward regression tests pass. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and monetization disclosure verification.

Loop 89 evidence note: `/rewards` point packs now display explicit points-only no-cashout disclosure copy: point packs are non-redeemable gameplay points with no cashout, withdrawal, crypto, fiat, or prize path. User-app reward regression tests lock the disclosure beside the existing `getPointPacks`/`claimPointPack` wiring. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and live monetization disclosure proof.

Loop 90 evidence note: wallet missions now include a one-time monthly check-in mission completed from thirty consecutive `daily_claim:{user}:{date}` wallet-ledger evidence keys and claimed once with idempotency key `mission_reward:{user}:monthly_check_in`. Wallet badges now include a non-redeemable monthly-check-in cosmetic badge derived from that mission reward ledger evidence. Gateway tests prove monthly mission completion, duplicate-claim idempotency, one mission ledger row, point-native response aliases, and badge earned state; user-app reward regression tests lock the catalog contract. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and live monetization disclosure proof.

Loop 91 evidence note: wallet streaks now include a 60-day check-in streak completed from consecutive `daily_claim:{user}:{date}` ledger evidence and claimed once with idempotency key `streak_reward:{user}:daily_60`. Wallet badges now include a non-redeemable double-monthly-streak cosmetic badge derived from that 60-day streak reward ledger evidence. Gateway tests prove 60-day streak completion, duplicate-claim idempotency, one streak ledger row, point-native response aliases, the expanded sixteen-badge catalog, and authenticated badge access; user-app reward regression tests lock the 60-day streak and badge catalog contract. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and live monetization disclosure proof.

Loop 92 evidence note: wallet missions now include a one-time seasonal check-in mission completed from sixty consecutive `daily_claim:{user}:{date}` wallet-ledger evidence keys and claimed once with idempotency key `mission_reward:{user}:seasonal_check_in`. Wallet badges now include a non-redeemable seasonal-check-in cosmetic badge derived from that mission reward ledger evidence. Gateway tests prove seasonal mission completion, duplicate-claim idempotency, one mission ledger row, point-native response aliases, badge earned state, the expanded seventeen-badge catalog, and authenticated badge access; user-app reward regression tests lock the seasonal mission and badge catalog contract. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and live monetization disclosure proof.

Loop 93 evidence note: wallet streaks now include a 90-day check-in streak completed from consecutive `daily_claim:{user}:{date}` ledger evidence and claimed once with idempotency key `streak_reward:{user}:daily_90`. Wallet badges now include a non-redeemable quarterly-streak cosmetic badge derived from that 90-day streak reward ledger evidence. Gateway tests prove 90-day streak completion, duplicate-claim idempotency, one streak ledger row, point-native response aliases, the expanded eighteen-badge catalog, and authenticated badge access; user-app reward regression tests lock the 90-day streak and badge catalog contract. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and live monetization disclosure proof.

Loop 94 evidence note: wallet missions now include a one-time quarterly check-in mission completed from ninety consecutive `daily_claim:{user}:{date}` wallet-ledger evidence keys and claimed once with idempotency key `mission_reward:{user}:quarterly_check_in`. Wallet badges now include a non-redeemable quarterly-check-in cosmetic badge derived from that mission reward ledger evidence. Gateway tests prove quarterly mission completion, duplicate-claim idempotency, one mission ledger row, point-native response aliases, badge earned state, the expanded nineteen-badge catalog, and authenticated badge access; user-app reward regression tests lock the quarterly mission and badge catalog contract. Scenario 9 remains Partial pending live rewards proof, broader catalog depth, distributed abuse proof, and live monetization disclosure proof.


Loop 97 evidence note: admins can now review persisted reward cluster evidence through `/api/v1/admin/wallet/reward-clusters`, which returns `PTS`, hashed device/IP signal summaries, distinct-user counts, sorted user IDs, and explanatory notes while requiring admin role and never returning raw signals. Gateway tests prove non-admin denial, two same-device daily claims appear as one hashed device summary, raw device IDs stay out of the response, and the surface is review-only. Scenarios 9, 10, 11, and 12 remain Partial pending broader account-graph clustering, multi-node/live abuse proof, live admin/rewards proof, and backend terminology cleanup.

Loop 98 evidence note: `/api/v1/admin/wallet/reward-clusters?format=csv` now exports the same admin-only hashed reward-cluster evidence as formula-safe CSV with `PTS` unit, distinct-user counts, and sorted user IDs while continuing to omit raw device/IP signals. Gateway tests prove the CSV content type, scoped filename, header, hashed signal row, sorted user IDs, point unit, and raw-device omission. Scenarios 9, 10, 11, and 12 remain Partial pending broader account-graph clustering, multi-node/live abuse proof, live admin/rewards proof, and backend terminology cleanup.

Loop 99 evidence note: office `/prediction-admin/reward-clusters` now gives admins an App Router suspicious-activity view backed by `/api/v1/admin/wallet/reward-clusters`, with date/limit controls, refresh, CSV export, hashed signal table, sorted affected user IDs, `PTS` unit, and no raw device/IP values. The dashboard nav exposes Reward Clusters, and office source tests prove the route, nav, endpoint wiring, CSV export call, hashed-signal labels, point unit, and absence of launch-prohibited cashout/deposit/withdrawal copy. Scenarios 9, 10, 11, and 12 remain Partial pending broader account-graph clustering, multi-node/live abuse proof, live admin/rewards proof, and backend terminology cleanup.

Loop 101 evidence note: gateway social writes now support an optional per-client-IP/action token-bucket guard for comments, reactions, reports, and follows, configured by `SOCIAL_WRITE_IP_RATE_LIMIT_PER_MIN` and `SOCIAL_WRITE_IP_RATE_LIMIT_BURST`, in addition to the existing per-user/action guard. Gateway tests prove a second account writing a comment from the same `X-Forwarded-For` IP receives `429`, the blocked comment is not persisted, and the same account can write from a different IP. Scenarios 8 and 12 remain Partial pending live social-flow proof, broader multi-node/account-graph abuse proof, backend terminology cleanup, and live safety proof.

Loop 102 evidence note: gateway social shared-IP tests now cover reports and follows as well as comments. The added regressions prove a same-IP second account is blocked from reporting a comment or following a profile, the blocked report/follow is not persisted, and the same account can proceed from a different IP. Scenarios 8 and 12 remain Partial pending live social-flow proof, broader multi-node/account-graph abuse proof, backend terminology cleanup, and live safety proof.

Loop 103 evidence note: gateway social shared-IP tests now cover reactions too. The added regression proves a same-IP second account is blocked from reacting to a comment, the blocked reaction does not increment reaction count, and the same account can react from a different IP. Scenarios 8 and 12 remain Partial pending live social-flow proof, broader multi-node/account-graph abuse proof, backend terminology cleanup, and live safety proof.

Loop 104 evidence note: admin social report moderation now supports `?format=csv` on `/api/v1/admin/social/reports`, returning formula-safe CSV rows for report/comment/reviewer fields and a status-scoped `social-reports-*.csv` filename. Office `/social-moderation` exposes the export action and source tests guard the CSV wiring. Scenarios 8, 10, 11, and 12 remain Partial pending live social/admin proof, broader export coverage, backend terminology cleanup, and live safety proof.

Loop 105 evidence note: admin prediction activity now has `/api/v1/admin/social/activity` JSON review plus `/api/v1/admin/social/activity?format=csv` export over the existing merged comments/follows/trades/settlements/rewards/leaderboard activity feed. Office `/prediction-admin/activity` exposes the review table and `prediction-social-activity.csv` export, and tests prove admin gating plus formula-safe activity CSV cells. Scenarios 8, 10, 11, and 12 remain Partial pending live social/admin proof, broader export coverage, backend terminology cleanup, and live safety proof.

Loop 106 evidence note: the admin market list now supports `/api/v1/admin/markets?format=csv`, exporting market id, event id, ticker, title, status, launch-facing TapTrade stage, result, execution mode, point-volume/open-interest/liquidity fields, settlement source/rule, and timestamps with formula-safe text cells. Office prediction markets expose `Prediction Markets.csv` export through the shared `exportAdminMarkets` client helper, tests prove the gateway CSV headers/content plus office route wiring, and a temporary migrated/seeded gateway returned live `prediction-markets.csv` rows for seeded markets. Fresh DB migration was also unblocked by adding goose markers to `044_prediction_social.sql` and `045_prediction_market_watchlist.sql`, with a clean migration reaching version 48. Scenarios 10, 11, and 12 remain Partial pending broader live admin workflow proof, backend terminology cleanup, and live safety proof.

Loop 107 evidence note: full demo seed mode now tolerates a fresh migrated gateway DB before the runtime-managed `wallet_ledger` table exists, while still deleting demo wallet ledger rows on rerun when the table exists. A temporary PostgreSQL 16 DB migrated cleanly to goose version 48, ran `go run ./cmd/seed -mode demo` through Phase 6 with 15 markets, 597 orders, 904 trades, 9 settled markets, 81 payouts, and Predict leaderboard recompute rows, then reran cleanly with Phase 0 deleting 591 demo orders, 898 demo trades, 449 demo ledger rows, 9 settlements, 118 positions, and 591 orphan reservations before reseeding. Seed CLI top-up and open-market summaries now render visible amounts as `pts`, and source scans outside the regression test find no `+$`, `->$`, or `Vol:$` seed output patterns. Scenarios 9, 10, 11, and 12 remain Partial pending live browser canonical journey proof, broader live admin workflow proof, backend terminology cleanup, and live safety proof.

Loop 108 evidence note: using the stable demo seed as a base, a temporary SQL-backed gateway launched with DB wallet mode, legacy money routes disabled, and bot auth enabled. A disposable API key for `user-001` placed a live `/api/v1/bot/orders` BUY YES market order on seeded open order-book market `MLBB-FINAL-G1`; the API returned `201`, order `336ce89e-d04a-4257-8219-352a4b55616f` filled quantity 3, captured 192 points-cents, and produced order-book issuance trade `4c02bbba-051e-48ee-bd0e-de931752275c` at 64 points-cents. The same DB showed `wallet_ledger` debit `prediction_fill:4c02bbba-051e-48ee-bd0e-de931752275c`, `wallet_balances.balance_cents=483337`, and `prediction_positions` for `user-001` on `MLBB-FINAL-G1` YES quantity 71; `/api/v1/bot/positions` returned the updated position. The session wallet/portfolio routes still returned authentication-required in this harness, so visible account ledger/browser proof is not counted as complete. Scenarios 4 and 6 remain Partial pending session-authenticated browser/API proof for account ledger, portfolio refresh, sell/close/cancel, and activity rendering.

Loop 109 evidence note: a temporary PostgreSQL-backed auth service plus gateway ran with `GATEWAY_AUTH_ENABLED=true`, DB wallet mode, and legacy money routes disabled. Through the gateway auth proxy, a disposable user `goal-proof-1782370540@taptrade.local` registered with `terms_accepted=true`, `terms_version=taptrade-launch-v1`, `launch_disclosure_accepted=true`, and `launch_disclosure_version=points-no-cashout-v1`, logged in, and read `/api/v1/auth/session` showing user `u-6e7e36c0e45d` with both persisted acceptance versions. The session posted `/api/v1/wallet/starter-grant` twice using the CSRF cookie; both responses reported `unit: "PTS"`, `grantPointsCents: 500000`, and `balancePointsCents: 500000`. Authenticated `GET /api/v1/wallet/u-6e7e36c0e45d/ledger?limit=10` returned exactly one PTS credit row with `amountPointsCents=500000`, `balancePointsCents=500000`, and idempotency key `starter_grant:u-6e7e36c0e45d`; SQL checks matched one `wallet_ledger` credit and a 500000 point-cent balance. Scenario 1 remains Partial pending browser-visible signup-to-discovery and account-ledger proof.

Loop 110 evidence note: Browser validation against a temporary migrated/seeded stack exercised `/auth/register` end to end. A disposable user `browser-proof-1782371044096@taptrade.local` completed the rendered two-step form, saw the points-only/no-cashout disclosure text, accepted it, and was redirected to `/predict`. The signed-in `/predict` page showed `BAL 5000.00 pts`, loaded seeded discovery data including featured `MLBB-FINAL-G1`, categories, series, tags, sort controls, and market cards after adding the configured API origin to the app CSP and allowing port 3010 in gateway CORS. `/account/transactions` rendered the visible point ledger with one row: `Starter points`, `+5,000 pts`, `5,000 pts`, reason `Starter point grant`, with no sampled cashout/withdraw/crypto/USD wording on that page. SQL matched persisted disclosure acceptance and one `starter_grant:u-a21706ffed67` ledger row for user `u-a21706ffed67`. The wallet DB idempotency path now also recovers concurrent same-payload starter-grant replays after unique/serialization races; a race proof user `race-proof-1782371397@taptrade.local` received two concurrent `200` starter-grant responses, one 500000 point-cent ledger row, and a 500000 point-cent balance. Scenario 1 is now Pass; the broader canonical journey remains incomplete.

Loop 111 evidence note: Browser validation against a fresh temporary migrated/seeded stack exercised session-authenticated trading on `MLBB-FINAL-G1` for disposable user `trading-proof-1782372060968@taptrade.local` / `u-d8e19b4204ac`. The user started at `5000.00 pts`, bought 39 YES for 24.96 pts with a 0.04 pt release, sold 8 YES for 4.80 pts proceeds, bought 12 NO for 4.80 pts with a 0.20 pt release, and ended at `4975.04 pts`. `/portfolio` rendered two open positions, 31 YES and 12 NO, with 24.64 pts invested. `/account/transactions` rendered visible point-ledger rows for order locks, fills, proceeds, unlocks, and starter points. `/activity` rendered the same user's `Bought 39 YES`, `Sold 8 YES`, and `Bought 12 NO` rows after adding seller-side trade rows to global SQL activity. Market detail recent trades now render trade sizes in `pts`, not `$`, covered by the app QA regression suite and browser revalidation. Scenarios 4, 6, 8, and 12 remain Partial pending settlement/admin, broader social/reward, live no-money-path, and backend terminology proof.

Loop 112 evidence note: Browser/API validation against a fresh temporary migrated/seeded stack with market sync disabled exercised settlement-to-ledger for disposable user `settleproof73601982` / `u-3032133a6ab9` on `MLBB-FINAL-G1`. The user registered, landed on `/predict` with `BAL 5000.00 pts`, bought 39 YES for 24.96 pts with a 0.04 pt release, then an admin closed and settled the market YES through gateway admin lifecycle and settlement endpoints. The settlement response returned `totalSettlementPointsCents=30100`, included this user's 39 YES disbursement with `settlementPointsCents=3900` and `realizedPointsCents=1404`, SQL showed wallet balance `501404`, a `prediction_payout:...` credit row, zeroed YES position, and settlement progress 9/9 payouts completed. `/portfolio` rendered `5014.04 pts`, invested `0.00 pts`, realized P&L `+14.04 pts`, open positions `0`, accuracy `100.0%`, and history showed entry `64c`, exit `100c`, P&L `+14.04 pts`, and settlement points `+39.00 pts` after fixing the history table to use settlement credits rather than loyalty accruals. `/account/transactions` rendered the same settlement as `Settlement points`, `+39 pts`, `5,014.04 pts` after, and `Prediction settlement`. Settlement notification copy now says winning positions settle at 100 points per share instead of `100c/contract`. Scenarios 4, 6, 7, 9, 11, and 12 remain Partial pending broader rewards/admin/social proofs, backend terminology cleanup, and live no-money-path safety proof.

Loop 113 evidence note: Browser/API validation against a fresh temporary migrated/seeded stack with market sync disabled exercised live insufficient-points rejection on `MLBB-FINAL-G1`. The first proof attempt exposed a client bug where limit-order zero-fill preview cost left a 6000 pt order enabled against a 5000 pt balance; the gateway rejected it as insufficient funds but still wrote a rejected order row. `TradeTicket` now uses preview spend only for market buys, so limit buys compare the selected point amount against balance. A second clean proof user `insufficientfixed1782375227830` / `u-0c1dd4208a0b` registered, received `BAL 5000.00 pts`, returned to `/market/MLBB-FINAL-G1/?side=yes&amount=6000.00`, selected Limit, and saw a disabled `Not enough points` CTA plus `Your available points are below this 6000.00 pts order.` SQL after the UI rejection stayed at balance `500000`, one starter-grant ledger row, zero `prediction_orders`, and zero `wallet_reservations`. Scenarios 4 and 12 remain Partial pending broader discovery/rewards/social/admin/safety proof and backend terminology cleanup.

Loop 115 evidence note: Browser/API validation against a SQL-backed proof stack exercised market-detail liquidity for both execution modes. `/market/MLBB-FINAL-G1` rendered the order-book market question, resolution criteria/source/timeline, YES/NO prices, history controls, 8 real aggregated order-book levels, recent trades in points, discussion shell, share action, and related markets, while `/api/v1/markets/MLBB-FINAL-G1/orderbook?depth=5` returned four YES bids and four NO bids. `/market/DOTA-GF-MAP1` rendered the launch-safe legacy AMM fixture with `AMM liquidity`, YES 15c/NO 85c, 200 pts liquidity, reserve balance YES 19 / NO 42, 200 pts subsidy, curve K 100, preview-backed impact quotes for 1/10/25 YES, related markets, and a disabled `Quote only` ticket. The DOTA market API returned `executionMode=amm`, reserve/subsidy/liquidity fields, and authenticated preview quotes returned backend average price, total cost, new YES price, slippage, and filled status for 1/10/25 YES. `TradeTicket` now short-circuits AMM submits and seed/demo user orders skip AMM markets. Scenario 5 is now Pass; Scenario 3 remains Partial pending live comment/reply/reaction/report/profile/follow/moderation proof and edge-state detail variants.

Loop 116 evidence note: Browser/API/SQL validation against a fresh SQL-backed stack exercised live social-detail behavior on `MLBB-FINAL-G1`. The demo user posted `Loop 116 proof comment 1782378484615`, submitted reply `Loop 116 proof reply 1782378515374`, upvoted the comment to `Upvote · 1`, reported it to `Report · 1`, and `/users/u-1` rendered the public profile with 2 comments, profile activity rows for the proof comment/reply, leaderboard rows, settlement rows, and trade rows. A second registered user `u-40f89fc127a4` followed `u-1`; the profile API returned `followerCount=1` and `viewerFollowing=true`, and user activity returned the follow plus proof comment/reply rows. Admin `admin@taptrade.local` listed the open social report, exported it as CSV, resolved it as reviewed with note `Loop 116 moderation proof`, and verified reviewed JSON/CSV. SQL confirmed 2 `prediction_market_comments`, 1 `prediction_market_comment_reactions`, 1 reviewed `prediction_market_comment_reports` row, and 1 `prediction_user_follows` row. Scenarios 3 and 8 are now Pass; Scenario 12 remains Partial pending broader multi-node/account-graph abuse and safety-boundary proof.

Loop 117 evidence note: Browser/API/SQL validation against the same SQL-backed stack exercised the live rewards and leaderboard path. `/rewards` rendered configured nonzero rewards, claimed the daily reward (`daily_claim:u-1:2026-06-25`), claimed the `starter_boost` point pack, claimed the first-prediction mission, then after a patch reload rendered daily claim as `Claimed today`, starter boost as `Claimed`, daily check-in as `1 / 1 complete`, streak progress as `1 / 3` through `1 / 90`, earned daily and mission badges, and daily reward-limit status `9,885 of 10,000 reward pts remain for today`. The daily-check-in mission was then claimed as `mission_reward:u-1:daily_check_in:2026-06-25`; `/leaderboards` rendered the session user as `#2 You` on Weekly P&L; `/account/transactions` rendered `Daily points +25 pts`, `Point pack +75 pts`, and mission rewards `+10 pts` and `+5 pts`. API proof showed point-pack `claimed=true`, completed/claimed daily and first-prediction missions, leaderboard-debut progress, PTS reward-limit aliases, earned badges, and 1-day streak progress; SQL confirmed four reward ledger rows and leaderboard snapshots for `u-1` on `pnl_weekly` and `category:politics`. Scenario 9 remains Partial because live streak reward claiming is still incomplete for the current seeded user and broader account-graph/multi-node abuse proof remains open.

Loop 118 evidence note: Demo seed mode now adds two historical `daily_claim:u-1:{date}` PTS ledger credits for the previous two UTC days after wallet schema/top-up, with timestamps backdated so today's reward limit is not pre-consumed. A fresh migrated/seeded stack proved those rows for `2026-06-23` and `2026-06-24`; browser login as `demo@taptrade.local` opened `/rewards` with the 3-day streak still `0 / 3`, claimed today's daily reward, watched the streak and check-in missions refresh to `3 / 3`, claimed the now-enabled `3-day check-in streak`, and rendered that streak as `Claimed` with the Streak builder badge earned. API proof saved at `/tmp/taptrade-streak-loop118-api-proof.json` showed `daily_3` `completed=true`, `claimed=true`, `currentStreak=3`, `unit="PTS"`, the earned daily and streak badges, reward-limit `grantedPointsCents=3500`, and ledger aliases for the three daily claims plus `streak_reward:u-1:daily_3`; SQL confirmed the same four wallet-ledger rows. Scenario 9 remains Partial because bonus UI/live proof, broader distributed abuse proof, and backend terminology cleanup remain open.

Loop 152 evidence note: order preview payloads began exposing preferred point-native aliases above legacy preview cost/result/slippage names. Loop 172 later retired those preview response aliases from launch JSON, OpenAPI, exported shared-client types, normalized outputs, and player preview UI. `/api/v1/orders/preview` remains documented as a non-mutating `OrderPreview` schema with no point movement, and launch request surfaces now send and document `notionalCapPointsCents` only. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 153 evidence note: trade tape payloads began exposing preferred point-native aliases above legacy trade price/fee names. Loop 173 later retired those trade response aliases from launch JSON, live fill payloads, OpenAPI, exported shared-client types, normalized outputs, and player trade-tape UI. `/api/v1/markets/{id}/trades` remains documented as a typed point-native `Trade` array. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 154 evidence note: central market/discovery/detail payloads began exposing preferred point-native aliases above legacy market price/activity/liquidity names. Loop 174 later retired those central market response aliases from launch JSON, OpenAPI, exported shared-client types, normalized app/office outputs, live market-detail merge behavior, and market UI consumers. Discovery, public market list/detail, admin market list/create/update, and related-market reads remain typed point-native `Market`/`PredictionMarket` surfaces. Scenarios 11 and 12 remain Partial pending backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 155 evidence note: market price-history chart payloads began exposing preferred point-native aliases and were documented in launch OpenAPI. Loop 175 later retired those history response aliases from launch JSON, OpenAPI, exported shared-client types, normalized player-app outputs, and chart/discovery UI consumers. `/api/v1/markets/{id}/prices` remains documented as a no-point-movement `MarketPriceHistory` response. Scenarios 11 and 12 remain Partial pending backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 156 evidence note: order-book/depth payloads began exposing preferred point-native aliases and were documented in launch OpenAPI. Loop 176 later retired the depth response aliases from launch JSON, OpenAPI, exported shared-client types, normalized outputs, and market-detail order-book UI. `/api/v1/markets/{id}/orderbook` remains documented as a no-point-movement `OrderBook` response. Scenarios 11 and 12 remain Partial pending backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 157 evidence note: live market WebSocket payloads began exposing preferred point-native aliases. Loop 179 later retired emitted live-frame market price/activity and order-book best-quote aliases. `market:<id>` frames now include `yesPricePointsCents`, `noPricePointsCents`, `lastTradePricePointsCents`, `volumePointsCents`, `openInterestPointsCents`, and `unit: "PTS"` without legacy market aliases; `orderbook:<id>` hint frames include best-quote point aliases and `unit: "PTS"` without best-quote `*Cents` aliases; and the market detail page normalizes live market-update frames from point aliases before merging them into local state while retaining private fallback parsing for older frames. Scenarios 11 and 12 remain Partial pending backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 158 evidence note: admin dashboard market-activity payloads began exposing preferred point-native aliases. Loop 177 later retired those dashboard activity response aliases from launch JSON, OpenAPI, exported shared-client types, normalized office outputs, and the office dashboard consumer. Scenarios 10, 11, and 12 remain Partial pending broader admin/live variants, backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 159 evidence note: the admin dashboard point-activity endpoint was documented in launch OpenAPI with preferred point-native aliases. Loop 177 later removed the transitional dashboard activity fields from `/api/v1/admin/dashboard/volume`, `DashboardVolumeStats`, and `DashboardMover`, leaving the route documented as read-only point activity with no point movement. Scenarios 10, 11, and 12 remain Partial pending broader admin/live variants, backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 160 evidence note: admin drift-alert payloads and docs began exposing preferred point-native aliases. Loop 178 later retired those drift response aliases from launch JSON, OpenAPI, exported shared-client types, normalized office outputs, and office market/settlement consumers. Scenarios 10, 11, and 12 remain Partial pending broader admin/live variants, backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 161 evidence note: office `/prediction-admin/risk` now consumes only the point-native risk snapshot contract for point-accounting invariants and concentration amounts. The page no longer maps `moneyInvariants`, `reservedCashCents`, `maxSettlementLiabilityCents`, `openCostCents`, or `maxPayoutLiabilityCents` into launch-visible risk cards/tables; missing `pointAccounting` remains a hard error. Office source regression tests now guard those retired aliases out of the risk route, and office TypeScript compilation passes. Scenarios 10, 11, and 12 remain Partial pending broader admin/live variants, backend legacy naming cleanup, live no-money-path proof, and broader abuse proof.

Loop 162 evidence note: gateway admin risk JSON now matches the point-only launch OpenAPI contract instead of emitting retired compatibility aliases. `prediction.RiskSnapshot`, `MarketExposure`, and `PointAccountingInvariants` no longer serialize `moneyInvariants`, `openCostCents`, `maxPayoutLiabilityCents`, `openPositionCostCents`, `maxSettlementLiabilityCents`, or `reservedCashCents`; the JSON regression now asserts those aliases are absent while the CSV export remains point-accounting-only. Scenarios 10, 11, and 12 remain Partial pending broader admin/live variants, backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 163 evidence note: order placement/read payloads no longer expose retired cash-named reservation aliases in launch JSON, OpenAPI, or exported shared client types. Gateway `prediction.Order` suppresses `reservedCashCents`, `capturedCashCents`, and `releasedCashCents` from JSON while still using internal DB fields; order JSON tests require `reservedPointsCents`, `capturedPointsCents`, `releasedPointsCents`, `filledCostPointsCents`, `notionalCapPointsCents`, and `unit: "PTS"` and assert the retired cash aliases are absent. The launch OpenAPI order schema and exported `PredictionOrder` type no longer list those cash aliases, and the shared client no longer reattaches them to normalized order objects while keeping a private fallback reader for older responses. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 164 evidence note: admin settlement and invalidation operation responses no longer expose the retired operation-level `payouts` array in launch JSON, OpenAPI, or normalized shared-client outputs. Gateway settlement/void payload tests now require `pointDisbursements`, `settlementPointsCents`, `realizedPointsCents`, `totalSettlementPointsCents`, and `unit: "PTS"` while asserting the `payouts` array is absent; the launch OpenAPI `AdminSettlementOperationResponse` documents only `pointDisbursements`; the shared prediction client still privately accepts older `payouts` responses but stops reattaching them; and office settlement success counts now read only `pointDisbursements`. Scenarios 7, 10, 11, and 12 remain Partial pending live dual-control/admin variants, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 165 evidence note: admin settlement and invalidation point-disbursement rows no longer leak the internal `prediction.Payout` JSON fields in launch operation responses. The gateway `settlementPointDisbursement` DTO now explicitly maps settlement row metadata plus `realizedPointsCents`, `settlementPointsCents`, `paidAt`, and `unit: "PTS"` instead of embedding `prediction.Payout`; settlement and void payload tests assert `payoutCents`, `pnlCents`, and the operation-level `payouts` array are absent. The launch OpenAPI `AdminSettlementPointDisbursement` schema no longer documents `payoutCents` or `pnlCents`. The shared API client exports `SettlementPointDisbursement` for `pointDisbursements`, keeps old `payouts` and row aliases only in a local legacy fallback reader, strips those aliases from normalized outputs, and uses point-disbursement lifecycle copy. Scenarios 7, 10, 11, and 12 remain Partial pending live dual-control/admin variants, portfolio/account-review settlement-history cleanup, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 166 evidence note: public portfolio settlement-history rows no longer leak the internal `prediction.Payout` JSON fields. The gateway `portfolioHistoryItem` DTO now explicitly maps settlement metadata plus `realizedPointsCents`, `settlementPointsCents`, `paidAt`, and `unit: "PTS"` instead of embedding `prediction.Payout`; focused JSON tests assert `payoutCents` and `pnlCents` are absent. Launch OpenAPI now documents `/api/v1/portfolio/history` with a `PortfolioHistoryItem` schema that includes point-native result fields and omits the retired aliases. The shared API client exports `SettledPayout` with required point-native result fields, keeps old `payoutCents`/`pnlCents` parsing only in a local legacy fallback reader, and strips those aliases from normalized outputs. `/portfolio` now renders realized result and settlement points from `realizedPointsCents` and `settlementPointsCents` only. Scenarios 6, 11, and 12 remain Partial pending account-review settlement-history cleanup, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 167 evidence note: admin account-review settlement-history rows no longer leak the internal `prediction.Payout` JSON fields. The gateway `adminPunterSettlementItem` DTO now explicitly maps settlement metadata plus `realizedPointsCents`, `settlementPointsCents`, `paidAt`, and `unit: "PTS"` instead of embedding `prediction.Payout`; route tests assert `payoutCents` and `pnlCents` are absent from `/api/v1/admin/punters/{id}/settlements`. The launch OpenAPI `AdminPunterSettlement` schema now omits the retired aliases, and the account-review docs test slices that schema to keep them out. Office `PunterProfile` settlement rows now type and render `realizedPointsCents` and `settlementPointsCents` only, with source regression coverage rejecting `pnlCents` and `payoutCents`. Scenarios 10, 11, and 12 remain Partial pending broader live admin variants, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 168 evidence note: admin account-review list/detail responses no longer emit the retired point-account and realized-result compatibility aliases. `prediction.AdminPunterListItem` and `prediction.AdminPunterDetail` now expose `pointAccountBalanceCents`, `realizedPointsCents`, and `unit: "PTS"` without `walletBalanceCents` or list-level `realizedPnlCents`; route tests assert the retired aliases are absent from `/api/v1/admin/punters` and `/api/v1/admin/punters/{id}` JSON. Launch OpenAPI removed `walletBalanceCents` and account-list `realizedPnlCents` from the admin account-review schemas, and the docs test slices those schemas to keep them out. Office user detail now maps point balance, portfolio value, realized result, and unrealized result from `pointAccountBalanceCents`, `portfolioValuePointsCents`, `realizedPointsCents`, and `unrealizedPointsCents` without reading retired aliases. Scenarios 10, 11, and 12 remain Partial pending broader live admin variants, remaining portfolio position compatibility aliases, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 169 evidence note: portfolio summary payloads no longer emit or document the retired summary compatibility aliases. `prediction.PortfolioSummary` now serializes `totalValuePointsCents`, `portfolioValuePointsCents`, `investedPointsCents`, `unrealizedPointsCents`, `realizedPointsCents`, and `unit: "PTS"` without `totalValueCents`, `unrealizedPnlCents`, or `realizedPnlCents`; JSON tests assert those aliases are absent. Launch OpenAPI removed those fields from the `PortfolioSummary` schema and the portfolio docs test slices that schema to keep them out. The exported shared-client `PortfolioSummary` type now contains required point-native fields only, while a private `LegacyPortfolioSummary` reader still accepts older responses without reattaching retired fields. `/portfolio` and `/account` summary cards now render from `totalValuePointsCents` and `realizedPointsCents`, and the office users list now reads `pointAccountBalanceCents` and `realizedPointsCents` instead of the retired account-review list aliases. Scenarios 6, 10, 11, and 12 remained Partial pending the then-open position-level cleanup, broader live admin variants, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 170 evidence note: portfolio position payloads no longer emit or document the retired position cost/result compatibility aliases. `prediction.Position` now serializes `totalCostPointsCents`, `realizedPointsCents`, and `unit: "PTS"` without `totalCostCents` or `realizedPnlCents`; JSON tests assert those aliases are absent. Launch OpenAPI removed those fields from the `Position` schema and the portfolio docs test slices that schema to keep them out. The exported shared-client `Position` type now contains point-native cost/result fields only, while a private `LegacyPosition` reader still accepts older responses without reattaching retired fields. `/portfolio` renders position cost from `totalCostPointsCents`. Scenarios 6, 11, and 12 remain Partial pending broader live portfolio variants, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 171 evidence note: order placement/read payloads no longer emit or document retired response-level order cost/cap aliases. `prediction.Order` now serializes `totalCostPointsCents`, `reservedPointsCents`, `capturedPointsCents`, `releasedPointsCents`, `filledCostPointsCents`, `notionalCapPointsCents`, and `unit: "PTS"` without `totalCostCents`, `filledCostCents`, `notionalCapCents`, `reservedCashCents`, `capturedCashCents`, or `releasedCashCents`; JSON tests assert those aliases are absent. Launch OpenAPI removed the retired cost/cap aliases from the `Order` schema and the docs test slices that schema to keep them out. The exported shared-client `PredictionOrder` type now contains point-native order cost/cap fields only, while a private `LegacyPredictionOrder` reader still accepts older responses without reattaching retired fields. `/portfolio` renders active-order cost from `totalCostPointsCents`. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 172 evidence note: order preview payloads no longer emit or document retired preview response aliases. `prediction.OrderPreview` now serializes `pricePointsCents`, `totalCostPointsCents`, `feePointsCents`, `maxProfitPointsCents`, `maxLossPointsCents`, `newYesPricePointsCents`, `newNoPricePointsCents`, `averageFillPricePointsCents`, `totalCostWithFeesPointsCents`, `estimatedSlippagePointsCents`, and `unit: "PTS"` without `priceCents`, `totalCostCents`, `feeCents`, `maxProfitCents`, `maxLossCents`, `newYesPriceCents`, `newNoPriceCents`, `averageFillPriceCents`, `totalCostWithFeesCents`, or `estimatedSlippageCents`; JSON tests assert those aliases are absent. Launch OpenAPI removed those aliases from the `OrderPreview` schema. The exported shared-client `OrderPreview` type now contains point-native quote fields only, while a private `LegacyOrderPreview` reader still accepts older responses without reattaching retired fields. TradeTicket and AMM impact quotes render preview economics from point-native fields. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 173 evidence note: trade tape payloads no longer emit or document retired trade price/fee response aliases. `prediction.Trade` JSON and live `trades:<marketID>` fill payloads now serialize `pricePointsCents`, `feePointsCents`, `notionalPointsCents`, and `unit: "PTS"` without `priceCents` or `feeCents`; JSON/live-payload tests assert those aliases are absent. Launch OpenAPI removed those aliases from the `Trade` schema. The exported shared-client `Trade` type now contains point-native fill fields only, while a private `LegacyTrade` reader still accepts older responses without reattaching retired fields. `RecentTrades` renders tape prices from `pricePointsCents`. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 174 evidence note: central market payloads no longer emit or document retired market price/activity/liquidity response aliases. `prediction.Market` JSON now serializes point-native market fields and `unit: "PTS"` without `yesPriceCents`, `noPriceCents`, `lastTradePriceCents`, `volumeCents`, `openInterestCents`, `liquidityCents`, `ammSubsidyCents`, `collateralPoolCents`, `settledPayoutPoolCents`, or best-quote `*Cents` aliases; JSON tests assert those aliases are absent. Launch OpenAPI removed those aliases from the `Market` schema. The exported shared-client `PredictionMarket` type now contains point-native market fields only, while a private `LegacyPredictionMarket` reader still accepts older responses without reattaching retired fields. Market detail, discovery, category, predict, top-bar, trade-ticket, and office market/settlement screens consume point-native market fields; price-history, order-book/depth, admin dashboard activity, live frames, and request input compatibility are separate contracts. Scenarios 11 and 12 remain Partial pending broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 175 evidence note: market price-history payloads no longer emit or document retired history price/activity response aliases. `prediction.PricePoint` JSON now serializes `yesPricePointsCents`, `volumePointsCents`, and `unit: "PTS"` without `yesPriceCents` or `volumeCents`; JSON tests assert those aliases are absent. Launch OpenAPI removed those aliases from the `PricePoint` schema. The exported shared-client `PricePoint` type now contains point-native history fields only, while a private `LegacyPricePoint` reader still accepts older responses without reattaching retired fields. Market chart, hero price-history, and discover movement consumers read point-native history fields. Scenarios 11 and 12 remain Partial pending broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 176 evidence note: order-book depth payloads no longer emit or document retired depth response aliases. `prediction.OrderBookLevel` JSON now serializes `pricePointsCents`, `shares`, `cumulativeShares`, `notionalPointsCents`, `totalNotionalPointsCents`, and `unit: "PTS"` without `priceCents`, `quantity`, or `total`; JSON tests assert those aliases are absent. Launch OpenAPI removed those aliases from the `OrderBookLevel` schema. The exported shared-client `OrderBookLevel` type now contains point-native/share-count fields only, while a private `LegacyOrderBookLevel` reader still accepts older responses without reattaching retired fields. Market-detail order-book display consumes normalized `pricePointsCents`, `shares`, and `cumulativeShares`. Scenarios 11 and 12 remain Partial pending broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 177 evidence note: admin dashboard activity payloads no longer emit or document retired activity response aliases. `prediction.DashboardVolumeStats` JSON now serializes `totalVolumePointsCents` and `unit: "PTS"` without `totalVolumeCents`; `prediction.DashboardMover` JSON now serializes `yesPricePointsCentsStart`, `yesPricePointsCentsNow`, `volumePointsCents`, and `unit: "PTS"` without `yesPriceCentsStart`, `yesPriceCentsNow`, or `volumeCents`; launch OpenAPI removed those aliases from the dashboard schemas; exported shared-client types and normalized outputs are point-native only; and the office dashboard consumes the point-native activity fields. Scenarios 10, 11, and 12 remain Partial pending broader admin/live variants, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 178 evidence note: admin drift-alert payloads no longer emit or document retired drift response aliases. `prediction.CollateralDriftAlert` JSON now serializes `maxDriftPointsCents`, `totalDriftPointsCents`, and `unit: "PTS"` without `maxDriftCents` or `totalDriftCents`; launch OpenAPI removed those aliases from the drift alert schema and response docs; exported shared-client types and normalized outputs are point-native only; and office market/settlement drift warnings consume the point-native fields. Scenarios 10, 11, and 12 remain Partial pending broader admin/live variants, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 179 evidence note: live market and order-book WebSocket frames no longer emit retired live-frame market price/activity or best-quote aliases. Gateway `market:<id>` update frames now serialize `yesPricePointsCents`, `noPricePointsCents`, `lastTradePricePointsCents`, `volumePointsCents`, `openInterestPointsCents`, and `unit: "PTS"` without `yesPriceCents`, `noPriceCents`, `lastTradePriceCents`, `volumeCents`, or `openInterestCents`; `orderbook:<id>` hint frames serialize best-quote point aliases without `bestYesBidCents`, `bestYesAskCents`, `bestNoBidCents`, or `bestNoAskCents`; and the player-app source regression guards the gateway live-frame builders while keeping older frame parsing private to the market-detail normalizer. Scenarios 11 and 12 remain Partial pending broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 180 evidence note: core wallet read payloads no longer emit retired balance, ledger, or breakdown aliases. Gateway `/api/v1/wallet/{userId}` responses now serialize `balancePointsCents`, `availablePointsCents`, `reservedPointsCents`, and `unit: "PTS"` without `balanceCents`, `availableCents`, or `reservedCents`; `/api/v1/wallet/{userId}/ledger` rows serialize `amountPointsCents`, `balancePointsCents`, and `unit: "PTS"` without `amountCents` or `balanceCents`; `/api/v1/wallet/{userId}/breakdown` responses serialize `basePointsCents`, `bonusPointsCents`, `totalPointsCents`, and `unit: "PTS"` without `realMoneyCents`, `bonusFundCents`, `totalCents`, or `currency`. The app wallet and bonus clients keep older read parsing local to private fallback types and no longer export or reattach retired read fields. Scenarios 11 and 12 remain Partial pending broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 181 evidence note: reward response payloads no longer emit retired reward cents aliases. Gateway starter grant, daily claim, point-pack claim, mission claim, and streak claim responses serialize `grantPointsCents` or `claimPointsCents`, `balancePointsCents`, and `unit: "PTS"` without `grantCents`, `claimCents`, or `balanceCents`; point-pack, mission, and streak definitions serialize `amountPointsCents` or `rewardPointsCents` without `amountCents` or `rewardCents`; reward-limit status serializes `limitPointsCents`, `grantedPointsCents`, `remainingPointsCents`, and `unit: "PTS"` without `limitCents`, `grantedCents`, or `remainingCents`. The app wallet client exports point-native reward objects and keeps older reward parsing local to private raw fallback types. Scenarios 11 and 12 remain Partial pending broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 182 evidence note: leaderboard definition responses no longer emit retired unit/reward compatibility aliases. Gateway legacy CRUD leaderboard payloads and Predict computed-board admin rows serialize `unit: "PTS"`, `pointMetricKey`, and `rewardSummary` without `currency` or `prizeSummary`; office leaderboard admin list/detail pages use `unit` and `rewardSummary` directly and the office source regression rejects the retired names. Loop 272 later removed old alias compatibility from admin create/update request parsing. Scenarios 10, 11, and 12 remain Partial pending broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 183 evidence note: Predict loyalty standing and public tier responses no longer emit retired tier/threshold aliases. Gateway `/api/v1/loyalty` and `/api/v1/loyalty/standing` serialize `xp`, `xpPoints`, `rank`, `rankName`, `nextRank`, `nextRankName`, `xpToNextRank`, and `unit: "PTS"` without `tier`, `tierName`, `nextTier`, `nextTierName`, or `pointsToNextTier`; `/api/v1/loyalty/tiers` serializes `rank`, `rankName`, `minXpPoints`, and `unit: "PTS"` without `tier`, `name`, or `pointsThreshold`. Launch OpenAPI documents only the point-native standing/tier schemas, and the player app rewards page/header pill consume exported rank fields while private raw fallback readers may still accept older responses. Scenarios 9, 11, and 12 remain Partial pending broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 184 evidence note: Admin loyalty account list/detail responses no longer emit retired account progress aliases. DB-backed Predict admin loyalty account summaries and the in-memory fallback mapper now serialize `rank`, `rankName`, `nextRank`, `nextRankName`, `xpToNextRank`, and `unit: "PTS"` without `currentTier`, `nextTier`, or `pointsToNextTier`; `/api/v1/admin/loyalty/accounts` documents `rankName` as the preferred filter while accepting old `tierCode` only as compatibility input. Office loyalty list/detail pages consume rank fields directly, visible copy now says rank, and the detail page refreshes after adjustments instead of depending on either adjustment response shape. Scenarios 9, 10, 11, and 12 remain Partial pending broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 185 evidence note: Legacy player bonus responses no longer emit retired amount/wagering aliases. Gateway `/api/v1/bonuses/active`, `/api/v1/bonuses/claim`, `/api/v1/bonuses/{id}`, and `/api/v1/bonuses/{id}/progress` serialize `grantedPointsCents`, `remainingPointsCents`, `playRequiredPointsCents`, `playCompletedPointsCents`, `playProgressPct`, and `unit: "PTS"` without `grantedAmountCents`, `remainingAmountCents`, `wageringRequiredCents`, `wageringCompletedCents`, `wageringProgressPct`, snake_case variants, or generic `progressPct`. The player-app bonus client and Redux bonus state export point-native bonus/progress/breakdown objects only while old payload names remain private parser fallbacks. Scenarios 9, 11, and 12 remain Partial pending bonus UI/live proof, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 186 evidence note: Legacy admin campaign responses no longer emit retired budget/spend or raw rule-config aliases. Gateway `/api/v1/admin/campaigns`, `/api/v1/admin/campaigns/{id}`, and campaign create/detail helpers serialize `budgetPointsCents`, `spentPointsCents`, sanitized `pointRuleConfig`, and `unit: "PTS"` without `budgetCents`, `spentCents`, raw campaign `rules`, raw `ruleConfig`, `max_bonus_cents`, `fixed_amount_cents`, `max_stake_contribution_cents`, or `min_amount_cents`. Scenarios 10, 11, and 12 remain Partial pending broader live admin variants, backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 187 evidence note: Launch OpenAPI now documents the legacy bonus/campaign compatibility slice using point-only response contracts. `/api/v1/bonuses/active`, `/api/v1/bonuses/claim`, `/api/v1/bonuses/{id}`, `/api/v1/bonuses/{id}/progress`, `/api/v1/admin/campaigns`, `/api/v1/admin/campaigns/{id}`, `/api/v1/admin/campaigns/{id}/{activate,pause,close}`, `/api/v1/admin/bonuses`, `/api/v1/admin/bonuses/grant`, `/api/v1/admin/bonuses/{id}`, and `/api/v1/admin/bonuses/{id}/forfeit` are documented with `PlayerBonus`, `PlayerBonusProgress`, `AdminCampaign`, and `AdminCampaignRule` schemas that expose `unit: "PTS"`, `grantedPointsCents`, `remainingPointsCents`, `playRequiredPointsCents`, `playCompletedPointsCents`, `playProgressPct`, `budgetPointsCents`, `spentPointsCents`, and sanitized `pointRuleConfig`. The launch-doc regression now fails if those docs disappear or if retired amount, progress, budget/spend, raw rule-config, or rule amount aliases return to those schemas. Scenarios 9, 10, 11, and 12 remain Partial pending bonus UI/live proof, broader live admin variants, backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 188 evidence note: Admin bonus/campaign request handling now accepts preferred point-native request aliases before falling through to legacy internal service fields. `CreateCampaignRequest` accepts `budget_points_cents` and rule `point_rule_config`, normalizes point-rule amount keys into the existing internal evaluator/storage keys before validation, and `GrantBonusRequest` accepts `override_points_cents` before using the existing grant path. Launch OpenAPI now documents `AdminCampaignCreateRequest`, `AdminCampaignRuleInput`, and `AdminBonusGrantRequest` with the preferred request aliases only, while the docs regression rejects `budget_cents`, `override_amount_cents`, raw `rule_config`, and retired rule amount keys in those schemas. Loop 273 later removed retired alias compatibility from admin campaign create and admin bonus grant HTTP request parsing. Scenarios 9, 10, 11, and 12 remain Partial pending bonus UI/live proof, broader live admin variants, backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 189 evidence note: The player rewards page now fetches `/api/v1/bonuses/active` through the point-native bonus client and renders active bonus rows in both the pre-first-settle and normal rewards states. The new active bonus panel displays campaign/status, remaining points, and the existing point-play progress component wired from `playRequiredPointsCents`, `playCompletedPointsCents`, `playProgressPct`, and `remainingPointsCents`, without consuming retired amount or wagering aliases. The wallet-path source regression now locks the rewards-page bonus wiring and point-play field usage. Scenarios 9, 11, and 12 remain Partial pending live bonus claim/progress proof, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 190 evidence note: Demo seeding now creates a launch-safe active point-play bonus for the demo user so `/rewards` can show the real active-bonus panel without manual setup. Phase 0 cleanup removes prior demo `player_bonuses` before deleting demo-seed campaigns, `RunDemo` seeds the active bonus after wallet/reward history and before market-maker orders, and `RunPhase5BonusDemo` inserts one active demo campaign plus one `u-1` active player bonus with point-play progress values. Seed source tests guard cleanup ordering and demo-phase ordering. Scenarios 9, 11, and 12 remain Partial pending live browser/API bonus proof, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 191 evidence note: Demo active-bonus seed values are now named constants and the seed test proves the launch demo grant remains a positive, partially-used point-play bonus with 25% progress. The HTTP bonus regression now serializes a demo-shaped active bonus through the same `playerBonusResponse` helper used by `/api/v1/bonuses/active`, proving the seeded row shape maps to `unit: "PTS"`, `remainingPointsCents`, `playRequiredPointsCents`, `playCompletedPointsCents`, and `playProgressPct` without retired amount, wagering, or generic progress aliases. Scenarios 9, 11, and 12 remain Partial pending live browser/API bonus proof, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 192 evidence note: `/api/v1/bonuses/active` now has an endpoint-level regression that exercises the authenticated handler path with a demo-shaped active bonus. `playerActiveBonusesHandler` depends only on the active-bonus listing method it uses, so `TestPlayerActiveBonusesEndpointReturnsDemoPointPlayPayload` can verify the handler lists bonuses for the session user and returns a JSON `bonuses` array with `unit: "PTS"`, demo campaign copy, `remainingPointsCents`, `playRequiredPointsCents`, `playCompletedPointsCents`, and `playProgressPct` without retired amount, wagering, or generic progress aliases. Scenarios 9, 11, and 12 remain Partial pending live browser/API bonus proof against a running seeded stack, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 193 evidence note: `/api/v1/bonuses/{id}` and `/api/v1/bonuses/{id}/progress` now have endpoint-level ownership and point-play regressions. `playerBonusDetailHandler` depends only on the player-bonus lookup method it uses, so `TestPlayerBonusProgressEndpointRequiresOwnerAndPointPlayPayload` verifies a session owner can read progress as `unit: "PTS"`, `playRequiredPointsCents`, `playCompletedPointsCents`, and `playProgressPct` without retired progress aliases, while `TestPlayerBonusDetailEndpointRejectsNonOwner` verifies another session user receives a forbidden response. Scenarios 9, 11, and 12 remain Partial pending live browser/API bonus proof against a running seeded stack, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 194 evidence note: `/api/v1/bonuses/claim` now has an endpoint-level session-boundary and point-play response regression. `claimBonusHandler` depends only on the claim method it uses, so `TestClaimBonusEndpointUsesSessionUserAndPointNativePayload` verifies the handler overwrites request-body user identity with the authenticated session user, preserves campaign and trigger inputs, returns `201`, and emits `unit: "PTS"`, `grantedPointsCents`, `remainingPointsCents`, `playRequiredPointsCents`, `playCompletedPointsCents`, and `playProgressPct` without retired amount, wagering, or generic progress aliases. Scenarios 9, 11, and 12 remain Partial pending live browser/API bonus proof against a running seeded stack, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 195 evidence note: Admin bonus grant and forfeit routes now have endpoint-level session-actor regressions. `adminGrantBonusHandler` depends only on the grant method it uses, so `TestAdminGrantBonusEndpointUsesSessionAdminAndPointNativePayload` verifies `/api/v1/admin/bonuses/grant` uses the authenticated admin as `GrantedBy`, accepts the preferred `override_points_cents` request alias, and emits `unit: "PTS"`, granted/remaining point fields, and point-play progress fields without retired amount or progress aliases. `TestAdminBonusForfeitEndpointUsesSessionAdmin` verifies `/api/v1/admin/bonuses/{id}/forfeit` binds the forfeit actor to the authenticated admin and returns the forfeit status for the requested bonus id. Scenarios 9, 10, 11, and 12 remain Partial pending live browser/API bonus proof, broader live admin variants, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 196 evidence note: The windowed-resolution route regression now covers the remaining dual-control dispute-review variant at the handler boundary. `TestPredictionAdminWindowedResolutionRoutesEnforceDualControlAndDisputeGate` verifies admin-1 proposes a challenge-window resolution with a future `challengeEndsAt`, cannot finalize it, cannot review the holder dispute against that same proposed result, and leaves the dispute open until admin-2 rejects it and finalizes. The same route test now rejects retired response aliases from proposed-resolution and finalization JSON, proving the flow stays on challenge-window metadata plus `unit: "PTS"` and `pointDisbursements` instead of `payouts`, `payoutCents`, `pnlCents`, `totalPayoutCents`, or `currency`. Scenarios 7, 10, 11, and 12 remain Partial pending live seeded-stack/browser proof, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 197 evidence note: Windowed resolution actions now have handler-level coverage for the identified-admin requirement even when the dev anonymous-admin bypass is enabled. `TestPredictionAdminWindowedResolutionRequiresIdentifiedAdmin` verifies uid-less requests to `/api/v1/admin/markets/{id}/propose` and `/api/v1/admin/markets/{id}/finalize` receive `403`, create no proposal, and leave the market closed, preventing anonymous admin bypass mode from creating system-like proposals that could evade dual-control. Scenarios 7, 10, 11, and 12 remain Partial pending live seeded-stack/browser proof, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 312 evidence note: Dispute challenge-bond launch contracts are now point-native while private storage remains preserved. `/api/v1/disputes`, `/api/v1/admin/disputes`, and `/api/v1/admin/disputes/{id}/resolve` map the inherited `BondCents` domain field to `bondPointsCents` plus `unit: "PTS"` and no longer emit `bondCents`; OpenAPI documents the point-native field, office dispute typing requires it, the admin route regression rejects the retired alias, and `cmd/windowed-resolution-live-proof` now guards created/resolved dispute responses against `bondCents`. Scenarios 7, 11, and 12 remain Partial pending broader backend/API legacy wallet/cents naming cleanup and the fully deployed-like canonical journey.

Loop 198 evidence note: Settlement audit metadata now uses point-native launch keys instead of retired payout aliases. HTTP admin finalize/void audit details record `totalSettlementPointsCents`, `pointDisbursementCount`, and `unit: "PTS"` instead of `totalPayoutCents` or `payoutCount`; the windowed finalization route test now verifies the `market.finalized` audit entry uses those keys. The prediction settlement audit callback now records `totalSettlementPointsCents`, `pointDisbursementCount`, and `unit: "PTS"` for admin and auto-settled markets, with tests rejecting `totalPayoutCents`, `payoutCount`, and `currency`. Scenarios 7, 10, 11, and 12 remain Partial pending live seeded-stack/browser proof, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 199 evidence note: Launch settlement documentation and exported client types no longer expose the transitional settlement total alias. `AdminSettlementRecord` in launch OpenAPI now documents `totalSettlementPointsCents` and `unit: "PTS"` without `totalPayoutCents` or `currency`; `TestLaunchOpenAPIDocumentsSettlementAndDisputeSlice` rejects those retired schema fields. The shared `SettlementRecord` TypeScript type no longer exports `totalPayoutCents`, while `PredictionApiClient` keeps old response parsing private in `LegacySettleMarketResponse`. The app source regression now rejects `totalPayoutCents?: number` from exported prediction types, and focused OpenAPI, app source, and TypeScript checks passed. Scenarios 7, 10, 11, and 12 remain Partial pending live seeded-stack/browser proof, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 200 evidence note: Admin settlement operation runtime JSON no longer embeds the raw settlement model with retired settlement total/cursor fields. `settlementRecordResponse` now maps only launch-facing settlement record fields explicitly, preserving `totalSettlementPointsCents`, `positionsSettled`, override audit fields, and `unit: "PTS"` while omitting `totalPayoutCents`, `payoutsTotal`, and `payoutsCompleted`. The windowed finalization route test now rejects those runtime fields from the finalize response, and the launch OpenAPI settlement schema also rejects `payoutsTotal` and `payoutsCompleted`. Scenarios 7, 10, 11, and 12 remain Partial pending live seeded-stack/browser proof, broader backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 201 evidence note: Office user recent activity now normalizes legacy timeline currency inputs to point units before rendering account-review activity. `normalizeRecentActivities` keeps old `currency` only as an input fallback and emits `unit: "PTS"` for point activity rows; the timeline item renders point tags (`pts`) instead of cash-symbol prefixes and no longer uses the dollar-circle icon. Active office Vitest coverage proves `USD`/`GBP` compatibility payloads normalize to `PTS`, and the office launch-safety source scan rejects the retired currency-symbol mapper and dollar icon. Scenarios 10, 11, and 12 remain Partial pending broader live admin variants, backend legacy wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 202 evidence note: The user app no longer ships dormant generic fiat formatting helpers or site-settings money contracts. Unused `app/lib/services/currency.ts` and `app/lib/format.ts` were deleted, removing USD/EUR/GBP symbol maps and `style: "currency"` helpers from launch source. `siteSettingsSlice` now keeps only non-money settings and no longer exports currency, deposit, withdrawal, stake-limit, or generic threshold actions/selectors through the store barrel. The app points-only regression guards those removals, and focused source plus TypeScript checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 203 evidence note: The user app compliance client and profile limits flow now use point-native launch contracts rather than exported deposit/stake aliases. `SetPointUseLimitsRequest` exposes `dailyLimitPoints`, `weeklyLimitPoints`, and `monthlyLimitPoints`; `SetPredictionLimitsRequest` exposes `maxOrderPoints`; `/profile` submits those fields to `setPointUseLimits` and `setPredictionLimits`; and normalized responses expose `PointUseLimits`/`PredictionLimits` with `unit: "PTS"` instead of public `DepositLimits`/`StakeLimits` plus currency. The API barrel no longer re-exports the retired compliance aliases, and unused deposit/stake selectors/helpers were removed. Focused compliance, app safety, and TypeScript checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 204 evidence note: The user app bonus wallet-breakdown client/store contract now exposes `unit` instead of a public `currency` field. `getWalletBreakdown` still privately accepts older gateway `currency` input as a compatibility fallback, but normalized `WalletBreakdown` objects and Redux bonus state now use `unit: res.unit || res.currency || "PTS"` and no longer export `currency: string`. The wallet-path regression now rejects public breakdown currency fields while continuing to guard point-native balance aliases and legacy breakdown fallback isolation. Focused wallet, compliance, app safety, and TypeScript checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 205 evidence note: The user app wallet balance and ledger client contract now exposes point units through `unit` instead of public `currency` fields. `Balance` and `Transaction` exports now carry `unit: string`; `getBalance` normalizes primary wallet responses with `unit: raw.unit || "PTS"` and old plural-wallet fallback responses with `unit: "PTS"`; and `getTransactions` normalizes ledger rows with `unit: item.unit || "PTS"`. The wallet-path regression now rejects public balance/transaction `currency: string` fields while continuing to require point-native wallet and reward aliases plus private legacy cents fallbacks. Focused wallet, compliance, app safety, and TypeScript checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 206 evidence note: The user app profile/preferences client no longer exports currency preferences. `UpdatePreferencesRequest` now contains only communication preference fields; exported `Preferences` responses omit `currency`; and `normalizePreferences` drops old raw `currency` values from `/api/v1/users/{userId}/profile/preferences` responses instead of reattaching them. The new `user-client-preferences` regression proves notification preferences do not submit currency and profile preferences remain local language/timezone settings. Focused preference, wallet, compliance, app safety, and TypeScript checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 207 evidence note: The user app no longer ships the dormant sportsbook odds-format preference path. `settingsSlice` no longer exports `DisplayOddsEnum`, `oddsFormat`, `setOddsFormat`, `selectOddsFormat`, `BettingPreferences`, or `selectBettingPreferences`; the store barrel no longer re-exports those names; and the unused `lib/utils/odds.ts` plus its mirrored test were deleted. The app safety regression now rejects those odds/betting preference contracts and requires the unused odds formatter to remain absent. Focused app safety, wallet, preference, and TypeScript checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 208 evidence note: The user app responsible-play history page no longer displays deposit/stake fallback labels. `account/rg-history` now filters normalized `point_use_limit`, `prediction_limit`, and `session_limit` rows without checking old deposit/stake type names, and its label mapper renders only point-use, prediction, session, cool-off, and self-exclusion labels. The compliance regression now rejects `deposit_limit`, `stake_limit`, and deposit/stake substring filters in that page while continuing to prove the compliance client normalizes inherited sources to launch labels. Focused compliance, app safety, and TypeScript checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 209 evidence note: The user app no longer ships the unused prediction Redux slice that carried a retired `stakeUsd` state contract. `predictionSlice.ts` was deleted, `store.ts` no longer registers `predictionReducer`, and the store barrel no longer exports prediction stake/selection helpers. Compliance-denial source fixtures were narrowed to active launch geo/pretrade denial sources by removing legacy payment-handler and withdrawal KYC expected-copy references. The app safety regression now rejects the retired prediction slice, `stakeUsd`, prediction stake exports, and payment/withdrawal denial fixture wording; focused compliance, app safety, wallet, preference, and TypeScript checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 210 evidence note: The user app no longer ships the dormant `deposit-limits` i18n namespace. `lib/i18n/config.ts` no longer registers `deposit-limits`, and the old `deposit-limits.json` locale files were deleted from `de`, `en`, `id`, `ms`, `tl`, `zh-Hans`, and `zh-Hant`. The compliance regression now guards namespace/file absence alongside the active point-use and prediction-limit route checks, and the full locale safety scan still passes after the deletion. Focused compliance, app safety, and TypeScript checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 211 evidence note: The user app point-ledger presentation helper no longer preserves explicit `deposit` or `withdrawal` movement type branches. `point-ledger.ts` labels current launch rows from credit, debit, reservation, release, prediction order/fill/proceeds, settlement, and reward metadata, while `point-ledger.test.ts` no longer includes deposit/withdrawal rows as accepted fixtures and now guards that those raw type branches stay absent. Focused point-ledger, wallet, app safety, and TypeScript checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 212 evidence note: The user app test suite no longer ships the stale `bet-placement.test.ts` mirror of retired stake, decimal-odds, and payout validation. It was replaced by `prediction-order-validation.test.ts`, which covers point amount validation, point-cent limit prices, available gameplay point checks, binary prediction-order economics, and stable prediction-order idempotency keys. The new test also guards that the retired fixture and its old contract tokens stay absent. Focused prediction-order, idempotency, trade-ticket preview, app safety, and TypeScript checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 213 evidence note: The optional full-stack smoke test no longer treats retired bet-placement APIs as the launch contract. `stack-smoke.test.ts` now validates authenticated `/api/v1/orders` pagination, unauthenticated `/api/v1/orders` denial, authenticated `/api/v1/orders/preview` with `notionalCapPointsCents`, and `/api/v1/wallet/{userId}` point-balance responses with `unit: "PTS"`, `balancePointsCents`, and `availablePointsCents`; it also rejects leaked `balanceCents`. The stack smoke test passed against the local stack, and TypeScript plus diff checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 214 evidence note: The gateway no longer ships the old `cmd/reconciliation-report` executable or its stale reconciliation fixture. That tool replayed `/api/v1/bets/place`, `/api/v1/admin/bets/{id}/lifecycle/*`, historical-bets CSV rows, `stakeCents`, and decimal odds; deleting it removes another executable backend contract for retired sportsbook bet settlement. A gateway command-boundary regression now proves the command source, command test, and fixture stay absent. Focused command-boundary tests, internal launch-boundary tests, all gateway command package tests, and diff checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 215 evidence note: Runtime order-fill portfolio and wallet frames now publish point-native fields: `filledPricePointsCents`, `balancePointsCents`, and `unit: "PTS"` instead of `filledPriceCents` or `balanceCents`. Admin wallet credit/debit mutation responses and audit details now return point ledger payloads, `balancePointsCents`, and `unit: "PTS"` instead of raw `balanceCents`. Focused live-frame/admin wallet tests, the full gateway `internal/http` package, and diff checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 216 evidence note: Gateway leaderboard definition JSON now publishes point-native `metricKey` values alongside matching `pointMetricKey` values, mapping inherited internal scorer keys such as `net_profit_cents` and `stake_cents` to `net_points` and `point_volume` at the HTTP boundary. Admin leaderboard create/update requests may send point-native metric aliases, which are translated back only inside the private service scorer for persistence and settled-result accrual compatibility. The public/admin leaderboard route regression now checks every returned board for `PTS`, `rewardSummary`, matching point-native metric aliases, and absence of retired leaderboard aliases; focused leaderboard tests and the full gateway `internal/http` package passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 217 evidence note: Admin wallet credit/debit request parsing now accepts preferred `amountPointsCents`, normalizes it into the private wallet service amount field, rejects conflicting `amountPointsCents`/`amountCents` dual-input requests with a point-native error field, and keeps `amountCents` only as a compatibility fallback. Admin wallet auth/idempotency/audit tests now post point-native adjustment payloads, public wallet mutation removal tests use point-native attack payloads, and the provider-ops audit fixture records `amountPointsCents` instead of `amountCents`. Focused wallet/auth/audit route tests and the full gateway `internal/http` package passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 218 evidence note: The shared privileged-operation audit wrapper is now named `recordProviderOpsAuditAction` instead of `recordMoneyAuditEntry`, and the admin audit merge comments now describe point-accounting/operator actions plus point-wallet/settlement audit rather than money-moving or money-audit logs. All gateway HTTP call sites for wallet adjustments, settlements, disputes, taxonomy, market lifecycle, KYC, RBAC, partner keys, and webhook admin actions now use the provider-ops wrapper name while preserving the same persisted audit behavior. Focused provider-ops/audit tests, the full gateway `internal/http` package, and targeted scans for the retired helper/money-audit wording passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 219 evidence note: Provider-ops audit entries no longer carry dormant sportsbook promo JSON fields (`freebetId`, `oddsBoostId`, or `freebetAppliedCents`), and the admin promotions usage report now returns an honest zero point-campaign placeholder with `unit: "PTS"`, `pointRewardCampaigns`, `usersWithPointRewards`, and `totalRewardPointsCents` instead of old betting promo keys such as `totalBets`, `totalStakeCents`, `betsWithFreebet`, or `betsWithOddsBoost`. Focused audit/report regressions and the full gateway `internal/http` package passed, and a targeted scan found retired promo tokens only in negative test assertions. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 220 evidence note: The admin wallet reconciliation report now adapts the real wallet ledger aggregate to point-native launch JSON. `/api/v1/admin/wallet/reconciliation` and `/admin/wallet/reconciliation` return `totalCreditPointsCents`, `totalDebitPointsCents`, `netMovementPointsCents`, `entryCount`, `distinctUserCount`, and `unit: "PTS"` instead of serializing the wallet service's retired `totalCreditsCents`, `totalDebitsCents`, or `netMovementCents` response names. The route-level regression seeds a real credit and debit, verifies 1200/350/850 point-cent totals, and asserts the retired aggregate keys stay absent; the full gateway `internal/http` package passed, and a targeted scan found retired reconciliation keys only in the negative test assertion list. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 221 evidence note: The launch OpenAPI now documents the real admin report slice for `/api/v1/admin/wallet/reconciliation` and `/api/v1/admin/promotions/usage`. New `AdminWalletReconciliationReport` and `AdminPointCampaignUsageReport` schemas describe read-only, no-point-movement admin metadata with point-native fields (`totalCreditPointsCents`, `totalDebitPointsCents`, `netMovementPointsCents`, `pointRewardCampaigns`, `usersWithPointRewards`, `totalRewardPointsCents`, and `unit: "PTS"`) and without retired reconciliation or promo metric aliases. `TestLaunchOpenAPIDocumentsAdminReportsSlice` guards the documented routes/schemas and rejects those retired aliases; the launch docs points-only scan, focused admin-report docs test, OpenAPI YAML parse, and full gateway `internal/http` package passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 222 evidence note: The launch OpenAPI bot-key security scheme no longer advertises an `admin` scope. The `BotApiKey` security scheme now says scopes are `read, trade`, matching the bot and partner key request schemas and the runtime rejection of privileged or unknown scopes. `TestLaunchOpenAPIDocumentsBotAPISlice` now requires the narrowed security-scheme wording and rejects `Scopes: read, trade, admin` or `enum: [read, trade, admin]` from that scheme; the launch docs points-only scan, focused bot OpenAPI doc test, OpenAPI YAML parse, full gateway `internal/http` package, and diff checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 223 evidence note: The launch OpenAPI `AdminPointLedgerEntry` schema no longer documents retired `amountCents` or `balanceCents` aliases. Admin account-review point-ledger docs now expose `amountPointsCents`, `balancePointsCents`, and `unit: "PTS"` only for ledger deltas and balances, and `TestLaunchOpenAPIDocumentsAdminAccountReviewSlice` rejects the retired aliases from that schema. Focused launch-doc tests, OpenAPI YAML parsing, full gateway `internal/http` tests, diff checks, and a targeted scan passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 224 evidence note: Launch-adjacent HTTP pretrade compliance tests no longer use cashier deposit-intent paths or deposit/withdraw external-value fixtures as accepted coverage. The geo allowlist and trading-KYC regressions now exercise `/api/v1/orders` with `SurfaceTrade`, proving missing/blocked country denial, allowlisted country pass, unverified-user KYC denial, and approved-user pass on the active prediction-order surface. Nearby compliance-gate comments now use guarded-surface wording instead of withdrawal or external-value framing. Focused pretrade/launch-doc tests, full gateway `internal/http` tests, diff checks, and targeted scans passed; the only remaining deposit/withdraw hits in touched scope are the existing internal compatibility enum constants. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, broader backend legacy naming cleanup, and broader abuse proof.

Loop 225 evidence note: Launch order request surfaces now use point-native market-buy caps end to end. `TradeTicketSubmitOptions`, market-detail preview/place-order handlers, `orderSignature`, and exported `PlaceOrderRequest` now use `notionalCapPointsCents` without a public `notionalCapCents` request field; the shared prediction client no longer has a request shim that maps `notionalCapCents` into the point-native field. Launch OpenAPI `PlaceOrderRequest` documents only `notionalCapPointsCents`, `TestLaunchOpenAPIDocumentsOrderSlice` rejects the retired request alias, and capless market-buy validation now reports `field: "notionalCapPointsCents"`. Focused gateway docs/bot validation tests, OpenAPI YAML parsing, app source tests, scoped typecheck, full gateway `internal/http`, diff checks, and targeted scans passed; the old request alias remains only in negative assertions and private response fallback parsing. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 226 evidence note: Launch order limit-price surfaces now use point-native `pricePointsCents`. `prediction.Order` JSON, launch OpenAPI `Order`, exported `PredictionOrder`, normalized player-app order objects, `TradeTicketSubmitOptions`, market-detail preview/place-order handlers, `orderSignature`, exported `PlaceOrderRequest`, bot/session order validation fixtures, and limit-price validation errors now use `pricePointsCents` instead of public `priceCents`; old request/response price aliases remain only as private compatibility parsing or fallback reads. Focused gateway docs/order/bot validation tests, full gateway `internal/http`, gateway `internal/prediction`, OpenAPI YAML parsing, app source tests, scoped typecheck, and targeted scans passed. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 227 evidence note: Launch order average-fill response surfaces now use point-native `averageFillPricePointsCents`. `prediction.Order` custom JSON, launch OpenAPI `Order`, exported `PredictionOrder`, and normalized player-app order objects expose `averageFillPricePointsCents`; the Go backing field is hidden from default JSON, and the old `averageFillPriceCents` name remains only in private shared-client fallback parsing, preview backing compatibility already governed by Loop 172, and negative assertions. Focused gateway order/docs tests, full gateway `internal/http`, gateway `internal/prediction`, OpenAPI YAML parsing, app source tests, scoped typecheck, and targeted scans passed. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 228 evidence note: Launch order read JSON no longer emits `walletReservationId`. The `prediction.Order` backing reservation ID is now `json:"-"`, the custom order JSON omits the field entirely, `TestOrderJSONExposesPointAliases` guards that omission, launch OpenAPI docs reject the field in the `Order` schema, and app source regressions keep the exported `PredictionOrder` type plus normalizer free of the wallet-named reservation alias. Focused JSON/docs/app checks, full gateway `internal/http`, gateway `internal/prediction`, OpenAPI YAML parsing, scoped typecheck, and targeted scans passed. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 229 evidence note: Portfolio position and settled-history price fields now use point-native aliases at the launch boundary. `prediction.Position` JSON emits `avgPricePointsCents`, portfolio history/admin settlement DTOs emit `entryPricePointsCents` and `exitPricePointsCents`, launch OpenAPI documents those aliases while rejecting the retired price aliases, exported shared-client `Position`, `SettledPayout`, and `SettlementPointDisbursement` types use the point-native fields, and `/portfolio` formats average/entry/exit prices as points instead of `¢`. Focused JSON/docs/app checks, full gateway `internal/http`, gateway `internal/prediction`, OpenAPI YAML parsing, scoped typecheck, and targeted scans passed. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 230 evidence note: Responsible-play prediction-check responses now expose only `amountPointsCents` plus `unit: "PTS"` for checked order size. The `/api/v1/compliance/rg/check-prediction` handler no longer emits public `stakePointsCents` or `stakeCents` response aliases, the launch OpenAPI `ResponsiblePlayCheckResponse` schema omits and rejects those retired aliases, and old query aliases remain parser-only compatibility. Focused compliance/OpenAPI tests, full gateway `internal/http`, full gateway `internal/compliance`, OpenAPI YAML parsing, and targeted scans passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 231 evidence note: The user-app bonus progress contribution contract now exports `playAmountPointsCents` instead of public `stakePointsCents`. `LegacyPlayContributionResponse` still accepts old `stakePointsCents`/`stakeCents` payloads only as private compatibility inputs before normalizing them into the point-play launch field, and the wallet-path regression now rejects `stakePointsCents` from the exported `PlayContribution` slice while proving the private fallback remains parser-only. Focused wallet-path tests, broad app QA regressions, scoped typecheck, targeted scans, and diff hygiene passed. Scenarios 9, 11, and 12 remain Partial pending live bonus proof, broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 232 evidence note: Admin campaign point-rule contribution caps now use `max_play_contribution_points_cents` at the launch boundary. `pointRuleConfig` maps the internal `max_stake_contribution_cents` storage key to the point-play alias in admin responses, `CreateCampaignRequest` accepts the preferred point-play request key before falling through to the old stake-named compatibility key, and launch OpenAPI/docs regressions require `max_play_contribution_points_cents` while rejecting `max_stake_contribution_points_cents` from documented schemas. Focused bonus model tests, HTTP bonus/docs tests, full gateway `internal/bonus`, full gateway `internal/http`, OpenAPI YAML parsing, and targeted scans passed. Scenarios 9, 11, and 12 remain Partial pending live bonus proof, broader backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 233 evidence note: Admin campaign rule types now expose `play` instead of public `wagering` at the launch boundary. Campaign create requests normalize `rule_type: "play"` into the existing internal evaluator/storage rule, campaign rule responses map internal `wagering` rows back to `ruleType: "play"`, and launch OpenAPI documents `enum: [eligibility, trigger, reward, play]` while rejecting the retired `wagering` enum. Focused bonus model tests, HTTP bonus/docs tests, full gateway `internal/bonus`, full gateway `internal/http`, OpenAPI YAML parsing, and launch-facing scans passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 234 evidence note: Bonus domain events now publish point-native event payload amounts for claim, admin grant, and expiry paths. `bonus.granted` uses `amount_points_cents` plus `unit: "PTS"` and `bonus.expired` uses `forfeited_points_cents` plus `unit: "PTS"`; retired event keys `amount_cents` and `forfeited_amount` are absent outside negative regression assertions. Focused bonus event-payload tests, full gateway `internal/bonus`, targeted HTTP bonus/docs tests, and launch-adjacent event-key scans passed. Scenarios 9, 11, and 12 remain Partial pending live bonus proof, broader backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 235 evidence note: Player bonus and admin campaign responses now map retired inherited campaign type strings such as `freebet_grant`, `freebet`, `cash`, and `deposit_match` to point-native launch values (`point_grant` or `point_match`). Launch OpenAPI now documents only `signup_bonus`, `custom`, `point_grant`, and `point_match` for player bonus/admin campaign type fields and rejects the inherited promo type strings in docs regressions. Focused HTTP response/docs tests, full gateway `internal/http`, full gateway `internal/bonus`, OpenAPI YAML parsing, and launch-facing campaign-type scans passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 236 evidence note: Bonus campaign creation now normalizes retired promo campaign types to point-native values before persistence, and claim/admin-grant paths normalize old persisted campaign rows before creating player bonus records. The dormant `FreebetGranter`/`SetFreebetGranter` hook and freebet issuance branch were removed from the TapTrade bonus service, so claiming an old `freebet_grant` campaign can no longer create a freebet side effect. Focused bonus normalization tests, full gateway `internal/bonus`, targeted/full gateway `internal/http`, OpenAPI YAML parsing, and scans proving the freebet issuance hook is absent passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 237 evidence note: Admin bonus/campaign request handling now rejects conflicting retired and point-native amount aliases before persistence or campaign lookup. `budget_points_cents` conflicts with `budget_cents` on campaign creation, `override_points_cents` conflicts with `override_amount_cents` on admin grants, matching alias values remain accepted, and validation errors use the point-native field names. Focused bonus model/service tests, full gateway `internal/bonus`, targeted/full gateway `internal/http`, OpenAPI YAML parsing, and launch-doc scans passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 238 evidence note: Admin campaign rule-config writes now reject conflicting retired and point-native nested amount aliases before normalization or persistence. Reward config conflicts such as `fixed_amount_points_cents` versus `fixed_amount_cents`, `max_bonus_points_cents` versus `max_bonus_cents`, and `min_points_cents` versus `min_amount_cents` fail with point-native field names; play contribution conflicts involving `max_play_contribution_points_cents`, old point-stake aliases, or internal `max_stake_contribution_cents` also fail before storage. Matching aliases remain accepted. Focused bonus model/service tests, full gateway `internal/bonus`, targeted/full gateway `internal/http`, OpenAPI YAML parsing, and launch-doc scans passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 239 evidence note: Admin bonus/campaign HTTP error responses now expose point-native conflict fields in the standard error envelope. Campaign budget conflicts return `details.field: "budget_points_cents"`, nested rule-config conflicts return fields such as `fixed_amount_points_cents`, and admin bonus override conflicts return `details.field: "override_points_cents"`, while preserving the existing bad-request status and message. Focused HTTP boundary tests, full gateway `internal/http`, full gateway `internal/bonus`, OpenAPI YAML parsing, and handler scans passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 240 evidence note: Admin leaderboard create/update now rejects launch-prohibited reward-summary copy before persistence. `rewardSummary`/legacy `prizeSummary` inputs containing cash, prize, payout, crypto, fiat, deposit, withdrawal, USD/dollar, or redemption wording return `400` with `details.field: "rewardSummary"`, while safe point-status wording remains accepted and old persisted inherited summaries still map to point-safe read responses. Focused leaderboard HTTP tests and the full gateway `internal/http` package passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 241 evidence note: Admin leaderboard create/update now rejects launch-prohibited `slug`, `name`, `description`, and `rewardSummary`/legacy `prizeSummary` copy before persistence. Cash, prize, payout, crypto, fiat, deposit, withdrawal, USD/dollar, or redemption wording returns `400` with `details.field` set to the offending launch-visible field, preventing unsafe leaderboard URLs and display copy from being stored or echoed by leaderboard APIs. Focused leaderboard HTTP tests and the full gateway `internal/http` package passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 242 evidence note: The admin leaderboard copy guard now rejects `redeemable` offer wording in launch-visible `slug`, `name`, `description`, and `rewardSummary`/legacy `prizeSummary` fields while still allowing explicit `non-redeemable` disclosure language. Redeemable offer copy returns `400` with `details.field` set to the offending field before persistence, and safe non-redeemable point-status copy remains accepted. Focused leaderboard HTTP tests and the full gateway `internal/http` package passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 243 evidence note: Bonus campaign creation now rejects launch-prohibited campaign `name` and `description` copy before persistence. Cash, deposit, crypto, fiat, freebet, prize, payout, sportsbook, stake, wager, redemption, or redeemable-offer wording returns `400` with `details.field` set to the offending field at the admin HTTP boundary, while explicit `non-redeemable` point-play disclosure copy remains accepted. Focused bonus model and admin HTTP tests, plus the full gateway `internal/bonus` and `internal/http` packages, passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 244 evidence note: Admin campaign rule responses now map inherited reward-config `type` values to point-native aliases inside `pointRuleConfig`. Values such as `freebet`, `cash`, and `odds_boost` return as `point_grant`, while `deposit_match` returns as `point_match`, preventing retired promo mechanics from being echoed in launch admin campaign JSON. Focused bonus model and HTTP response tests, plus the full gateway `internal/bonus` and `internal/http` packages, passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 245 evidence note: Bonus campaign activation domain-event payloads now map inherited promo campaign types such as `freebet_grant`, `freebet`, `cash`, `odds_boost`, and `deposit_match` to point-native `point_grant` or `point_match` values for both `type` and `campaign_type`, and include `unit: "PTS"`. The focused `TestCampaignActivatedEventPayloadMapsRetiredPromoType` regression plus the full gateway `internal/bonus` package passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 246 evidence note: Admin bonus campaign creation now rejects unsafe trigger rule `event` values such as `deposit` or `bet` before persistence with `details.field: "rules[0].point_rule_config.event"`, while old stored rule configs map launch-prohibited trigger event values to point-native admin `pointRuleConfig.event` aliases such as `manual_review`, `prediction_order`, or `point_grant`. Focused bonus model and HTTP boundary/response tests plus the full gateway `internal/bonus` and `internal/http` packages passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 247 evidence note: Admin bonus campaign creation now rejects retired eligibility rule keys such as `min_deposits` before persistence with `details.field: "rules[0].point_rule_config.min_point_activity_count"`, while old stored rule configs map `min_deposits` to `min_point_activity_count` and `tier_min` to `rank_min` in admin `pointRuleConfig` responses. Focused bonus model and HTTP boundary/response tests plus the full gateway `internal/bonus` and `internal/http` packages passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 248 evidence note: Admin bonus campaign creation now rejects retired eligibility rank keys such as `tier_min` before persistence with `details.field: "rules[0].point_rule_config.rank_min"`, while preferred `min_point_activity_count` and `rank_min` request keys normalize into private rule-evaluator storage before persistence. Focused bonus model and HTTP boundary tests plus the full gateway `internal/bonus` and `internal/http` packages passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 249 evidence note: Direct bonus claims now fail closed when campaign eligibility requires verified point activity or rank review, preventing `min_point_activity_count`/`rank_min` configs from being silently ignored by the claim path. Focused bonus service tests plus the full gateway `internal/bonus` package passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 250 evidence note: Player bonus claim errors for activity/rank eligibility review now return a point-safe `403` message without leaking backend admin method names such as `GrantBonus` or internal wiring instructions. Focused bonus service and HTTP boundary tests plus the full gateway internal/bonus and internal/http packages passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 251 evidence note: Manual bonus-forfeit domain events now reuse a point-native payload with `forfeited_points_cents`, `unit: "PTS"`, reason, and actor metadata, matching the bonus-expiry event contract and rejecting retired generic amount keys in regression coverage. Nearby bonus service comments were also cleaned of money/fund wording. Focused bonus event tests plus the full gateway internal/bonus and internal/http packages passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 252 evidence note: Manual bonus forfeiture now fails closed if the point-wallet forfeiture call fails, returning a point-native service error before player-bonus status is marked forfeited or a `bonus.forfeited` event is published. Focused bonus service tests now guard the wallet-error/status/event ordering, and the full gateway internal/bonus and internal/http packages passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 253 evidence note: Manual and expiry bonus-forfeit domain events now publish `forfeited_points_cents` from the actual point-wallet ledger entry returned by `ForfeitBonus`, rather than the requested player-bonus remaining amount. This keeps capped or zero wallet removals from being overstated in `bonus.forfeited` or `bonus.expired` payloads. Focused bonus source/order tests and the full gateway internal/bonus and internal/http packages passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 254 evidence note: Bonus campaign validation now returns point-native reward point and point-play messages for reward amount bounds and play multiplier bounds, avoiding inherited `wagering` or generic `cents` wording at the admin API boundary. Focused bonus service and HTTP boundary tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 255 evidence note: Admin bonus-forfeit responses now include `unit: "PTS"` alongside `status: "forfeited"`, and the launch OpenAPI documents the response through `AdminBonusForfeitResponse`. Focused handler and OpenAPI documentation tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 256 evidence note: Admin point-play campaign lifecycle action responses now include `unit: "PTS"` for activate, pause, and close status responses, and the launch OpenAPI documents the unit on `AdminCampaignActionResponse`. Focused handler-helper and OpenAPI documentation tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 257 evidence note: Bonus campaign close domain events now use a point-native lifecycle payload with mapped `type`/`campaign_type`, `status: "closed"`, and `unit: "PTS"` instead of a bare `campaign_id` event. Focused campaign event payload tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 258 evidence note: Bonus campaign pause now publishes a point-native lifecycle domain event. The `campaign.paused` payload includes mapped `type`/`campaign_type`, `status: "paused"`, and `unit: "PTS"` instead of silently changing status without a point-play event context. Focused campaign event payload tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 259 evidence note: Bonus campaign activation events now include explicit lifecycle status. The `campaign.activated` payload includes mapped `type`/`campaign_type`, `status: "active"`, and `unit: "PTS"`, aligning activation with pause and close event contracts. Focused campaign event payload tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 260 evidence note: Scheduled expired-campaign closure now emits point-native close events. The repository returns the campaigns it closed through `UPDATE ... RETURNING`, and the service publishes one `campaign.closed` event per expired campaign using mapped `type`/`campaign_type`, `status: "closed"`, and `unit: "PTS"`. Focused event publisher tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 261 evidence note: Campaign lifecycle domain-event publication now goes through a shared nil-safe point-native publisher. Manual activate, pause, and close actions plus scheduled expiry close all use the same publisher path while preserving mapped lifecycle payloads and allowing status transitions to succeed when an event bus is absent. Focused lifecycle publisher tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 262 evidence note: Bonus grant, manual-forfeit, and expiry domain-event publication now goes through a shared nil-safe point-native publisher. Existing `bonus.granted`, `bonus.forfeited`, and `bonus.expired` payload contracts remain mapped to `PTS` fields, while post-wallet mutation flows no longer depend on event-bus wiring being present. Focused bonus event publisher tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 263 evidence note: Admin campaign rule responses now sanitize the old stored `max_stake_contribution_points_cents` compatibility key. `pointRuleConfig` maps that key to the launch-facing `max_play_contribution_points_cents` field and omits the retired stake-named alias from admin JSON. Focused HTTP response/docs tests and broad gateway bonus/http tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 264 evidence note: Admin campaign rule response alias mapping now preserves already-present preferred point-native fields. If old stored configs contain both `max_play_contribution_points_cents` and a retired stake-named contribution alias, `pointRuleConfig` keeps the preferred point-play value and still omits the retired alias. Focused HTTP response/docs tests and broad gateway bonus/http tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 265 evidence note: Admin campaign rule-config writes now normalize retired reward `type` values before persistence. Old promo values such as `freebet_grant`, `freebet`, `cash`, and `odds_boost` become `point_grant`, while `deposit_match` becomes `point_match`, so newly authored reward rules no longer rely only on read-time response sanitization. Focused bonus model tests and broad gateway bonus/http tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 266 evidence note: Admin campaign rule responses now filter inherited point-play mechanics that do not belong in the launch admin JSON contract. Old stored keys `min_odds_decimal`, `parlay_multiplier`, and `excluded_sports` are omitted from `pointRuleConfig` along with retired amount/activity aliases. Focused HTTP response/docs tests and broad gateway bonus/http tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 267 evidence note: Admin campaign creation now rejects newly authored inherited point-play mechanics before persistence. Rule configs containing `min_odds_decimal`, `parlay_multiplier`, or `excluded_sports` return `400` with a structured `details.field` under `rules[0].point_rule_config.*`, while old stored values remain filtered from responses by Loop 266. Focused bonus model and admin HTTP boundary tests plus broad gateway bonus/http tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 268 evidence note: Campaign rule input now treats `point_rule_config` as authoritative when a mixed request also includes legacy `rule_config`. Normalization and launch validation read the preferred payload first, so legacy rule bodies cannot override point-native amounts, reward types, or safe point-play validation when both shapes are present. Focused bonus model tests, focused admin HTTP regressions, and broad gateway bonus/http tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 269 evidence note: Direct player bonus claims now reject explicit trigger rules, including `manual`, `prediction_order`, and `point_grant`, unless the required point activity or admin review happens outside the direct claim path. The claim endpoint returns a point-safe `403` message for trigger-gated campaigns without backend implementation wording. Focused bonus service tests, focused HTTP claim-boundary tests, and broad gateway bonus/http tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 270 evidence note: Bonus claim and admin-grant wallet-credit failures now compensate repository state after a player bonus row has been created. The service releases the reserved campaign claim/budget amount and marks the created bonus as forfeited before returning the wallet-credit error, preventing active bonus state or campaign counters from claiming points were granted without a point-wallet ledger credit. Focused bonus compensation tests and broad gateway bonus/http tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 271 evidence note: Admin wallet credit/debit request decoding now rejects retired `amountCents` or `amount_cents` JSON bodies instead of treating them as a compatibility fallback for `amountPointsCents`. Valid point-native `amountPointsCents` admin mutations still succeed, while retired alias requests return `400` with point-native `details.field: "amountPointsCents"`, keeping admin point adjustments on the launch request contract. Focused admin wallet mutation tests and the full gateway `internal/http` package passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 272 evidence note: Admin leaderboard create/update request decoding now rejects retired launch-incompatible fields and values before persistence. Newly authored leaderboard boards must use `unit: "PTS"`, `rewardSummary`, and point-native `metricKey` aliases; `currency`, `prizeSummary`, `net_profit_cents`, `stake_cents`, and non-PTS units return `400` with point-native field details. Read-side response mapping still sanitizes old stored definitions. Focused admin leaderboard boundary tests and the full gateway `internal/http` package passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 273 evidence note: Admin campaign create and admin bonus grant HTTP request decoding now rejects retired launch-incompatible fields before service normalization or persistence. Newly authored campaign writes must use `budget_points_cents`, `rules[].point_rule_config`, point-native rule amount keys, point-native campaign/reward type values, and `override_points_cents`; retired `budget_cents`, raw `rule_config`, retired rule amount keys, retired promo type values such as `freebet_grant` or `deposit_match`, stake-named contribution aliases, and `override_amount_cents` return `400` with point-native field details. Internal model normalization still maps preferred launch aliases into existing private evaluator/storage fields. Focused admin bonus/campaign boundary tests and broad gateway `internal/bonus` plus `internal/http` package tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader abuse proof.

Loop 274 evidence note: Session order placement, order preview, and bot order placement now decode launch request bodies through a boundary helper that rejects retired `priceCents` and `notionalCapCents` before `PlaceOrderRequest` service normalization. Retired alias bodies return `400` with point-native `details.field` values (`pricePointsCents` or `notionalCapPointsCents`), while valid point-native order requests continue through the existing validator and service path. Focused order/bot/docs HTTP tests and the full gateway `internal/http` package tests passed. Scenarios 4, 11, and 12 remain Partial pending broader live trading variants, remaining backend wallet/cents/payment contracts, live no-money-path proof, and broader abuse proof.

Loop 275 evidence note: Launch responsible-play request decoding now rejects retired request aliases before service normalization. `/api/v1/compliance/rg/point-use-limit`, `/api/v1/compliance/rg/prediction-limit`, `/api/v1/compliance/rg/check-point-use`, and `/api/v1/compliance/rg/check-prediction` require `amountPointsCents`; retired `amountCents`, `stakePointsCents`, and `stakeCents` return `400` with point-native field details on those launch routes. Explicit legacy compatibility routes such as `/deposit-limit`, `/bet-limit`, `/check-deposit`, and `/check-bet` still parse their old aliases while registered. Focused compliance tests, the full gateway `internal/compliance` package, and responsible-play launch-doc HTTP checks passed. Scenarios 11 and 12 remain Partial pending broader backend wallet/cents/payment contracts, live no-money-path proof, backend terminology cleanup, and broader abuse proof.

Loop 276 evidence note: Admin loyalty rule create/update now rejects retired request aliases before service normalization. `/api/v1/admin/loyalty/rules` and `/api/v1/admin/loyalty/rules/{ruleId}` require launch-facing `predictionSourceType`, `minQualifiedPointsCents`, and `eligiblePredictionTypes`; retired `sourceType`, `minQualifiedStakeCents`, `eligibleSportIds`, and `eligibleBetTypes` return `400` with point-native field details. Admin loyalty config/rule responses now use an explicit launch-safe rule payload with `predictionSourceType`, `minQualifiedPointsCents`, `eligiblePredictionTypes`, and `unit: "PTS"` instead of embedding the legacy canonical rule shape. The launch OpenAPI now documents the admin loyalty rule create/update routes and point-native schemas without the retired rule aliases. Focused loyalty HTTP tests, launch-doc checks, the full gateway `internal/http` package, and `internal/loyalty` tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 277 evidence note: Loyalty ledger read payloads now use an explicit launch-safe shape instead of embedding the canonical ledger entry. Player `/api/v1/loyalty/ledger`, admin `/api/v1/admin/loyalty/accounts/{playerId}` ledger rows, and admin adjustment responses expose `predictionSourceType`, `predictionSourceId`, point deltas, sanitized metadata, and `unit: "PTS"` without retired `sourceType` or `sourceId` aliases; seeded settlement rows also avoid old `bet_settlement` and `bet:` source values in JSON. The launch OpenAPI `LoyaltyLedgerEntry` and `AdminLoyaltyLedgerEntry` schemas now document the point-native source fields and `PTS` unit only. Focused loyalty ledger HTTP tests, launch-doc checks, the full gateway `internal/http` package, and `internal/loyalty` tests passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 278 evidence note: The legacy public `/api/v1/loyalty` route now serializes the launch `LoyaltyStanding` shape instead of embedding the canonical loyalty account. It returns `userId`, `pointsBalance`, `xp`, `xpPoints`, `rank`, `rankName`, `nextRank`, `nextRankName`, `xpToNextRank`, optional `lastActivity`, and `unit: "PTS"` without canonical `accountId`, `playerId`, `currentTier`, `currentTierAssignedAt`, `nextTier`, `pointsToNextTier`, or `lastAccrualAt` aliases. Focused loyalty standing and launch-doc tests plus the full gateway `internal/http` and `internal/loyalty` packages passed. Scenarios 9, 11, and 12 remain Partial pending live bonus proof, broader backend wallet/cents/payment contracts, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 279 evidence note: The legacy public `/api/v1/loyalty/tiers` route now serializes the launch `LoyaltyTier` shape instead of embedding canonical loyalty tier rows. It returns `rank`, `rankName`, `minXpPoints`, `benefits`, and `unit: "PTS"` without canonical `tierCode`, `displayName`, `minLifetimePoints`, `minRolling30dPoints`, `active`, or retired `tier`/`name`/`pointsThreshold` aliases. Focused loyalty tier and launch-doc tests plus the full gateway `internal/http` and `internal/loyalty` packages passed. Scenarios 9, 11, and 12 remain Partial pending live bonus proof, broader backend wallet/cents/payment contracts, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 280 evidence note: Admin leaderboard entry recording now uses a launch-safe activity source contract. `POST /api/v1/admin/leaderboards/{id}/entries` rejects retired `sourceType` and `sourceId` request fields, accepts `activitySourceType` and `activitySourceId`, and returns a PTS event payload with those activity source aliases instead of embedding the canonical leaderboard event. Launch OpenAPI now documents the admin leaderboard entry request/response schemas and guards them against retired source aliases. Focused admin leaderboard HTTP and launch-doc tests plus the full gateway `internal/http` and `internal/leaderboards` packages passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, broader backend wallet/cents/payment contracts, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 281 evidence note: Legacy leaderboard standings now serialize through explicit launch-safe PTS payloads for public entries, public detail top entries, admin detail entries, recompute entries, and viewer-entry responses. Standing metadata maps old stored keys such as `betId`, `stakeCents`, `payoutCents`, `sourceType`, and `sourceId` to `predictionId`, `pointVolumeCents`, `settlementPointsCents`, `activitySourceType`, and `activitySourceId`, while launch admin event writes reject those retired metadata keys before service normalization. Focused leaderboard standing/admin-event tests plus the full gateway `internal/http` and `internal/leaderboards` packages passed. Scenarios 9, 10, 11, and 12 remain Partial pending live bonus proof, broader admin/backend terminology cleanup, broader backend wallet/cents/payment contracts, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 287 evidence note: Office account-review and risk-report copy now avoids inherited money-style result wording. `PunterSearch` renders `Point balance`, `Point result`, and `pts` values instead of dollar-formatted balance/P&L columns; the English risk summary translation now renders `Platform point result` instead of `Platform profit`; and the app QA regression reads those office files directly to guard the launch-adjacent admin copy. The shared prediction client settlement-history/disbursement normalizers now keep old fallback price reads private while always returning numeric point-native entry/exit fields, allowing the office production build to typecheck without reattaching retired public aliases. Scenarios 10, 11, and 12 remain Partial pending broader admin/backend terminology cleanup, remaining compatibility surfaces, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 288 evidence note: Office risk-summary promotion/report values now avoid inherited betting and odds-boost wording on the launch-adjacent admin surface. The English risk summary translation renders Total predictions, Prediction count, Predictions with point boosts, Predictions with both bonus types, Point boost rule ID, Unique point boost rules, and Point boost usage breakdown instead of the old bet/odds-boost labels, while preserving the underlying compatibility keys for later storage cleanup. The direct QA regression now guards those rendered office values. Scenarios 10 and 12 remain Partial pending broader office/admin terminology cleanup, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 289 evidence note: Office leaderboard creation now avoids a profit-named example slug in the launch-adjacent admin form. The leaderboard slug placeholder changed from `weekly-profit-race` to `weekly-points-race`, and the office app-router regression now requires the point-safe placeholder while rejecting the old profit example. Scenarios 9, 10, and 12 remain Partial pending broader live bonus proof, office/admin terminology cleanup, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 290 evidence note: Office audit-log rendered values now avoid inherited betting, odds-boost, and sportsbook wording on the active admin audit surface. The English audit-log translation renders `Point boost rule ID`, `Point boost`, `Prediction placed`, `Prediction precheck failed`, and `Legacy sports feed` instead of the old odds boost, bet, and sportsbook labels; the office app-router regression now guards those exact rendered values and rejects the old labels. Scenarios 10 and 12 remain Partial pending broader office/admin terminology cleanup, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 291 evidence note: Office provider-ops intervention copy now avoids inherited bet wording on the launch-adjacent provider operations surface. The English source translation and generated static locale render `Prediction ID`, `Prediction settlement intervention`, `Open prediction intervention audit logs`, and `Prediction status` instead of the old bet labels, while preserving compatibility keys as private identifiers. A focused office app-router regression now guards those rendered values and rejects the old labels. Scenarios 10 and 12 remain Partial pending broader office/admin terminology cleanup, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 292 evidence note: Remaining English office translation rendered values now avoid standalone bet/cashed-out wording across retired sportsbook-era modules and shared error/transaction copy. Source translations and generated static locale values now render prediction wording for page-bets, page-fixed-exotics, page-fixtures-details, page-markets-details, error, and page-transactions values, while preserving compatibility keys as private identifiers. The office app-router regression now scans all English office translation values for standalone `bet`/`betting` and `cashed out` wording, and a focused scan found no remaining matches. Scenarios 10 and 12 remain Partial pending broader office/admin terminology cleanup, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 293 evidence note: English office translation rendered values now avoid sportsbook odds wording across retired sportsbook-era modules and shared error copy. Source translations and generated static locale values now render price wording for page-bets, page-fixed-exotics, page-markets, page-markets-details, and error values instead of `odds`/`odd` labels, while preserving compatibility keys as private identifiers. The office app-router regression now scans all English office translation values for odds wording, and a focused scan found no remaining matches. Scenarios 10 and 12 remain Partial pending broader office/admin terminology cleanup, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 294 evidence note: English office translation rendered values now avoid the inherited `bettable` market-state wording across market list/detail and shared error copy. Source translations and generated static locale values render `Open for predictions`, `Closed for predictions`, and `Market is closed for predictions` while preserving old key names as private compatibility identifiers. The office app-router regression now scans English office translation values for `bettable` in addition to standalone bet/betting/cashed-out wording, and a value-only scan across English source/static locale values found no rendered bettable wording. Scenarios 10 and 12 remain Partial pending broader office/admin terminology cleanup, live no-money-path proof, and broader account-graph/multi-node abuse proof.

Loop 295 evidence note: `/api/v1/status` now exposes a public launch-boundary payload with `pointMode: "non_redeemable_points"`, `legacyMoneyRoutes: "disabled"` by default, and active `launchRouteDomains` that use point-safe labels and exclude alpha-cashier/payment/crypto-payment domains. Gateway route-boundary tests prove the default status payload, legacy money routes remain absent by default, route summaries exclude the legacy money domains by default, deployed envs refuse legacy money opt-in, and the OpenAPI `GatewayStatus` schema documents the point-mode and legacy-route status fields while the launch-doc safety scan remains green. Scenarios 11 and 12 remain Partial pending a full live no-money-path proof across running player/admin/gateway surfaces, broader backend terminology cleanup, and broader account-graph/multi-node abuse proof.

Loop 296 evidence note: gateway route-boundary tests now cover the broader inherited Alpha Cashier player and admin surface without rewriting those production modules. `TestLegacyMoneyRoutesAreAbsentByDefault` proves wallet challenge/connect/list, deposit-intent submit, withdrawal request/cancel, admin deposits/reconciliation/withdrawals/audit-events, admin withdrawal approval, payment, crypto-payment, webhook, and provider-callback routes remain absent when `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED` is unset. `TestLegacyMoneyPathsAreNotPublicOrCSRFSkippedByDefault` and `TestLegacyMoneyOptInOnlyExemptsProviderCallbacks` prove those interactive inherited money routes are not public and do not skip CSRF in launch mode, and even under explicit local compatibility opt-in only provider callbacks/webhooks get public/CSRF exemptions. Focused gateway tests and `git diff --check` passed. Scenarios 11 and 12 remain Partial pending a full live no-money-path proof across running player/admin/gateway surfaces, broader backend terminology cleanup, and broader account-graph/multi-node abuse proof.

Loop 297 evidence note: office user-limit admin surfaces now render point units instead of dollar units while preserving inherited private field keys. `components/users/limits/update.tsx` uses `pts` suffixes for the point-add and point-use/loss limit sections instead of `unit="$"`, and the component test now expects `1.00 pts`, `2.00 pts`, and `3.00 pts` for daily/weekly/monthly values. The office app-router safety regression also reads the limits update source and rejects `unit="$"`. Focused office Vitest, the focused Jest component test, office production build, source scans, and `git diff --check` passed. Scenarios 10 and 12 remain Partial pending broader office/admin terminology cleanup, full live no-money-path proof, broader backend legacy naming cleanup, and broader account-graph/multi-node abuse proof.

Loop 298 evidence note: player discovery helpers no longer carry crypto-era fallback category mappings. `CategoryPills` now includes an esports icon fallback instead of a crypto fallback, `TrendingSidebar` maps launch esports ticker prefixes to Esports and no longer maps `btc`/`eth`/`crypto`, `marketImage` no longer has a crypto hue fallback, and `FeaturedCarousel` comments describe All/Esports/Sports/Politics rather than Crypto. The existing launch discovery regression now asserts those helper-level crypto fallbacks stay absent while preserving the explicit `AllMarketsSection` crypto slug filter as a safety gate. The focused app QA regression, app scoped typecheck, targeted helper scan, and `git diff --check` passed. Scenarios 2 and 12 remain Partial/Pass as previously recorded: Scenario 2 remains Pass, while Scenario 12 remains Partial pending full live no-money-path proof, broader backend legacy naming cleanup, and broader account-graph/multi-node abuse proof.

Loop 299 evidence note: added `docs/preservation-audit.md` to make the preservation boundary explicit after reviewing current deleted artifacts. The audit classifies launch-prohibited player cashier/routes/clients/locales separately from higher-risk operational proof-tool deletions, and records that the old reconciliation report command must not be restored unchanged because it replays retired bet routes and `amountCents` contracts. Scenario 12 remains Partial because the required correction is a point-native reconciliation proof plus live no-money-path evidence, not a silent deletion or a blind restore of money-path artifacts.

Loop 300 evidence note: added a first point-native gateway reconciliation proof command at `cmd/prediction-reconciliation-report` with fixture coverage under `internal/http/testdata/prediction_reconciliation/lifecycle_cases.json`. The command validates PTS ledger entries, computes credit/debit/net/final-balance summaries, renders a point-native report, and rejects retired fixture fields/text such as `stakeCents`, `amountCents`, `betId`, deposit/withdraw/cashier/crypto wording, and similar money-path vocabulary. Focused command tests, the old retired-command absence test, `go run ./cmd/prediction-reconciliation-report`, and `git diff --check` passed. Scenario 12 remains Partial because this is fixture-level operational proof; full completion still requires live running-route no-money-path proof and persisted settlement/ledger reconciliation evidence.

Loop 301 evidence note: strengthened the point-native reconciliation command tests so the fixture proof is pinned to the current gateway launch contracts. `TestReconciliationFixtureFollowsLaunchGatewayContracts` now checks OpenAPI for `PlaceOrderRequest`, `pricePointsCents`, `notionalCapPointsCents`, `amountPointsCents`, `pointDisbursements`, `settlementPointsCents`, and `totalSettlementPointsCents`; checks prediction and wallet handlers for the corresponding JSON fields/source values; and checks the reconciliation fixture for `amountPointsCents`, `prediction_order`, `prediction_settlement`, and `unit: "PTS"`. Focused command tests, the retired-command absence test, command execution, and `git diff --check` passed. Scenario 12 remains Partial pending live running-route proof and persisted settlement/ledger reconciliation evidence.

Loop 302 evidence note: added a player app route-manifest regression that walks all `page.ts(x)` and `route.ts(x)` files and rejects launch-prohibited money path segments such as cashier, cashout, crypto, deposit/deposits, fiat, payment/payments, prize/prizes, redeem/redemption, and withdraw/withdrawal/withdrawals. The focused player QA suite and scoped typecheck passed, production `yarn build` passed, and direct inspection of `.next/server/app-paths-manifest.json`, `.next/server/pages-manifest.json`, and `.next/routes-manifest.json` found 0 prohibited entries across 40 app-path entries, 2 pages entries, and 14 route-manifest entries. Scenario 12 remains Partial because player route-manifest proof is stronger, but full live running-route proof and persisted settlement/ledger reconciliation evidence are still required.

Loop 303 evidence note: mirrored the route-manifest no-money-path proof on the office/admin app. `tests/app-router-legacy-routes.test.ts` now walks all office `page.ts(x)` and `route.ts(x)` files and rejects cashier, cashout, crypto, deposit/deposits, fiat, payment/payments, prize/prizes, redeem/redemption, and withdraw/withdrawal/withdrawals route segments. The focused office route regression passed, production `yarn build` passed with the existing dynamic translation import warning, and direct inspection of office `.next/server/app-paths-manifest.json`, `.next/server/pages-manifest.json`, and `.next/routes-manifest.json` found 0 prohibited entries across 34 app-path entries, 2 pages entries, and 14 route-manifest entries. Scenario 12 remains Partial because shipped player/admin route proof is stronger, but full live running-route proof across gateway plus persisted settlement/ledger reconciliation evidence remain required.

Loop 304 evidence note: added a runnable gateway launch-boundary proof command at `cmd/launch-boundary-report`. The command forces launch mode, instantiates the real gateway router through `RegisterRoutes`, checks `/api/v1/status` for `pointMode: "non_redeemable_points"`, `legacyMoneyRoutes: "disabled"`, and point-safe route domains, then probes 21 prohibited Alpha Cashier/payment/crypto-payment player/admin paths and requires `404` for every probe. Focused command tests, existing gateway launch-boundary tests, command execution, and `git diff --check` passed. Scenario 12 remains Partial because gateway registered-route proof is now runnable, but completion still needs a full deployed-like live no-money journey and persisted settlement/ledger reconciliation evidence.

Loop 305 evidence note: added DB-backed settlement-to-ledger persistence proof at `internal/http/prediction_settlement_wallet_persistence_test.go`. The test uses the production `NewPredictionWalletAdapter(wallet.Service)` bridge with `prediction.NewSettlementEngine` and `prediction.SQLRepository`, settles a closed manual market, then verifies the persisted `prediction_settlements` cursor, three `prediction_payouts` rows, two winner `wallet_ledger` credit rows, winner `wallet_balances`, and no losing-position settlement credit. A disposable Postgres `postgres:16-alpine` container was migrated through gateway migration version 48, then `GATEWAY_DB_DSN=postgres://postgres:postgres@127.0.0.1:56543/postgres?sslmode=disable go test ./internal/http -run TestSettlementPersistsPointLedgerCreditsThroughProductionWalletAdapter -count=1 -v` passed. Scenario 12 remains Partial because this proves persisted settlement/ledger behavior in an isolated migrated DB, while completion still needs a deployed-like live no-money journey across player, office, and gateway.

Loop 306 evidence note: added a live no-money boundary probe at `scripts/qa/live-no-money-boundary.mjs` with mock pass/fail tests. The probe checks configured player, office, and gateway base URLs, follows same-origin redirects, requires retired web money paths to resolve to `404`/`410`, checks gateway `/api/v1/status` for `pointMode: "non_redeemable_points"` and `legacyMoneyRoutes: "disabled"`, and probes the inherited Alpha Cashier/payment/crypto-payment paths. Player and office proxies now return `404` for retired money routes before auth redirects, so removed routes cannot look live through login redirects. A live run against player `http://127.0.0.1:3010`, office `http://127.0.0.1:3313`, and gateway `http://127.0.0.1:3314` passed with 70 checks and 0 failures; probe unit tests, player QA regressions, player typecheck/build, office route regressions/build, gateway focused boundary tests, `go run ./cmd/launch-boundary-report`, `go run ./cmd/prediction-reconciliation-report`, and `git diff --check` also passed. Scenario 12 remains Partial because live no-money-path proof now exists, but broader backend legacy terminology cleanup, account-graph/multi-node abuse proof, and a fully deployed-like authenticated end-to-end journey remain incomplete.

Loop 307 evidence note: added DB-backed multi-instance reward-cluster proof in `internal/wallet/service_test.go`. `TestRewardClusterDBStoreBlocksAcrossServiceInstances` opens two independent wallet services against the same Postgres store, records hashed device/IP cluster evidence through one service, proves the second service allows the same-user retry, blocks a different user on the shared device cluster, reads the shared admin review summaries, and verifies raw device/IP signals are not stored in `wallet_reward_clusters`. The no-DSN focused wallet run passed with the DB proof skipped, the same test passed against a disposable `postgres:16-alpine` container on port `56544`, and adjacent HTTP reward-cluster tests for device limits, route restart persistence, IP point-pack limits, and hashed admin review evidence passed. Scenarios 9 and 12 remain Partial because this strengthens daily/point-pack reward abuse proof, but broader account-graph coverage and the fully deployed-like authenticated end-to-end journey remain incomplete.

Loop 308 evidence note: added DB-backed bonus-claim-to-wallet-ledger proof in `internal/http/bonus_wallet_persistence_test.go`. `TestClaimBonusPersistsPointWalletLedgerThroughHTTP` creates a launch-safe point-play campaign through the real bonus service, activates it, posts to the actual `/api/v1/bonuses/claim` handler with an authenticated session user, and verifies a migrated Postgres database contains one active `player_bonuses` row, one `wallet_ledger` bonus credit with idempotency key `bonus-grant:<bonusId>`, and the matching `wallet_balances.bonus_balance_cents` update. The test also proves body-supplied user identity cannot receive the credit, the response exposes only `PTS` point-native fields, and duplicate claims return `409` without a second ledger credit. The no-DSN focused HTTP run passed with the DB proof skipped, the same test passed against a disposable migrated `postgres:16-alpine` container on port `56545`, and adjacent bonus/wallet/http tests passed. Scenario 9 remains Partial because bonus persistence proof is now present, but bonus browser UI proof and broader account-graph abuse coverage remain incomplete; Scenario 12 remains Partial pending the fully deployed-like authenticated end-to-end proof and remaining backend terminology cleanup.

Loop 313 evidence note: Admin market create/update request payloads now use `ammSubsidyPointsCents` at the launch-facing boundary while preserving the inherited private Go field and `amm_subsidy_cents` storage. `CreateMarketRequest` decodes `ammSubsidyPointsCents`, `/api/v1/admin/markets` and `/api/v1/admin/markets/{id}` reject retired `ammSubsidyCents` request bodies with a `400` pointing to `ammSubsidyPointsCents`, the launch OpenAPI `AdminMarketCreateRequest` and exported shared-client request type document only the point-native field, and the office market edit modal sends only `ammSubsidyPointsCents`. Focused gateway HTTP/OpenAPI tests, office route-safety tests, app QA regressions, and the windowed-resolution command compile check passed. Scenarios 7, 11, and 12 remain Partial because broader backend/API legacy wallet/cents naming and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 314 evidence note: Office account-review point-ledger rows now consume the gateway's point-native admin ledger contract. `PunterProfile` exports and renders `amountPointsCents` and `balancePointsCents` for Point Ledger rows instead of retired `amountCents`/`balanceCents`, while the user-detail page keeps any old-row fallback private at the loader boundary. The office route-safety regression now requires the active renderer to contain the point-native fields and reject the retired names; gateway account-review tests and OpenAPI doc guards already prove `/api/v1/admin/punters/{id}/wallet` emits `amountPointsCents`, `balancePointsCents`, and `unit: "PTS"`. Focused office and gateway tests passed. Scenarios 10, 11, and 12 remain Partial because this closes one active account-review ledger UI contract while broader backend/API legacy wallet/cents naming and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 315 evidence note: Player market cards now use a point-native activity prop contract end-to-end. `MarketCard` accepts `volumePointsCents` and formats `formatCompactPoints(volumePointsCents)`, while `MarketGrid` and category pages pass `m.volumePointsCents` through the same prop instead of the retired `volumeCents` name. The QA regression now guards this contract. The loop also repaired the rewards production build blocker by moving `ActiveBonusesControl` out of `app/rewards/page.tsx` into a dedicated client component, preserving the existing point-play UI while satisfying Next.js page export rules. Focused player regressions, scoped typecheck, production `yarn build`, upstream-leak check, and `git diff --check` passed. Scenario 2 remains Pass; Scenarios 9 and 12 remain Partial because this preserves active reward UI/build health and point-native discovery contracts, but broader game-economy proof, backend terminology cleanup, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 316 evidence note: Player market-card liquidity metadata now uses the point-native public prop contract as well. `MarketCard` accepts `liquidityPointsCents` and formats `formatCompactPoints(liquidityPointsCents ?? 0)`, while `MarketGrid` and category cards pass `m.liquidityPointsCents`. The existing card metadata regression now rejects both retired `volumeCents` and `liquidityCents` public card props. Focused player QA, scoped typecheck, production `yarn build`, and upstream-leak checks passed. Scenario 2 remains Pass; Scenario 12 remains Partial because this removes another launch-facing cents alias from discovery cards while broader backend terminology cleanup and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 317 evidence note: The active trade ticket review surface now labels estimated point outcomes without payout wording. `TradeTicket` uses `pointsIfCorrect`, `POTENTIAL_POINTS`, and `POINTS_IF_SIDE`, and supported launch prediction locale bundles describe correct contracts settling at 100 points each instead of winning contracts receiving points. A focused trade-ticket regression rejects the old `PAYOUT`/`PAYOUT_IF_SIDE` keys, `const payout`, and the retired trust-note phrase. Focused ticket/order/player QA tests, scoped typecheck, production `yarn build`, upstream-leak check, and `git diff --check` passed. Scenario 4 remains Partial because this tightens the active trading copy boundary while broader trading/admin/rewards/social proof and backend terminology cleanup remain incomplete; Scenario 12 remains Partial because this removes another launch-facing payout-wording risk without completing the fully deployed-like canonical end-to-end proof.

Loop 318 evidence note: Order preview launch responses now expose the maximum correct-outcome point result as `maxResultPointsCents` instead of the retired public `maxProfitPointsCents` alias. The inherited gateway preview math keeps its private `MaxProfit` engine field, and the shared client keeps old `maxProfit*` reads only inside the private legacy normalizer, but exported `OrderPreview` types, gateway JSON, launch OpenAPI, and app regressions use `maxResultPointsCents`. Focused gateway preview JSON and OpenAPI tests plus the 110-test player app preview/order QA slice passed. Scenario 4 remains Partial because this closes one preview-review API naming gap while broader trading variants, admin lifecycle, rewards/social proof, and backend/API naming cleanup remain incomplete; Scenarios 11 and 12 remain Partial because broader API compatibility cleanup and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 319 evidence note: The player notification preferences page now avoids retired betting, odds, subscription, billing, and special-offer wording in its launch-facing local category controls. Local-only category keys changed from `bet_results`/`odds_alerts` to `market_results`/`price_alerts`, new-market copy says topics or series instead of sports or leagues, promotions copy references point bonus updates and missions, and the old subscription/billing info card is now market-update copy. A user-client preferences regression guards the page against those retired strings, and the focused preferences plus broad player QA slice passed with 99 tests. Scenario 12 remains Partial because this closes one player account-copy leak while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 320 evidence note: Shipped `communication-settings.json` locale values across supported launch languages now align with the notification preference cleanup. The inherited values `Subscription Updates`, `Betting`, `Matches Resolved`, and `New matches for events I've made bets in` were replaced with `Market Updates`, `Prediction Activity`, `Markets Resolved`, and `New markets for followed events`, while compatibility keys remain unchanged. The user-client preferences regression now parses all six supported communication-settings bundles and rejects the retired values; focused preferences plus broad player QA passed with 100 tests. Scenario 12 remains Partial because this closes one shipped locale leak while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 321 evidence note: Supported launch locale values now avoid standalone sportsbook-era bet/odds wording in the remaining shipped header, language/time, about, esports, sidebar, wallet-preference, and win/loss-stat bundles. Across English, Indonesian, Malay, Tagalog, Simplified Chinese, and Traditional Chinese, rendered values now use `Live Predictions`, `Price Format`, `TapTrade - Beyond the Guess`, `ESPORTS PREDICTIONS`, `Price`, `Prediction History`, and `Defaults and Personal Prediction Limits` instead of inherited `Stream Bets`, `Odds Format`, `Beyond the Bet`, `ESPORTS BETS`, `Odds`, `Bet History`, or `Personal Bet Limits`. The parsed supported-locale regression now rejects standalone `bet`, `bets`, `betting`, `odds`, and `sportsbook` rendered values in addition to the existing money/cashier/crypto terms; focused preferences plus broad player QA, scoped typecheck, production build, upstream-leak check, `git diff --check`, and conflict-marker scan passed. Scenario 12 remains Partial because this closes another shipped locale leak while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 322 evidence note: The preservation audit now includes a current-diff checkpoint that classifies deleted artifacts instead of treating all removals as equivalent. The checkpoint separates launch-prohibited player cashier routes/components/clients/locales, launch-adjacent office cashier/payment admin surfaces, the high-risk deleted reconciliation proof command, and retired tests. It records the point-native replacement evidence already present for each group: player/office route absence regressions, proxy 404 behavior, point-ledger account-review fields, `cmd/prediction-reconciliation-report`, `internal/http/testdata/prediction_reconciliation/lifecycle_cases.json`, persisted settlement-to-wallet-ledger proof, and replacement point-native safety/trading/admin tests. Scenario 12 remains Partial because this is an audit and preservation-control improvement, not the fully deployed-like authenticated canonical journey or the remaining backend terminology/account-graph proof.

Loop 323 evidence note: Supported launch locale values now remove another sportsbook/cash-equivalent copy cluster from `page-esports-bets` and `win-loss-statistics`. Across English, Indonesian, Malay, Tagalog, Simplified Chinese, and Traditional Chinese, rendered values now use `Events`, `LONG-TERM MARKETS`, `Probability`, `Point Price`, `Share Price`, `Category`, and `Point Ledger Entry ID` instead of inherited `Matches`, `OUTRIGHTS`, `Decimal`, `American`, `Fractional`, `Sport`, and `Financial Transaction ID`. Compatibility keys remain unchanged while rendered values move to prediction-market and point-ledger language. A focused regression now rejects those legacy values in the affected namespaces; targeted scan, broad player QA, scoped typecheck, production build, upstream-leak check, `git diff --check`, and conflict-marker scan passed. Scenario 12 remains Partial because this closes another shipped locale wording leak while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 324 evidence note: Player chat seed copy and the office loyalty settings placeholder now avoid inherited sportsbook, crypto-asset, commodity-price, and cash-equivalent examples. `ChatSidebar` uses launch-safe esports, weather, grand-prix, and creator-award market snippets plus neutral usernames such as `pricewatcher`, while office loyalty settings now suggests `point_bonus_rate` instead of `cashback_rate`. App and office regressions guard the retired chat usernames/topics and loyalty placeholder; focused player QA, office route tests, player scoped typecheck/build, office production build, targeted source scan, and upstream leak check passed. Scenario 12 remains Partial because this removes another visible mock/placeholder wording leak while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 325 evidence note: Player footer/legal copy, geolocation denial copy, and nearby account/trade-ticket comments now avoid inherited sportsbook/bet/dollar-default wording. The footer states `Non-redeemable point prediction markets`, geolocation denial falls back to prediction-market copy, permission denial asks users to enable location services to submit a prediction order, and comments no longer refer to bet analytics, betting heatmaps, sportsbook products, or restarting from `$25`. The player QA regression now guards those strings; focused player QA, targeted scans, scoped typecheck, production build, upstream-leak check, `git diff --check`, and conflict-marker scan passed. Scenario 12 remains Partial because this removes another small launch-facing wording leak while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 326 evidence note: Office account-review trade history tabs now use a point-native internal tab key. `PunterProfile` already rendered `Trade History`, but the state key was still `bets`; it now uses a typed `PunterProfileTab` union with `"trades"` and the route regression rejects `activeTab === "bets"` and `setActiveTab("bets")`. Focused office route tests, office production build, and source scans passed. Scenario 12 remains Partial because this removes one launch-adjacent admin compatibility token while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 327 evidence note: Office user-limit editing now keeps the active admin form boundary on point-use wording while preserving the inherited submit contract. The UI section uses the existing `losses` field, local editable state key `"pointUse"`, and rendered `Point Use` translation; on submit it maps back to `TapTradePunterLimitsTypesEnum.STAKE` only at the compatibility boundary. The office route regression now guards `pointUse`, `values.losses`, the explicit enum adapter, and rejects `editables.stake`, `HEADER_CARD_LIMITS_STAKE`, and dollar units. Focused office route tests, office production build, targeted scans, `git diff --check`, and conflict-marker scans passed. Scenario 12 remains Partial because this tightens one launch-adjacent admin form boundary while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 328 evidence note: Office recent-activity output contracts now use prediction-native activity enum values. `TapTradePunterActivityEnum` exports `PREDICTION_ORDER`, `PREDICTION_RESULT`, and `SYSTEM_LOGIN`; the recent-activity renderer switches on those values; and the normalizer maps legacy `"BET_PLACEMENT"` / `"BET_WON"` input strings to the prediction-native output values at the compatibility boundary. Focused recent-activity and office route tests plus office production build passed; an older reducer slice test under `lib/slices/__tests__` remains outside the package Vitest include/exclude configuration and could not be run directly with this Vitest CLI, but the updated source is covered by the configured normalizer and route-safety tests. Scenario 12 remains Partial because this closes one active office model/rendering alias while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 329 evidence note: The recent-activity reducer proof is now inside the configured office Vitest suite. The excluded `lib/slices/__tests__/usersRecentActivitySlices.test.ts` copy, whose tracked baseline still used dollar/deposit/bet fixtures, was replaced by `tests/users-recent-activity-slices.test.ts`; the configured test now proves both users and user-details reducers normalize legacy `"BET_PLACEMENT"` and Go timeline `entry_type: "bet"` inputs into `PREDICTION_ORDER` / `PREDICTION_RESULT` PTS outputs. Focused recent-activity, reducer, and office route tests passed with 26 tests, and office production build passed. Scenario 12 remains Partial because this strengthens proof for one active office model boundary while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 330 evidence note: Office audit-log rendering now maps inherited stored audit action strings such as `bet.placed` and `bet.precheck.failed` to prediction-native display actions at the resolver boundary. The active translation keys now use `CELL_ACTION_PREDICTION_ORDER_PLACED` and `CELL_ACTION_PREDICTION_ORDER_PRECHECK_FAILED` instead of retired `CELL_ACTION_BET_*` keys, while old action strings remain searchable as legacy query values. The excluded resolver test was replaced by configured `tests/audit-log-resolvers.test.ts`, and focused resolver plus office route/translation tests passed with 25 tests. Scenario 12 remains Partial because this closes one office audit-log display boundary while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 331 evidence note: Office audit-log reducer proof is now runnable under the configured Vitest suite. The excluded `lib/slices/__tests__/logsSlice.test.ts` and `lib/slices/__tests__/usersDetailsAuditSlice.test.ts` copies were replaced with `tests/audit-log-slices.test.ts`; the configured test proves audit list and user-detail reducers accept legacy `bet.placed` rows as searchable compatibility input while resolver display maps them to `CELL_ACTION_PREDICTION_ORDER_PLACED`, and the user-detail fixture now uses prediction-order entity/product metadata instead of stale `BET`/`SPORTSBOOK` values. Focused audit slice, resolver, and office route/translation tests passed with 30 tests. Scenario 12 remains Partial because this strengthens proof for one office audit-log reducer boundary while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 332 evidence note: Deterministic seed hygiene now rejects accidental duplicate seed fixtures and removes the unreferenced `read-model.seed 2.json` copy that still carried old Premier League/La Liga odds and stake data. `scripts/data/prepare-deterministic-seeds.sh` now fails on unexpected `*.seed*.json` source files, keeps the inherited `BET_STORE_FILE` env var only as compatibility, and labels the generated report artifact as legacy compatibility order state instead of bet state. `bash -n` passed for the script, the seed source directory contains only `read-model.seed.json`, `wallet.seed.json`, and `bets.seed.json`, and targeted scans found the deleted duplicate content absent from the deterministic seed folder. Scenario 12 remains Partial because this removes one seed/demo-data preservation hazard while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 333 evidence note: The top-level Go reconciliation Make targets now use the point-native `cmd/prediction-reconciliation-report` command and `internal/http/testdata/prediction_reconciliation/lifecycle_cases.json` fixture instead of the deleted retired bet replay command and fixture. Historical bet CSV Make target names remain as compatibility aliases, but they explicitly print that historical bet CSV replay is retired for launch before running the point-native report; `scripts/reconciliation/historical-directory-parity.sh` now writes a retired-replay batch notice and runs the point-native report once. `bash -n` passed for the wrapper, `make -n verify-go` reaches `cmd/prediction-reconciliation-report`, targeted scans found no deleted command/fixture or retired CSV flags in the active Make/script wiring, and `go run ./cmd/prediction-reconciliation-report -fixture internal/http/testdata/prediction_reconciliation/lifecycle_cases.json` passed with both cases. Scenario 12 remains Partial because this repairs one release-gate proof path while broader backend terminology cleanup, account-graph proof, and the fully deployed-like canonical end-to-end proof remain incomplete.

Loop 334 evidence note: `make qa-e2e-critical` no longer runs the retired `/api/v1/bets` place/settle smoke flow. `scripts/qa/go-critical-path-e2e.sh` now runs the maintained `cmd/launch-boundary-report` and `cmd/prediction-reconciliation-report` proof commands, publishes `revival/25_GO_CRITICAL_PATH_E2E.md`, and writes timestamped launch-boundary and point-reconciliation artifacts. A live run of `make qa-e2e-critical` passed, producing a gateway launch-boundary report with `pointMode=non_redeemable_points`, `legacyMoneyRoutes=disabled`, 21 prohibited money-route probes returning 404 with 0 failures, and a PTS prediction reconciliation report with both cases passing. Scenario 12 remains Partial because this repairs another release-gate proof path, but broader backend terminology cleanup, account-graph proof, and the fully deployed-like authenticated canonical end-to-end proof remain incomplete.

Loop 335 evidence note: `make qa-capability-slo` no longer starts the old auth/gateway stack, seeds cents through `/api/v1/wallet/credit`, posts to `/api/v1/bets/place`, or probes `/api/v1/bets/cashout/quote`. `scripts/qa/go-capability-slo-gate.sh` now runs the maintained launch-boundary and point-native prediction reconciliation proof commands, publishes `revival/171_SB504_CAPABILITY_SLO_GATE_REPORT.md`, and writes timestamped launch-boundary, launch-gate, and PTS reconciliation artifacts. A live run of `make qa-capability-slo` passed, producing a gateway launch-boundary report with `pointMode=non_redeemable_points`, `legacyMoneyRoutes=disabled`, 21 prohibited cashier/payment/crypto route probes returning 404 with 0 failures, and a PTS prediction reconciliation report with both cases passing. Scenario 12 remains Partial because this repairs another release-gate proof path, but broader backend terminology cleanup, account-graph proof, and the fully deployed-like authenticated canonical end-to-end proof remain incomplete.

Loop 336 evidence note: `make qa-regression-pack` no longer runs `internal/bets` sportsbook lifecycle suites or HTTP `TestPlaceBet*`/`TestAdminSettle*` bet-settlement checks as a mandatory release gate. `scripts/qa/go-regression-pack.sh` now gates canonical replay, prediction order buy/sell/cancel/preview/idempotency behavior, point wallet ledger/idempotency/reconciliation behavior, launch-boundary and admin wallet HTTP behavior, settlement replay, and the point-native prediction reconciliation report contract. A live run of `make qa-regression-pack` passed with five green suites and published `revival/179_SB502_CANONICAL_REGRESSION_PACK_REPORT.md` plus timestamped logs. Scenario 12 remains Partial because this repairs another release-gate proof path, but broader backend terminology cleanup, account-graph proof, and the fully deployed-like authenticated canonical end-to-end proof remain incomplete.

Loop 337 evidence note: `scripts/pre-commit-hook.sh` no longer invokes the stale TapTrade Sportsbook player/backoffice health scripts that require cashier, deposit/withdrawal, betslip, stake, betting-client, cashier-review, and pending-withdrawal surfaces. The pre-commit hook now runs the maintained launch-safe gates `make qa-regression-pack` and `make qa-e2e-critical`. A live run of `./scripts/pre-commit-hook.sh` passed, producing a point-native regression pack artifact, a gateway launch-boundary report with 21 prohibited money routes returning 404, and a PTS prediction reconciliation report with both cases passing. Scenario 12 remains Partial because this repairs another local governance proof path, but broader backend terminology cleanup, account-graph proof, and the fully deployed-like authenticated canonical end-to-end proof remain incomplete.

Loop 338 evidence note: `make verify-sportsbook` is now a compatibility alias for the TapTrade player app verifier instead of building the inherited `phoenix-frontend-brand-viegg` sportsbook tree. `scripts/frontend/verify-sportsbook.sh` now installs the TapTrade workspace, reuses the shared utils dist guard, runs `yarn typecheck` in `frontend/packages/app`, and runs the app package's production `yarn build`, including the upstream-leak check. A live run with single retries passed: scoped typecheck reported 0 errors, Next built 35 app routes, and `check-no-upstream-leak.sh` passed. Scenario 12 remains Partial because this repairs one official frontend verification path, but broader backend terminology cleanup, account-graph proof, and the fully deployed-like authenticated canonical end-to-end proof remain incomplete.

Loop 339 evidence note: `make verify-api-contract-fixtures` is now a compatibility verifier for TapTrade API/client contracts instead of the inherited sportsbook response-shape fixture suite. `scripts/frontend/verify-api-contract-fixtures.sh` now installs the TapTrade workspace, builds `@taptrade-ui/api-client` with `tsc`, and runs focused player-app contract tests for same-origin prediction-client routing, auth refresh/retry, prediction-order validation, trade-ticket preview economics, wallet/reward endpoint paths, and point-ledger presentation. A live run passed with the API-client build green and 47 focused contract tests passing. Scenario 12 remains Partial because this repairs another official verification path, but broader backend terminology cleanup, account-graph proof, and the fully deployed-like authenticated canonical end-to-end proof remain incomplete.

Loop 340 evidence note: The `qa-sports-route-smoke` and `qa-sports-regression` Make targets are now compatibility aliases for TapTrade discovery/API contract proof instead of runtime `/sports/<sport>` and `/api/odds-feed` probes. `scripts/qa/sports-route-smoke.sh` now installs the TapTrade workspace and runs focused discovery/market tests for search ranking, subcategory extraction, lifecycle display, honest chart states, and dynamic market copy. `scripts/qa/sports-regression-gate.sh` repeats that smoke by `ITERATIONS` and then runs the TapTrade API/client contract verifier; `release-launch-readiness-runtime` now enables the new TapTrade discovery contract gate env while the release script still accepts the old env name as compatibility input. Live runs passed with 27 discovery/market tests, the API-client build, and 47 focused API/client contract tests. Scenario 12 remains Partial because this repairs another inherited launch-readiness gate, but broader backend terminology cleanup, account-graph proof, and the fully deployed-like authenticated canonical end-to-end proof remain incomplete.

Loop 341 evidence note: The managed local runtime stack and runtime-profile release gate now start and wait for the TapTrade player app instead of the inherited sportsbook app tree. `scripts/local-stack.sh` uses `frontend/packages/app` as `taptrade-player`, writes `NEXT_PUBLIC_API_URL` plus launch feature flags into the player app local env, starts it from the TapTrade workspace on `PLAYER_PORT`, and stops any stale legacy sportsbook pid as cleanup only. `scripts/release/runtime-gate-profile.sh` now reports and waits on `taptrade-player`, passes `PLAYER_PORT` to the stack, and enables the TapTrade discovery/API compatibility gate with `RUN_TAPTRADE_DISCOVERY_CONTRACT_GATE (legacy alias: RUN_TIANGGE_DISCOVERY_CONTRACT_GATE)`; `SPORTSBOOK_PORT` and old multi-sport iteration envs remain accepted only as compatibility aliases. `scripts/release/profiles/runtime-gate.env` now uses TapTrade player/discovery names. Syntax checks, Make dry-runs, `./scripts/local-stack.sh status`, targeted old-runtime scans, and `git diff --check` passed. Scenario 12 remains Partial because this repairs another release-signoff runtime path, but broader backend terminology cleanup, account-graph proof, and the fully deployed-like authenticated canonical end-to-end proof remain incomplete.

Loop 342 evidence note: The release security/dependency gates now preserve inherited coverage while targeting TapTrade's active launch surfaces. `scripts/security/generate-sbom.sh` generates SBOM/module inventory for `frontend`, `frontend/packages/app` as `taptrade-player-app`, Go platform modules/services, and the inherited backend declared-dependency fallback; when the backend classpath scan is blocked by missing Java/SBT startup, it now writes a real error artifact instead of a dangling path. `scripts/security/scan-secrets.sh` scopes the secret baseline to backend, TapTrade, and Go platform rather than the retired sportsbook app tree. `scripts/security/dependency-baseline.sh` audits TapTrade plus the TapTrade player app, parses yarn audit summaries, reports 8 critical and 90 high advisories instead of saying advisory payloads were unavailable, and reports current Next 16.2.9 / React 19.2.4 versions. `scripts/frontend/dependency-modernization-baseline.sh` now reports TapTrade Backoffice and TapTrade Player App outdated-dependency baselines. Live runs of `make security-secrets`, `make security-sbom`, `make security-deps`, and `make frontend-deps-baseline` passed and regenerated `revival/05_SECRET_SCAN_BASELINE.md`, `revival/21_SBOM_BASELINE.md`, `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`, `revival/195_FRONTEND_DEPENDENCY_MODERNIZATION_BASELINE.md`, `revival/artifacts/sbom_20260628_133059`, and `revival/artifacts/frontend_dependency_baseline_20260628_133140`. Syntax checks, Make dry-runs, stale-sportsbook-scope scans, conflict-marker scans, and `git diff --check` passed. Scenario 12 remains Partial because this improves release-security evidence and preservation of inherited dependency coverage, but critical/high dependency triage, broader backend terminology cleanup, account-graph proof, and the fully deployed-like authenticated canonical journey remain incomplete.

Loop 343 evidence note: The first high-impact frontend dependency remediation is now applied and verified. The TapTrade workspace root `resolutions` pins `i18next-fs-backend` to `2.6.6`, which keeps the `next-i18next` transitive dependency on a patched same-major release for both TapTrade Player App and TapTrade Office. `yarn install --ignore-engines` updated `frontend/yarn.lock`, and direct yarn-audit proof showed the `i18next-fs-backend` critical/high findings disappeared: critical advisories dropped from 8 to 7, high advisories dropped from 90 to 89, and unique advisory IDs dropped from 33 to 31. `make security-deps` regenerated `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md` with the lower counts and no remaining high/critical `i18next-fs-backend` findings. `make verify-sportsbook` passed against the TapTrade player app. `scripts/frontend/verify-taptrade.sh` also now runs the office Next 16 build without the retired `--openssl-legacy-provider` Node flag and with explicit `--webpack`, and `make verify-taptrade` passed. Syntax checks, conflict-marker scan, and `git diff --check` passed. Scenario 12 remains Partial because this removes one launch-app dependency vulnerability cluster and repairs one office verifier, but 7 critical and 89 high frontend advisories remain along with broader backend terminology cleanup, account-graph proof, and the fully deployed-like authenticated canonical journey.

Loop 344 evidence note: A second active office dependency vulnerability cluster is now remediated. The TapTrade workspace root `resolutions` pins `@xmldom/xmldom` to patched version `0.8.13`, keeping the inherited `mammoth` `.docx` terms-and-conditions importer while moving its XML parser to the fixed same-major release. `yarn install --ignore-engines` updated `frontend/yarn.lock`, and direct yarn-audit proof showed zero remaining `@xmldom/xmldom` findings. `make security-deps` regenerated `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md` with TapTrade/TapTrade counts reduced to 7 critical, 85 high, and 27 unique advisory IDs. `make verify-taptrade` passed with office translation generation and a Next 16 webpack production build for 31 app routes; `make verify-sportsbook` passed with TapTrade player scoped typecheck, a production build for 35 app routes, and upstream-leak check. Syntax checks, Make dry-runs, conflict-marker scans, trailing-whitespace scans, and `git diff --check` passed. Scenario 12 remains Partial because this removes four high office XML-parser advisories, but 7 critical and 85 high frontend advisories remain along with broader backend terminology cleanup, account-graph proof, and the fully deployed-like authenticated canonical journey.

Loop 351 evidence note: The Playwright prediction critical-path API spec now uses launch-native contracts for the authenticated user path. Registration payloads include terms and no-cashout disclosure acceptance and the KYC test verifies the returned disclosure flags; portfolio summary assertions require point-native accounting fields while rejecting retired P&L aliases; no-money route checks assert disabled payment, crypto-payment, and cashier paths; and the new-user starter-grant test now continues through a real `PTS` order plus wallet-ledger evidence for `starter_grant:<userId>` and `prediction_fill:*` entries with `amountPointsCents` and `balancePointsCents`. A live DB-backed run against auth `18081`, gateway `18180`, player proxy `3022`, and a disposable migrated/seeded Postgres database passed: `PREDICT_BASE_URL=http://127.0.0.1:3022 npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts` returned 7 passed. The proof is recorded in `revival/35_CRITICAL_API_JOURNEY.md` and `revival/artifacts/critical_api_journey_20260628_165417.md`. Scenario 12 remains Partial because this API proof does not yet cover the full browser journey, buy NO or sell/close, social comment/share/follow, reward progression/claim, leaderboard appearance, admin close/resolve/settlement in the same deployed-like run, or remaining backend terminology cleanup.

Loop 352 evidence note: broad modification preservation now has a maintained review gate alongside the deletion gate. `scripts/qa/preservation-modification-gate.sh` classifies every modified tracked artifact under `apps/taptrade-platform`, counts line churn, highlights high-risk contract files and large-change files, and writes `revival/36_PRESERVATION_MODIFICATION_MAP.md` plus timestamped artifacts. `make qa-preservation-modifications` passed on the current worktree with 386 modified tracked artifacts classified, 85 high-risk contract files, 34 files above the 250-line churn threshold, 0 unclassified modified artifacts, and tracked line churn of `+30542 / -6079`. The pre-commit launch hook now runs the modification classification after the deletion classification. Scenario 12 remains Partial because this makes the broad inherited-system diff reviewable, but it does not prove every production contract is preserved or complete the authenticated canonical journey, settlement/reward/admin proof, backend terminology cleanup, or account-graph/multi-node abuse evidence.

Loop 353 evidence note: the authenticated critical-path API proof now covers more of the canonical journey in one deployed-like run. Against live auth `18081`, gateway `18180`, player proxy `3022`, and a fresh migrated/seeded Postgres container `taptrade-e2e-pg-353`, `PREDICT_BASE_URL=http://127.0.0.1:3022 npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts` passed 7/7. The new-user flow now proves starter points, YES and NO market buys, point ledger entries for starter grant plus at least two `prediction_fill:*` rows, first-prediction mission completion and claim, `mission_reward:<userId>:first_prediction_order` ledger evidence, market comment creation, following `u-1`, user activity containing comment/follow/trade rows, public `PTS` leaderboard board availability, and absent money/crypto/cashier routes. Proof is recorded in `revival/37_EXTENDED_CRITICAL_API_JOURNEY.md` and `revival/artifacts/extended_critical_api_journey_20260628_175403.md`. Scenarios 4, 8, 9, 11, and 12 have stronger evidence, but remain Partial where applicable because the full browser journey, the new user's leaderboard appearance, admin close/resolve/settlement in the same run, backend terminology cleanup, preservation review, and account-graph/multi-node abuse proof remain incomplete.

Loop 354 evidence note: public contract anchor preservation now has a maintained gate in `scripts/qa/preservation-contract-anchor-gate.sh`. `make qa-preservation-contract-anchors` compares current gateway OpenAPI paths, gateway handler route strings, and `PredictionApiClient` async method names against `HEAD`, allows only explicit launch-prohibited money-path removals, and fails on any other inherited public anchor removal. The run passed with OpenAPI paths baseline/current/added/unexpected-removed `18/116/98/0`, handler route strings `9/9/0/0`, and prediction client methods `26/38/12/0`. Proof is recorded in `revival/38_PRESERVATION_CONTRACT_ANCHORS.md` and `revival/artifacts/preservation_contract_anchors_20260628_180402.md`. Scenarios 11 and 12 remain Partial because this protects a focused set of public contract anchors but does not prove every modified production contract, the full browser journey, new-user leaderboard appearance, same-run admin close/resolve/settlement, backend terminology cleanup, or broader abuse evidence.

Loop 355 evidence note: the authenticated critical-path API proof now includes same-run admin close and settlement. Against live auth `18081`, gateway `18180`, player proxy `3022`, and a fresh migrated/seeded Postgres container `taptrade-e2e-pg-355`, `PREDICT_BASE_URL=http://127.0.0.1:3022 npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts` passed 8/8. The new test registers a fresh user, claims starter points, buys YES on an open order-book market, closes the market through `/api/v1/admin/markets/{id}/lifecycle/close`, resolves it YES through `/api/v1/admin/settlements/{marketId}`, verifies `PTS` settlement disbursement fields and lifecycle audit stages, then logs back in as the user to verify a `prediction_payout:{marketId}:...` ledger credit and matching portfolio-history row. Proof is recorded in `revival/39_ADMIN_SETTLEMENT_API_JOURNEY.md` and `revival/artifacts/admin_settlement_api_journey_20260628_181350.md`. Scenarios 7, 10, 11, and 12 have stronger evidence but remain Partial because office-browser admin variants, dual-admin variants, the full browser journey, new-user leaderboard appearance, backend terminology cleanup, complete preservation review, and broader abuse evidence remain incomplete.

Loop 356 evidence note: the authenticated critical-path API proof now verifies fresh-user leaderboard appearance after settlement. `PredictService.RecomputeNow` lets the existing admin leaderboard recompute route perform a real point-native snapshot refresh, and the admin settlement test now calls `/api/v1/admin/leaderboards/pnl_weekly/recompute`, verifies the response status is `recomputed`, logs back in as the user, confirms `/api/v1/me/leaderboards` contains the user's `pnl_weekly` row, and confirms public weekly entries include the same user. Against live auth `18081`, gateway `18180`, player proxy `3022`, and a fresh migrated/seeded Postgres container `taptrade-e2e-pg-356`, `PREDICT_BASE_URL=http://127.0.0.1:3022 npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts` passed 8/8. Proof is recorded in `revival/40_LEADERBOARD_APPEARANCE_API_JOURNEY.md` and `revival/artifacts/leaderboard_appearance_api_journey_20260628_202428.md`. Scenarios 9, 10, 11, and 12 have stronger evidence but remain Partial because the full browser journey, office-browser admin variants, dual-admin variants, backend terminology cleanup, complete preservation review, and broader abuse evidence remain incomplete.
Loop 357 evidence note: the authenticated critical-path API proof now covers dual-admin proposed-resolution challenge handling in the same deployed-like run. Against live auth `18081` with `AUTH_STORE_MODE=db`, gateway `18180` with `MARKET_SYNC_ENABLED=false`, player proxy `3022`, and a fresh migrated/seeded Postgres container `taptrade-e2e-pg-357`, `PREDICT_BASE_URL=http://127.0.0.1:3022 npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts` passed 9/9. The dual-admin test proves admin A close/propose, direct-settlement rejection while challenge flow is active, same-admin finalize rejection, holder dispute filing with `bondPointsCents`/`PTS`, proposer dispute-resolution rejection, admin B dispute rejection, admin B finalization, point-native settlement disbursements, and user settlement-ledger credit without retired payout/currency aliases. Focused Go route/service tests for explicit zero-hour challenge windows, dual-control finalization, point-native aliases, and far-future imported-time JSON clamping passed. Proof is recorded in `revival/41_DUAL_ADMIN_RESOLUTION_API_JOURNEY.md` and `revival/artifacts/dual_admin_resolution_api_journey_20260628_205500.md`. Scenarios 7, 10, 11, and 12 have stronger evidence but remain Partial because the full browser journey, office-browser admin variants, backend terminology cleanup, complete preservation review, and broader abuse evidence remain incomplete.

Loop 358 evidence note: the canonical player browser journey now has a maintained live proof. Against live auth `18081`, gateway `18180`, player proxy `3022`, and a fresh migrated/seeded Postgres container `taptrade-e2e-pg-358`, `PREDICT_BASE_URL=http://127.0.0.1:3022 npx playwright test --config playwright.prediction.config.ts e2e/prediction/canonical-browser.ui.spec.ts --project=ui --reporter=list` passed with setup plus the UI journey. The browser test registers a fresh user, accepts the no-cashout points-only disclosure, verifies starter points, watches/searches/opens `VAL-MASTERS-FINAL`, verifies resolution/liquidity/trade controls, buys YES and NO through the rendered trade ticket, comments/upvotes/follows, verifies portfolio and point-ledger pages, claims an available reward, performs admin close/settlement/recompute through APIs, verifies `PTS` settlement fields and a `prediction_payout:{marketId}:...` ledger key, checks portfolio history, checks leaderboard appearance, checks the activity feed, and confirms `/cashier`, `/cashout`, `/crypto`, `/deposit`, `/withdraw`, and `/redeem` return 404. Browser sanity also loaded `/discover/` with `Market sentiment` and no observed console warnings/errors. Proof is recorded in `revival/42_CANONICAL_BROWSER_JOURNEY.md` and `revival/artifacts/canonical_browser_journey_20260628_194146.md`. Scenarios 4, 6, 7, 9, 10, 11, and 12 have stronger evidence, but remain Partial where applicable because office-browser admin variants, backend terminology cleanup, high-risk preservation review, dependency/security risk, and final RC audit remain incomplete.

Loop 359 evidence note: the office admin lifecycle now has a maintained live browser proof. Against live auth `18081`, gateway `18080`, TapTrade Office `3330`, and fresh migrated/seeded Postgres container `taptrade-e2e-pg-360`, `PREDICT_OFFICE_BASE_URL=http://localhost:3330 PREDICT_ADMIN_API_URL=http://127.0.0.1:18080 npx playwright test --config playwright.prediction.config.ts e2e/prediction/office-admin-lifecycle.ui.spec.ts --project=ui --no-deps --reporter=list` passed with `1 passed`. The proof creates a synthetic draft market, logs into the office UI, opens the market from the rendered admin table, closes it through the destructive confirmation modal with an audit reason, verifies the lifecycle audit modal, and checks retired office money routes return 404. The loop also fixed the office login proxy by setting `authToken` with `path: "/"`, allowing the dashboard proxy to see successful login cookies. Scenarios 10 and 12 have stronger evidence, but remain Partial because backend terminology cleanup, complete preservation review, dependency/security risk, and final RC audit remain incomplete.

Loop 360 evidence note: backend terminology cleanup removed another active source cluster of launch-prohibited wording while preserving inherited storage and compatibility contracts. Prediction void-refund ledger credits now say `returning locked points` instead of `returning stake`; wallet production-store safety logging refers to production point ledgers instead of real money; wallet reservation/bonus/play-through comments describe point operations and gameplay points; and player/office comments no longer use dollar/financial/P&L wording in the touched areas. Targeted unsafe-phrase scans over the touched active areas returned no matches, `git diff --check` passed for touched files, `go test ./internal/wallet ./internal/prediction -run 'Test|$^'` passed, and `make qa-preservation-modifications` passed after classifying `globals.css` as a player launch surface with 392 modified artifacts and zero unclassified paths. Scenario 12 remains Partial because broader backend terminology cleanup, complete preservation review, dependency/security risk, and final RC audit remain incomplete.

Loop 361 evidence note: the frontend dependency-security baseline now removes
the `form-data` advisory cluster from both TapTrade and TapTrade player app audit
evidence while preserving the inherited Jest/jsdom/request tooling path. The
workspace root resolution pins `form-data` to `2.5.6`, the lockfile resolves
`form-data@~2.3.2` to that patched version, `make security-deps` regenerated the
official baseline, and both regenerated audit logs report zero `form-data`
findings. Scenario 12 remains Partial because the official baseline still shows
`critical 2` and `high 80`, backend JVM SCA evidence is still missing, complete
preservation review is still required, and final RC audit remains incomplete.
The preservation modification gate was rerun after the dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

Loop 362 evidence note: the active frontend dependency-security baseline now
reports zero critical Yarn audit advisories. The remaining critical cluster was
under inherited Lerna publish/version tooling, and the remediation preserves
Lerna while resolving `parse-url` to `8.1.0` and `parse-path` to `7.1.0`.
`yarn lerna list --all --json`, a direct CommonJS `parse-url` smoke test,
`yarn workspace @taptrade-ui/api-client build`, and `make security-deps` passed.
Scenario 12 remains Partial because the official baseline still reports
`high 78`, backend JVM SCA evidence is still missing, complete preservation
review is still required, and final RC audit remains incomplete. The
preservation modification gate was rerun after this dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

Loop 365 evidence note: the active frontend dependency-security baseline now
removes the inherited `undici` high-advisory cluster. A same-major root Yarn
resolution moves `undici` to `7.28.0` under jsdom, cheerio, Enzyme-adjacent, and
isomorphic-dompurify paths while preserving those inherited tools. Direct jsdom,
cheerio, and undici MockAgent smokes, `yarn workspace @taptrade-ui/api-client
build`, and `make security-deps` passed. Scenario 12 remains Partial because the
official baseline still reports `high 42`, backend JVM SCA evidence is still
missing, complete preservation review is still required, and final RC audit
remains incomplete. The preservation modification gate was rerun after this
dependency change and classified 392 modified artifacts with zero unclassified
modified paths.

Loop 364 evidence note: the active frontend dependency-security baseline now
removes the inherited `ws` high-advisory cluster. A same-major root Yarn
resolution moves `ws` to `7.5.11` under mock-server and Jest/jsdom paths while
preserving those inherited tools. Direct WebSocket echo and jsdom smokes,
`yarn workspace @taptrade-ui/api-client build`, and `make security-deps` passed.
Scenario 12 remains Partial because the official baseline still reports
`high 48`, backend JVM SCA evidence is still missing, complete preservation
review is still required, and final RC audit remains incomplete. The
preservation modification gate was rerun after this dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

Loop 363 evidence note: the active frontend dependency-security baseline now
removes the inherited `tar` high-advisory cluster. A root Yarn resolution moves
`tar` to `7.5.11` under Lerna, pacote, and node-gyp tooling paths while
preserving those inherited tools. Direct tar create/extract proof,
`yarn lerna run --scope @taptrade-ui/api-client build`, and `make security-deps`
passed. Scenario 12 remains Partial because the official baseline still reports
`high 54`, backend JVM SCA evidence is still missing, complete preservation
review is still required, and final RC audit remains incomplete. The
preservation modification gate was rerun after this dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

Loop 366 evidence note: the active frontend dependency-security baseline now
removes the inherited `trim-newlines` high-advisory cluster. A root Yarn
resolution moves `trim-newlines` to `3.0.1` under commitlint, Lerna,
conventional-changelog, get-pkg-repo, and meow paths while preserving those
inherited release and developer tools. Direct `trim-newlines`, commitlint,
Lerna, API-client build, and `make security-deps` checks passed, and both TapTrade
and TapTrade player app audit logs have zero `trim-newlines` findings. Scenario
12 remains Partial because the official baseline still reports `high 36`,
backend JVM SCA evidence is still missing, complete preservation review is still
required, and final RC audit remains incomplete. The preservation modification
gate was rerun after this dependency change and classified 392 modified
artifacts with zero unclassified modified paths.

Loop 367 evidence note: the active frontend dependency-security baseline now
removes the inherited `http-cache-semantics` high-advisory cluster. A root Yarn
resolution moves the Lerna publish nested edge to `http-cache-semantics@4.2.0`,
matching the patched version already used by Office `got` cache paths while
preserving the inherited publish toolchain. Direct cache-policy, module-load,
Lerna, API-client build, and `make security-deps` checks passed, and both TapTrade
and TapTrade player app audit logs have zero `http-cache-semantics` findings.
Scenario 12 remains Partial because the official baseline still reports
`high 33`, backend JVM SCA evidence is still missing, complete preservation
review is still required, and final RC audit remains incomplete. The
preservation modification gate was rerun after this dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

Loop 368 evidence note: the active frontend dependency-security baseline now
removes the inherited `merge` high-advisory cluster. A root Yarn resolution
moves the `@taptrade-ui/utils -> watch -> exec-sh` edge to `merge@2.1.1` while
preserving that inherited developer tooling chain. Direct merge, `exec-sh`,
Lerna, API-client build, and `make security-deps` checks passed, and both TapTrade
and TapTrade player app audit logs have zero `merge` findings. Scenario 12
remains Partial because the official baseline still reports `high 31`, backend
JVM SCA evidence is still missing, complete preservation review is still
required, and final RC audit remains incomplete. The preservation modification
gate was rerun after this dependency change and classified 392 modified
artifacts with zero unclassified modified paths.

Loop 369 evidence note: the active frontend dependency-security baseline now
removes the inherited `dot-prop` high-advisory cluster. Targeted Yarn path
resolutions move the vulnerable commitlint `dot-prop@3.0.0` callers to
`dot-prop@4.2.1` while preserving already-safe Lerna `dot-prop@5.3.0` callers.
Direct dot-prop, commitlint, Lerna, API-client build, and `make security-deps`
checks passed, and both TapTrade and TapTrade player app audit logs have zero
`dot-prop` findings. Scenario 12 remains Partial because the official baseline
still reports `high 29`, backend JVM SCA evidence is still missing, complete
preservation review is still required, and final RC audit remains incomplete.
The preservation modification gate was rerun after this dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

Loop 370 evidence note: the active frontend dependency-security baseline now
removes the inherited `semver` high-advisory cluster. Targeted Yarn path
resolutions move the vulnerable commitlint `semver@6.3.0` caller to
`semver@6.3.1` and the mock-server/nodemon `semver@7.0.0` caller to
`semver@7.7.3` while preserving those inherited tooling paths. Direct semver,
commitlint, nodemon/simple-update-notifier, Lerna, API-client build, and
`make security-deps` checks passed, and both TapTrade and TapTrade player app audit
logs have zero `semver` findings. Scenario 12 remains Partial because the
official baseline still reports `high 27`, backend JVM SCA evidence is still
missing, complete preservation review is still required, and final RC audit
remains incomplete. The preservation modification gate was rerun after this
dependency change and classified 392 modified artifacts with zero unclassified
modified paths.

Loop 371 evidence note: the active frontend dependency-security baseline now
removes the inherited `fast-uri` high-advisory cluster. A targeted Yarn path
resolution moves the `eslint -> table -> ajv` edge to `fast-uri@3.1.2` while
preserving that inherited tooling path. Direct fast-uri, AJV URI-format
validation, ESLint execution, API-client build, and `make security-deps` checks
passed, and both TapTrade and TapTrade player app audit logs have zero `fast-uri`
findings. Scenario 12 remains Partial because the official baseline still
reports `high 25`, backend JVM SCA evidence is still missing, complete
preservation review is still required, and final RC audit remains incomplete.
The preservation modification gate was rerun after this dependency change and
classified 392 modified artifacts with zero unclassified modified paths.

Loop 372 evidence note: the active frontend dependency-security baseline now
removes the inherited `tmp` high-advisory cluster. A targeted Yarn path
resolution moves the `lerna -> @lerna/prompt -> inquirer -> external-editor ->
tmp` edge to `tmp@0.2.7` while preserving that inherited workspace tooling path.
The current advisory database showed `tmp@0.2.6` was still vulnerable to
CVE-2026-49982, so the accepted patch is `0.2.7`. Direct tmp,
external-editor, Lerna workspace enumeration, API-client build, and
`make security-deps` checks passed, and both TapTrade and TapTrade player app audit
logs have zero `tmp` findings. Scenario 12 remains Partial because the official
baseline still reports `high 22`, backend JVM SCA evidence is still missing,
complete preservation review is still required, and final RC audit remains
incomplete. The preservation modification gate was rerun after this dependency
change and classified 392 modified artifacts with zero unclassified modified
paths.

Loop 373 evidence note: the active frontend dependency-security baseline now
removes the inherited `lodash` high-advisory cluster. A targeted Yarn path
resolution moves the `@commitlint/cli` lodash subtree to `lodash@4.18.1` while
preserving inherited commitlint and release-governance tooling. Direct lodash,
commitlint, Lerna workspace enumeration, API-client build, and
`make security-deps` checks passed, and both TapTrade and TapTrade player app audit
logs have zero `lodash` findings. Scenario 12 remains Partial because the
official baseline still reports `high 17`, backend JVM SCA evidence is still
missing, complete preservation review is still required, and final RC audit
remains incomplete. The preservation modification gate was rerun after this
dependency change and classified 392 modified artifacts with zero unclassified
modified paths.

Loop 374 evidence note: the active frontend dependency-security baseline now
removes the inherited `braces` high-advisory cluster. A targeted Yarn path
resolution moves the `micromatch -> braces` leaf used by inherited Jest/sane and
Lerna/globby/fast-glob tooling to `braces@3.0.3`. Because this is a
major-version override for older callers, the loop verified direct braces,
micromatch, fast-glob, globby, Lerna workspace enumeration, the supported
player app `tsx` test runner, API-client build, and API-client Jest entrypoint
before accepting the remediation. Both TapTrade and TapTrade player app audit logs
have zero `braces` findings. Scenario 12 remains Partial because the official
baseline still reports `high 5`, backend JVM SCA evidence is still missing,
complete preservation review is still required, and final RC audit remains
incomplete. The preservation modification gate was rerun after this dependency
change and classified 392 modified artifacts with zero unclassified modified
paths.

Loop 375 evidence note: the five remaining high frontend advisories were
reviewed as residual inherited Lerna toolchain findings rather than silently
left as an audit number. `ip` has 3 findings through Lerna add/publish package
fetching paths and reports `patched_versions: <0.0.0`; `lodash.set` has 2
findings through Lerna version/publish GitHub client paths and also reports
`patched_versions: <0.0.0`. No override was applied because the advisory feed
offers no patched range, latest `ip` remains in the vulnerable range, and
replacing `lodash.set` with full `lodash` would change the expected CommonJS
export shape for inherited Octokit code. The residual report is
`revival/59_FRONTEND_RESIDUAL_SECURITY_ADVISORIES.md` with artifact
`revival/artifacts/frontend_residual_security_advisories_20260629_102847.md`.
The JVM dependency baseline script now captures missing Java/SBT blockers
instead of aborting during preflight; the fresh report is
`revival/12_JVM_DEPENDENCY_BASELINE.md` with artifact
`revival/artifacts/backend_sbt_update_2026-06-29.log`. The preservation
modification gate was rerun after this residual/security-reporting slice and
classified 394 modified artifacts with zero unclassified modified paths.
Scenario 12 remains Partial because residual high frontend advisories are not
remediated, backend JVM SCA remains blocked by missing tooling, complete
preservation review is still required, and final RC audit remains incomplete.

Loop 376 evidence note: the reviewed frontend residual advisories are now
guarded by an executable QA gate rather than documentation alone.
`scripts/qa/frontend-residual-advisory-gate.sh` parses the active TapTrade and
TapTrade player high-threshold audit logs, forbids critical advisories, and
allows high advisories only when they match the reviewed inherited Lerna
residuals (`ip`/`GHSA-2p57-rm9w-gvfp` at most 3 rows and
`lodash.set`/`GHSA-p6mc-m468-83gw` at most 2 rows, both with
`patched_versions: <0.0.0` and Lerna-only paths). The gate is exposed as
`make qa-frontend-residual-advisories`, is included in the launch pre-commit
hook, and is included in `release-launch-readiness`. After rerunning
`make security-deps`, the gate passed and wrote
`revival/60_FRONTEND_RESIDUAL_ADVISORY_GATE.md` plus artifact
`revival/artifacts/frontend_residual_advisory_gate_20260629_083726.md`. The
preservation modification gate was rerun after this governance change and
classified 394 modified artifacts with zero unclassified modified paths.
Scenario 12 remains Partial because the residual advisories are still not
remediated, backend JVM SCA remains blocked by missing Java/SBT tooling, and
final preservation/RC audit remains incomplete.

Loop 377 evidence note: backend JVM dependency evidence now has an OSV-backed
direct-dependency baseline even though full SBT resolution remains blocked.
`scripts/security/jvm-osv-direct-baseline.sh` parses declared Maven coordinates
from the inherited backend SBT source files and queries OSV `querybatch` without
requiring Java or SBT. The target `make security-jvm-osv-direct` passed and
wrote `revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md` plus artifacts
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_084530.md` and
`.json`. The clean report parsed 113 package/version coordinates, found 9
coordinates with OSV findings, and reported 18 unique OSV ids across direct
dependencies including logback-classic 1.2.11, wiremock-jre8-standalone 2.33.2,
akka-management 1.1.3, amqp-client 5.8.0, akka-stream-kafka 3.0.0,
commons-text 1.9, Keycloak 17.0.1, and swagger-ui 4.1.2. This is not a full
resolved transitive graph; Java/SBT are still required for complete JVM SCA and
eviction evidence. The preservation modification gate was rerun after this
security evidence slice and classified 394 modified artifacts with zero
unclassified modified paths.

Loop 378 evidence note: two direct backend JVM dependency findings were
remediated without changing inherited gameplay, ledger, route, or economy
logic. `org.apache.commons:commons-text` moved from 1.9 to 1.10.0 for
`GHSA-599f-7c49-w659`, and `ch.qos.logback:logback-classic` moved from 1.2.11
to 1.2.13 for `GHSA-vmq6-5m68-f53m`. The refreshed
`make security-jvm-osv-direct` report parsed 113 coordinates and reduced direct
OSV findings from 9 affected coordinates / 18 unique OSV ids to 7 affected
coordinates / 16 unique OSV ids. `commons-text@1.10.0` and
`logback-classic@1.2.13` remain in the parsed coordinate table but no longer
appear in direct OSV findings. The preservation modification gate passed after
this slice with 395 modified artifacts classified, 90 high-risk contract files,
36 large-change files, and zero unclassified modified paths. Scenario 12
remains Partial because this is not a resolved transitive JVM SCA result,
backend Java/SBT compile evidence is still unavailable, and final RC audit
remains incomplete.

Loop 379 evidence note: one test-scoped backend JVM dependency finding was
remediated without changing runtime product behavior. The inherited
`com.github.tomakehurst:wiremock-jre8-standalone` test dependency moved from
2.33.2 to the OSV fixed 2.x version 2.35.1 for `GHSA-pmxq-pj47-j8j4`. Maven
artifact checks for the POM and JAR returned HTTP 200 before the bump. The
refreshed `make security-jvm-osv-direct` report parsed 113 coordinates and
reduced direct OSV findings from 7 affected coordinates / 16 unique OSV ids to
6 affected coordinates / 15 unique OSV ids. `wiremock-jre8-standalone@2.35.1`
remains in the parsed coordinate table but no longer appears in direct OSV
findings. Scenario 12 remains Partial because backend Java/SBT compile and test
evidence, resolved transitive JVM SCA, and final RC audit remain incomplete.

Loop 380 evidence note: one backend documentation-surface JVM dependency
finding was remediated without changing gameplay or economy behavior.
`org.webjars:swagger-ui` moved from 4.1.2 to the OSV fixed version 4.1.3 for
`GHSA-cr3q-pqgq-m8c2`. Maven artifact checks for the POM and JAR returned HTTP
200, and the embedded `index.html` files for 4.1.2 and 4.1.3 had no diff,
preserving the inherited static Swagger UI behavior while removing the direct
OSV finding. The refreshed `make security-jvm-osv-direct` report parsed 113
coordinates and reduced direct OSV findings from 6 affected coordinates / 15
unique OSV ids to 5 affected coordinates / 14 unique OSV ids. Scenario 12
remains Partial because backend Java/SBT compile/runtime docs evidence,
resolved transitive JVM SCA, and final RC audit remain incomplete.

Loop 381 evidence note: the remaining direct backend JVM OSV findings are now
guarded by an executable residual advisory gate. New
`scripts/qa/jvm-direct-residual-advisory-gate.sh` reads the latest direct OSV
JSON artifact and passes only when every finding exactly matches the reviewed
runtime residual set: Akka Management 1.1.3 (`GHSA-9qvj-rpj8-v5c8`), RabbitMQ
AMQP client 5.8.0 (`GHSA-mm8h-8587-p46h`), Akka Stream Kafka 3.0.0
(`GHSA-55vq-xpjf-r2xc`), Keycloak adapter-core 17.0.1
(`GHSA-7vw6-5q2f-7w5r`), and Keycloak core 17.0.1 with its ten reviewed GHSA
ids. `make security-jvm-direct-residual-advisories` passed after a fresh
`make security-jvm-osv-direct`, writing
`revival/65_JVM_DIRECT_RESIDUAL_ADVISORY_GATE.md` and artifact
`revival/artifacts/jvm_direct_residual_advisory_gate_20260629_091647.md`. The
gate is included in `security-baseline`, the launch pre-commit hook, and
launch-readiness after the direct OSV baseline refresh. Scenario 12 remains
Partial because this is governance around residual runtime findings, not
compatible remediation, compile evidence, resolved transitive JVM SCA, or final
RC proof.

Loop 382 evidence note: missing Java/SBT backend evidence is now an explicit
release-readiness blocker rather than only a narrative caveat. The existing
`make security-jvm` target still refreshes `revival/12_JVM_DEPENDENCY_BASELINE.md`
and the SBT preflight log, but new `make security-jvm-required` runs the same
baseline with `JVM_DEPENDENCY_BASELINE_STRICT=1` and fails when JVM/SBT evidence
cannot be produced. `scripts/release/launch-readiness-gate.sh` now runs the
strict target before direct JVM OSV and residual governance checks. In this
workspace, `make security-jvm` reports `sbt_not_found`, no Java runtime, and
baseline exit code 127; `make security-jvm-required` fails as intended. The
evidence report is `revival/66_JVM_SBT_REQUIRED_RELEASE_GATE.md` with artifact
`revival/artifacts/jvm_sbt_required_release_gate_20260629_092042.md`. Scenario
12 remains Partial until Java/SBT or equivalent resolver-backed tooling is
available and the strict target passes.

Loop 383 evidence note: final RC completion status is now enforced by an
executable progress-matrix gate instead of a narrative checklist. New
`scripts/qa/rc-completion-audit-gate.sh` reads the canonical
`/Users/john/Sandbox/Taya_NA_Predict/spec.md` progress matrix and fails unless
all 12 acceptance scenarios are marked `Pass` with evidence. The target
`make qa-rc-completion-audit` is wired into
`scripts/release/launch-readiness-gate.sh` after the TapTrade discovery/API
compatibility checks. The first real run failed, as expected, with 5 `Pass`
rows and 7 `Partial` rows: scenarios 4, 6, 7, 9, 10, 11, and 12 still require
stronger evidence or remaining implementation. The report is
`revival/67_RC_COMPLETION_AUDIT_GATE.md` with artifact
`revival/artifacts/rc_completion_audit_gate_20260629_092924.md`. No scenario
status was promoted by this loop.

Loop 384 evidence note: one active office account-review ledger consumer was
removed from the retired admin wallet/cents compatibility path. The office
`/users/[id]` detail mapper now reads only `amountPointsCents` and
`balancePointsCents` from `/api/v1/admin/punters/{id}/wallet` rows, with no
fallback to `amountCents` or `balanceCents`; the existing office route/source
regression now asserts those retired tokens are absent from the active
user-detail route. The focused command
`yarn --cwd frontend/packages/office vitest run tests/app-router-legacy-routes.test.ts`
passed with 22 tests. The evidence report is
`revival/68_OFFICE_USER_LEDGER_POINT_CONTRACT_CLEANUP.md`. The refreshed RC
completion audit still failed with scenarios 4, 6, 7, 9, 10, 11, and 12
Partial, writing artifact
`revival/artifacts/rc_completion_audit_gate_20260629_093811.md`. Scenarios 10,
11, and 12 remain Partial because this closes one launch-adjacent consumer, not
the broader backend/API terminology cleanup or final RC evidence.

Loop 385 evidence note: the active office user-limit editor no longer uses
deposit-shaped UI/form state names for the point-add limit. The section key and
form field are now `pointAdd`, the translation key is
`HEADER_CARD_LIMITS_POINT_ADD`, and the enum member is
`TapTradePunterLimitsTypesEnum.POINT_ADD` while preserving the inherited serialized
API value `"deposits"` for compatibility. The focused command
`yarn --cwd frontend/packages/office vitest run tests/app-router-legacy-routes.test.ts`
passed with 22 tests, and the focused source scan found old active symbols only
inside negative regression assertions. The evidence report is
`revival/69_OFFICE_LIMITS_POINT_ADD_CONTRACT_CLEANUP.md`. The refreshed RC
completion audit still failed with scenarios 4, 6, 7, 9, 10, 11, and 12
Partial, writing artifact
`revival/artifacts/rc_completion_audit_gate_20260629_094328.md`. Scenarios 10,
11, and 12 remain Partial because this closes one launch-adjacent office naming
path, not the broader backend/API terminology cleanup or final RC evidence.

Loop 386 evidence note: the active office user-limit editor no longer uses
stake/loss-shaped UI/form state names for the point-use limit. The form field
is now `pointUse`, the translation key is `HEADER_CARD_LIMITS_POINT_USE`, and
the enum member is `TapTradePunterLimitsTypesEnum.POINT_USE` while preserving the
inherited serialized API value `"stake"` for compatibility. The focused command
`yarn --cwd frontend/packages/office vitest run tests/app-router-legacy-routes.test.ts`
passed with 22 tests; `git diff --check` passed; the edited-file whitespace
scan found no matches; and the focused source scan found no active matches for
`values.losses`, `field="losses"`, `HEADER_CARD_LIMITS_LOSS`,
`TapTradePunterLimitsTypesEnum.STAKE`, or `STAKE =` in the edited office limit
files. The evidence report is
`revival/70_OFFICE_LIMITS_POINT_USE_CONTRACT_CLEANUP.md`. The refreshed RC
completion audit still failed with scenarios 4, 6, 7, 9, 10, 11, and 12
Partial, writing artifact
`revival/artifacts/rc_completion_audit_gate_20260629_095321.md`. Scenarios 10,
11, and 12 remain Partial because this closes one launch-adjacent office naming
path, not the broader backend/API terminology cleanup or final RC evidence.

Loop 387 evidence note: the office limit-history type no longer uses
deposit/stake-shaped TypeScript enum member names for responsible-play history
rows. `LimitTypeEnum.POINT_ADD_AMOUNT` preserves the inherited serialized value
`"DEPOSIT_AMOUNT"`, and `LimitTypeEnum.PREDICTION_POINT_AMOUNT` preserves the
inherited serialized value `"STAKE_AMOUNT"` so API/history compatibility stays
intact while active type names are point-native. The focused command
`yarn --cwd frontend/packages/office vitest run tests/app-router-legacy-routes.test.ts`
passed with 22 tests; `git diff --check` passed; the edited-file whitespace
scan found no matches; and the focused source scan found no active matches for
`LimitTypeEnum.DEPOSIT_AMOUNT`, `LimitTypeEnum.STAKE_AMOUNT`,
`DEPOSIT_AMOUNT =`, or `STAKE_AMOUNT =` in the office type/history files. The
evidence report is
`revival/71_OFFICE_LIMIT_HISTORY_ENUM_CONTRACT_CLEANUP.md`. The refreshed RC
completion audit still failed with scenarios 4, 6, 7, 9, 10, 11, and 12
Partial, writing artifact
`revival/artifacts/rc_completion_audit_gate_20260629_095753.md`. Scenarios 10,
11, and 12 remain Partial because this closes one launch-adjacent office type
name path, not the broader backend/API terminology cleanup or final RC
evidence.

Loop 388 evidence note: the office limit-history table no longer translates
inherited backend history values directly as launch-facing translation keys.
`DEPOSIT_AMOUNT` now maps through `limitTypeTranslationKey` to
`LIMIT_TYPE_POINT_ADD_AMOUNT`, and `STAKE_AMOUNT` maps to
`LIMIT_TYPE_PREDICTION_POINT_AMOUNT`; rendered labels remain `Point add amount`
and `Prediction point amount`. The inherited serialized values remain preserved
inside `LimitTypeEnum.POINT_ADD_AMOUNT = "DEPOSIT_AMOUNT"` and
`LimitTypeEnum.PREDICTION_POINT_AMOUNT = "STAKE_AMOUNT"`. The focused command
`yarn --cwd frontend/packages/office vitest run tests/app-router-legacy-routes.test.ts`
passed with 22 tests; `git diff --check` passed; the edited-file whitespace
scan found no matches; and the focused source scan found no active matches for
`DEPOSIT_AMOUNT: "Point add amount"`, `STAKE_AMOUNT: "Prediction point amount"`,
`page-users-details:${limitType}`, `LimitTypeEnum.DEPOSIT_AMOUNT`,
`LimitTypeEnum.STAKE_AMOUNT`, `DEPOSIT_AMOUNT =`, or `STAKE_AMOUNT =`. The
evidence report is
`revival/72_OFFICE_LIMIT_HISTORY_TRANSLATION_KEY_CLEANUP.md`. The refreshed RC
completion audit still failed with scenarios 4, 6, 7, 9, 10, 11, and 12
Partial, writing artifact
`revival/artifacts/rc_completion_audit_gate_20260629_100426.md`. Scenarios 10,
11, and 12 remain Partial because this closes one launch-adjacent office display
key path, not the broader backend/API terminology cleanup or final RC evidence.

Loop 389 evidence note: the Office user-details financial-summary translation
keys no longer use deposit/withdrawal-shaped names for point-summary labels.
`HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_POINTS_ADDED`,
`HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_POINTS_USED`, and
`HEADER_CARD_FINANCIAL_SUMMARY_PENDING_POINT_USE` preserve the existing rendered
labels `Lifetime Points Added`, `Lifetime Points Used`, and `Pending Point Use`
while retiring the active key names
`HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_DEPOSITS`,
`HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_WITHDRAWALS`, and
`HEADER_CARD_FINANCIAL_SUMMARY_PENDING_WITHDRAWALS`. The focused command
`yarn --cwd frontend/packages/office vitest run tests/app-router-legacy-routes.test.ts`
passed with 22 tests; `git diff --check` passed; and the focused source scan
found the old financial-summary keys only inside negative regression
assertions. The evidence report is
`revival/73_OFFICE_FINANCIAL_SUMMARY_TRANSLATION_KEY_CLEANUP.md`. The
preservation modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_101042.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_101042.md`. Scenarios 10,
11, and 12 remain Partial because this closes one launch-adjacent Office
display-key path, not the broader backend/API terminology cleanup or final RC
evidence.

Loop 390 evidence note: Office account-review and point-ledger translation
values no longer render inherited `Sportsbook` copy. The old product resolver
key `CELL_PRODUCT_SPORTSBOOK` remains as a compatibility key for inherited
wallet product rows but now renders `Legacy sports feed`, and the
financial-summary exposure label uses
`HEADER_CARD_FINANCIAL_SUMMARY_LEGACY_SPORTS_FEED_EXPOSURE` with rendered copy
`Legacy Sports Feed Open Exposure` instead of the old sportsbook key/value. The
focused command
`yarn --cwd frontend/packages/office vitest run tests/app-router-legacy-routes.test.ts`
passed with 23 tests; `git diff --check` passed; and a focused scan found
`Sportsbook` only in test names and negative assertions inside the checked
Office translation/test scope. The evidence report is
`revival/74_OFFICE_LEGACY_SPORTS_FEED_COPY_CLEANUP.md`. The preservation
modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_101426.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_101426.md`. Scenarios 10,
11, and 12 remain Partial because this closes one launch-adjacent Office copy
path, not the broader backend/API terminology cleanup or final RC evidence.

Loop 391 evidence note: the dormant Office
`components/users/bets/cancel/index.tsx` component no longer contains the
retired `admin/bets/:id/cancel` endpoint, `page-bets` namespace, API hook, or
cancellation payload. The inherited path remains as a null compatibility stub
for preservation review, but the launch-adjacent source no longer carries an
active retired bet-cancel operation string. The focused command
`yarn --cwd frontend/packages/office vitest run tests/app-router-legacy-routes.test.ts`
passed with 23 tests; `git diff --check` passed; and a focused scan found
`admin/bets` only inside the negative regression assertion. The evidence report
is `revival/75_OFFICE_RETIRED_BET_CANCEL_ENDPOINT_CLEANUP.md`. Scenarios 10,
11, and 12 remain Partial because this closes one dormant Office retired-source
path, not the broader backend/API terminology cleanup or final RC evidence. The
preservation modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_102037.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_102037.md`.

Loop 392 evidence note: Office English translation keys no longer use inherited
bet-shaped names for prediction trades, open positions, cancel-order, and
prediction ledger labels. `HEADER_PREDICTION_TRADES_HISTORY`,
`HEADER_CARD_FINANCIAL_SUMMARY_OPEN_POSITIONS`, `ACTION_CANCEL_ORDER`, and
`CELL_TYPE_PREDICTION` preserve the rendered values `Prediction Trades`,
`Open Positions`, `Cancel Order`, and `Prediction` while retiring
`HEADER_BETS_HISTORY`, `HEADER_CARD_FINANCIAL_SUMMARY_OPEN_BETS`,
`ACTION_CANCEL_BET`, and `CELL_TYPE_BET`. The focused command
`yarn --cwd frontend/packages/office vitest run tests/app-router-legacy-routes.test.ts`
passed with 23 tests; `git diff --check` passed; and focused source scans found
the retired key names only inside negative regression assertions. The evidence
report is `revival/76_OFFICE_BET_TRANSLATION_KEY_CLEANUP.md`. Scenarios 10,
11, and 12 remain Partial because this closes one Office translation-key path,
not the broader backend/API terminology cleanup or final RC evidence. The
preservation modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_102430.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_102430.md`.

Loop 393 evidence note: the Office README current admin-surface documentation
no longer describes loyalty and leaderboard administration as
`sportsbook-native`. It now describes point-native TapTrade loyalty and
leaderboard administration with point-ledger and XP/rank wording, and the
Office route/source regression now guards that README section against
launch-prohibited sportsbook, cashier, deposit, withdrawal, crypto, fiat,
redemption, prize, wager, stake, refund, payout, payment, and dollar wording.
The preservation modification gate now classifies the Office README as an
Office admin and operations surface. The focused command
`yarn --cwd frontend/packages/office vitest run tests/app-router-legacy-routes.test.ts`
passed with 24 tests. The evidence report is
`revival/77_OFFICE_ADMIN_README_POINT_NATIVE_CLEANUP.md`. Scenarios 10, 11,
and 12 remain Partial because this closes one launch-adjacent Office
documentation path, not the broader backend/API terminology cleanup or final RC
evidence. The preservation modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_152612.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_152612.md`.

Loop 394 evidence note: active Office navigation and risk source comments no
longer describe retired risk-management compatibility paths with inherited
sportsbook-era wording. The comments in the Pages Router menu compatibility
files, the prediction risk page, and the risk-management redirect now use
retired pre-TapTrade or legacy compatibility language while preserving the
`RISK_MANAGEMENT` enum member, redirect behavior, risk page data source, and
all admin operation logic. The Office route/source regression now scans those
active source files for the retired phrases. The focused command
`yarn --cwd frontend/packages/office vitest run tests/app-router-legacy-routes.test.ts`
passed with 25 tests, and the focused source scan found no `sportsbook`,
`freebet`, `odds-boost`, `bet/stake`, or `fixture exposure` wording in the
touched active Office navigation/risk files. The evidence report is
`revival/78_OFFICE_NAV_RISK_COMMENT_CLEANUP.md`. Scenarios 10, 11, and 12
remain Partial because this closes one launch-adjacent Office source-comment
path, not the broader backend/API terminology cleanup or final RC evidence. The
preservation modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_153140.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_153140.md`.

Loop 395 evidence note: Office audit-log scoped-copy URLs and telemetry no
longer carry unsupported inherited promo filter keys such as `freebetId` or
`oddsBoostId`. Copied audit-log handoff URLs now allow only launch-supported
query keys (`preset`, `action`, `actorId`, `targetId`, `userId`, `product`,
`p`, and `limit`), and telemetry filter signatures count only launch-supported
audit filters. The active audit-log API query, rendered audit table, stored
rows, and inherited raw type fields remain unchanged for compatibility. The
focused Jest command
`yarn --cwd frontend/packages/office test:jest containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`
passed with 28 tests, and the focused Office Vitest route/source regression
passed with 25 tests. The evidence report is
`revival/79_OFFICE_AUDIT_SCOPED_URL_BOUNDARY_CLEANUP.md`. Scenarios 10, 11,
and 12 remain Partial because this closes one Office admin-copy/telemetry
boundary, not the broader backend/API terminology cleanup or final RC evidence.
The preservation modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_153723.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_153723.md`.

Loop 396 evidence note: Office audit-log expanded diff JSON no longer renders
unsupported inherited promo detail keys directly. The rendered before/after
diff path now recursively maps `freebetId` to `pointGrantId`, `oddsBoostId` to
`pointRuleId`, and `freebetAppliedCents` to
`pointGrantAppliedPointsCents`, while preserving raw audit rows, type
compatibility fields, API filtering, copied URLs, and telemetry behavior. The
focused sanitizer test
`yarn --cwd frontend/packages/office vitest run tests/audit-log-display-sanitizer.test.ts`
passed with 2 tests; the existing audit-log Jest command passed with 28 tests;
and the focused Office route/source regression passed with 25 tests. The
evidence report is
`revival/80_OFFICE_AUDIT_DIFF_DISPLAY_BOUNDARY_CLEANUP.md`. Scenarios 10, 11,
and 12 remain Partial because this closes one Office audit display boundary,
not the broader backend/API terminology cleanup or final RC evidence. The
preservation modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_154417.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_154436.md`.

Loop 397 evidence note: the active Go gateway Makefile no longer presents the
service as `TapTrade Sportsbook Gateway` or tells developers to create/use a
`sportsbook` database for current setup. Help/setup output now says
`TapTrade Prediction Gateway - Make Commands`, creates
`taptrade_predict`, and uses `postgres://.../taptrade_predict` DSN examples. The
existing launch-doc safety test now scans `services/gateway/Makefile` beside
the Go platform README and launch OpenAPI spec. `make -C
go-platform/services/gateway help` rendered TapTrade-native setup text;
`go test ./internal/http -run TestLaunchDocsStayPointsOnly` passed; and a
focused Makefile scan found no `sportsbook` or old sportsbook DSN examples.
The evidence report is
`revival/81_GATEWAY_MAKEFILE_POINT_NATIVE_SETUP_CLEANUP.md`. Scenarios 10, 11,
and 12 remain Partial because this closes one active gateway
developer-tooling documentation leak, not the broader backend/API terminology
cleanup or final RC evidence. The preservation modification gate passed and
wrote `revival/artifacts/preservation_modification_map_20260629_155045.md`;
the refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10,
11, and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_155103.md`.

Loop 398 evidence note: the active Go gateway `make seed` target no longer
attempts to load the removed historical `migrations/seed.sql` file. It now
uses the launch base seed command, `go run ./cmd/seed -mode base`, with
`WALLET_DB_DSN=$(GATEWAY_DB_DSN)` and `WALLET_STORE_MODE=db`, matching the
launch seed command family used by `make demo-data`. The seed command comment
now records that `make seed`,
`make demo-data`, and `make wipe-demo` share the stable mode contract, and the
launch-doc test guards the Makefile seed command. `make -C
go-platform/services/gateway help` rendered `Load TapTrade launch base seed
data`; `go test ./internal/http -run
'TestLaunchDocsStayPointsOnly|TestGatewayMakefileUsesLaunchSeedCommand'`
passed; `go test ./cmd/seed -run Test` passed; and `git diff --check` passed.
The evidence report is
`revival/82_GATEWAY_MAKEFILE_LAUNCH_SEED_TARGET_CLEANUP.md`. Scenarios 10, 11,
and 12 remain Partial because this closes one active seed-tooling hazard, not
the broader backend/API terminology cleanup or final RC evidence. The
preservation modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_155441.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_155504.md`.

Loop 399 evidence note: the active Go gateway demo backoffice seed no longer
inserts launch-visible audit rows with removed crypto market examples or
retired payout/price-cent detail keys. Phase 6 halt/resume audit rows now
reference launch-seeded `MLBB-FINAL-G1` with official-source
review/confirmation reasons; settlement audit details use
`settlementPointsCents`; market-create audit details use
`yesPricePointsCents`; and the phase 4/5 executable demo plans no longer
include removed ETH/BTC market prefixes. The focused seed regression
`go test ./cmd/seed -run Test` passed; the focused launch-doc regression
passed; `git diff --check` passed; and focused scans found no `BTC`, `ETH`,
`payout_pool_cents`, `yes_price_cents`, or `oracle_feed` in the touched demo
seed phase files. The evidence report is
`revival/83_GATEWAY_DEMO_BACKOFFICE_AUDIT_SEED_CLEANUP.md`. Scenarios 10, 11,
and 12 remain Partial because this closes one active demo admin-audit seed
boundary, not the broader backend/API terminology cleanup or final RC
evidence. The preservation modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_160132.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_160132.md`.

Loop 400 evidence note: active gateway demo seed operator wording now describes
settlement credits and reserved points instead of payouts or cash. Phase 5 seed
output now prints `settlement credits created`; per-market settlement output
uses `settlementCredits=`; phase 0 cleanup comments describe reserved points
and point releases; and cleanup error context says settlement credit
rows/wallet entries instead of demo payouts. The focused seed regression
passed in `cmd/seed`; `go test ./cmd/seed -run Test` passed; `git diff
--check` passed; and focused runtime-file scans found no `stuck cash`,
`reserved cash`, `refund the cash`, `payouts created`, `payouts=`,
`delete demo payouts`, `purge demo payout`, or `reset payout pool` in the
touched runtime seed files. The evidence report is
`revival/84_GATEWAY_SEED_OPERATOR_WORDING_CLEANUP.md`. Scenarios 10, 11, and
12 remain Partial because this closes one active seed/operator wording
boundary, not the broader backend/API terminology cleanup or final RC evidence.
The preservation modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_160638.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_160638.md`.

Loop 401 evidence note: active gateway market-maker seed comments and error
output now use point-native wording. Phase 1 comments describe point balances,
point-cents, and resting point bids instead of dollar/cash/stake examples;
phase 1 order-placement error output uses `point-cents` instead of a cent
symbol; and the orphan-reservation cleanup comment describes insufficient
points instead of insufficient funds. The focused seed regression passed;
`go test ./cmd/seed -run Test` passed; `git diff --check` passed; and a
focused scan found no `resting cash`, `stakes`, `insufficient funds`, dollar
sign, or cent symbol in `demo_phase1_book.go`. The evidence report is
`revival/85_GATEWAY_SEED_MARKET_MAKER_WORDING_CLEANUP.md`. Scenarios 10, 11,
and 12 remain Partial because this closes one active seed market-maker wording
boundary, not the broader backend/API terminology cleanup or final RC evidence.
The preservation modification gate passed and wrote
`revival/artifacts/preservation_modification_map_20260629_161156.md`; the
refreshed RC completion audit still failed with scenarios 4, 6, 7, 9, 10, 11,
and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_161156.md`.

Loop 402 evidence note: launch readiness now makes preservation review
mandatory for release signoff. `scripts/release/launch-readiness-gate.sh` runs
`make qa-preservation-deletions`, `make qa-preservation-modifications`, and
`make qa-preservation-contract-anchors` before later platform and journey
checks, and its decision notes state that inherited artifact removals or broad
rewrites must stay classified and reviewable. This is a governance slice, not a
product parity claim and not proof that every inherited business contract is
preserved. `bash -n scripts/release/launch-readiness-gate.sh`,
`make qa-preservation-deletions`, `make qa-preservation-contract-anchors`,
`make qa-preservation-modifications`, and `git diff --check` passed. The
preservation gate artifacts are
`revival/artifacts/preservation_deletion_map_20260629_161826.md`,
`revival/artifacts/preservation_contract_anchors_20260629_161826.md`, and
`revival/artifacts/preservation_modification_map_20260629_161836.md`. The
evidence report is `revival/86_LAUNCH_READINESS_PRESERVATION_GATES.md`.
Scenarios 10, 11, and 12 remain Partial because this strengthens inherited
artifact review in launch readiness, but does not close broader admin/API,
safety, or behavioral preservation evidence. The refreshed RC completion audit
still failed with scenarios 4, 6, 7, 9, 10, 11, and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_161854.md`.

Loop 403 evidence note: launch readiness now also requires the deterministic
reward/social abuse-boundary proof. `scripts/release/launch-readiness-gate.sh`
runs `make qa-abuse-boundary` before preservation and platform checks, and its
decision notes state that blocked reward claims and social writes must remain
non-persistent and reviewable. This strengthens Scenario 12 release-governance
evidence but does not close the fully deployed-like authenticated canonical
journey, multi-node abuse proof, or broader backend terminology cleanup.
`bash -n scripts/release/launch-readiness-gate.sh`, `make qa-abuse-boundary`,
`make qa-preservation-modifications`, and `git diff --check` passed. The
evidence report is `revival/87_LAUNCH_READINESS_ABUSE_BOUNDARY_GATE.md`; the
fresh abuse artifact is `revival/artifacts/abuse_boundary_20260629_162224.md`;
the refreshed preservation artifact is
`revival/artifacts/preservation_modification_map_20260629_162237.md`. Scenario
12 remains Partial. The refreshed RC completion audit still failed with
scenarios 4, 6, 7, 9, 10, 11, and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_162255.md`.

Loop 404 evidence note: the shared `@taptrade-ui/api-client` wallet exports now
use point-native wallet fields instead of retired generic cent aliases.
`WalletBalance`, `WalletLedgerEntry`, `WalletMutationRequest`, and
`WalletMutationResponse` expose `balancePointsCents`, `availablePointsCents`,
`reservedPointsCents`, `amountPointsCents`, and `unit: "PTS"`; old
`amountCents`/`balanceCents` fields remain only inside private legacy payload
normalizers in `client.ts`. The focused wallet regression passed with 19
tests; the shared API-client TypeScript build passed; the launch docs
point-only test passed; a focused scan found no retired cent aliases or
`TapTrade Sportsbook` header in `api-client/src/types.ts`; `git diff --check`
passed; and `make qa-preservation-modifications` passed with 412 classified
modified artifacts and zero unclassified paths. The evidence report is
`revival/88_SHARED_API_CLIENT_WALLET_POINT_CONTRACT.md`; the preservation
artifact is
`revival/artifacts/preservation_modification_map_20260629_162742.md`.
Scenarios 6, 11, and 12 remain Partial because this closes one exported
wallet-client contract leak, not the broader API terminology cleanup or full
canonical journey. The refreshed RC completion audit still failed with
scenarios 4, 6, 7, 9, 10, 11, and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_162803.md`.

Loop 405 evidence note: the shared `@taptrade-ui/api-client` audit-log export
now uses point-native review fields instead of retired promo fields.
`AuditLogEntry` exposes `pointGrantId`, `pointRuleId`, and
`pointGrantAppliedPointsCents`; old `freebetId`, `oddsBoostId`, and
`freebetAppliedCents` remain only inside a private legacy audit-log payload
normalizer in `client.ts`. The focused wallet/API contract regression passed
with 20 tests; the shared API-client TypeScript build passed; the launch docs
point-only test passed; a focused scan found no retired promo fields, retired
wallet cent aliases, or `TapTrade Sportsbook` header in `api-client/src/types.ts`;
`git diff --check` passed; and `make qa-preservation-modifications` passed
with 412 classified modified artifacts and zero unclassified paths. The
evidence report is
`revival/89_SHARED_API_CLIENT_AUDIT_LOG_POINT_CONTRACT.md`; the preservation
artifact is
`revival/artifacts/preservation_modification_map_20260629_163333.md`.
Scenarios 10, 11, and 12 remain Partial because this closes one shared
audit-log API-client contract leak, not the broader admin/API terminology
cleanup or full canonical journey. The refreshed RC completion audit still
failed with scenarios 4, 6, 7, 9, 10, 11, and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_163352.md`.

Loop 406 evidence note: the shared `@taptrade-ui/api-client` order-book hint
export now uses only point-native best-quote fields. `OrderBookHint` exposes
`bestYesBidPointsCents`, `bestYesAskPointsCents`, `bestNoBidPointsCents`,
`bestNoAskPointsCents`, and `unit?: "PTS" | string` without exported
`bestYesBidCents`, `bestYesAskCents`, `bestNoBidCents`, or
`bestNoAskCents` aliases. Private legacy reads in `prediction-client.ts`
remain available for older market payload normalization. The focused
wallet/API contract regression passed with 21 tests; the shared API-client
TypeScript build passed; the launch docs point-only test passed; a focused
scan found no retired best-quote aliases or `sportsbook` wording in the edited
exported API-client files; `git diff --check` passed; and `make
qa-preservation-modifications` passed with 412 classified modified artifacts
and zero unclassified paths. The evidence report is
`revival/90_SHARED_API_CLIENT_ORDERBOOK_HINT_POINT_CONTRACT.md`; the
preservation artifact is
`revival/artifacts/preservation_modification_map_20260629_164036.md`.
Scenarios 11 and 12 remain Partial because this closes one shared order-book
hint API-client contract leak, not the broader API/data surface cleanup or full
canonical journey. The refreshed RC completion audit still failed with
scenarios 4, 6, 7, 9, 10, 11, and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_164053.md`.

Loop 407 evidence note: the shared `@taptrade-ui/api-client` portfolio-history
export no longer uses the payout-named `SettledPayout` type. The launch-facing
row type is now `SettledPositionResult`, still exposing
`entryPricePointsCents`, `exitPricePointsCents`, `realizedPointsCents`,
`settlementPointsCents`, and `unit?: "PTS" | string`; private legacy reads in
`prediction-client.ts` still tolerate older `pnlCents` and `payoutCents`
payloads without re-exporting the payout-named contract. The portfolio page
now stores settlement-history rows as `SettledPositionResult[]`. The focused
QA regression passed with 99 tests; the wallet/API contract regression passed
with 21 tests; the shared API-client TypeScript build passed; the app scoped
typecheck passed; the launch docs point-only test passed; a focused scan found
no exported `SettledPayout` or old normalizer name in the edited shared
API-client files or portfolio page; `git diff --check` passed; and `make
qa-preservation-modifications` passed with 412 classified modified artifacts
and zero unclassified paths. The evidence report is
`revival/91_SHARED_API_CLIENT_SETTLED_POSITION_RESULT_CONTRACT.md`; the
preservation artifact is
`revival/artifacts/preservation_modification_map_20260629_164651.md`.
Scenarios 6, 11, and 12 remain Partial because this closes one exported
portfolio-history contract-name leak, not broader portfolio-history coverage,
API/data cleanup, or the full canonical journey. The refreshed RC completion
audit still failed with scenarios 4, 6, 7, 9, 10, 11, and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_164709.md`.

Loop 408 evidence note: public market payloads now use
`settlementPoolPointsCents` instead of the payout-named
`settledPayoutPoolPointsCents` at the launch JSON/OpenAPI/shared-client
boundary. The Go market JSON marshal, launch OpenAPI Market schema, shared
`PredictionMarket` type, and shared market normalizer now expose
`settlementPoolPointsCents`; older payout-pool fields remain only as private
legacy reads or internal DB-backed fields. Focused Go market JSON and launch
docs tests passed; the focused player QA regression passed with 99 tests; the
wallet/API contract regression passed with 21 tests; the shared API-client
TypeScript build passed; the app scoped typecheck passed; a focused
public-contract scan found only `settlementPoolPointsCents` in launch OpenAPI
and exported client market types; `git diff --check` passed; and `make
qa-preservation-modifications` passed with 412 classified modified artifacts
and zero unclassified paths. The evidence report is
`revival/92_MARKET_SETTLEMENT_POOL_POINT_CONTRACT.md`; the preservation
artifact is
`revival/artifacts/preservation_modification_map_20260629_165327.md`.
Scenarios 11 and 12 remain Partial because this closes one public market
payload naming leak, not the broader API/data surface cleanup or full
canonical journey. The refreshed RC completion audit still failed with
scenarios 4, 6, 7, 9, 10, 11, and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_165344.md`.

Loop 409 evidence note: preservation review now has a production-dossier gate
in addition to deletion, modification, and public contract-anchor gates.
`make qa-preservation-production-dossier` writes
`revival/93_PRODUCTION_PRESERVATION_DOSSIER.md` and timestamped artifact
`revival/artifacts/production_preservation_dossier_20260629_170920.md`,
summarizing tracked rewrite magnitude, high-risk inherited contract domains,
deleted launch-prohibited money-path files, and required compatibility anchors.
The dossier explicitly fails if `PhoenixApiClient` disappears, if the new
`TapTradeApiClient` launch-facing alias stops wrapping it, or if private legacy
wallet/audit payload normalizers are removed. Launch readiness now runs this
dossier as a mandatory preservation step. Loop 410 tightened the same dossier
so untracked artifacts are classified by risk and unclassified untracked paths
fail the gate; the refreshed dossier classified all 506 untracked entries with
zero unclassified paths. Focused verification passed:
`make qa-preservation-production-dossier`, `make qa-preservation-modifications`
with 412 classified modified artifacts and artifact
`revival/artifacts/preservation_modification_map_20260629_170932.md`,
`make qa-preservation-contract-anchors` with zero unexpected public-anchor
removals and artifact
`revival/artifacts/preservation_contract_anchors_20260629_170932.md`,
`npx tsx --test app/__tests__/wallet-paths.test.ts` with 22 tests,
`npx tsx --test app/__tests__/qa-regressions-2026-04-18.test.ts` with 99
tests, shared API-client `npm run build`, Go launch-doc point-only test,
`bash -n` for the new script and launch gate, and `git diff --check`. Scenarios
11 and 12 remain Partial because this makes broad inherited-system changes more
reviewable and keeps API-client compatibility anchored, but it does not itself
complete the remaining API/data cleanup, human preservation review, security
risk, or final RC audit. The refreshed RC completion audit still failed with
scenarios 4, 6, 7, 9, 10, 11, and 12 Partial, writing
`revival/artifacts/rc_completion_audit_gate_20260629_171013.md`.

Loop 410 evidence note: the production preservation dossier now treats
untracked artifacts as first-class preservation evidence. It classifies
untracked gateway HTTP/admin behavior and tests, prediction-engine tests,
point-reconciliation proof commands, launch proof commands, schema/seed files,
verification scripts, player and office surfaces, browser/regression proofs,
market visual assets, and revival evidence reports. The gate fails on any
unclassified untracked path, preventing new production code or proof scripts
from hiding outside tracked diff review. The refreshed run classified 506
untracked entries with zero unclassified paths and wrote
`revival/artifacts/production_preservation_dossier_20260629_170920.md`.
`make qa-preservation-modifications`, `make qa-preservation-contract-anchors`,
`bash -n scripts/qa/preservation-production-dossier.sh`, and `git diff
--check` passed. Scenarios 11 and 12 remain Partial because untracked
classification improves preservation governance, but it still does not replace
human review, remaining API/data cleanup, security evidence, or final RC proof.

Loop 411 evidence note: the progress matrix now separates scenario-owned
acceptance blockers from broader cross-scenario cleanup. Scenarios 4, 6, 7, 9,
and 10 were promoted to `Pass` because their own acceptance checklists already
have direct browser/API/SQL evidence in the matrix: rendered YES/NO/sell and
insufficient-points trading with balance, position, activity, and ledger
updates; portfolio balances, open/settled positions, history, orders, and full
point-ledger proof; admin lifecycle create/edit/open/pause/close/resolve/cancel
settle/replay/audit/export proof including dual-admin challenge handling;
starter/daily/point-pack/mission/streak/rank/leaderboard/badge/reward-limit
economy proof with ledger-backed point movement; and admin market, taxonomy,
ledger-inspection, risk, moderation, settlement, replay, and export operations.
Their old Gap cells pointed mostly to API/data cleanup and safety/release
hardening, which remain tracked under scenarios 11 and 12. The Scenario 11 row
also had a markdown table delimiter repaired so the RC audit report now reads
the intended Gap and Next cells. `make qa-rc-completion-audit` now reports 10
`Pass` rows and 2 `Partial` rows, still failing correctly for scenarios 11 and
12 with artifact
`revival/artifacts/rc_completion_audit_gate_20260629_171559.md`.

Loop 418 evidence note: admin KYC decision `reason` values now pass through the
shared launch-facing reason guard before the DB-backed KYC service can persist
or return a review decision. `decodeKYCAdminDecisionRequest` trims `userId` and
`reason`, rejects launch-prohibited money/redemption wording with
`details.field: "reason"`, and keeps unsafe admin text out of error bodies.
The touched KYC route comment was also moved away from inherited external-value
gate wording while preserving the concrete `PostgresKYCService.AdminDecision`
contract. Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestKYCAdminDecisionReasonRejectsMoneyWordingBeforeService|TestDecodeKYCAdminDecisionRequestTrimsSafeReason|TestPredictionAdminDisputeResolutionNoteRejectsMoneyWording|TestLoyaltyAdminAdjustmentRejectsMoneyWording|TestAdminWalletMutationReasonRejectsMoneyWording|TestPredictionAdminLifecycleReasonRejectsMoneyWording|TestPredictionAdminSettlementReasonsRejectMoneyWording' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260629_180106.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260629_180106.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260629_180124.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260629_180124.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260629_180124.md`. Scenario 12
remains Partial because this closes one more persisted admin-entered reason
boundary, not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 419 evidence note: admin social-report resolution `note` values now use
the shared launch-facing reason guard before moderation state can be persisted
or exported. The report-resolution handler trims `note`, keeps the existing
500-character limit, rejects launch-prohibited money/redemption wording with
`details.field: "note"`, and calls `ResolveReport` only after validation.
`TestMarketSocialAdminResolveNoteRejectsMoneyWording` proves an unsafe review
note returns 400, is not echoed, and leaves the report open with no review note.
Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestMarketSocialAdminResolveNoteRejectsMoneyWording|TestMarketSocialAdminModerationAndCSV|TestKYCAdminDecisionReasonRejectsMoneyWordingBeforeService|TestPredictionAdminDisputeResolutionNoteRejectsMoneyWording|TestLoyaltyAdminAdjustmentRejectsMoneyWording|TestAdminWalletMutationReasonRejectsMoneyWording' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260629_180613.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260629_180613.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260629_180634.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260629_180634.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260629_180634.md`. Scenario 12
remains Partial because this closes another persisted/exported admin review
note boundary, not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 420 evidence note: admin CRM punter-note `content` now uses the shared
launch-facing reason guard before `user_notes` persistence. The admin punter
notes handler trims content, keeps the existing required-content check, rejects
launch-prohibited money/redemption wording with `details.field: "content"`, and
calls `AddPunterNote` only after validation. `TestAdminPunterAddNoteRejectsMoneyWording`
proves unsafe note content returns 400, is not echoed, and is not passed to the
repo fake or persisted in returned notes. Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestAdminPunterAddNote|TestAdminPunterAddNoteRejectsEmpty|TestAdminPunterAddNoteRejectsMoneyWording|TestMarketSocialAdminResolveNoteRejectsMoneyWording|TestKYCAdminDecisionReasonRejectsMoneyWordingBeforeService|TestPredictionAdminDisputeResolutionNoteRejectsMoneyWording' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260629_181051.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260629_181051.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260629_181110.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260629_181110.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260629_181110.md`. Scenario 12
remains Partial because this closes another persisted admin-authored note
boundary, not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 421 evidence note: admin bonus grant and forfeit `reason` values now use
the shared launch-facing reason guard before bonus services can persist
metadata, fold grant reasons into point-credit ledger text, or store forfeit
state. `decodeAdminBonusGrantRequest` trims `reason`, keeps the retired
`override_amount_cents` rejection, rejects launch-prohibited money/redemption
wording with `details.field: "reason"`, and calls `GrantBonus` only after
validation. The admin bonus forfeit route trims and validates `reason` before
setting the session admin actor and calling `ForfeitPlayerBonus`.
`TestAdminGrantBonusRejectsMoneyWordingReason` and
`TestAdminBonusForfeitRejectsMoneyWordingReason` prove unsafe bonus reasons
return 400, are not echoed, and do not call the fake services. Focused HTTP
tests passed:
`go test ./services/gateway/internal/http -run 'TestAdminGrantBonusEndpointUsesSessionAdminAndPointNativePayload|TestAdminGrantBonusRejectsRetiredOverrideAliasAtHTTPBoundary|TestAdminGrantBonusRejectsMoneyWordingReason|TestAdminBonusForfeitEndpointUsesSessionAdmin|TestAdminBonusForfeitRejectsMoneyWordingReason|TestAdminPunterAddNoteRejectsMoneyWording|TestMarketSocialAdminResolveNoteRejectsMoneyWording' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_073731.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_073743.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_073743.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_073747.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_073749.md`. Scenario 12
remains Partial because this closes another persisted admin-authored bonus
reason boundary, not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 422 evidence note: the older admin loyalty adjustment `reason` value now
uses the shared launch-facing reason guard before the in-memory loyalty service
can create a loyalty account or point-ledger entry. The handler trims `reason`,
rejects launch-prohibited money/redemption wording with
`details.field: "reason"`, and calls `service.Adjust` only after validation.
`TestAdminLoyaltyAdjustmentRejectsMoneyWordingReason` proves an unsafe
adjustment reason returns 400, is not echoed, and leaves the target account
absent from admin detail lookup. Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestAdminLoyaltyAdjustmentAndDetailFlow|TestAdminLoyaltyAdjustmentRejectsMoneyWordingReason|TestLoyaltyAdminAdjustment|TestLoyaltyAdminAdjustmentRejectsMoneyWording|TestAdminGrantBonusRejectsMoneyWordingReason|TestAdminPunterAddNoteRejectsMoneyWording' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_074222.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_074234.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_074234.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_074237.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_074239.md`. Scenario 12
remains Partial because this closes another persisted admin-authored loyalty
ledger reason boundary, not human preservation review, multi-node/live abuse
proof, dependency/release hardening, or final RC evidence.

Loop 423 evidence note: the older admin loyalty tier editor now validates
launch-facing tier copy before persisting config. `displayName` and visible
`benefits` values pass through the shared wording guard before
`service.UpdateTier` runs. `TestAdminLoyaltyTierRejectsMoneyWordingBenefits`
proves unsafe benefit copy returns 400, is not echoed, and does not appear in
the public tier payload after rejection. Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestAdminLoyaltyConfigAndSettingsUpdateFlow|TestAdminLoyaltyTierRejectsMoneyWordingBenefits|TestAdminLoyaltyAdjustmentRejectsMoneyWordingReason|TestLoyaltyAdminAdjustmentRejectsMoneyWording' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_074536.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_074548.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_074548.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_074551.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_074553.md`. Scenario 12
remains Partial because this closes another persisted admin-authored loyalty
tier copy boundary, not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 424 evidence note: CMS page create and update requests now validate
launch-facing page copy before the DB-backed content service can persist it.
Admin page `title`, `content`, `meta_title`, and `meta_description` fields
pass through the shared wording guard before `CreatePage` or `UpdatePage` is
called. `TestAdminContentPageCreateRejectsMoneyWordingBeforeService` and
`TestAdminContentPageUpdateRejectsMoneyWordingBeforeService` use nil services
to prove unsafe create/update copy returns 400 before any service call could be
made, identifies the unsafe field, and does not echo the admin-supplied value.
Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestAdminContentPage(Create|Update)RejectsMoneyWordingBeforeService|TestAdminLoyaltyTierRejectsMoneyWordingBenefits|TestAdminGrantBonusRejectsMoneyWordingReason|TestAdminPunterAddNoteRejectsMoneyWording' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_075004.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_075017.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_075018.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_075022.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_075024.md`. Scenario 12
remains Partial because this closes another public CMS copy persistence path,
not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 425 evidence note: CMS banner create and update requests now validate
public banner copy and destination links before persistence. Admin banner
`title` and `link_url` values pass through the shared wording guard before
`CreateBanner` or `UpdateBanner` is called. `TestAdminContentBannerCreateRejectsMoneyWordingBeforeService`
and `TestAdminContentBannerUpdateRejectsMoneyPathBeforeService` use nil
services to prove unsafe banner title copy and retired money-path links return
400 before any service call could be made, identify the unsafe field, and do
not echo the admin-supplied value. Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestAdminContent(Page|Banner).*(RejectsMoney|RejectsMoneyPath)' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_075238.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_075250.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_075250.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_075253.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_075255.md`. Scenario 12
remains Partial because this closes another public CMS banner persistence
path, not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 426 evidence note: custom RBAC role creation now validates office-visible
role copy before the RBAC service can persist it. Role `name` and
`description` values pass through the shared wording guard before `CreateRole`
is called. `TestRBACCreateRoleRejectsMoneyWordingDescription` proves unsafe
role description copy returns 400, identifies `description`, does not echo the
admin-supplied value, and does not appear in the role list after rejection.
Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestRBAC(CreateRoleRejectsMoneyWordingDescription|Handlers_)|TestAdminContent(Page|Banner).*(RejectsMoney|RejectsMoneyPath)' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_075649.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_075701.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_075702.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_075706.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_075708.md`. Scenario 12
remains Partial because this closes another persisted operator-copy path, not
human preservation review, multi-node/live abuse proof, dependency/release
hardening, or final RC evidence.

Loop 427 evidence note: operator-issued partner key names now validate
office-visible copy before key generation or persistence. Admin partner key
`name` values pass through the shared wording guard after trimming and before
scope normalization or `CreateAPIKey` is called.
`TestPartnerAdminIssueKeyRejectsMoneyWordingName` proves unsafe partner key
names return 400, identify `name`, do not echo the admin-supplied value, and
do not persist a key. Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestPartnerAdmin(IssueKey|IssueKeyRejectsMoneyWordingName|ListKeysRequiresUserID)|TestRBACCreateRoleRejectsMoneyWordingDescription|TestLaunchInfraMetricsExcludeLegacyMoneyCollector' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_080240.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_080255.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_080256.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_080259.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_080301.md`. Scenario 12
remains Partial because this closes another persisted operator-copy path, not
human preservation review, multi-node/live abuse proof, dependency/release
hardening, or final RC evidence.

Loop 428 evidence note: operator-managed partner webhook endpoint destinations
now validate launch-prohibited route wording before endpoint persistence. Admin
webhook `url` values still pass the existing public-host/SSRF validator first;
then the path, query, and fragment are checked for retired cashier, deposit,
withdrawal, crypto/fiat, cashout, redemption, or redeemable-route terms before
`CreateEndpoint` is called. Hostnames remain governed by the existing network
safety validator rather than launch-copy screening.
`TestWebhookAdminRegisterRejectsMoneyPathURL` proves an unsafe
`/cashier/deposit` destination returns 400, identifies `url`, does not echo the
admin-supplied value, and does not persist an endpoint. Focused HTTP tests
passed:
`go test ./services/gateway/internal/http -run 'TestWebhookAdmin(Register|RegisterRejectsMoneyPathURL|ListMasksSecret|Toggle)|TestPartnerAdmin(IssueKey|IssueKeyRejectsMoneyWordingName|ListKeysRequiresUserID)|TestRBACCreateRoleRejectsMoneyWordingDescription' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_080720.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_080736.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_080736.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_080740.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_080742.md`. Scenario 12
remains Partial because this closes another persisted operator destination
path, not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 429 evidence note: self-serve bot API key names now validate
account-visible copy before scope normalization, key generation, or
persistence. Cookie-authenticated `/api/v1/bot/keys` POST `name` values pass
through the shared wording guard after trimming and before `CreateAPIKey` is
called. `TestBotKeySelfServeRejectsMoneyWordingName` proves an unsafe
self-serve key name returns 400, identifies `name`, does not echo the
user-supplied value, and does not persist a key. Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestBotKeySelfServe(RejectsPrivilegedOrUnknownScopes|RejectsMoneyWordingName|Gate)|TestPartnerAdmin(IssueKey|IssueKeyRejectsMoneyWordingName|ListKeysRequiresUserID)' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_081242.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_081255.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_081256.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_081259.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_081301.md`. Scenario 12
remains Partial because this closes another persisted account-copy path, not
human preservation review, multi-node/live abuse proof, dependency/release
hardening, or final RC evidence.

Loop 430 evidence note: admin loyalty accrual rule names now validate
operator/economy copy before loyalty rule persistence. Admin
`/api/v1/admin/loyalty/rules` POST and PUT `name` values pass through the
shared wording guard after trimming and before `CreateRule` or `UpdateRule` is
called. `TestAdminLoyaltyRuleRejectsMoneyWordingName` proves an unsafe rule
name returns 400, identifies `name`, does not echo the admin-supplied value,
and does not persist into the admin loyalty config payload. Focused HTTP tests
passed:
`go test ./services/gateway/internal/http -run 'TestAdminLoyalty(ConfigAndSettingsUpdateFlow|TierRejectsMoneyWordingBenefits|RuleRejectsMoneyWordingName|RuleRejectsRetiredRequestFields)|TestAdminLoyaltyAdjustmentRejectsMoneyWordingReason' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_081628.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_081641.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_081642.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_081645.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_081646.md`. Scenario 12
remains Partial because this closes another persisted economy-rule copy path,
not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 431 evidence note: DB-backed Predict loyalty tier display names and
benefits now validate operator/economy copy before Predict loyalty tier
persistence. Admin `/api/v1/admin/loyalty/tiers/{tierId}` PUT `displayName`
and visible `benefits` values pass through the shared wording guard before
`UpdateTier` is called. `TestPredictLoyaltyAdminTierRejectsMoneyWordingBenefits`
proves an unsafe benefit value returns 400, identifies `benefits`, does not
echo the admin-supplied value, and is rejected before the fake repository
persistence path can run. Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestPredictLoyaltyAdminTierRejectsMoneyWordingBenefits|TestLoyaltyAdmin(Config|Adjustment|AdjustmentRejectsMoneyWording|RequiresAdminRole|AccountsList|AccountDetail)|TestAdminLoyaltyTierRejectsMoneyWordingBenefits' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_082234.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_082246.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_082247.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_082250.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_082252.md`. Scenario 12
remains Partial because this closes another persisted economy-tier copy path,
not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 432 evidence note: admin-created discovery taxonomy copy now validates
public category and series wording before persistence. Admin
`/api/v1/admin/categories` POST `name` values and
`/api/v1/admin/series` POST `title`, `description`, and `tags` values pass
through the shared wording guard before `CreateCategory` or `CreateSeries` is
called. `TestPredictionAdminTaxonomyRejectsMoneyWordingBeforePersistence`
proves unsafe category names and unsafe series title, description, or tag copy
return 400, identify the affected field, do not echo the admin-supplied value,
and do not persist into the taxonomy repo fake. Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestPredictionAdminTaxonomyRoutesCreateCategorySeriesAndTags|TestPredictionAdminTaxonomyRejectsMoneyWordingBeforePersistence|TestPredictionCategoryRoutesApplyLaunchTaxonomyBoundary|TestPredictionAdminCreateMarketRejectsLaunchProhibitedCopy' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_082723.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_082737.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_082737.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_082741.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_082743.md`. Scenario 12
remains Partial because this closes another public discovery taxonomy copy
path, not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 433 evidence note: admin-created event copy now validates public
market-grouping wording before persistence. Admin `/api/v1/admin/events` POST
`title` and `description` values pass through the shared wording guard before
`CreateEvent` is called. `TestPredictionAdminCreateEventRejectsMoneyWordingBeforePersistence`
proves unsafe event title or description copy returns 400, identifies the
affected field, does not echo the admin-supplied value, and does not persist
into the event repo fake. Focused HTTP tests passed:
`go test ./services/gateway/internal/http -run 'TestPredictionAdminCreateEvent|TestPredictionAdminCreateEventRejectsMoneyWordingBeforePersistence|TestPredictionAdminTaxonomyRejectsMoneyWordingBeforePersistence' -count=1`.
Preservation evidence was refreshed: `make qa-preservation-modifications`
passed at
`revival/artifacts/preservation_modification_map_20260630_083216.md`,
`make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_083237.md`,
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_083238.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_083244.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_083247.md`. Scenario 12
remains Partial because this closes another public market-grouping copy path,
not human preservation review, multi-node/live abuse proof,
dependency/release hardening, or final RC evidence.

Loop 434 evidence note: gateway-only live no-money-boundary evidence was
refreshed on the current worktree. A foreground Go gateway run with
`PORT=18180`, `GATEWAY_AUTH_ENABLED=false`, and no DB available returned
`/api/v1/status` with `pointMode: non_redeemable_points`,
`legacyMoneyRoutes: disabled`, required launch domains present, and prohibited
money domains absent. `PLAYER_BASE_URL= OFFICE_BASE_URL= GATEWAY_BASE_URL=http://127.0.0.1:18180 make qa-live-no-money-boundary`
passed with 32 checks and 0 failures, returning 404 for inherited cashier,
admin-cashier, payment, withdrawal, webhook, and crypto-payment endpoints. The
artifact is
`revival/artifacts/live_no_money_boundary_20260630_103652.md`. Scenario 12
remains Partial because this is gateway-only runtime route evidence, not full
player/office route proof, authenticated canonical journey proof, human
preservation review, multi-node/live abuse proof, dependency/release
hardening, or final RC evidence.

Loop 435 evidence note: full player, office, and gateway live
no-money-boundary evidence now passes on the current worktree. The player and
office Next dev servers were run in foreground sessions on `3022` and `3020`,
and the foreground Go gateway ran on `18180` with auth disabled for router-level
absence checks. `PLAYER_BASE_URL=http://127.0.0.1:3022 OFFICE_BASE_URL=http://127.0.0.1:3020 GATEWAY_BASE_URL=http://127.0.0.1:18180 make qa-live-no-money-boundary`
passed with 70 checks and 0 failures. The passing artifact is
`revival/artifacts/live_no_money_boundary_20260630_105447.md`, covering
positive player/office launch pages, retired player/office money route absence,
gateway point-mode/domain assertions, and inherited cashier/payment/crypto API
absence. `make qa-rc-completion-audit` still fails correctly with Scenario 12
Partial at `revival/artifacts/rc_completion_audit_gate_20260630_085501.md`.
Scenario 12 remains Partial because this clears the full live route-boundary
proof, but human preservation review, multi-node/live abuse proof,
dependency/release hardening, and final RC evidence still remain.

Loop 436 evidence note: the maintained abuse-boundary gate now includes
DB-backed reward-cluster multi-instance proof. `make qa-abuse-boundary` starts
a temporary Postgres 16 container, runs
`TestRewardClusterDBStoreBlocksAcrossServiceInstances` with `WALLET_DB_DSN`
against that shared store, and removes the container afterward. The test uses
two independent wallet service instances to prove same-user retries remain
allowed across instances, a second account sharing the same device cluster is
blocked across instances, admin summaries expose hashed evidence only, and raw
device/IP values are not persisted. The passing artifact is
`revival/artifacts/abuse_boundary_20260630_090055.md`; the DB step log is
`revival/artifacts/abuse_boundary_20260630_090055_dbbacked_multiinstance_reward_cluster_controls.log`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_090216.md`. Scenario 12
remains Partial because this clears reward-cluster shared-store multi-instance
proof, but human preservation review, broader live social/account-graph abuse
proof, dependency/release hardening, and final RC evidence still remain.

Loop 437 evidence note: dependency/release-hardening evidence was refreshed
with current artifacts. `scripts/security/dependency-baseline.sh` now writes
timestamped yarn-audit logs, and
`scripts/qa/frontend-residual-advisory-gate.sh` reads the latest TapTrade and
TapTrade player audit logs by default. `make security-deps` passed and wrote
`revival/artifacts/talon_yarn_audit_20260630_090648.log` plus
`revival/artifacts/taptrade_player_yarn_audit_20260630_090648.log`; the fresh
baseline reports critical 0, high 5, moderate 76, low 14, and 2 unique advisory
ids per frontend scope. `make qa-frontend-residual-advisories` passed at
`revival/artifacts/frontend_residual_advisory_gate_20260630_090658.md`,
confirming every high row is still one of the reviewed inherited Lerna
residuals. `make security-jvm-osv-direct` refreshed declared direct JVM OSV
evidence at `revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_090606.md`
and `revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_090606.json`
with 113 parsed coordinates, 5 coordinates with OSV findings, and 14 unique OSV
ids. `make security-jvm-direct-residual-advisories` passed against that
refreshed JSON at
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_090609.md`.
Scenario 12 remains Partial because this clears stale dependency-evidence
handling and refreshes residual governance, but full resolver-backed
JVM/transitive SCA, human preservation review, broader live social/account-graph
abuse proof, and final RC evidence still remain.

Loop 438 evidence note: preservation deletion evidence now requires durable
replacement anchors for every deleted inherited artifact classification. The
deletion gate validates that removed cashier/payment/crypto routes and clients
are covered by the live no-money-boundary proof harness, retired money helpers
are replaced by point-ledger and wallet-client presentation tests, relocated
Office audit/activity tests still exist, and retired bet replay proof is
replaced by the point-native prediction reconciliation command and fixture.
`make qa-preservation-deletions` passed at
`revival/artifacts/preservation_deletion_map_20260630_091216.md` with 54
deleted artifacts classified and replacement evidence emitted per path.
`make qa-preservation-modifications` passed at
`revival/artifacts/preservation_modification_map_20260630_091234.md` with 415
modified tracked artifacts classified, 95 high-risk contract files, and 37
large-change files. `make qa-preservation-contract-anchors` passed at
`revival/artifacts/preservation_contract_anchors_20260630_091234.md` with no
unexpected inherited public contract anchor removals. `make qa-preservation-production-dossier`
passed at
`revival/artifacts/production_preservation_dossier_20260630_091327.md`,
recording the rewrite-sized tracked diff, 78 high-risk review queue entries,
and 647 classified untracked artifacts. `git diff --check` passed, the local
stack was stopped, and `make qa-rc-completion-audit` still fails correctly with
Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_091544.md`. Scenario 12
remains Partial because this strengthens machine-checkable preservation
evidence, but it does not replace human preservation review, broader live
social/account-graph abuse proof, full resolver-backed JVM/transitive SCA, or
final RC evidence.

Loop 439 evidence note: backend launch-facing lifecycle copy and nearby
production comments were tightened from money/cash/bet wording to point-native
wording without renaming inherited DB columns or removing compatibility routes.
The settled lifecycle description now says final results and point
disbursements are recorded, and `TestDescribeTapTradeMarketLifecycleUsesPointNativeCopy`
guards lifecycle descriptions against launch-prohibited money/cash/payout/bet
terms. Wallet reservation defaults now use `prediction_order` when a caller
does not pass a reference type, and point-reservation comments replaced stale
cash-reservation wording in the prediction exchange and settlement paths.
Verification passed with
`go test ./services/gateway/internal/prediction ./services/gateway/internal/wallet -count=1`,
`git diff --check`, and a targeted `rg` scan for the cleaned phrases returning
no matches in prediction/wallet production code. Preservation evidence was
refreshed: `make qa-preservation-modifications` passed at
`revival/artifacts/preservation_modification_map_20260630_092125.md`, and
`make qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_092125.md`.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_092353.md`. Scenario 12
remains Partial because this closes one backend point-native copy/default
cleanup slice, not human preservation review, broader live social/account-graph
abuse proof, full resolver-backed JVM/transitive SCA, or final RC evidence.

Loop 440 evidence note: the maintained abuse-boundary gate now includes a
DB-backed multi-instance social graph proof. `TestMarketSocialSQLStorePersistsAcrossServiceInstances`
opens two independent SQL social stores against one Postgres database and
proves comments, reactions, reports, report resolution, follows, profiles, user
activity, and global activity remain shared across instances; duplicate
reactions and follows stay idempotent through SQL primary keys. `make
qa-abuse-boundary` passed at `revival/artifacts/abuse_boundary_20260630_093100.md`,
with the social proof log at
`revival/artifacts/abuse_boundary_20260630_093100_dbbacked_multiinstance_social_graph_controls.log`.
The production preservation dossier was refreshed at
`revival/artifacts/production_preservation_dossier_20260630_093447.md` with 82
high-risk review queue entries and 657 classified untracked artifacts.
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_093413.md`. Scenario 12
remains Partial because this clears DB-backed social graph persistence/
idempotency evidence, not human preservation review, cross-node social
rate-limit enforcement, full resolver-backed JVM/transitive SCA, or final
authenticated RC journey evidence.

Loop 441 evidence note: social write limiter state is now DB-backed when the
gateway has a DB connection, while no-DB paths keep the inherited in-memory
token bucket. Migration `049_prediction_social_write_limits.sql` owns the
persistent shared token-bucket table and `TestSocialWriteLimiterMigrationOwnsPersistentStore`
guards that schema anchor. `TestMarketSocialSQLWriteLimiterBlocksAcrossRouteInstances`
opens two independent route instances against one Postgres database and proves
same-user and same-IP comment bursts are blocked across instances without
persisting blocked comments. `make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_094247.md`, and
`go test ./services/gateway/internal/http -count=1` passed. The production
preservation dossier was refreshed at
`revival/artifacts/production_preservation_dossier_20260630_094321.md` with 83
high-risk review queue entries and 663 classified untracked artifacts. `make
qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_094605.md`. Scenario 12
remains Partial because this clears cross-instance social limiter evidence, not
human preservation review, remaining backend legacy-contract cleanup, full
resolver-backed JVM/transitive SCA, or final authenticated RC journey evidence.

Loop 442 evidence note: the stale manual canonical-browser proof now has a
maintained wrapper target. `scripts/qa/canonical-browser-journey.sh` runs the
existing rendered-player Playwright proof
`frontend/e2e/prediction/canonical-browser.ui.spec.ts`, writes
`revival/42_CANONICAL_BROWSER_JOURNEY.md` plus timestamped artifacts, and is
exposed as `make qa-canonical-browser-journey`. The wrapper first probes the
running player root and same-origin `/api/v1/status` gateway proxy, then runs
the Playwright UI project against `PREDICT_BASE_URL`, defaulting to
`http://127.0.0.1:3022`. Verification for this loop covered script syntax,
Makefile dry-run wiring, and local stack status:
`bash -n scripts/qa/canonical-browser-journey.sh`, `make -n
qa-canonical-browser-journey`, and `scripts/local-stack.sh status` all behaved
as expected, with backend, gateway, office, and player stopped. `make
qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_095420.md`, and
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_095420.md`. Scenario 12
remains Partial because this creates the maintained proof gate but does not
itself execute the authenticated canonical journey against a seeded running
stack, nor does it replace human preservation review, remaining backend
legacy-contract cleanup, or full resolver-backed JVM/transitive SCA.

Loop 443 evidence note: the canonical browser proof now has a disposable
DB-backed seeded-stack runner and fresh passing evidence. `scripts/qa/canonical-browser-stack.sh`
starts an ephemeral Postgres container, applies gateway migrations, runs demo
seed data, starts DB-backed auth, DB-backed gateway, and the TapTrade player app
on free local ports, verifies the same-origin player `/api/v1/status` proxy,
and then invokes `make qa-canonical-browser-journey`. `make
qa-canonical-browser-stack` passed at
`revival/artifacts/canonical_browser_stack_20260630_100541.md`; the nested
browser gate passed at
`revival/artifacts/canonical_browser_journey_20260630_100649.md`, and the
Playwright log shows setup plus UI specs both passed in `33.1s`. The browser
test now uses the current open seeded order-book market `MLBB-FINAL-G1` rather
than the demo-settled `VAL-MASTERS-FINAL` fixture, preserving the same
canonical journey coverage against current demo data. `make
qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_101039.md`, and
`make qa-rc-completion-audit` still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_101039.md`. Scenario 12
remains Partial because this clears the fresh authenticated canonical browser
proof, but does not replace human preservation review, remaining backend
legacy-contract cleanup, or full resolver-backed JVM/transitive SCA.

Loop 444 evidence note: the production-preservation dossier now adds a
per-file `Review Focus` column for the high-risk inherited-contract queue and
a human review checklist covering auth/session, gateway HTTP/admin, prediction
engine, wallet ledger, and public API/client changes. `bash -n
scripts/qa/preservation-production-dossier.sh` passed, and `make
qa-preservation-production-dossier` passed at
`revival/artifacts/production_preservation_dossier_20260630_101602.md` with
83 high-risk review queue entries and 679 classified untracked artifacts.
Scenario 12 remains Partial because this makes preservation review more
actionable but does not replace human sign-off, remaining backend
legacy-contract cleanup, or full resolver-backed JVM/transitive SCA.

Loop 445 evidence note: admin CRM note categories now use the shared
launch-facing copy guard before persistence. `POST /api/v1/admin/punters/{id}/notes`
already rejected unsafe note content; it now trims and rejects unsafe
`category` values as well. `TestAdminPunterAddNoteRejectsMoneyWordingCategory`
proves `cash payout review` returns 400 with `field: category`, is not echoed,
and writes no note. `go test ./services/gateway/internal/http -run
'TestAdminPunterAddNote' -count=1`, `make qa-preservation-modifications`, and
`make qa-preservation-production-dossier` passed. `make qa-rc-completion-audit`
still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_102215.md`.

Loop 446 evidence note: resolver-backed JVM/SBT evidence is now present. A
workspace-local Java 17 plus SBT toolchain ran `make security-jvm-required`,
refreshing `revival/12_JVM_DEPENDENCY_BASELINE.md` and
`revival/artifacts/backend_sbt_update_2026-06-30.log` with successful SBT
update/eviction output. `make security-sbom` refreshed
`revival/21_SBOM_BASELINE.md` with `revival/artifacts/sbom_20260630_122817/`,
including an ok `phoenix-backend (resolved classpath)` component. Direct JVM OSV
and residual governance passed through
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_102806.md` and
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_102808.md`. The
new `security-jvm-osv-resolved-classpath` launch-readiness step wrote
`revival/68_JVM_OSV_RESOLVED_CLASSPATH_BASELINE.md` and
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_103139.md`,
covering 233 resolved package/version coordinates and reporting 31 coordinates
with OSV findings across 77 unique OSV ids. `make qa-rc-completion-audit` still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_103847.md`. Scenario 12
remains Partial because those resolved findings still require remediation,
compatibility validation, or explicit residual-risk acceptance, and human
preservation review plus remaining backend legacy-contract cleanup also remain.

Loop 447 evidence note: resolved JVM classpath OSV findings now have an
executable residual-governance gate. `scripts/qa/jvm-resolved-residual-advisory-gate.sh`
reads the latest `jvm_osv_resolved_classpath_baseline_*.json` artifact and
fails any resolved coordinate with OSV findings unless it matches an explicit
reviewed residual policy at `revival/jvm_resolved_residual_allowlist.json` or
the path supplied through `JVM_RESOLVED_RESIDUAL_ADVISORY_POLICY`. The Makefile
target `security-jvm-resolved-residual-advisories` is wired into launch
readiness after the resolved-classpath OSV baseline and direct residual gate.
The first run failed as intended at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_104108.md`
because no reviewed resolved residual policy exists yet. Scenario 12 remains
Partial until those resolved JVM findings are remediated or explicitly accepted
through reviewed residual entries, and human preservation review plus remaining
backend legacy-contract cleanup also remain. Preservation was refreshed at
`revival/artifacts/preservation_modification_map_20260630_104207.md` and
`revival/artifacts/production_preservation_dossier_20260630_104207.md`; the RC
completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_104226.md`.

Loop 448 evidence note: the first compile-verified JVM remediation batch is in
place. Direct RabbitMQ and Akka Stream Kafka versions moved to fixed lines, and
the backend now applies security dependency overrides for fixed transitive
runtime libraries including Jackson, Guava, OkHttp/Okio, Jakarta Mail,
commons-beanutils/io/net/compress/lang3, Avro, RESTEasy multipart, PostgreSQL,
and snappy-java. Akka Management, SnakeYAML, BouncyCastle, Keycloak, Scala, POI,
and related deeper-compatibility items remain residual follow-up because fixed
candidates either did not resolve in this SBT/Coursier build, did not clear OSV
under the same artifact family, or require broader runtime migration review.
`make security-jvm-required`, `make security-jvm-osv-resolved-classpath`,
`make security-jvm-osv-direct`, `make security-jvm-direct-residual-advisories`,
and `make security-sbom` passed. The resolved classpath baseline at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_105239.md`
now reports 236 resolved coordinates, 15 coordinates with OSV findings, and 42
unique OSV ids. The direct baseline at
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_105251.md`
now reports 3 direct coordinates with OSV findings and 12 unique OSV ids, with
direct residual governance passing at
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_105254.md`.
The resolved residual gate still fails on the remaining 15 coordinates at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_105835.md`.
Backend compile passed with saved log
`revival/artifacts/backend_compile_20260630_105900.log`, and SBOM evidence was
refreshed at `revival/artifacts/sbom_20260630_125842/`. Preservation evidence
was refreshed at
`revival/artifacts/preservation_modification_map_20260630_110208.md` and
`revival/artifacts/production_preservation_dossier_20260630_110208.md`; the RC
completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_110235.md`. Scenario 12
remains Partial until the remaining resolved JVM findings are remediated or
explicitly accepted through reviewed residual policy entries, and human
preservation review plus remaining backend legacy-contract cleanup also remain.

Loop 449 evidence note: the second compile-verified JVM remediation batch kept
only clean overrides that preserve direct residual governance. Apache MIME4J
`apache-mime4j-core` moved to `0.8.10`, Apache POI OOXML moved to `5.4.1`, and
`jawn-parser` moved to `1.3.2`. Akka HTTP `10.5.3` was rejected because the SBT
resolver surfaced a Scala XML conflict with inherited Scalate/Spoiwo
dependencies. Kafka `3.9.1` and LZ4 `1.8.1` were removed because they still
carried OSV findings and failed the direct residual gate as new unreviewed
direct residuals. `make security-jvm-required`,
`make security-jvm-osv-resolved-classpath`, `make security-jvm-osv-direct`,
`make security-jvm-direct-residual-advisories`, and `make security-sbom`
passed. The resolved classpath baseline at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_131538.md`
now reports 237 resolved coordinates, 12 coordinates with OSV findings, and 39
unique OSV ids. The direct baseline at
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_131548.md`
reports 3 direct coordinates with OSV findings and 12 unique OSV ids, with
direct residual governance passing at
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_131549.md`.
The resolved residual gate still fails on the remaining 12 coordinates at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_131550.md`.
Backend compile passed with saved log
`revival/artifacts/backend_compile_20260630_130435.log`, and SBOM evidence was
refreshed at `revival/artifacts/sbom_20260630_145448/`. Preservation evidence
was refreshed at
`revival/artifacts/preservation_modification_map_20260630_125930.md` and
`revival/artifacts/production_preservation_dossier_20260630_125955.md`; the RC
completion audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_130002.md`. Scenario 12
remains Partial until the remaining resolved JVM findings are remediated or
explicitly accepted through reviewed residual policy entries, and human
preservation review plus remaining backend legacy-contract cleanup also remain.

Loop 450 evidence note: the remaining resolved JVM residuals now have an
origin and candidate triage artifact at
`revival/70_JVM_RESOLVED_RESIDUAL_TRIAGE.md`. It records the observed origins
for the 12 residual coordinates and why the obvious narrow candidates were not
kept: Scala patch upgrades require unavailable `semanticdb-scalac_2.13.x`
artifacts for the pinned Scalafix/SemanticDB line, Circe YAML `0.15.2` fails
strict SBT resolution through missing `snakeyaml-2.2-android.jar`, newer SSHJ
trades EdDSA for still-flagged BouncyCastle artifact families, same-artifact
BouncyCastle versions stay OSV-positive, and clean Keycloak core versions
require a broader auth/session migration while `keycloak-adapter-core` has no
matching current artifact line. The latest final-state JVM evidence is
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_131538.md`,
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_131548.md`,
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_131549.md`, and
the expected failing
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_131550.md`.
Scenario 12 remains Partial because no resolved residual is accepted for launch.

Loop 451 evidence note: Java 17/SBT executable evidence was restored and the
unsafe Logback trial was rejected. Logback `1.3.16` plus SLF4J `2.0.17` reduced
unique resolved OSV ids from 39 to 36 in
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_132354.md`, but
was rolled back because a targeted Logback configuration test crashed Scala
2.13.8 compilation while importing Logback classic metadata. Current evidence
after rollback is
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_133345.md`,
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_133403.md`,
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_133411.md`, and
the expected failing
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_133418.md`.
Backend compile passed at
`revival/artifacts/backend_compile_20260630_133442.log`, and the RC audit still
fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_133528.md`. Scenario 12
remains Partial because the 12 resolved JVM residual coordinates are still not
remediated or covered by reviewed residual policy entries.

Loop 452 evidence note: the Scala resolved residual is remediated. Backend
Scala moved from `2.13.8` to `2.13.16`, `sbt-scalafix` moved from `0.9.34` to
`0.14.3`, the obsolete newer-line `scalafix-rules` dependency was removed, and
compiler-compatibility warnings were fixed directly while keeping
`-Xfatal-warnings`. `make security-jvm-required` and backend compile passed,
with compile log `revival/artifacts/backend_compile_20260630_135908.log`.
`make security-jvm-osv-resolved-classpath` now reports 238 resolved
coordinates, 11 coordinates with OSV findings, and 38 unique OSV ids at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_135649.md`.
Direct OSV evidence remains governed at
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_135730.md` and
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_135741.md`; the
resolved residual gate still fails correctly at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_135749.md`.
SBOM evidence was refreshed at `revival/artifacts/sbom_20260630_155759/`,
preservation evidence at
`revival/artifacts/preservation_modification_map_20260630_140140.md` and
`revival/artifacts/production_preservation_dossier_20260630_140208.md`, and the
RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_140223.md`. Scenario 12
remains Partial until the remaining 11 resolved JVM residual coordinates are
remediated or covered by reviewed residual policy entries.

Loop 453 evidence note: the Logback residual is reduced after the Scala
toolchain remediation made the upgrade compile-safe. Backend logging now uses
Logback `1.5.37`, `logstash-logback-encoder` `8.1`, and SLF4J `2.0.17`.
`make security-jvm-required` passed, backend compile passed with saved log
`revival/artifacts/backend_compile_20260630_141620.log`, and
`make security-jvm-osv-resolved-classpath` now reports 238 resolved
coordinates, 10 coordinates with OSV findings, and 34 unique OSV ids at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_143322.md`.
Direct OSV evidence remains governed at
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_143348.md` and
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_143348.md`; the
resolved residual gate still fails correctly at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_143348.md`.
SBOM evidence was refreshed at `revival/artifacts/sbom_20260630_163402/`,
preservation evidence at
`revival/artifacts/preservation_modification_map_20260630_143402.md` and
`revival/artifacts/production_preservation_dossier_20260630_143430.md`, and the
RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_143430.md`. Scenario 12
remains Partial because the remaining 10 resolved JVM residual coordinates are
not fully remediated or covered by reviewed residual policy.

Loop 454 evidence note: the Kafka/LZ4 resolved JVM residuals are remediated
without accepting any residual for launch. Backend Kafka clients now resolve to
`4.3.1`; that version removes the retained `org.apache.kafka:kafka-clients@3.3.2`
coordinate and moves LZ4 off `org.lz4:lz4-java@1.8.0` to
`at.yawk.lz4:lz4-java@1.10.2`. Backend compile passed at
`revival/artifacts/backend_compile_20260630_153800.log`, and
`make security-jvm-osv-resolved-classpath` now reports 238 resolved
coordinates, 8 coordinates with OSV findings, and 28 unique OSV ids at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_153740.md`.
Direct OSV evidence remains governed at
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_153927.md` and
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_153957.md`; the
resolved residual gate still fails correctly at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_154009.md`.
SBOM evidence was refreshed at `revival/artifacts/sbom_20260630_174009/`,
preservation evidence at
`revival/artifacts/preservation_modification_map_20260630_155758.md` and
`revival/artifacts/production_preservation_dossier_20260630_155758.md`, and the
RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_155758.md`. Scenario 12
remains Partial until the remaining 8 resolved JVM residual coordinates are
remediated or covered by reviewed residual policy entries.

Loop 455 evidence note: Keycloak `25.0.3` is rejected as a dependency-only
remediation. Maven metadata showed the newer adapter line exists, and the trial
direct OSV baseline at
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_160841.md`
reduced direct advisory ids from 12 to 5. It was not kept because the resolved
classpath baseline at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_160600.md`
increased coordinates with findings from 8 to 11 by adding Keycloak
`server-spi-private` and BouncyCastle `jdk18on` residuals, and backend compile
failed on moved/changed Keycloak adapter APIs used by the inherited auth
deployment builder. The code was rolled back to Keycloak `17.0.1`; backend
compile passed at `revival/artifacts/backend_compile_20260630_161305.log`,
the resolved OSV baseline returned to 238 resolved coordinates, 8 coordinates
with OSV findings, and 28 unique OSV ids at
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_161305.md`,
direct OSV evidence returned to 3 coordinates and 12 unique OSV ids at
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_161915.md`,
direct residual governance passed at
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_162001.md`, and
the resolved residual gate still fails correctly at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_162009.md`.
The RC audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_162324.md`.
Scenario 12 remains Partial because the remaining 8 resolved JVM residual
coordinates are not remediated or accepted by reviewed residual policy.

Loop 456 evidence note: SFTP/SSHJ hardening is retained, while the unsafe Akka
Streams Kafka adapter bump is rejected to preserve inherited Akka runtime
compatibility. SSHJ now resolves to `0.40.0`, with BouncyCastle `jdk18on`
artifacts pinned at `1.84`; this removes the former
`net.i2p.crypto:eddsa@0.2.0` residual from the Alpakka FTP path. The
production-relevant SFTP flows passed against a real Testcontainers SFTP server
in `revival/artifacts/sftp_dependency_compat_20260630_162558.log` with 3 suites
and 4 tests passing. Testcontainers moved from `1.16.3` to `1.21.4`, and its
test harness host accessors now use `getHost` so Docker Desktop verification
works. `akka-stream-kafka` was rolled back from the trial `4.0.2` to the
inherited-compatible `3.0.0` because `4.0.2` pulled Akka `2.7.0` artifacts into
the inherited Akka `2.6.19` classpath and caused ActorSystem startup failure.
Backend compile passed at `revival/artifacts/backend_compile_20260630_165054.log`.
The retained resolved JVM baseline is
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_164958.md`,
with 239 resolved coordinates, 8 coordinates with OSV findings, and 28 unique
OSV ids. Direct evidence is
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_165026.md` and
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_165053.md`; the
resolved residual gate still fails correctly at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_165054.md`.
SBOM and preservation evidence were refreshed at
`revival/artifacts/sbom_20260630_185121/`,
`revival/artifacts/preservation_modification_map_20260630_165234.md`,
`revival/artifacts/preservation_deletion_map_20260630_165257.md`,
`revival/artifacts/preservation_contract_anchors_20260630_165258.md`, and
`revival/artifacts/production_preservation_dossier_20260630_165247.md`. The RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_165306.md`. Scenario 12
remains Partial because 8 resolved JVM residual coordinates still require
remediation or reviewed residual policy.

Loop 457 evidence note: SnakeYAML was trialed and rejected rather than retained
as a partial improvement that breaks direct residual governance. SnakeYAML `2.6`
could not resolve because Coursier attempts to fetch a missing
`snakeyaml-2.6-android.jar`, even when the override points directly at the
official Maven Central jar. SnakeYAML `1.33` compiled and reduced unique
resolved JVM OSV ids from 28 to 22, and the focused OpenAPI YAML route
regression passed at
`revival/artifacts/snakeyaml_openapi_compat_20260630_170000.log`, but it still
carried `GHSA-mjmj-j48q-9wg2` and caused the direct residual gate to fail at
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_170032.md`. The
override was rolled back; the OpenAPI YAML regression was retained and passed
after rollback at `revival/artifacts/openapi_yaml_regression_20260630_170100.log`.
Backend compile passed at `revival/artifacts/backend_compile_20260630_170100.log`,
direct JVM evidence returned to
`revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_170135.md` with
the direct residual gate passing at
`revival/artifacts/jvm_direct_residual_advisory_gate_20260630_170137.md`, and
the retained resolved JVM baseline returned to
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_170146.md`
with 239 resolved coordinates, 8 coordinates with OSV findings, and 28 unique
OSV ids. The resolved residual gate still fails correctly at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_170155.md`.
Preservation evidence passed at
`revival/artifacts/preservation_modification_map_20260630_170321.md` and
`revival/artifacts/production_preservation_dossier_20260630_170335.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_170337.md`. Scenario 12
remains Partial.

Loop 458 evidence note: the retained resolved JVM residuals now have an
explicit drift policy instead of remaining unreviewed. Added
`revival/jvm_resolved_residual_allowlist.json` for the exact 8 resolved
coordinates and 28 OSV ids from
`revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_170146.md`;
each entry records the compatibility-constrained remediation rationale and is
marked pending launch-owner sign-off. `make security-jvm-resolved-residual-advisories`
passed at
`revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_171007.md`,
proving the current resolved JVM OSV findings match the reviewed policy exactly
and that stale policy entries will fail after future remediation. Preservation
evidence was refreshed at
`revival/artifacts/preservation_modification_map_20260630_171018.md` and
`revival/artifacts/production_preservation_dossier_20260630_171019.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_171019.md`. Scenario 12
remains Partial because the residual policy still needs launch-owner/security
acceptance or remediation, and high-risk inherited production-contract
preservation review remains required.

Loop 459 evidence note: public and moderation-visible user-generated text now
shares the launch-copy boundary used by admin reason fields. `/api/v1/disputes`
rejects unsafe holder-filed `reason` text before market lookup or dispute
creation; `/api/v1/social/markets/{marketId}/comments` rejects unsafe public
comment `body` text before rate-limit/store work; and
`/api/v1/social/comments/{commentId}/report` rejects unsafe report `reason`
text before report persistence. Focused tests prove unsafe values are not
echoed and do not persist comments, reports, or dispute state, and the full
gateway HTTP package passed at
`revival/artifacts/user_generated_copy_boundary_20260630_171545.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_171606.md`; preservation gates passed
at `revival/artifacts/preservation_modification_map_20260630_171606.md` and
`revival/artifacts/production_preservation_dossier_20260630_171606.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_171606.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 460 evidence note: public/user activity reward rows no longer echo raw
stored loyalty ledger `reason` values. SQL-backed social user/global activity
still includes `loyalty_ledger` rows, but reward bodies now render point-safe
generic text (`Earned N reward points` or `Reward adjustment N points`) instead
of appending stored reasons, preventing legacy/imported reason values from
resurfacing on `/activity` or public profiles. The full gateway HTTP package
passed at `revival/artifacts/activity_reason_boundary_20260630_171939.log`, and
the player app regression suite passed at
`revival/artifacts/activity_reason_frontend_regression_20260630_171954.log`.
Preservation gates passed at
`revival/artifacts/preservation_modification_map_20260630_172020.md` and
`revival/artifacts/production_preservation_dossier_20260630_172020.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_172020.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 461 evidence note: legacy unsafe social text is now redacted on public
read paths while remaining available in storage for moderation review. Public
market comment lists, created/updated comment responses, user activity, global
activity, and admin social activity exports run comment/activity bodies through
the points-only launch boundary and replace unsafe legacy text with
`Removed by points-only safety boundary.` A regression seeds a legacy
`cash payout` comment directly into the social store, verifies raw moderation
storage remains intact, and proves public comment, global activity, and user
activity responses do not echo the unsafe text. The full gateway HTTP package
passed at
`revival/artifacts/social_read_redaction_boundary_20260630_172426.log`.
Preservation gates passed at
`revival/artifacts/preservation_modification_map_20260630_172426.md` and
`revival/artifacts/production_preservation_dossier_20260630_172426.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_172426.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 462 evidence note: legacy unsafe CMS content is now redacted on public
read paths without changing raw admin records. Public `/api/v1/content/{slug}`
responses sanitize page title/content, meta fields, and nested JSON block
strings; public `/api/v1/banners` responses sanitize banner title/link fields.
The regression proves raw page/banner values are not mutated while unsafe
public values are replaced with `Removed by points-only safety boundary.` and
safe nested block text remains intact. The full gateway HTTP package passed at
`revival/artifacts/content_public_redaction_boundary_20260630_173148.log`.
`make qa-abuse-boundary` passed at
`revival/artifacts/abuse_boundary_20260630_173213.md`; preservation gates passed
at `revival/artifacts/preservation_modification_map_20260630_173237.md` and
`revival/artifacts/production_preservation_dossier_20260630_173237.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_173258.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 463 evidence note: the public read-side redaction helper is now shared
from the launch-boundary utility rather than being defined in the social route
file. CMS and social public payloads use one
`redactLaunchProhibitedUserText` implementation, with focused coverage for
money wording, redeemable wording, allowed `non-redeemable` disclosure copy,
and safe points-only copy. The full gateway HTTP package passed at
`revival/artifacts/shared_redaction_boundary_20260630_173603.log`.
Preservation gates passed at
`revival/artifacts/preservation_modification_map_20260630_173616.md` and
`revival/artifacts/production_preservation_dossier_20260630_173616.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_173637.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 464 evidence note: Predict-native public leaderboard cards now redact
legacy unsafe category display copy and suppress generated category boards with
unsafe public identifiers. Public `/api/v1/leaderboards` payloads redact board
`name`, `description`, and `rewardSummary`, while a generated category board
whose ID/slug contains prohibited wording is omitted from the public list
instead of emitting identifiers such as `category:crypto`. Admin/recompute
internals remain unchanged for review. The full gateway HTTP package passed at
`revival/artifacts/leaderboard_public_redaction_boundary_20260630_174039.log`.
Preservation gates passed at
`revival/artifacts/preservation_modification_map_20260630_174053.md` and
`revival/artifacts/production_preservation_dossier_20260630_174053.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_174113.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 465 evidence note: public loyalty tier payloads now redact legacy unsafe
tier display and benefit text on read. Predict-native `/api/v1/loyalty/tiers`
and the older loyalty tier response builder route `rankName` and benefit
strings through the shared points-only redaction helper, while admin
storage/review behavior remains unchanged. The full gateway HTTP package
passed at
`revival/artifacts/loyalty_tier_public_redaction_boundary_20260630_174442.log`.
Preservation gates passed at
`revival/artifacts/preservation_modification_map_20260630_174458.md` and
`revival/artifacts/production_preservation_dossier_20260630_174458.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_174524.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 484 evidence note: public prediction catalog reads now redact restored or
imported unsafe display copy without mutating inherited prediction records.
Discovery, category, series, tag, event, and market responses sanitize copied
display text; event payloads sanitize nested markets; and market payloads
sanitize nested translation and settlement-parameter JSON strings. Category
detail also rejects restored taxonomy rows whose slug is safe but whose stored
display copy remains launch-prohibited. Focused catalog regressions passed,
the full gateway HTTP package passed at
`revival/artifacts/prediction_public_catalog_redaction_boundary_20260630_193320.log`,
and the prediction package passed with the taxonomy guard. Abuse and
preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_193350.md`,
`revival/artifacts/preservation_deletion_map_20260630_193401.md`,
`revival/artifacts/preservation_modification_map_20260630_193402.md`, and
`revival/artifacts/production_preservation_dossier_20260630_193416.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_193418.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 485 evidence note: admin market list and export reads now reuse sanitized
market copies instead of serializing restored raw market copy directly.
`/api/v1/admin/markets` JSON responses and
`/api/v1/admin/markets?format=csv` exports redact unsafe title, description,
category, translation, settlement source/rule/params, and fallback source
copy while preserving the backing market record for operator review. Focused
admin/catalog regressions passed, the full gateway HTTP package passed at
`revival/artifacts/admin_market_read_redaction_boundary_20260630_193733.log`,
and the prediction package passed. Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_193743.md`,
`revival/artifacts/preservation_deletion_map_20260630_193754.md`,
`revival/artifacts/preservation_modification_map_20260630_193755.md`, and
`revival/artifacts/production_preservation_dossier_20260630_193810.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_193813.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 486 evidence note: admin taxonomy and market-detail reads now serialize
sanitized response copies. Admin category and series list/create responses use
taxonomy payload helpers, admin tag reads redact unsafe restored tag values,
and admin market detail/edit responses use sanitized market copies. Focused
admin read regressions passed, the full gateway HTTP package passed at
`revival/artifacts/admin_taxonomy_detail_read_redaction_boundary_20260630_194115.log`,
and the prediction package passed. Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_194124.md`,
`revival/artifacts/preservation_deletion_map_20260630_194135.md`,
`revival/artifacts/preservation_modification_map_20260630_194136.md`, and
`revival/artifacts/production_preservation_dossier_20260630_194150.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_194153.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 487 evidence note: admin prediction-risk snapshot reads now serialize a
sanitized copy of aggregate market rows. `/api/v1/admin/prediction/risk` and
the CSV export redact unsafe restored settlement-aging and concentration
tickers while preserving the raw `prediction.RiskSnapshot` for operator
review. Focused risk regressions passed, the full gateway HTTP package passed
at
`revival/artifacts/admin_risk_snapshot_read_redaction_boundary_20260630_194511.log`,
and the prediction package passed. Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_194523.md`,
`revival/artifacts/preservation_deletion_map_20260630_194536.md`,
`revival/artifacts/preservation_modification_map_20260630_194537.md`, and
`revival/artifacts/production_preservation_dossier_20260630_194551.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_194554.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 488 evidence note: order placement and preview HTTP errors now redact
unsafe service-message copy before serialization. Existing reason-code details
for prediction-limit and responsible-play blocks remain unchanged, while
restored unsafe market ticker text in service errors is replaced at the
response boundary. Focused order-error regressions passed, the full gateway
HTTP package passed at
`revival/artifacts/order_service_error_redaction_boundary_20260630_194902.log`,
and the prediction package passed. Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_194918.md`,
`revival/artifacts/preservation_deletion_map_20260630_194931.md`,
`revival/artifacts/preservation_modification_map_20260630_194932.md`, and
`revival/artifacts/production_preservation_dossier_20260630_194948.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_194950.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 489 evidence note: remaining admin prediction service errors in
`prediction_handlers.go` now use the shared HTTP response redaction boundary.
Admin market/source/event, taxonomy, lifecycle, resolution, jurisdiction,
void, and settlement bad-request paths call `serviceBadRequestError`, which
redacts launch-prohibited wording before serialization while preserving the
underlying service/repository error internally. The new create-market
regression injects an unsafe repository error, proves the error envelope uses
the launch redaction marker, proves the unsafe wording is not echoed, and
proves no market is persisted. Focused admin/order error regressions passed,
the full gateway HTTP package passed at
`revival/artifacts/prediction_admin_service_error_redaction_boundary_20260630_195715.log`,
and the prediction package passed. Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_195736.md`,
`revival/artifacts/preservation_deletion_map_20260630_195748.md`,
`revival/artifacts/preservation_modification_map_20260630_195748.md`, and
`revival/artifacts/production_preservation_dossier_20260630_195803.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_195807.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 490 evidence note: adjacent gateway HTTP handlers now close the same raw
service-error echo class outside prediction market routes. Admin dispute
resolution, KYC decisions, predict-loyalty adjustments, CMS page/banner
creation, partner webhook URL validation, campaign lifecycle actions, bonus
forfeits, and point-alias campaign validation redact launch-prohibited wording
before returning bad-request messages. Existing structured field details are
preserved, and the gateway HTTP scan for raw `BadRequest(err.Error())` now
finds only redacting helper constructors. Focused helper/handler regressions
passed, the full gateway HTTP package passed at
`revival/artifacts/gateway_http_service_error_redaction_boundary_20260630_200304.log`,
and the prediction package passed. Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_200326.md`,
`revival/artifacts/preservation_deletion_map_20260630_200338.md`,
`revival/artifacts/preservation_modification_map_20260630_200338.md`, and
`revival/artifacts/production_preservation_dossier_20260630_200354.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_200357.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 491 evidence note: gateway HTTP status/error-body responses now redact
another client-visible legacy-copy echo class. RBAC conflict/not-found,
forbidden, and validation errors; CMS page/banner not-found responses; bonus
campaign/player-bonus not-found responses; and bonus claim conflict/forbidden
JSON error bodies redact launch-prohibited wording before serialization.
Bonus claim branching still uses the raw service error to preserve status
semantics, but the serialized `error` field is redacted. Focused RBAC/bonus
regressions passed, the full gateway HTTP package passed at
`revival/artifacts/gateway_http_error_status_redaction_boundary_20260630_200750.log`,
and the prediction package passed. Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_200805.md`,
`revival/artifacts/preservation_deletion_map_20260630_200817.md`,
`revival/artifacts/preservation_modification_map_20260630_200818.md`, and
`revival/artifacts/production_preservation_dossier_20260630_200833.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_200837.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 492 evidence note: preserved legacy transfer admin compatibility errors
now use launch-neutral human-readable copy without changing their route or
payload contracts. `mapAlphaCashierAdminError` keeps status mapping and field
details, but disabled-rail, disabled external-release, invalid-status,
missing-request, insufficient-point-account, reservation, and internal-failure
messages no longer serialize old cashier/withdrawal/wallet wording. Focused
regressions passed, the full gateway HTTP package passed at
`revival/artifacts/legacy_transfer_admin_error_copy_boundary_20260630_201255.log`,
and the prediction package passed. Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_201307.md`,
`revival/artifacts/preservation_deletion_map_20260630_201317.md`,
`revival/artifacts/preservation_modification_map_20260630_201318.md`, and
`revival/artifacts/production_preservation_dossier_20260630_201333.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_201336.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 493 evidence note: gateway HTTP raw service-error echo cleanup now has a
maintained source-level regression. `TestGatewayHTTPHandlersDoNotEchoRawServiceErrors`
scans handler sources and rejects direct raw `err.Error()` serialization
through bad-request/status helpers, `stdhttp.Error`, or JSON `error` bodies
while allowing centralized redacting helper constructors. Focused source-guard
tests passed, the full gateway HTTP package passed at
`revival/artifacts/gateway_http_raw_error_echo_guard_20260630_201641.log`, and
the prediction package passed. Abuse and preservation gates passed at
`revival/artifacts/abuse_boundary_20260630_201652.md`,
`revival/artifacts/preservation_deletion_map_20260630_201701.md`,
`revival/artifacts/preservation_modification_map_20260630_201702.md`, and
`revival/artifacts/production_preservation_dossier_20260630_201715.md`; the RC
audit still fails correctly with Scenario 12 Partial at
`revival/artifacts/rc_completion_audit_gate_20260630_201718.md`. Scenario 12
remains Partial because launch-owner/security residual-policy acceptance and
high-risk inherited production-contract preservation review still remain.

Loop 519 evidence note: Scenario 12 signoff governance is now visible in the
production preservation dossier rather than classified as generic low-risk
revival evidence. `revival/signoffs/` is classified as medium launch signoff
governance, the current production signoff template references
`production_preservation_dossier_20260701_084313.md`, and the signoff gate
fails only because both security residual and production preservation templates
remain pending without accepted or approved status, named reviewer, or ISO
signoff date. The RC completion audit still fails correctly with Scenario 12
Partial at `revival/artifacts/rc_completion_audit_gate_20260701_084411.md`.
Scenario 12 remains Partial because real security residual acceptance or
remediation and human production-preservation signoff still remain.

Loop 520 evidence note: a bounded reviewer handoff now exists at
`revival/artifacts/scenario_12_reviewer_handoff_20260701_084500.md`. It points
reviewers to the two pending signoff files, current security residual packet,
production contract review pack, production preservation dossier
`production_preservation_dossier_20260701_084732.md`, signoff gate
`scenario_12_signoff_gate_20260701_084755.md`, and RC audit
`rc_completion_audit_gate_20260701_084755.md`. The handoff records the
preservation diff scale, security residual focus areas, reviewer commands, and
non-negotiable no-fiat/no-crypto/no-withdrawal/no-cash-equivalent/no-redeemable
constraints. Scenario 12 remains Partial because a handoff is not human
acceptance or remediation.
