# Hula Na! Cashier Operator Checklists

**Status:** Draft.
**Date:** 2026-05-25.

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
