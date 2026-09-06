> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> Written on branch `pam/p0-modernization` (2026-07-02 → 2026-07-06); never merged. The reference
> implementation (345 commits, migrations 057–061) lives at tag `archive/pam-p0-modernization-2026-07-06`.
> Paths here are PRE-REBRAND (`apps/Phoenix-Predict-Combined/go-platform` = `apps/taptrade-platform/go-platform`;
> `talon-backoffice/packages/app` = `frontend/packages/office`) and units are pre-points ("cents", before
> migration 050). Commit hashes cited inside resolve only at that tag.
> For what of this main still lacks, see `docs/licensability-gaps.md`. See `CLAUDE.md` for current architecture.

# GAP-64 — External anchor for the audit hash-chain — BLOCKED (needs external infra)

**Status:** BLOCKED (Blocked-Item Protocol). Spec §24 Audit Logs & Compliance Evidence.
**Discovered:** verification #8 (2026-07-03). This is a known-limitation hardening, not a coding bug in GAP-13.

## Problem
GAP-13 made `provider_ops_audit_log` a hash chain (`entry_hash = H(seq ‖ prev_hash ‖ payload)`),
appended under an advisory lock, with `VerifyChain` walking the links. The append-only DB
trigger stops a *non-superuser* from mutating history. But the chain is **self-contained**:
a DB **superuser** who can drop the append-only trigger can either

1. **Rehash forward** from a tamper point — alter row N, then recompute `entry_hash` for
   rows N+1…head — and `VerifyChain` will report OK (every link is internally consistent), or
2. **Truncate the tail** — delete the last K rows — and the shortened chain still verifies OK.

So the integrity guarantee is only as strong as "no adversary ever had superuser," which is
not an assumption a licensed operator's auditor will accept for the compliance evidence trail.

## Why this is BLOCKED (not buildable in-session)
Closing the superuser gap requires an **external, out-of-band, append-only anchor** that the
DB superuser cannot also control — i.e. periodically publishing/signing the current head
`entry_hash` (plus `seq`/row-count) to a sink outside the database's trust boundary:

- object storage with WORM / Object-Lock (e.g. S3 Object Lock in compliance mode), or
- a transparency log / Merkle-anchored ledger, or
- a co-signed RFC-3161 trusted timestamp.

Every one of these needs **external infrastructure and credentials that do not exist and
cannot be provisioned or verified from inside this session** (a WORM bucket + IAM role, a
timestamp authority, or a transparency-log endpoint). Per the Verification Doctrine, a
load-bearing fact that needs an external system is unverifiable → the item is BLOCKED with
the fact named, rather than guessed.

Building only the *in-process* half now — extending `VerifyChain` to compare the head against
"the last anchor" — would be **dead code** (there is no anchor source to compare against),
which Guardrail #5 forbids. So no partial slice is shippable until the sink is decided/provisioned.

## Interim mitigation already in place
- The append-only trigger blocks the **non-superuser** tamper path (the common case).
- `VerifyChain` detects any in-band inconsistency (a tamper that does *not* also rehash forward).
- GAP-13's chaining raises the bar from "edit one row" to "drop the trigger AND rehash the whole tail."

## Design for when unblocked (external sink chosen + provisioned)
1. **Anchor job:** a periodic task reads the current head (`max(seq)`, its `entry_hash`, and the
   row count) and writes a signed record `{seq, entry_hash, row_count, ts, signature}` to the
   external WORM sink. Cadence: every N minutes and on process shutdown.
2. **Anchor store table** `provider_ops_audit_anchors` (append-only, mirrored to the sink) so
   `VerifyChain` can cheaply fetch the most recent local copy, then confirm it against the sink.
3. **VerifyChain extension:** after the in-band walk, assert (a) the current head `entry_hash`
   extends the last anchored `entry_hash` (no fork), (b) `max(seq)` ≥ the anchored `seq` and the
   row count is ≥ the anchored count (no truncation below an anchor), and (c) the anchor's
   signature verifies. A mismatch is a CRITICAL integrity alarm.
4. **Fail-closed posture:** in a deployed environment, a missing/misconfigured sink makes the
   anchor job error loudly (metric + alert), matching the rest of the compliance stack.

## Unblock condition
A decision + provisioning of the external append-only sink (which sink, its credentials, its
retention/WORM policy). That is an infrastructure/ownership decision outside this loop's reach.
