# Hula Na! Cashier Incident Response

**Status:** Draft gate for Phase 8-9.
**Date:** 2026-05-25.

## Severity

| Severity | Examples | First action |
|---|---|---|
| SEV-0 | Unauthorized fund movement, contract exploit | Global pause, incident commander |
| SEV-1 | Provider double-settlement risk, relayer abuse attempt | Pause affected chain/provider |
| SEV-2 | Deposit delays, recovery backlog SLA breach | Disable affected rail, support banner |
| SEV-3 | Metrics degradation without user impact | Ticket and monitor |

## Immediate Actions

1. Assign incident commander.
2. Freeze deploys touching cashier.
3. Preserve logs and provider payloads.
4. Pause affected rail/chain/relayer if funds are at risk.
5. Start reconciliation from last known-good checkpoint.
6. Draft user/support messaging only after facts are established.

## Kill Switches Required Before Beta

- Disable Tron deposits.
- Disable direct EVM deposits.
- Disable withdrawals.
- Pause relayer globally.
- Pause relayer by target contract.
- Pause settlement/collateral contract if contract design supports it.
- Disable provider callbacks while keeping raw payload capture.

The schema seeds `cashier_runtime_flags` fail-closed:

- `tron_deposits_enabled = false`
- `evm_deposits_enabled = false`
- `withdrawals_enabled = false`
- `relayer_enabled = false`
- `provider_callbacks_enabled = false`

## Evidence Packet

Every incident needs:

- Timeline.
- Affected user ids.
- Deposit/withdrawal/relayer ids.
- Source and destination tx hashes.
- Provider request ids.
- Callback raw body hashes.
- Operator actions.
- Reconciliation result.
- Follow-up fixes.
