# Enterprise Prediction Market PAM / Back Office Spec

> **Status:** Specification, reconciled against the implemented system. The requirements were
> synthesized from four evidence sources — public PAM vendor research, the Idefix
> PAM/back-office source-code audit, the OMEGA CORE back-office screenshot reverse
> engineering, and prediction-market product adaptation — per the traceability matrix in
> `/docs/pam-traceability-matrix.md`. **As of the June 2026 reconciliation, an actual
> implementation exists** (`Taya_NA_Predict` — the Phoenix-Predict-Combined Go gateway +
> `talon-backoffice`). The spec has been updated to reflect what is built, partial, and
> missing; see the new **Section 37 (Reconciliation with the Implemented System)** and the
> revised **Section 36 (Progress Matrix)**. The original greenfield framing ("no trading
> domain exists") is superseded: the prediction-market trading/settlement core is the
> *strongest* implemented area; the gaps are in compliance depth and back-office breadth.
> Evidence: `/docs/taya-gap-analysis.md` and `/docs/codex-vs-claude-comparison.md`.

## 1. Product Definition

An enterprise-grade Player Account Management (PAM) and back-office platform for a
**prediction market** application. It gives operators a single console to onboard and manage
**traders** (players), run **KYC/AML/compliance** and **responsible-trading** controls,
operate **wallets and a double-entry ledger**, manage **deposits and withdrawals**, oversee
**markets, orders, trades, positions, exposure, and settlement**, monitor **market integrity
and fraud**, run **CRM/segmentation/bonuses**, and produce **regulatory and financial
reporting** — all multi-brand, multi-jurisdiction, permissioned, and fully audited.

The operational and compliance half of the platform adapts a mature iGaming PAM
(Idefix/OMEGA lineage). The **prediction-market trading core is greenfield**: no source
vendor or audited codebase contains markets, orders, positions, exposure, or contract
settlement.

## 2. Evidence Base

- **Vendor research** (`/docs/pam-vendor-research.md`): GamMatrix/EveryMatrix, Pragmatic
  Solutions, Bragg, OMEGA CORE — a 32-capability enterprise PAM baseline.
- **Idefix source audit** (`/docs/idefix-source-audit.md`): `gstech-backoffice` (legacy CRA
  app) and `idefix-backoffice` (Nx rewrite) are **two generations of the same iGaming PAM
  frontend**. Strong reusable player-360, KYC/AML, responsible-gaming, notes/audit, CRM, and
  reporting surfaces. **No backend, no ledger, no trading domain.**
- **OMEGA screenshot audit** (`/docs/omega-screenshot-audit.md`): 37 screens of OMEGA CORE
  v5 — twelve top-level sections; standout modules are the AWA auto-withdrawal rules engine,
  Nevada compliance report suite, Brand Registry config switchboard, Engage gamification,
  Player Tags, and Core Users RBAC + Staff Change Log + Dual Approval.
- **Parity & traceability**: `/docs/pam-feature-functionality-parity.md`,
  `/docs/pam-traceability-matrix.md`. **Domain model**: `/docs/pam-domain-model.md`.
- **Implemented-system audit** (June 2026): `/docs/taya-gap-analysis.md` — built-vs-missing
  assessment of `Taya_NA_Predict` against this spec, cross-checked by an independent re-audit
  in `/docs/codex-vs-claude-comparison.md`. Key facts feeding back into this spec: the active
  backend is a single Go gateway (`go-platform/services/gateway`, the Scala `phoenix-backend`
  is dead legacy); the app was forked from a sportsbook codebase on 2026-04-16; custody is
  custodial off-chain (a Postgres cents ledger), and the on-chain non-custodial stack
  (`contracts/`, `services/relayer`) exists only as a design seed.

## 3. Product Goals

1. One permissioned console for the full trader lifecycle and the full market lifecycle.
2. Financial integrity: every balance change posts to an immutable double-entry ledger;
   balances are always derivable from the ledger.
3. Regulator-ready compliance: KYC/AML/sanctions/PEP, responsible trading, jurisdiction
   gating, immutable audit, and statutory reporting.
4. Operational safety: segregation of duties, dual approval for high-risk financial actions,
   and tamper-evident audit.
5. Multi-brand, multi-jurisdiction configurability without code changes.
6. Reuse the proven Idefix compliance/operational surfaces; build the trading core to a high
   correctness bar.

## 4. Non-Goals

- Building a casino/sportsbook content aggregator, RNG/live-casino studio, or odds engine
  (integrate, don't build).
- Building a standalone affiliate platform or full website CMS.
- Player-facing trading UI/app (this spec is the back office; the trading API surface is
  shared but the trader-facing client is out of scope here).
- Reusing legacy gambling-specific mechanics (RTP, jackpots, free spins, bonus-wagering
  multipliers) except as conceptual analogs.
- Day-one native sanctions/PEP screening engine (use an integrated vendor first).

## 5. Assumptions and Product Decisions

- **PD-1 (revised)** The backend/data tier is **no longer greenfield** — an active Go gateway
  (`go-platform/services/gateway`) with ~45+ migrations implements identity, RBAC, wallet/
  ledger, the trading engine, settlement, audit, webhooks, and compliance gates. New work
  *extends* this system rather than building from zero. (The Idefix repos remain a UX/domain
  reference only.)
- **PD-2 (revised)** The implemented stack is the canonical target: Go gateway backend +
  `talon-backoffice` (Next.js / React, App-Router `packages/office/app/(dashboard)/*`). The
  Idefix Nx layout informed the original design but is not what shipped.
- **PD-3** Balances are ledger-derived. **Reality note:** the implemented ledger is
  *single-entry running-balance with idempotency keys*, not double-entry; migrating to
  double-entry (the spec invariant) is an open remediation item, not a fresh build.
- **PD-4** RBAC is a role/permission/scope model. **Built** in the gateway (migrations 027/038/
  040) — the Idefix boolean-flag model was never used here.
- **PD-5** Player Tags are the universal targeting/gating primitive (OMEGA pattern). **Not yet
  implemented** (segmentation is a gap).
- **PD-6** Withdrawal automation follows the OMEGA AWA rules-engine pattern. **Not yet
  implemented** — current withdrawals are manual two-person review with no auto-approval rules.
- **PD-7** Configuration uses an OMEGA-style Brand Registry key-value store + Brand Country
  per-jurisdiction switchboard. **Partial** — per-market jurisdiction + global geo-gate exist;
  a key-value config registry and brand/jurisdiction admin UI do not.
- **LEG-1** The venue operates under a financial/prediction-market regulatory regime (e.g.
  CFTC/DCM-style or equivalent), not a gambling license; exact regime is an open legal
  question. **Reality note:** the implementation currently relies on **geofencing (default
  block US)** as the load-bearing control and is positioned to not operate in the US.
- **LEG-2** Immutable financial-record retention may conflict with data-erasure rights;
  resolved by legal review.
- **PD-8** Market microstructure: the implemented engine is a **central limit order book
  (CLOB)** with complementary YES/NO issuance (Kalshi/Polymarket model); a legacy LMSR AMM
  remains only for pre-migration markets and is slated for retirement.
- **PD-9 (new)** Custody is **custodial off-chain** today (single treasury, internal cents
  ledger, human-broadcast withdrawals, default-off crypto rail). The non-custodial on-chain
  settlement stack (`contracts/src` Solidity interfaces, `services/relayer`, `bridge-watcher`)
  is a **design seed, not runnable**; whether to build it out is a product decision.

## 6. User Roles

- **Super Admin** — manage admin users, roles, brands, global config.
- **Compliance Officer** — KYC decisions, AML review, sanctions/PEP, responsible-trading,
  cases, regulatory reports.
- **Risk/Fraud Analyst** — risk rules, fraud cases, duplicate detection, market-integrity
  alerts.
- **Finance/Payments Operator** — deposits, withdrawals (within AWA), manual adjustments
  (maker), ledger review.
- **Finance Approver** — checker for dual-approval adjustments/settlements.
- **Market Operations** — create/configure/suspend/resolve markets, run settlement.
- **Support Agent** — player search, notes, communications, read-only finance.
- **Marketing/CRM** — segments, campaigns, bonuses (no financial mutation).
- **Auditor (read-only)** — full read + audit-log access, no writes.

Roles are brand/jurisdiction-scoped. *Source: Idefix `RiskRole`/user flags; OMEGA Core Users;
vendor RBAC; Product Decision.*

## 7. Permission Model

Granular `Permission(resource, action, scope, requiresDualApproval)` aggregated into `Role`s.
Resources include: player, account.status, kyc, aml, wallet, ledger, deposit, withdrawal,
adjustment, market, order, settlement, case, segment, campaign, report, export, config,
admin.user, audit. Actions: read / write / approve. Scope: global / brand / jurisdiction.
Segregation of duties: maker ≠ checker on dual-approval actions; no self-escalation of one's
own permissions. *Source: OMEGA Role & Func. Map + Dual Approval; Idefix `requiredRole`;
vendor unified access control.*

## 8. Tenant / Brand / Jurisdiction Model

- **Brand** is the primary tenant scope (id, name, url, default language, currencies, from
  email). *Source: Idefix `brandId`; OMEGA Brand Editor.*
- **Jurisdiction** (Brand Country) holds per-country switches: gameplay/trading, login,
  signup, deposit limits, KYC system, geo system, auto-withdrawal, signup age, market
  eligibility, default flag. *Source: OMEGA Brand Country (343 rows).*
- **Feature flags / Brand Registry**: key-value config, scoped all-brands or specific-brand,
  with country/currency and encryptable values. *Source: OMEGA Brand Registry.*
- All entities and queries are brand-scoped; cross-brand access requires explicit permission.

## 9. Navigation and Information Architecture

Top-level sections (synthesizing OMEGA's twelve + trading additions):

1. **Dashboard** (finance/trading/compliance KPIs)
2. **Players/Traders** (search, profile 360, duplicates)
3. **Markets & Trading** (markets, order book, trades, positions, exposure, settlement) — *new*
4. **Wallets & Ledger** (balances, transactions, adjustments)
5. **Payments** (deposits, withdrawals/AWA, payment methods)
6. **Compliance** (KYC, AML, sanctions/PEP, responsible trading, regulatory reports)
7. **Market Integrity & Fraud** (surveillance, duplicate detection, cases) — *new + reuse*
8. **Cases** (KYC/AML/fraud/integrity/dispute/withdrawal)
9. **CRM** (segments/tags, campaigns, bonuses, communications, loyalty)
10. **Reporting & Exports**
11. **Maintenance/Config** (brands, jurisdictions, registry, products, payment methods,
    consents, password policy, email templates, exclusion service)
12. **Core Users** (admin users, roles, staff change log, dual-approval queue)

*Source: OMEGA navigation map; Idefix routes; PM additions.*

## 10. Player Search and Player Profile 360

Search by user ID, name, email, phone, national ID, tag, and trading attributes (volume,
exposure). Results grid uses the OMEGA Query Builder / Cashier column set. The **Profile 360**
(reusing Idefix `modules/player-details` tabbed case view) presents tabs: Overview/identity,
Balances & Wallets, **Open Orders / Positions / Exposure & P/L** (*new*), Transactions, KYC,
AML/Risk, Responsible Trading, Payments, Bonuses/Rewards, Notes & Timeline, Documents, Cases.
A dedicated Profile 360 screen was **not** captured in the OMEGA set (inferred to exist) — it
is specified here from Idefix evidence. *Source: Idefix player-details (Real); OMEGA Query
Builder/Cashier; vendor single-player view; PM trading tabs.*

## 11. Identity, Account Lifecycle, and Authentication

Registration captures identity, contact, affiliate/IP/country (Idefix
`PlayerRegistrationInfo`), gated by jurisdiction signup rules (OMEGA Brand Country). Account
lifecycle uses the Idefix `PlayerAccountStatus` state machine with per-field `modified`
audit, renaming `allowGameplay → allowTrading`. Trader auth supports strong auth; admin auth
requires MFA for financial/compliance roles, with password policy and lockout (OMEGA Password
Policy: player + staff). Sessions, failed-login lockout, and connection locks ("steal lock",
Idefix) are supported. *Source: Idefix (Real); OMEGA; vendor auth/MFA.*

## 12. KYC, AML, Risk, and Compliance

- **KYC**: automated triggers (registration, first deposit, threshold, trading volume),
  manual override, decline/request-documents, KYC log/audit; per-country requirements via
  OMEGA KYC Status Requirements; vendor integration (Sumsub/Trulioo/GBG). *Idefix `kyc.ts`
  (Real); OMEGA; vendor.*
- **AML**: rule-based risk scoring (Idefix `risk.ts`: customer/transaction/interface/geo,
  plus new **trading** rule type), configurable alerts, deposit-alert thresholds, escalation
  to cases. *Idefix (Real); OMEGA AML alerting; vendor.*
- **Sanctions/PEP**: via integrated KYC/AML vendor; results stored on profile (`pep` flag).
  Native engine deferred. *Vendor; Idefix `pep`; Legal.*
- **Risk profile**: low→high level feeding account status and gating.

## 13. Responsible Gaming / Responsible Trading

Self-imposed and operator limits: deposit, loss, **position**, **exposure**, and session
limits; self-exclusion (temporary/permanent with idle period), cool-off, reality check;
problem-trading flag; `preventLimitCancel`. Limits are **enforced before order placement**
(invariant). Self-excluded traders cannot log in or trade. National self-exclusion register
integration via OMEGA Exclusion Service pattern. *Source: Idefix limits/exclusion (Real);
OMEGA Exclusion Service + Donation Limit; vendor RG; PM reframing; Legal.*

## 14. Wallet, Balances, Ledger, and Transactions

- **Wallets**: per-currency cash (and optional bonus) wallets; multi-currency. *Idefix
  balance split; OMEGA wallets.*
- **Balances** (derived from ledger): available, reserved margin (held for open orders),
  unrealized P/L, equity. *PD-3.*
- **Ledger**: immutable double-entry. **Invariant: every balance change posts a ledger
  entry.** Accounts: player cash, margin, house, fees, settlement. *Greenfield (PM + PD).*
- **Transactions**: deposit, withdrawal, trade/fill, fee, settlement, adjustment,
  correction, compensation — each grouping paired ledger entries with drill-down (reusing
  Idefix transaction drawer UX). *Idefix transactions (Real) extended for trading.*

## 15. Prediction Market Account Functions

Per-trader trading account view: KYC/eligibility status for trading, available margin, open
orders, positions, realized/unrealized P/L, trading limits, and per-market eligibility
(restricted markets gated by jurisdiction/tags). **Restricted players cannot access
restricted markets** (invariant). *Source: PM adaptation; Idefix account gating; OMEGA
jurisdiction switches.*

## 16. Orders, Trades, Positions, Exposure, and P/L

- **Orders**: limit/market, buy/sell per outcome; states new→open→partially_filled→filled |
  cancelled | rejected | expired; placing reserves margin; cancel releases margin. Admin can
  view and cancel orders (audited).
- **Trades/Fills**: immutable; reference maker+taker orders; post ledger entries (fee + cash
  movement); update positions.
- **Positions**: net per trader/market/outcome (quantity, avg price, realized/unrealized
  P/L). Position quantity = signed sum of fills (invariant).
- **Exposure & P/L**: per-trader, per-market, and **house** exposure; mark-to-market;
  liabilities/exposure dashboards (mapping the legacy "liabilities" report concept).
- **Suspended players cannot place new orders; resolved markets cannot accept new orders**
  (invariants). *Source: PM adaptation (greenfield); gstech bet-ticket UX analog only.*

## 17. Settlement Operations

Market resolution (oracle or manual, with resolver identity) → **idempotent** settlement
batch → ledger postings closing positions and paying out → audit. Re-resolution voids prior
settlement via idempotency key. **Settlement must be idempotent** (invariant). Settlement may
require dual approval per config. *Source: PM adaptation (greenfield); gstech "bet settled
date" analog; OMEGA wagering/balance reports; Legal.*

## 18. Market Integrity, Fraud, and Abuse Monitoring

- **Market integrity surveillance** (new): detect wash trading, spoofing, collusion,
  insider/abnormal patterns; generate alerts → cases. Reuses Idefix rule-engine and OMEGA
  duplicate-detection patterns.
- **Fraud & abuse**: fraud cases (Idefix fraud-task), duplicate detection with configurable
  multi-field matching + linking (OMEGA Duplicates Report), multi-account/funding abuse,
  bonus abuse. *Source: Idefix (Real); OMEGA (High); vendor rules engines; PM.*

## 19. Case Management

Structured cases by type (KYC, AML, fraud, integrity, dispute, withdrawal) with status,
assignee, priority, SLA, linked entities, notes, and approval steps (maker-checker where
required). Built on top of the Idefix notes/event timeline and OMEGA Dual Approval workflow.
*Source: Idefix (Partial→structured); OMEGA; Product Decision.*

## 20. Notes, Documents, and Communication History

- **Internal notes**: sticky/archive, per record (Idefix Real; OMEGA comment tagging).
- **Documents**: KYC and source-of-funds upload/store (Idefix `documents`).
- **Communications**: multi-channel (email/SMS/push/in-app) with a template registry (OMEGA
  Email Control), including regulatory and trade/settlement/margin notices; full sent-content
  history (Idefix `PlayerSentContent`).

## 21. Segmentation, CRM, Bonuses, Rewards, and Lifecycle

- **Segmentation**: tags + tag groups as the universal targeting primitive (OMEGA Player Tag;
  Idefix tags/segments), plus a Query Builder for ad-hoc segments/exports.
- **CRM**: campaigns and lifecycle messaging (Idefix campaigns; OMEGA Engage).
- **Bonuses/Promotions**: bonus types with **trading-volume turnover** requirements
  (reframing gambling wagering), eligibility by tags/product/country, trigger caps (OMEGA
  Social Package).
- **Rewards/Loyalty** (Defer / P2): accrual + redemption (OMEGA Brand Loyalty + Loyalty
  Item). *Source: Idefix (Real); OMEGA (High); vendor; PM reframing.*

## 22. Payments, Deposits, and Withdrawals

- **Payment methods registry** with auto/manual/enabled flags, brand/jurisdiction scope
  (OMEGA Payment Method, 74 methods).
- **Deposits**: multi-PSP, manual cashier deposit, events history (Idefix payments; OMEGA
  Cashier).
- **Withdrawals**: pending queue + **Auto Withdrawal Approval (AWA)** rules engine —
  cumulative limits, deposit thresholds, day schedule, AWA delay, and manual-review triggers
  (player tag/status/lock/KYC); manual approve/reject otherwise. Withdrawals may be gated by
  open exposure/unsettled positions. *Source: Idefix withdrawal-task (Real); OMEGA AWA
  (High); PM gating.*

## 23. Reporting, Dashboards, and Exports

- **Dashboards**: finance, trading (volume, open interest, fees, settlement P/L, exposure),
  compliance, payments (OMEGA dashboards; vendor real-time reporting).
- **Reports**: trading/financial/regulatory; reuse Idefix reporting scaffolding, replace
  gambling KPIs (GGR/RTP/jackpots) with trading KPIs; statutory report suite modeled on
  OMEGA's Nevada set (transaction summary/detail, daily balance, exception/audit, tax) —
  mapped to the actual regulatory regime (open question).
- **Exports**: CSV/PDF/data-pull (Idefix react-csv/@react-pdf; OMEGA export controls).

## 24. Audit Logs and Compliance Evidence

Append-only, tamper-evident audit log (hash-chained) of every sensitive action (see Domain
Model audit events). Combines Idefix per-field `modified{who,when}` change tracking with an
OMEGA-style Staff Change Log and Exception Report (privileged actions with maker/approver).
**Every sensitive admin action must create an audit log** (invariant). Audit is queryable and
exportable for regulators. *Source: Idefix (Real); OMEGA (High); vendor; Legal.*

## 25. Admin Operations and Configuration

Core Users management (create/edit staff, status, lock, failed-login, MFA), roles &
permissions editor (the OMEGA Role & Function Map concept), Brands, Jurisdictions (Brand
Country), Brand Registry/feature flags, Products/market-type catalog, Payment Methods,
Consents versioning, Password Policy (player + staff), Email Templates, Exclusion Service,
and a Dual-Approval queue. *Source: OMEGA Maintenance + Core Users (High); Idefix users
(Real).*

## 26. Integrations, APIs, and Webhooks

Greenfield backend exposes an open REST/GraphQL API (Idefix's `/api/v1` client contracts are
useful DTO seeds) plus **webhook eventing** (a noted gap across all four vendors — a
differentiator) for downstream CRM, BI, fraud, and settlement consumers. Integrations:
KYC/AML vendors, PSPs/payment connectors, market-data/oracle/settlement sources, CRM, BI
warehouse. *Source: Idefix client wiring (Real); OMEGA 250+ integrations (High); vendor open
API; PM market-data/oracle.*

## 27. Security Requirements

MFA for privileged roles; least-privilege RBAC with scoping; segregation of duties + dual
approval; encryption in transit and at rest (encryptable config values per OMEGA Brand
Registry); secrets management; tamper-evident audit; rate limiting and anti-account-takeover;
ISO 27001-grade posture (vendor baseline). Replace Idefix global-singleton fetch client with
a configurable, injectable, authenticated client (audit finding). *Source: vendor; Idefix
audit findings; OMEGA password policy; Legal.*

## 28. Privacy, Data Retention, and Data Rights

Consent capture and versioning (OMEGA Consents). Jurisdiction-specific retention schedules.
Right-to-erasure must be reconciled with immutable financial-record retention and audit
(pseudonymization/segregation rather than deletion of financial/audit records). **Needs Legal
Review.** *Source: OMEGA Consents; vendor (implied by ISO 27001); Legal assumption.*

## 29. UI Requirements

React 18 / MUI v5 in the Idefix Nx librarized structure. Consistent list-detail-drawer
pattern (Idefix), brand/period/multi-select filter + run + exportable grid pattern (OMEGA).
Tabbed Profile 360. Dashboards with KPI widgets. Accessibility and responsive layout.
Read-only states clearly enforce permission scope. *Source: Idefix architecture; OMEGA UI
patterns; Product Decision.*

## 30. Data Model Requirements

Implements all entities and state machines in `/docs/pam-domain-model.md`, with the listed
invariants enforced server-side. Ledger is the source of truth for balances. All entities
carry brand scope and audit metadata. The Idefix `libs/idefix/types/src/*` DTOs are
API-contract seeds; the backend schema is specified from scratch. *Source: Domain model;
Idefix DTOs (seeds); PM ledger/trading; PD-1.*

## 31. Seed and Demo Data Requirements

Non-production environments seed: brands/jurisdictions, admin users per role, sample
traders (various KYC/risk/RG states), payment methods, sample markets across outcome types
and states, open orders/positions, completed trades, a settled market, pending withdrawals,
and audit history — sufficient to demo every acceptance scenario. *Source: Idefix
mock/seed sparseness (gap); Product Decision.*

## 32. Acceptance Scenarios

All scenarios begin at status `Fail`; future implementation agents update them.

### Scenario 1: Admin Login and Permission Enforcement
#### Purpose
Verify MFA login and that a role can only perform permitted, brand-scoped actions.
#### Evidence Source
OMEGA Core Users/password policy; Idefix user flags; Vendor RBAC; Product Decision.
#### Preconditions
Admin user with Support role exists; MFA enrolled; two brands configured.
#### Actor
Support Agent.
#### Steps
1. Log in with credentials + MFA. 2. Attempt to view a player in own brand. 3. Attempt a
manual balance adjustment. 4. Attempt to view a player in another brand.
#### Expected Result
Login succeeds; player view in own brand allowed; adjustment denied (no permission); other
brand denied (scope). All attempts audited.
#### Required Evidence
Audit-log entries for login and denied actions; permission check trace.
#### Status
Fail

### Scenario 2: Player Search and Profile 360
#### Purpose
Find a trader and view the unified profile including trading tabs.
#### Evidence Source
Idefix player-details; OMEGA Query Builder/Cashier; Vendor single-player view; PM.
#### Preconditions
Trader with balances, positions, KYC, and notes exists.
#### Actor
Support Agent.
#### Steps
1. Search by email. 2. Open profile. 3. Inspect Balances, Positions, Transactions, KYC, Notes.
#### Expected Result
Correct trader returned; all tabs load with consistent, ledger-derived balances and live
positions.
#### Required Evidence
Screenshot of profile; balance equals ledger sum.
#### Status
Fail

### Scenario 3: Account Status Change
#### Purpose
Suspend a trader and confirm trading is blocked.
#### Evidence Source
Idefix `PlayerAccountStatus`; OMEGA Status/Lock; PM invariant.
#### Preconditions
Active trader with open trading ability.
#### Actor
Compliance Officer.
#### Steps
1. Set status to Suspended with reason. 2. As the trader, attempt to place an order.
#### Expected Result
Status changes; per-field audit recorded; order placement rejected ("suspended cannot place
new orders").
#### Required Evidence
Audit entry with who/when/reason; rejected-order log.
#### Status
Fail

### Scenario 4: KYC Review
#### Purpose
Review and decide a KYC case.
#### Evidence Source
Idefix `kyc.ts`; OMEGA KYC Status Requirements; Vendor; Legal.
#### Preconditions
Trader in KYC pending with uploaded documents; jurisdiction requires KYC for trading.
#### Actor
Compliance Officer.
#### Steps
1. Open KYC case. 2. Verify or decline with reason. 3. Confirm trading gate updates.
#### Expected Result
KYC state transitions; decision audited; trading enabled only when verified per jurisdiction.
#### Required Evidence
KYC log entry; gate state; audit.
#### Status
Fail

### Scenario 5: AML / Risk Case Creation
#### Purpose
Risk rule triggers an AML review case.
#### Evidence Source
Idefix `risk.ts`; OMEGA AML alerting; Vendor.
#### Preconditions
AML rule configured (e.g., deposit threshold or abnormal trading).
#### Actor
System + Risk Analyst.
#### Steps
1. Trader breaches rule. 2. System raises alert and case. 3. Analyst reviews and escalates.
#### Expected Result
Risk points accrue; case created at threshold; escalation audited.
#### Required Evidence
Risk log; case record; audit.
#### Status
Fail

### Scenario 6: Responsible Gaming / Responsible Trading Controls
#### Purpose
Enforce a trading limit before order placement.
#### Evidence Source
Idefix limits/exclusion; OMEGA Exclusion Service; Vendor RG; PM invariant; Legal.
#### Preconditions
Trader with a daily loss/position limit set.
#### Actor
Trader (+ Compliance).
#### Steps
1. Trader sets/has a position limit. 2. Trader attempts an order exceeding it. 3. Trader
self-excludes.
#### Expected Result
Over-limit order rejected before placement; after self-exclusion, login and trading blocked.
#### Required Evidence
Rejected-order log; exclusion state; audit.
#### Status
Fail

### Scenario 7: Wallet and Ledger Review
#### Purpose
Confirm balances reconcile to the ledger.
#### Evidence Source
PM ledger invariant; Idefix balance model; OMEGA daily balance report.
#### Preconditions
Trader with deposits, trades, and fees.
#### Actor
Finance Operator.
#### Steps
1. Open wallet. 2. View ledger entries. 3. Reconcile available/reserved/equity to entries.
#### Expected Result
Balance equals signed sum of ledger entries; reserved margin matches open orders.
#### Required Evidence
Ledger export; reconciliation.
#### Status
Fail

### Scenario 8: Manual Balance Adjustment
#### Purpose
Permissioned, reasoned adjustment with dual approval over threshold.
#### Evidence Source
Idefix TransactionType correction; OMEGA Exception Report + Dual Approval; PD.
#### Preconditions
Adjustment threshold configured; maker and checker users exist.
#### Actor
Finance Operator (maker) + Finance Approver (checker).
#### Steps
1. Maker creates adjustment with reason above threshold. 2. Checker approves. 3. Ledger posts.
#### Expected Result
Adjustment requires approval (maker ≠ checker); on approval posts ledger entry + audit; below
threshold posts directly with reason.
#### Required Evidence
Approval record; ledger entry; audit with reason.
#### Status
Fail

### Scenario 9: Prediction Market Position Review
#### Purpose
Review a trader's positions, exposure, and P/L.
#### Evidence Source
PM adaptation (greenfield); legacy liabilities concept.
#### Preconditions
Trader holds positions in an open market.
#### Actor
Market Operations / Risk.
#### Steps
1. Open Positions tab. 2. View quantity, avg price, unrealized P/L. 3. View house exposure.
#### Expected Result
Position quantity equals sum of fills; mark-to-market P/L correct; exposure aggregates.
#### Required Evidence
Position vs fills check; exposure report.
#### Status
Fail

### Scenario 10: Market Manipulation / Integrity Review
#### Purpose
Surface a wash-trading / abnormal-pattern alert into a case.
#### Evidence Source
PM market integrity (new); Idefix risk rules; OMEGA duplicate detection.
#### Preconditions
Integrity rule configured; suspicious trading present.
#### Actor
Risk/Fraud Analyst.
#### Steps
1. Surveillance flags pattern. 2. Alert raised. 3. Analyst opens case and links traders.
#### Expected Result
Alert generated with evidence; case created; linked accounts shown; audited.
#### Required Evidence
Alert record; case; linkage.
#### Status
Fail

### Scenario 11: Settlement Operations
#### Purpose
Resolve a market and settle positions idempotently.
#### Evidence Source
PM settlement (greenfield); gstech bet-settled analog; Legal.
#### Preconditions
Market past close with open positions; resolver identity available.
#### Actor
Market Operations (+ Approver if configured).
#### Steps
1. Resolve market to an outcome. 2. Run settlement. 3. Re-run settlement (idempotency test).
#### Expected Result
Open orders cancelled; positions settled; ledger paid out once; re-run posts nothing
(idempotent); audited.
#### Required Evidence
Settlement batch; ledger postings; idempotency proof; audit.
#### Status
Fail

### Scenario 12: Player Communication and Notes
#### Purpose
Add a note and send a templated communication.
#### Evidence Source
Idefix notes/PlayerSentContent; OMEGA Email Control.
#### Preconditions
Trader exists; template registry configured.
#### Actor
Support Agent.
#### Steps
1. Add sticky note. 2. Send a templated message. 3. View communication history.
#### Expected Result
Note saved; message sent and logged; history shows both; audited.
#### Required Evidence
Note + comm records; audit.
#### Status
Fail

### Scenario 13: Segmentation and CRM
#### Purpose
Build a segment and target a campaign.
#### Evidence Source
Idefix tags/segments; OMEGA Player Tag + Query Builder.
#### Preconditions
Traders with varied attributes; tags configured.
#### Actor
Marketing/CRM.
#### Steps
1. Create a segment via Query Builder. 2. Tag matching traders. 3. Attach to a campaign.
#### Expected Result
Segment resolves correctly; tags applied; campaign targets the segment.
#### Required Evidence
Segment membership; campaign targeting.
#### Status
Fail

### Scenario 14: Bonus / Reward Controls
#### Purpose
Grant a bonus with trading-volume turnover and confirm release rules.
#### Evidence Source
Idefix bonuses; OMEGA Social Package; PM reframing.
#### Preconditions
Bonus campaign with turnover rule; eligible trader.
#### Actor
Marketing/CRM (+ Finance for ledger).
#### Steps
1. Grant bonus. 2. Trader trades toward turnover. 3. Bonus converts on completion.
#### Expected Result
Bonus granted with caps/eligibility; turnover tracked as trading volume; conversion posts
ledger + audit.
#### Required Evidence
Reward record; turnover progress; ledger.
#### Status
Fail

### Scenario 15: Reporting and Export
#### Purpose
Run a trading/financial report and export it.
#### Evidence Source
Idefix reports/export; OMEGA report suite; PM KPIs.
#### Preconditions
Activity data present.
#### Actor
Auditor / Finance.
#### Steps
1. Run a daily balance/trading-volume report by brand/period. 2. Export CSV and PDF.
#### Expected Result
Report computes correct KPIs; export files generated; PII export audited.
#### Required Evidence
Report output; export files; audit.
#### Status
Fail

### Scenario 16: Tenant / Brand / Jurisdiction Configuration
#### Purpose
Configure a jurisdiction switch and confirm runtime enforcement.
#### Evidence Source
OMEGA Brand Country/Registry; Idefix multi-brand; Legal.
#### Preconditions
New jurisdiction row; a market restricted to certain jurisdictions.
#### Actor
Super Admin.
#### Steps
1. Set jurisdiction KYC/eligibility switches. 2. Trader from restricted jurisdiction attempts
the market.
#### Expected Result
Config saved + audited; restricted trader cannot access restricted market (invariant).
#### Required Evidence
Config audit; access denial.
#### Status
Fail

### Scenario 17: Audit Log Integrity
#### Purpose
Confirm audit log is append-only and tamper-evident.
#### Evidence Source
OMEGA Staff Change Log/Exception Report; Idefix per-field audit; Legal.
#### Preconditions
Several sensitive actions performed.
#### Actor
Auditor.
#### Steps
1. Query audit log. 2. Verify hash chain. 3. Attempt to modify an entry.
#### Expected Result
All actions present with who/when/before/after; hash chain validates; modification
impossible/detected.
#### Required Evidence
Audit query; chain verification.
#### Status
Fail

### Scenario 18: Data Privacy and Retention
#### Purpose
Handle a right-to-erasure request against retention/audit constraints.
#### Evidence Source
OMEGA Consents; Vendor; Legal (Needs Legal Review).
#### Preconditions
Trader requests erasure; financial/audit records exist.
#### Actor
Compliance Officer.
#### Steps
1. Receive erasure request. 2. Apply policy (pseudonymize PII, retain financial/audit).
3. Record consent/decision.
#### Expected Result
PII pseudonymized/removed per policy; financial and audit records retained; decision audited.
#### Required Evidence
Erasure record; retained-record proof; audit.
#### Status
Fail

### Scenario 19: Support / Dispute Case Workflow
#### Purpose
Resolve a trade/settlement dispute via a case.
#### Evidence Source
Idefix notes/events; OMEGA Dual Approval; Product Decision.
#### Preconditions
Trader raises a dispute on a settled position.
#### Actor
Support Agent → Market Operations.
#### Steps
1. Open dispute case. 2. Investigate linked trade/settlement. 3. Resolve (possibly with
approval + adjustment).
#### Expected Result
Case progresses through states; any adjustment follows Scenario 8 rules; resolution audited.
#### Required Evidence
Case history; linked entities; audit.
#### Status
Fail

### Scenario 20: Operational Configuration Change
#### Purpose
Change a feature flag / config and confirm scope + audit.
#### Evidence Source
OMEGA Brand Registry; Idefix settings; Product Decision.
#### Preconditions
Config key exists (e.g., AWA delay or a market parameter).
#### Actor
Super Admin.
#### Steps
1. Change a Brand Registry value for a specific brand. 2. Confirm effect is brand-scoped.
3. Review audit.
#### Expected Result
Change applies only to the targeted brand; audited with who/when/before/after.
#### Required Evidence
Config audit; scoped effect.
#### Status
Fail

## 33. Source Traceability Summary

- **Vendor Benchmark** establishes the 32-capability enterprise baseline (Sections 6–14,
  21–31).
- **Idefix Source Evidence** supplies the reusable operational/compliance surfaces (Sections
  10–14, 18–25) and the target frontend architecture (Section 29).
- **OMEGA Screenshot Evidence** supplies back-office configuration, AWA withdrawals,
  compliance reporting, RBAC governance, and tagging (Sections 7–9, 22–25).
- **Prediction Market Requirements** supply the greenfield trading core (Sections 15–18) and
  the ledger (Section 14).
- **Product Decisions / Legal Assumptions** are recorded in Section 5 and
  `/docs/pam-open-questions.md`.
- Full row-level mapping: `/docs/pam-traceability-matrix.md`.

## 34. Open Questions

Tracked in `/docs/pam-open-questions.md`. Highest priority: regulatory regime (gambling vs
financial/CFTC), market microstructure (CLOB vs AMM), wallet model, crypto scope, settlement
source/oracle trust, retention-vs-erasure, and the location/availability of the absent Idefix
backend.

## 35. Implementation Plan

Detailed, explicitly non-coding plan in `/docs/pam-implementation-plan.md`. Summary phasing:
foundation/auth/RBAC → player 360 → account lifecycle/wallet/ledger/transactions → trading
core (orders/positions/exposure/settlement) → KYC/AML/risk/responsible trading → cases/notes/
docs/comms → CRM/segmentation/bonuses → reporting/exports/dashboards/audit → tenant/
jurisdiction/config/integrations/hardening.

## 36. Progress Matrix

Status reflects the **2026-07-03 scenario-evidence reconciliation** (GAP-26) against the
implemented system on branch `pam/p0-modernization`, superseding the June 2026 baseline
(`/docs/taya-gap-analysis.md`, cross-checked in `/docs/codex-vs-claude-comparison.md`).
Legend: **Built** / **Partial** / **Missing**. The "Scenario Status" column is now the
acceptance-evidence state: **Pass** = the scenario's steps + expected result are covered by
green automated tests (unit/race/live-Postgres/Playwright) per `docs/pam/scenario-evidence.md`;
**Partial** = core evidenced but a named sub-part is BLOCKED; **Fail** = missing/blocked with
no runnable surface. "Pass" here is evidence of correctness, not a witnessed manual acceptance
sign-off — that attestation remains a separate human step.

| Area | Spec Section | Scenario | Implemented Status | Scenario Status | Note |
|---|---|---|---|---|---|
| Admin auth & RBAC | 6, 7, 11, 27 | 1 | **Built** | Pass | MFA now **mandatory for admin roles** (P0-1 `6914421c`,`268157b8`), RBAC (mig 027/038/040) + permission-denial audit (GAP-25 `d719804f`), least-privilege personas (GAP-14 `bd0634db`), admin MFA-reset backend (GAP-15 `21743d22`) **+ MFA-reset operator UI (GAP-88 `70663a00`, confirmed row action, users:write-gated, audited)**, **admin session-revocation / kick-session (GAP-76 `7252cf97`)**. Residual: WebAuthn/passkey option (GAP-71); guaranteed single-session "steal-lock" deferred (GAP-76 slice 2) |
| Player search & 360 | 10 | 2 | **Built** | Pass | Profile-360 Built (KYC tab P0-3 `ad6e84c4`, Limits tab P1-3 `d610ecdf`, Bonuses/Cases GAP-35); **office player search now SERVER-SIDE (GAP-81 `409c3a04`)** — debounced `?search=` refetch over the full population, so "search by email → correct trader" holds on a real book. Residual: id/name/phone/national-ID predicate breadth = GAP-34 (BLOCKED) |
| Account lifecycle | 11 | 3 | **Built** | Pass | Suspension read on trading+login with reason+audit (GAP-9/10) |
| KYC | 12 | 4 | **Built** | Pass | Fail-closed (P0-2 `5adf223c`) + admin review UI + document BYTEA storage (P0-3) + expiry re-trigger (GAP-17 `59f7eb6d`) + request-more-docs (GAP-18 `d0d314f6`). Residual: IDV vendor (GAP-19 ⚑) |
| AML / Risk | 12, 18 | 5 | **Partial** | Partial | Alert→case→disposition plumbing (`registerAMLAdminRoutes`) + risk-profile rating (GAP-12) built; **rule set / SAR BLOCKED on regime** (P0-5 ⚑) |
| Responsible trading | 13 | 6 | **Built** | Pass | Loss/position/session limits (GAP-11), fail-closed (GAP-1), loosen-cooldown (GAP-63), Profile-360 Limits tab (P1-3); enforced before order placement |
| Wallet & ledger | 14 | 7 | **Partial** | Partial | Wallet/balances Built; **double-entry ledger BLOCKED** (P0-7 ⚑ protected core) |
| Manual adjustment | 14, 25 | 8 | **Partial** | Partial | UI + audited `finances:write` route (P1-2 `bb710f52`); **dual-approval BLOCKED** (P0-6 ⚑) |
| Positions & exposure | 15, 16 | 9 | **Built** | Partial | Trading core built (positions, exposure/P&L, house risk dashboard, per-market eligibility GAP-20, admin order view/cancel backend GAP-21); **but the per-PLAYER operator surface is missing (GAP-89)** — no Profile-360 Open Orders/Positions/Exposure&P/L tab, and the admin-orders route is unwired in the office, so Scenario 9 (Market-Ops/Risk inspecting a trader's positions) is not operator-usable |
| Market integrity | 18 | 10 | **Built** | Pass | Surveillance: wash/spoof/collusion (P1-4 `7761823b`,`8936142a`,`e33045c4`) + insider (GAP-22 `11d1fc1b`) + bonus-abuse (GAP-23 `c46b166f`) + duplicate-account; alerts→cases UI; **runs CONTINUOUSLY (GAP-78 `d31865d1`, `Engine.Run` 5-min sliding sweep, always-on when DB-backed)**, not just on manual scan |
| Settlement | 17 | 11 | **Built** | Pass | Idempotent propose→challenge→finalize + disputes + dual-control finalize |
| Notes & comms | 20 | 12 | **Built** | Partial | Notes + notification-template store + admin editor (P1-6 `a2cf341f`); **sent-communication history + agent-initiated templated send BACKEND (GAP-43)** (`internal/communications`, audited, rate-limited GAP-75); **but no operator UI (GAP-90)** — no Profile-360 Communications tab, so an agent cannot view a player's comm history or send a notice from the console (Scenario 12 not operator-usable) |
| Segmentation & CRM | 21 | 13 | **Built** | Partial | Backend (tags/segments/campaigns/query, `internal/segmentation`) + **operator UI (GAP-87 `2d04f97f`, `/segments`: tag CRUD, Query Builder + CSV export, campaign create)**, gated `segments:read`/`write` (GAP-84), operable by the GAP-85 marketing-crm role. Residual: **campaign DISPATCH (send) NOT wired (GAP-79 BLOCKED)** — `execute` returns 501; needs a channel decision (GAP-42), a marketing consent/opt-out model (rides P2-3), and a throttle/audit policy |
| Bonus / rewards | 21 | 14 | **Partial** | Partial | Bonus engine + wagering machinery + loyalty + admin bonus UI (P1-6 `dae22915`) + abuse detection (GAP-23); **turnover→conversion NOT wired to trading (GAP-77 BLOCKED)** — `RecordWageringContribution`/`ConvertBonusToReal` have zero production callers, so bonus turnover never accrues from live trading; balance-changing + hooks protected trade path → design note |
| Reporting & export | 23 | 15 | **Partial** | Partial | Operational CSV exports (P1-6 `a95f6e5a`, risk/KYC/surveillance CSVs) + **finance reports (GAP-48)** — wallet-ledger CSV (capped/413), daily-balance + reconciliation (`finances:read`, UTC-day buckets); **statutory suite pending regime** (GAP-24 ⏳) |
| Tenant / jurisdiction | 8, 25 | 16 | **Partial** | Partial | Geofencing + per-market jurisdiction Built; **multitenancy dormant, BLOCKED** (P2-1 ⚑ protected core) |
| Audit integrity | 24 | 17 | **Built** | Pass | Append-only + hash-chain + verify route (GAP-13) + durable auth audit (GAP-5) + permission-denial audit (GAP-25) |
| Privacy & retention | 28 | 18 | **Partial** | Fail | Loyalty opt-out only; **DSAR/retention/erasure BLOCKED** (P2-3 ⚑ legal) |
| Support / disputes | 19 | 19 | **Built (markets)** | Partial | Market-resolution disputes Built; **cross-domain read-only case center (GAP-32 slice 1 `15bb000d`)** aggregating AML+surveillance, surfaced in Profile-360 Cases tab (GAP-35 `e482db1c`); **writable shared case model (assignee/SLA/notes/approval) — GAP-32 slice 2 design-gated** |
| Operational config | 25 | 20 | **Partial** | Partial | DB-backed flag store + admin route (`internal/platformconfig`, `/api/v1/admin/config/flags`); **full ops-settings screens pending** |
| Orders / trades (CLOB) | 16 | 9 | **Built** | Pass | Real central limit order book, complementary issuance, TIF/post-only |
| Integrations / webhooks | 26 | — | **Built** | — | HMAC webhooks + scoped partner API |
| Custody / on-chain settlement | 17, 26 | 11 | **Partial / design-seed** | Partial | Custodial off-chain today; **non-custodial BLOCKED** (P2-4 ⚑ founder decision) |

Summary: as of the **2026-07-04 Termination-pass-B reconciliation** (refining the 2026-07-03
evidence pass + the GAP-27 schema-domain reconciliation), **~12 areas Built, ~10 Partial, 0 Missing**;
acceptance scenarios are **10 Pass / 9 Partial / 1 Fail** (Scenario 18, DSAR) — updated by the
2026-07-04 pass B **round 2** (spec-section walk), which reopened the loop with 5 new gaps
(GAP-80…84; see `PROGRESS_LEDGER.md`). GAP-81 (office server-side search) has since landed,
restoring **Player search & 360 (Scenario 2)** to Built/Pass; GAP-80/82/83-s1 also DONE. The earlier 07-04 pass made
three status changes vs the 07-03 baseline: **Notes & comms 12 Partial→Built/Pass** (GAP-43
sent-communication history landed); **Bonus / rewards 14 Built/Pass→Partial** (GAP-77 — bonus
turnover→conversion unwired from live trading); **Segmentation & CRM 13 Built/Pass→Partial** (GAP-79
— campaign dispatch send is a 501 stub). The latter two are overclaim corrections surfaced by the
adversarial pass B (capability present but never called from a live path), not regressions; both are
now tracked BLOCKED items with design notes. Market integrity (10) stays Built/Pass and was hardened
to run continuously (GAP-78). Every non-Pass scenario is attributable
to a tracked BLOCKED/open item with a brief (P0-5/6/7, P2-1/3/4, GAP-17b/19/24/30/77/79) — the
residual gaps are human-decision-gated (regime/legal/threshold/vendor/protected-core) or filed
breadth items, not un-started surprises. Full per-scenario evidence (with the honest
"automated-evidence ≠ manual-acceptance-sign-off" caveat) is in `docs/pam/scenario-evidence.md`;
the entity/FSM-level reconciliation is in `docs/pam/schema-domain-reconciliation.md`.

## 37. Reconciliation with the Implemented System (Taya_NA_Predict, June 2026)

This section records how the spec maps onto the system that actually exists, so future work
*extends and remediates* rather than rebuilds.

**Already built to spec (extend/harden, don't rebuild):** the prediction-market trading core
(CLOB matching with complementary YES/NO issuance, orders, trades, positions, exposure/P&L),
idempotent settlement with a propose→challenge→finalize + dispute seam, the wallet money-path
(idempotency keys, row locks, SERIALIZABLE), granular RBAC, DB-trigger append-only audit,
fail-closed geofencing + per-market jurisdiction, responsible-trading limits enforced before
order placement, outbound HMAC webhooks + scoped partner API, loyalty, and a backend bonus/
wagering engine. These exceed the legacy reference and largely satisfy Sections 14–17, 24, and
parts of 7, 11, 13, 22, 26.

**Built but below the spec bar (remediate):**
- **Ledger** is single-entry running-balance, not the **double-entry** invariant (§14, §30).
- **Admin MFA** is a stub that enforces nothing (§11, §27) — treat as a security defect, not a
  missing feature.
- **KYC** has no admin review UI, no production vendor, and stores **document metadata only
  (no file/binary storage)**; it can silently fall back to an in-memory mock (§12, §20).
- **Multitenancy** exists as a dormant `tenant_id` foundation nothing reads (§8) — effectively
  single-brand.

**Missing vs spec (net-new build):** AML transaction monitoring/SAR (§12); sanctions/PEP
screening with a real list/vendor (§12); market-integrity surveillance (§18); fraud/duplicate-
account detection (§18); dual-approval / maker-checker (§7, §25); back-office money-movement
and approval UIs — cashier/deposits, withdrawal queue + **AWA** rules engine, manual-adjustment
UI (§22, §14); segmentation/CRM (§21); notification templates (§20); reporting/exports module
(§23); tenant/brand + global jurisdiction + feature-flag admin UIs (§8, §25); data-retention/
DSAR tooling (§28).

**Architecture deltas to note in the spec's framing:** the system is a **single Go gateway**
(not the Idefix Nx frontend stack or a microservice fleet — Codex's original 14-service plan,
including a dedicated compliance service with AML, was collapsed into the gateway, which is how
AML fell out of scope). Custody is **custodial off-chain**; the non-custodial on-chain stack is
a design seed. These do not change the requirements but reframe Sections 26 and the
implementation plan.

**§29 UI-stack amendment (GAP-52, verified 2026-07-04).** §29 prescribes **React 18 / MUI v5 in
the Idefix Nx librarized structure**. The shipped back office is **React 19.2.4 + Next.js 16.2.9
(App Router) + Ant Design 5.29**, themed with the P8 design tokens (`talon-backoffice/packages/
office/package.json`; player app under `packages/app`). It is a Next.js yarn-workspaces monorepo,
not an Nx workspace, and uses AntD, not MUI. Per the Verification Doctrine (code wins on current
state) the shipped stack STANDS — no rebuild to MUI/Nx is warranted; §29's stack clause is
amended to the shipped stack. The §29 *capability* requirements (consistent list-detail-drawer +
filter/run/exportable-grid patterns, permission-scoped read-only states) remain in force and are
tracked separately (GAP-53 pattern rollout, GAP-54 a11y/responsive). Only the framework/library
prescription is superseded.
