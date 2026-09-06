> **Abandoned workstream — specification only.** `services/bridge-watcher/` is not a running
> service and this document describes nothing that exists. The product moved to
> non-redeemable points; the gateway's cashier, crypto and payment routes are
> unmounted by default and refuse to boot in production or staging. See
> `services/bridge-watcher/README.md` for why this tree is still in the repository, and
> `docs/archive/cashier/` for the design record.

# Bridge Watcher State Machine

**Status:** SUPERSEDED 2026-09-06 — abandoned workstream (was: "Draft.").
**Date:** 2026-05-25.

## Deposit Intent States

```text
created
  -> address_issued
  -> source_detected
  -> bridging
  -> settled
```

Any non-terminal state may move to `recovery_required` or `failed`. Terminal states
never move.

## Processing Loop

1. Load non-terminal deposit intents with leases.
2. Fetch provider status.
3. Fetch source-chain evidence if provider status references a source tx.
4. Fetch destination-chain evidence if provider status references a destination tx.
5. Insert bridge event with idempotency key.
6. Apply exactly one state transition if evidence is unambiguous.
7. Release lease.

## Lease Rules

- Lease duration must be shorter than retry interval.
- Lease owner and expiration are persisted.
- Expired leases are stealable.
- Processing must be safe if two workers race and one loses the insert/update.

## Callback and Poll Merge Rules

- Callback path and polling path write the same `bridge_events` table.
- Both paths use the same idempotency-key builder.
- Callback does not get higher trust than chain evidence.
- Provider status does not get higher trust than final destination-chain evidence.

## Quarantine Rules

Quarantine instead of transition when:

- Provider request maps to multiple users.
- Source tx maps to multiple intents.
- Destination wallet differs from user smart wallet.
- Amount decimals do not match known decimal metadata.
- Provider status conflicts with chain evidence.
- Compliance decision is not `allow`.
