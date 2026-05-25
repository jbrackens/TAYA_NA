# Relayer Policy

**Status:** Draft.
**Date:** 2026-05-25.

The relayer is a constrained transaction submitter, not a general-purpose hot
wallet.

## Required Inputs

- Authenticated user id.
- Smart-wallet address.
- Domain-separated user authorization hash.
- Target contract.
- Calldata hash.
- Idempotency key.
- Compliance/policy decision id.

## Allowlist

V1 allowlist should include only:

- Collateral wrap/unwrap.
- Market trade execution.
- Market redemption.
- EVM withdrawal to user-specified address after policy approval.

No arbitrary token transfer, contract upgrade, approval-for-all, delegatecall, or
unbounded calldata is allowed.

## Pre-Submit Checks

- User authorization is valid for chain id, target, calldata, nonce, and expiry.
- Authorization nonce is single-use per user and authorization expiry is in the
  future at policy-evaluation time.
- Target contract is allowlisted.
- Calldata selector is allowlisted for that target.
- Amount is below user and beta caps.
- Policy decision is `allow`.
- Paymaster balance is above runway threshold.
- Same idempotency key has not already reached `submitted` or `included`.

The provider-independent SDK function `evaluateRelayerPolicy` enforces this
minimum policy contract for mocks/tests. A production service may add checks, but
must not remove any of these fail-closed denials.

## Emergency Controls

- Global pause.
- Per-chain pause.
- Per-target pause.
- Per-user pause.
- Paymaster key rotation.
- Provider credential rotation.
