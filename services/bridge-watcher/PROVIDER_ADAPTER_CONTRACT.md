# Provider Adapter Contract

**Status:** Draft.
**Date:** 2026-05-25.

Every bridge provider adapter must implement this behavior before it is eligible
for testnet E2E runs.

## Interface Shape

```text
createDepositRoute(intent) -> providerRequest
getProviderRequest(providerRequestId) -> providerStatus
verifyCallback(rawBody, headers) -> verifiedEnvelope | invalidSignature
normalizeCallback(verifiedEnvelope) -> bridgeEvent[]
normalizeProviderStatus(providerStatus) -> bridgeEvent[]
```

## Hard Requirements

- `createDepositRoute` is idempotent by caller-provided idempotency key.
- `verifyCallback` operates on raw body bytes before JSON parsing.
- Callback signature comparison must be constant-time and must fail if the raw body
  is reserialized before verification.
- `normalizeCallback` and `normalizeProviderStatus` produce the same
  provider-independent `BridgeEvent` shape.
- Duplicate callbacks normalize to the same idempotency key.
- Unknown callbacks normalize to quarantined events, not credits.
- A destination-confirmed event must include destination tx hash, destination
  chain, destination wallet, amount units, asset, and decimals.

## Mock Scenarios Required

1. Happy path: address issued, source confirmed, destination confirmed.
2. Duplicate callback replay.
3. Invalid callback signature.
4. Unknown provider request id.
5. Under-minimum source amount.
6. Expired quote with late source tx.
7. Destination wallet mismatch.
8. Provider failed after source detection.
9. Provider reports success but destination chain evidence is missing.
10. Sanctions/manual-review quarantine.

Machine-readable coverage:

- `fixtures/provider-scenarios.manifest.json`
- `scripts/check-cashier-provider-scenarios.mjs`

## Adapter Rejection Criteria

Reject provider for V1 if:

- It cannot produce passive deposit-address or equivalent one-step send UX.
- It cannot correlate source and destination transactions deterministically.
- It cannot expose stable request ids/statuses for reconciliation.
- It can only refund to sender in CEX-origin flows.
- It cannot support duplicate-safe callback/poll replay.
