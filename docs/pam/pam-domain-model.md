# PAM Domain Model

Target domain model for the enterprise prediction-market PAM / back office. The
operational/compliance entities adapt proven structures from the Idefix audit and OMEGA
screenshots; the trading entities (Market, Order, Trade, Position, Settlement,
MarketIntegrityAlert) are greenfield prediction-market adaptations not present in any
evidence source. All financial mutation flows through `LedgerEntry`.

## Domain Overview

The system manages **traders** (players) and their **accounts**, **wallets**, and
**positions** in **prediction markets**, operated by **admin users** under a **role/permission**
model, scoped by **brand** and **jurisdiction**. Money and contract value move only through an
immutable **double-entry ledger**. Compliance is enforced through **KYC**, **AML/risk**,
**sanctions/PEP**, and **responsible-trading** profiles. Operations are governed by
**cases**, **notes**, **documents**, **communications**, **audit logs**, and configurable
**feature flags**. Everything that changes a balance, a position, or a sensitive setting is
audited; sensitive financial actions can require **dual approval**.

## Core Entity List

AdminUser, Role, Permission, Player (Trader), PlayerAccount, PlayerProfile, Wallet, Balance,
LedgerEntry, Transaction, PaymentMethod, KYCProfile, AMLScreening, RiskProfile,
ResponsibleGamingProfile (ResponsibleTradingProfile), Market, Order, Trade, Position,
Settlement, MarketIntegrityAlert, Case, InternalNote, Document, CommunicationEvent, Segment,
BonusCampaign, Reward, AuditLog, Brand, Jurisdiction, Report, ExportJob, FeatureFlag.

## Entity Definitions

### AdminUser
Back-office operator/staff account. Fields: id, brandScope[], loginName, fullName, email,
status (active/inactive), lockStatus, failedLoginCount, mfaEnabled, roles[], lastActiveAt,
createdAt, createdBy, requirePasswordChange. *Source: Idefix `User`/`FullUser`; OMEGA Core
Users User List.* Replaces Idefix coarse boolean access flags with `roles[]`.

### Role
Named set of permissions. Fields: id, name, description, permissions[], brandScope,
isSystemRole. *Source: OMEGA Role & Function Map (concept); replaces Idefix boolean flags.*

### Permission
Atomic capability + scope. Fields: id, resource (e.g. ledger, withdrawal, settlement,
player.status), action (read/write/approve), scope (brand/jurisdiction/global),
requiresDualApproval (bool). *Source: Product Decision; OMEGA User Access Listing.*

### Player (Trader)
End customer who trades. Fields: id, brandId, jurisdictionId, email, currencyId, dateOfBirth,
nationalId, registrationInfo (affiliate, IP, country), tags[], createdAt. *Source: Idefix
`Player`/`PlayerRegistrationInfo`; OMEGA Cashier/Query Builder identity fields.*

### PlayerAccount
Account lifecycle/compliance state for a player. Fields: id, playerId, status, verified,
activated, allowTrading (was allowGameplay), allowTransactions, loginBlocked, accountClosed,
accountSuspended, selfExcluded, pep, riskProfileLevel, documentsRequested, preventLimitCancel,
modified{field→{who,when}}. *Source: Idefix `PlayerAccountStatus` (with per-field audit);
OMEGA Status/Lock.*

### PlayerProfile
Extended identity/contact/KYC display profile. Fields: names, nickname, gender, phone/mobile,
address/city/state/postal/country, language, contactPreference, taxId, passport, idCard, VIP
level. *Source: OMEGA Query Builder columns; Idefix player-info module.*

### Wallet
A trader's funds container per currency. Fields: id, playerId, currencyId, type
(cash/bonus), status (active/frozen/closed). *Source: Idefix balance split; OMEGA
multi-currency wallets.*

### Balance
Derived, never directly stored as truth — computed from ledger. Fields: walletId, available,
reservedMargin (held for open orders), unrealizedPnl, equity, asOf. *Source: Idefix
`PlayerStatus.balance` (real/bonus/reserved) reinterpreted; PM adaptation.*

### LedgerEntry
Immutable double-entry posting. Fields: id, txnId, accountSide (debit/credit), accountRef
(player cash / margin / house / fees / settlement), amount, currencyId, balanceAfter, reason,
sourceType (deposit/withdrawal/trade/fee/settlement/adjustment), sourceId, createdAt,
createdBy, immutable=true. *Source: PM adaptation + Product Decision (absent in Idefix).*

### Transaction
Logical grouping of paired ledger entries + metadata. Fields: id, type
(deposit/withdrawal/trade/fill/fee/settlement/adjustment/correction/compensation), status,
playerId, amount, currencyId, provider, externalRef, relatedOrderId/tradeId/settlementId,
createdAt. *Source: Idefix `PlayerTransaction` + `TransactionType`; extended for trading.*

### PaymentMethod
Registry of funding methods. Fields: id, code, name, subMethod, autoPayment, isEnabled,
allowManual, brandScope, jurisdictionScope, provider. *Source: OMEGA Payment Method registry
(74 rows).*

### KYCProfile
KYC status & documents for a player. Fields: id, playerId, status
(none/pending/verified/declined/expired), level, triggers[], documents[], vendorRef,
verifiedBy, log[]. *Source: Idefix `kyc.ts` workflow; OMEGA KYC Status Requirements.*

### AMLScreening
AML/risk evaluation record. Fields: id, playerId, riskType
(customer/transaction/interface/geo/trading), fraudKey, points, maxCumulativePoints,
requiredRole, manualTrigger, alerts[], log[]. *Source: Idefix `risk.ts`; OMEGA AML alerting.*

### RiskProfile
Aggregate risk level for a player. Fields: playerId, level (low→high), pep, factors[],
updatedBy. *Source: Idefix `RiskProfile`/`PlayerAccountStatus.riskProfile`.*

### ResponsibleGamingProfile (ResponsibleTradingProfile)
Self-imposed and operator limits. Fields: id, playerId, limits[] (deposit/loss/position/
exposure/session), selfExclusion{type, start, end, idlePeriod}, coolOff, realityCheck,
problemFlag, preventLimitCancel. *Source: Idefix limits + exclusionKey + gamblingProblem;
OMEGA Exclusion Service + Donation Limit. Reframed as responsible **trading**.*

### Market
A tradable prediction market. Fields: id, brandId, jurisdictionScope[], title, description,
category, outcomeType (binary/categorical/scalar), outcomes[], status, openAt, closeAt,
resolveSourceRef (oracle/manual), tradingParams (tick, min/max order, fees),
microstructure (orderbook/AMM). *Source: PM adaptation (greenfield); gstech sportsbook
marketName is only terminological analog.*

### Order
A trader instruction. Fields: id, marketId, outcomeId, playerId, side (buy/sell), type
(limit/market), price, quantity, filledQuantity, status, reservedMargin, createdAt,
cancelledAt. *Source: PM adaptation (greenfield).*

### Trade
An immutable fill matching orders. Fields: id, marketId, outcomeId, makerOrderId,
takerOrderId, price, quantity, fee, createdAt, ledgerTxnId. *Source: PM adaptation
(greenfield).*

### Position
Net holding per trader/market/outcome. Fields: id, playerId, marketId, outcomeId, quantity,
avgPrice, realizedPnl, unrealizedPnl, status (open/closed/settled), updatedAt. *Source: PM
adaptation (greenfield).*

### Settlement
Resolution and payout of a market. Fields: id, marketId, resolvedOutcomeId, resolvedBy,
resolvedAt, method (oracle/manual), idempotencyKey, status (pending/processing/complete/void),
ledgerBatchId. *Source: PM adaptation (greenfield); idempotent by design.*

### MarketIntegrityAlert
Surveillance alert. Fields: id, marketId, playerId(s), pattern (wash/spoof/collusion/insider/
abnormal), severity, evidence, status, caseId. *Source: PM adaptation; reuses Idefix
risk-rules + OMEGA duplicate-detection patterns.*

### Case
Structured workflow item. Fields: id, type (kyc/aml/fraud/integrity/dispute/withdrawal),
subjectPlayerId, status, assignee, priority, linkedEntities[], notes[], slaDueAt,
createdAt, resolvedAt. *Source: Idefix notes/events (informal) + OMEGA Dual Approval; built
structured.*

### InternalNote
Operator note on a record. Fields: id, subjectType, subjectId, body, isSticky, isArchived,
authorId, createdAt. *Source: Idefix notes (sticky/archive); OMEGA comment tagging.*

### Document
Stored file (KYC, source-of-funds). Fields: id, playerId/accountId, type, filename, mime,
storageRef, status, uploadedBy, createdAt. *Source: Idefix `documents` module.*

### CommunicationEvent
Outbound/inbound message. Fields: id, playerId, channel (email/sms/push/in-app), templateKey,
status, sentAt, payloadRef. *Source: Idefix `PlayerSentContent`; OMEGA Email Control.*

### Segment
Tag/tag-group definition. Fields: id, code, name, type (tag/group), status, criteria,
members[]. *Source: Idefix `/tags` `/segments`; OMEGA Player Tag + Tag Groups.*

### BonusCampaign
Promotion definition. Fields: id, brandId, name, triggerType, start/end, caps (maxTriggerAll,
maxTriggerPlayer), eligibility (incTags, excTags, product, country), turnoverRule
(trading-volume), status. *Source: Idefix campaigns/bonuses; OMEGA Social Package.*

### Reward
Granted bonus/loyalty item. Fields: id, playerId, campaignId, amount/itemCode, status,
turnoverRemaining, grantedBy, expiresAt. *Source: Idefix rewards; OMEGA Loyalty Item.*

### AuditLog
Append-only record of sensitive actions. Fields: id, actorId, actorType (admin/system),
action, resource, resourceId, before, after, brandId, ip, createdAt, hashPrev (tamper-evident
chain). *Source: Idefix per-field `modified` + UserLog/RiskLog; OMEGA Staff Change Log +
Exception Report.*

### Brand
Tenant. Fields: id, name, url, defaultLanguage, fromEmail, currencies[], status, createdAt.
*Source: Idefix `brandId`; OMEGA Brand Editor.*

### Jurisdiction
Per-country/region rule set. Fields: id, country, jurisType/value, gameplay/login/signup/
deposit toggles, kycSystem, geoSystem, autoWithdrawal, signupAge, defaultFlag, marketEligibility.
*Source: OMEGA Brand Country (343 rows).*

### Report
Report definition + run. Fields: id, type, parameters (brand/period/filters), schedule,
format, lastRunAt. *Source: Idefix reports; OMEGA report suite.*

### ExportJob
Async export. Fields: id, reportId/query, format (csv/pdf/json), status, fileRef,
requestedBy, createdAt. *Source: Idefix export libs; OMEGA export controls.*

### FeatureFlag
Config toggle / key-value. Fields: key, value, scope (all-brands/specific-brand),
country, currency, isEncrypted, updatedBy. *Source: OMEGA Brand Registry.*

## State Machines

### Player Account State
`registered → active → (suspended ↔ active) → closed`; plus orthogonal flags:
`loginBlocked`, `selfExcluded`, `documentsRequested`. Suspended/self-excluded/closed block
trading and/or login. *Source: Idefix `PlayerAccountStatus`.*

### KYC State
`none → pending → verified | declined`; `verified → expired → pending` (re-verification).
Triggers: registration, first deposit, threshold, spend/trading-volume. *Source: Idefix
`kyc.ts`; OMEGA KYC Status Requirements.*

### AML / Risk Review State
`clear → flagged → under_review → (escalated → case) | cleared`. Driven by rule points
crossing `maxCumulativePoints` or manual trigger. *Source: Idefix `risk.ts`.*

### Responsible Gaming / Responsible Trading State
`none → limited (active limits) → cool_off → self_excluded(temporary) → self_excluded(permanent)`;
exit from temporary exclusion only after idle period. *Source: Idefix limits/exclusion; OMEGA
Exclusion Service.*

### Wallet State
`active ↔ frozen → closed`. Frozen blocks debits/credits except authorized adjustments.
*Source: PM adaptation + Idefix balance model.*

### Transaction State
`initiated → pending → (approved → completed) | rejected | failed | reversed`. Withdrawals
add `auto_approved` vs `manual_review`. *Source: Idefix payments + OMEGA AWA/Pending.*

### Order State
`new → open → (partially_filled → filled) | cancelled | rejected | expired`. Cancellation
releases reserved margin. *Source: PM adaptation (greenfield).*

### Position State
`open → (increased/decreased) → closed → settled`. Settled only after market settlement.
*Source: PM adaptation (greenfield).*

### Settlement State
`pending → processing → complete`; or `→ void` (re-resolution). Idempotency key prevents
double-payout. *Source: PM adaptation (greenfield).*

### Case State
`open → in_progress → (pending_approval) → resolved | closed | rejected`. *Source: Idefix
events + OMEGA Dual Approval.*

## Required Invariants

The following invariants are mandatory and must be enforced by the backend:

- Every balance-changing event must create an immutable ledger entry.
- Every sensitive admin action must create an audit log.
- Manual balance adjustments require permission and reason.
- Dual approval is required for high-risk financial adjustments if configured.
- Suspended players cannot place new orders.
- Self-excluded players cannot log in or trade.
- Restricted players cannot access restricted markets.
- Resolved markets cannot accept new orders.
- Settlement must be idempotent.
- KYC/AML gates must be jurisdiction-configurable.
- Responsible gaming or responsible trading limits must be enforced before order placement.

Additional derived invariants:

- Balances are always derivable from the ledger (no authoritative stored scalar).
- Reserved margin for open orders cannot exceed available balance at order time.
- A trade must reference two valid orders and post matching ledger entries.
- Position quantity equals the signed sum of its fills.
- Closing/voiding a market requires that no orders remain open (they are cancelled first).

## Permission Boundaries

- **Read player data:** support/compliance/admin roles (brand-scoped).
- **Change account status / apply limits:** compliance/risk roles.
- **Approve KYC / clear AML:** compliance role; declines logged.
- **Manual balance adjustment:** finance role + reason; over threshold → dual approval
  (maker ≠ checker).
- **Approve/reject withdrawals:** payments role; AWA auto-approves within configured rules.
- **Resolve/settle markets:** market-operations role; settlement → dual approval if configured.
- **Configure brands/jurisdictions/feature flags:** admin/config role only.
- **Manage admin users & roles:** super-admin; self-permission escalation blocked.
- All write actions are brand/jurisdiction-scoped per the actor's role scope.

## Audit Events

Every one of the following emits an `AuditLog` (append-only, tamper-evident):
admin login/logout/lockout; role/permission change; player status change (per field, who/when);
KYC decision; AML flag/clear; limit set/cancel; self-exclusion set/lift; wallet
freeze/unfreeze; manual adjustment (with reason + approver); deposit/withdrawal
approve/reject; order cancel by admin; market open/suspend/resolve/void; settlement
run/void; case create/assign/resolve; configuration/feature-flag change; data export of PII;
consent capture. *Source: corroborated by Idefix per-field audit + OMEGA Staff Change Log /
Exception Report.*

## Prediction Market Adaptations

- **Gambling → trading semantics:** `allowGameplay → allowTrading`; GGR/RTP/jackpot KPIs →
  volume/open-interest/fees/settlement-P&L; wagering requirement → trading-volume turnover.
- **Bet ticket → trade/position:** the gstech fixed-odds bet drawer (Bet ID, Stake, Odds,
  Selection, marketName, settled date) informs the **trade/position drawer UX** but not the
  model — a tradable contract has a price, order book/AMM, and continuous settlement, unlike a
  fixed-odds wager.
- **Reserved balance → margin:** Idefix `reservedBalance` is reinterpreted as margin held
  against open orders/positions.
- **Liabilities report → exposure/P&L:** the legacy liabilities reporting concept maps to
  house and per-market exposure and mark-to-market P/L.
- **Responsible gaming → responsible trading:** deposit/loss/session limits extended with
  position and exposure limits; self-exclusion and cool-off retained.
- **Market integrity:** new surveillance domain (wash trading, spoofing, collusion) with no
  precedent in the gambling sources; reuses the rule-engine and duplicate-detection patterns.
