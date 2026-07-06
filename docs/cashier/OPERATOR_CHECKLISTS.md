# TapTrade Cashier Operator Checklists

**Status:** Stage 1 Alpha operational checklist.
**Date:** 2026-05-28.

## Stage 1 Alpha Enablement

Use this checklist before setting `ALPHA_CASHIER_ENABLED=true`.

1. Confirm the single Alpha chain and chain id.
2. Verify the USDC contract address from chain-native documentation or explorer
   sources; do not copy from screenshots or chat.
3. Create the TapTrade treasury wallet and record owner, backup owner, creation date,
   chain, and intended use in the private operations register.
4. Confirm no treasury private key, seed phrase, or payout signing credential is
   stored in the app, repository, CI variables, or server `.env` files.
5. Provision primary RPC URL in deployment secrets and record the backup provider
   in the private operations register.
6. Keep `ALPHA_CASHIER_WITHDRAWALS_ENABLED=false` unless the operator team is
   ready to receive user withdrawal requests in backoffice.
7. Keep `ALPHA_CASHIER_WITHDRAWAL_REVIEW_REQUIRED=true`.
8. Run the admin Alpha preflight endpoint:
   `GET /api/v1/admin/cashier/alpha/preflight`.
9. Do not invite users unless preflight has no `fail` checks and every `warn`
   check has an explicit owner-approved note.
10. Run the fake/test RPC smoke flow and record the result in the launch log.

## Stage 1 Daily Reconciliation

Run once per operating day while Alpha is enabled.

1. Open backoffice `/cashier`.
2. Review the Alpha preflight panel; any `fail` check pauses new deposits.
3. Review treasury reserve, expected reserve, reserve drift, and pending
   withdrawals.
4. Compare the on-chain treasury balance with the backoffice reconciliation
   number.
5. If drift is non-zero, pause deposit invitations and open an incident before
   processing withdrawals.
6. Export or screenshot the deposit list, withdrawal queue, and audit trail into
   the private launch log.
7. Confirm every credited deposit has a tx hash and a matching audit event.
8. Confirm every completed withdrawal has a broadcast tx hash and two humans
   aware of the payout.

## Stage 1 Manual Withdrawal Review

Stage 1 does not broadcast payouts from application code.

1. Confirm the request status is `requested`.
2. Confirm destination address format and chain.
3. Confirm amount is within the Alpha limit and does not exceed current available
   treasury balance.
4. Confirm the user's account is not flagged for fraud, abuse, or unresolved
   support issues.
5. Approve only with a concrete review note. Generic notes such as `ok` or empty
   strings are not acceptable.
6. Broadcast the payout manually from the approved operations wallet.
7. Mark the request `broadcasted` with the tx hash.
8. Mark the request `completed` only after the transaction is visible on-chain.
9. If rejecting, include the reason and confirm the wallet reservation was
   released.

## Stage 1 Pause Criteria

Pause new cashier activity immediately if any of these occur:

- Alpha preflight reports `fail`.
- RPC is unavailable or returns inconsistent chain data.
- Treasury balance cannot be confirmed independently.
- Reconciliation drift is non-zero and unexplained.
- Duplicate tx replay guard fails in smoke or live monitoring.
- Backoffice RBAC cannot distinguish `cashier:read` and `cashier:write`.
- A private key or seed phrase is found in any app, deploy, or CI surface.

Pause means: set `ALPHA_CASHIER_ENABLED=false`, redeploy, leave existing audit
records intact, and continue reconciliation before deciding on user messaging.

## Stuck Deposit

1. Search by user id, deposit intent id, provider request id, source tx hash, and
   destination tx hash.
2. Confirm provider status using the provider adapter/status endpoint.
3. Confirm source-chain evidence.
4. Confirm destination-chain evidence.
5. Compare destination wallet to the user's smart wallet.
6. Compare asset and decimals against SDK decimal metadata.
7. If evidence conflicts, create or keep recovery case in `triage`.
8. If provider is degraded, move case to `waiting_on_provider`.
9. Never manually credit from screenshots.

## Destination Mismatch

1. Confirm destination wallet mismatch from chain evidence.
2. Create recovery case if one does not exist.
3. Create compliance decision `quarantine`.
4. Attach evidence hash and provider request id.
5. Escalate to two-person review.
6. Do not settle or refund until ownership is established.
7. Record approvals in `recovery_approvals`; one operator cannot approve twice for
   the same approval type.
8. Service implementation should use the SDK `hasTwoPersonApproval` helper or an
   equivalent database constraint/query that requires two distinct approving
   operators.

## Expired Quote / Late Source Funds

1. Confirm source tx arrived after quote expiry.
2. Confirm whether provider created a child request or regenerated route.
3. If no safe destination settlement exists, move case to `waiting_on_provider`.
4. Do not refund to source if source is a CEX/hot-wallet pattern.
5. Ask user for wallet-control proof only through approved support channels.

## Withdrawal Review

1. Verify user authorization hash is present.
2. Verify compliance decision is `allow`.
3. Verify destination address format.
4. Verify amount is below beta/user caps.
5. Verify relayer target and selector are allowlisted.
6. Verify paymaster runway.
7. Deny if idempotency key already reached `submitted` or `included`.

## Paymaster Low Runway

1. Pause relayer submissions if runway is below threshold.
2. Notify incident channel.
3. Confirm no queued withdrawals will expire during pause.
4. Refill or rotate credentials using approved secret-management process.
5. Resume only after canary passes.

## Provider Callback Signature Failure

1. Preserve raw body and headers.
2. Do not parse into a state transition.
3. Check whether provider rotated signing keys.
4. If failures spike, pause provider callback processing but keep raw capture.
5. Open incident if valid deposits may be delayed.
