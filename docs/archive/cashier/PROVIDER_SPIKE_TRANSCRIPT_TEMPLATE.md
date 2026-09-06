> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> A template for provider spikes that were never run.
> See `CLAUDE.md` for current architecture.

# Provider Spike Transcript Template

**Status:** SUPERSEDED 2026-09-06 — abandoned workstream (was: "Required before Phase 3 live run.").
**Date:** 2026-05-25.

Create one copy per provider and route.

## Metadata

- Provider:
- Date:
- Environment:
- Source chain:
- Source asset and decimals:
- Destination chain:
- Destination asset and decimals:
- Destination smart wallet:
- Operator:

## Address or Route Creation

- Request id:
- Idempotency key:
- Request payload SHA-256:
- Response payload SHA-256:
- Deposit address, if any:
- Minimum amount:
- Quote expiry:
- Provider docs URL:

## Source Transaction

- Source tx hash:
- Source address:
- Amount units:
- Confirmations required:
- Detection timestamp:

## Destination Settlement

- Destination tx hash:
- Destination contract:
- Destination smart wallet:
- Settled amount units:
- Settlement timestamp:

## Callback Verification

- Callback id:
- Raw body SHA-256:
- Signature header:
- Signature version:
- Verified at:
- Duplicate replay result:

## Failure/Recovery Observations

- Under-minimum behavior:
- Expired quote behavior:
- Wrong-token behavior:
- Unknown callback behavior:
- Refund behavior:
- Provider reindex/retry mechanism:

## Decision

- Pass/fail for Maria V1 UX:
- Security concerns:
- Operational concerns:
- Follow-up questions:
