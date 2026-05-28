# Hula Na! Cashier Testnet E2E Acceptance

**Status:** Stage 1 Alpha plus V3 testnet gates.
**Date:** 2026-05-28.

No mainnet integration may start until this testnet matrix is boring.

## Stage 1: Custodial USDC Alpha Smoke

Stage 1 uses the Go gateway `alphacashier` rail, not the V3 non-custodial
cashier service. This smoke can run against a fake EVM client in unit tests, a
test RPC, or a supervised live-chain micro-deposit after treasury setup.

Happy path:

1. User signs in.
2. User requests `POST /api/v1/cashier/alpha/wallet/challenge`.
3. User signs the exact challenge message with MetaMask.
4. Gateway verifies `personal_sign` server-side and stores the wallet
   connection.
5. User creates an exact-amount deposit intent with an `Idempotency-Key`.
6. User sends the exact ERC-20 USDC transfer from the connected wallet to the
   Hula treasury.
7. User submits the tx hash.
8. Gateway verifies receipt status, token contract, sender, recipient, amount,
   log index, and confirmations.
9. Gateway credits the internal wallet ledger exactly once.
10. Replaying the same tx submission does not create a second credit.
11. User creates a withdrawal request only if the Alpha queue is enabled.
12. Operator approves with a review note, records manual broadcast tx hash, and
    marks completed only after on-chain visibility.
13. Backoffice reconciliation reports expected reserve, treasury reserve, and
    drift.

Required local guard:

```bash
scripts/check-alpha-cashier-stage1.sh
```

Pass condition: deposit credit count remains one after replay, withdrawal funds
are held before approval, completion captures the reservation, audit events are
written, and reconciliation drift is zero for the fake-chain fixture.

Before Alpha invite:

- `GET /api/v1/admin/cashier/alpha/preflight` has no `fail` checks.
- Any `warn` checks have an owner-approved launch note.
- The first real transaction is a tiny operator-controlled deposit, not a user
  deposit.

## Phase 3: TRC-20 USDT Deposit Path

Happy path:

1. User signs in by email.
2. Cashier resolves embedded EVM wallet and smart-wallet address.
3. User requests a TRC-20 USDT deposit address.
4. Provider maps the deposit address to the user's destination wallet/collateral
   route.
5. User sends testnet USDT-equivalent from Tron.
6. Bridge watcher records source detection exactly once.
7. Bridge watcher records destination settlement exactly once.
8. UI moves through `address_issued -> source_detected -> bridging -> settled`.
9. Available collateral updates without touching the legacy Go cents ledger.

Required run:

- 10/10 deposits complete.
- At least 3 deposits are from repeated sends to the same issued address if the
  selected provider supports reusable deposit addresses.
- At least 2 deposits simulate CEX-style source addresses where refund-to-sender
  is unsafe.
- Every deposit has source tx hash, provider request id, destination tx hash, and
  user wallet attribution.

## Restart Safety

Run each interruption at least once:

- Restart `cashier-api` after address creation.
- Restart `bridge-watcher` after source detection and before destination tx.
- Restart `bridge-watcher` after destination tx and before database commit.
- Replay the same provider callback 10 times.
- Poll the same provider request while callbacks are also arriving.

Pass condition: no double settlement, no lost attribution, no terminal-state
mutation after `settled`, `failed`, or `recovery_required`.

## Failure Cases

Every case must land in recovery, not silent credit:

- Wrong token sent to deposit address.
- Correct token on wrong chain.
- Under-minimum deposit.
- Deposit after quote expiry.
- Provider creates a child request or regenerated route.
- Destination transaction fails or is replaced.
- Provider callback has invalid signature.
- Provider callback is valid but references an unknown request.
- Source address or destination address hits sanctions/manual-review policy.

## Phase 4: Gasless Trading Path

Use market mocks until final market contracts exist.

Required flow:

1. User authorizes collateral wrap/spend using provider wallet UX.
2. Relayer verifies domain, nonce, target contract, calldata policy, and limits.
3. Relayer submits gas-sponsored operation.
4. Watcher confirms inclusion.
5. UI reflects pending and confirmed states.

Pass condition: Maria never needs native gas, chain switching, or seed phrases.

## Phase 5: Withdrawals

V1 withdrawal target is EVM first.

Required flow:

1. User enters destination EVM address.
2. Cashier shows chain, asset, network fee policy, and irreversible-send warning.
3. User authorizes withdrawal.
4. Compliance and velocity policy approve or route to manual review.
5. Relayer submits.
6. Watcher confirms.

Pass condition: no relayer transaction exists without a user authorization hash,
single-use nonce, future expiry, and policy decision id.
