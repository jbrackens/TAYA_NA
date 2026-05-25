# Hula Na! Cashier Compliance Controls

**Status:** Draft gate for Phase 7.
**Date:** 2026-05-25.

This is not legal advice; it is the engineering control plan needed before counsel
and compliance can sign off.

## V1 Controls

- Geo policy before wallet creation and before every deposit/withdrawal action.
- Address screening for source, destination, and smart-wallet addresses where data
  is available.
- Deposit caps during beta.
- Daily user velocity limits.
- Manual review above threshold.
- Quarantine for sanctions/manual-review hits.
- Immutable audit log for compliance decisions.
- Operator role separation for review and release.

## Beta Caps

Recommended starting caps:

- Per deposit: 100 USD equivalent.
- Daily deposits: 500 USD equivalent.
- Daily withdrawals: 500 USD equivalent.
- Manual review required above any cap.

Raise caps only after reconciliation and support metrics stay stable.

## Decision Outcomes

| Outcome | Effect |
|---|---|
| `allow` | Flow continues |
| `manual_review` | Flow pauses; operator decision required |
| `quarantine` | Funds/status locked; no user-visible promise of release |
| `deny` | Flow stops; recovery/legal process only |

## Policy Evaluator Contract

The provider-independent SDK exposes `evaluateCashierCompliancePolicy` so API,
watcher, and operator tooling can share one decision ladder:

- Geo block escalates to `deny`.
- Sanctions hit escalates to `quarantine`.
- Screening unavailable/manual-review, beta cap breach, daily velocity breach, or
  cashier pause escalates to `manual_review`.
- The highest-severity decision wins when multiple reasons are present.

The Go gateway package mirrors the same rules in `internal/cashier` for handlers
that cannot consume the TypeScript SDK directly.

## Audit Requirements

Every decision records:

- Subject type and id.
- User id if known.
- Input evidence hashes.
- Decision and reasons.
- System or operator actor.
- Timestamp.
- Follow-up action id, if any.
