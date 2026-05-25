# Cashier runbooks

> **Superseded for production design (2026-05-25):** these runbooks describe the
> custodial BSC prototype only. The approved cashier architecture is now
> non-custodial EVM wallet + Tron-first deposits; see `docs/cashier/README.md`.
> Keep these notes for prototype debugging and for lessons on finality,
> idempotency, and decimal handling. Do not treat them as production launch
> runbooks for real user funds.

Operational runbooks for the custodial BSC USDT rail + deposit watcher **as built
so far**. Honest status: the **deposit detect→credit path is implemented and
tested**; the **withdrawal signer**, **deposit-address derivation**, **Symbiosis
bridge**, **admin pause**, and **sanctions screening** are not yet implemented
(fail-closed) — their entries below are policy stubs marked `[STUB]`.

Conventions: Postgres is the dev container `predict_postgres` on `:5434`. Run SQL with:

```bash
docker exec predict_postgres psql -U predict -d predict -c "<SQL>"
```

Key tables: `crypto_deposits` (on-chain detection + finality + exactly-once),
`crypto_deposit_addresses` (per-user deposit addresses), `wallet_balances` /
ledger (the cents balance). Key env: `CRYPTO_RPC_URL`, `CRYPTO_ASSET_CONTRACT`,
`CRYPTO_DEPOSIT_ADDRESS_SOURCE`, `CRYPTO_CONFIRMATIONS` (default 12),
`CRYPTO_NETWORK`/`CRYPTO_ASSET`/`CRYPTO_CHAIN_ID`/`CRYPTO_ASSET_DECIMALS`.

---

## RB-1 — A deposit is not showing in the user's balance

1. Find the deposit by tx hash:
   ```sql
   SELECT id, status, block_number, amount_cents, dust_base, ledger_entry_id, detected_at, credited_at
   FROM crypto_deposits WHERE tx_hash = '<0xhash>';
   ```
2. Interpret `status`:
   - **no row** → the watcher hasn't seen it. Check the address is one of ours
     (`SELECT * FROM crypto_deposit_addresses WHERE LOWER(address)=LOWER('<to>')`),
     the token contract matches `CRYPTO_ASSET_CONTRACT`, and the watcher is
     running and has scanned that block range (see RB-2 / RB-4).
   - **pending** → detected, awaiting finality. Creditable once
     `head_block - block_number + 1 >= CRYPTO_CONFIRMATIONS`. Check head:
     `cast`/RPC `eth_blockNumber`. If finality is reached but it's still pending,
     the credit step is failing — check watcher logs for `crypto deposit: credit failed`.
   - **credited** → `ledger_entry_id` is set; the balance moved. Verify the ledger
     entry and `wallet_balances` for the user.
   - **reorged** → the block left the canonical chain before finality; correctly
     not credited. If the tx later re-mined, a new row (different `block_hash`)
     should appear and credit normally.
3. Sub-cent deposits (`amount_cents = 0`, all in `dust_base`) are marked credited
   with no ledger movement — by design (nothing creditable).

## RB-2 — BSC RPC outage (watcher can't reach the chain)

Symptoms: watcher `Sync` returns `head block` / `get logs` errors; no new
detections or credits. **Funds are safe** — nothing is lost; detection resumes
on recovery and pending deposits credit once final.

1. Confirm the RPC is down: `curl -s -X POST $CRYPTO_RPC_URL -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' -H content-type:application/json`.
2. Fail over: set `CRYPTO_RPC_URL` to the backup provider and restart the watcher.
   Public fallback (read-only, China-accessible): `https://bsc-dataseed.binance.org`.
3. The watcher re-scans from its cursor; deposits during the outage are detected
   on the next successful scan. Confirm credits resume (RB-1).

## RB-3 — Chain reorg

`crypto_deposits` rows whose block is removed go `reorged` and are never credited.
Because credit only happens at `CRYPTO_CONFIRMATIONS` (12 ≈ 36s on BSC), a credited
deposit being reorged out requires a >12-block reorg — treat as a Sev1, manual
review: identify affected `credited` rows, reconcile against on-chain state, and
file a wallet correction task. Consider raising `CRYPTO_CONFIRMATIONS` if BSC
finality assumptions change.

## RB-4 — Watcher stalled / cursor stuck

Symptoms: pending deposits past finality not crediting; no recent log activity.
1. Check the watcher process/logs.
2. The cursor is the `fromBlock` the loop persists (see DECISIONS.md — cursor
   persistence is a known TODO; until then a restart re-scans from the configured
   start block, which is safe because detection + credit are idempotent).
3. Re-run; `creditFinalized` will credit any pending-but-final deposits.

## RB-5 — Suspected double-credit

It should be impossible: `wallet.Credit` is idempotent on
`crypto_deposit:<chainId>:<txHash>:<logIndex>`, and a partial unique index allows
at most one `credited` row per `(chain_id, tx_hash, log_index)`. To verify:
```sql
SELECT chain_id, tx_hash, log_index, count(*) FILTER (WHERE status='credited')
FROM crypto_deposits GROUP BY 1,2,3 HAVING count(*) FILTER (WHERE status='credited') > 1;
```
Any rows returned indicate a bug — escalate. Cross-check the ledger for duplicate
entries under the same idempotency key (there should be exactly one).

## RB-6 — Pause deposits  `[PARTIAL]`

Today: stop the deposit watcher and/or unset `CRYPTO_RPC_URL` (rail goes
fail-closed). A first-class admin pause flag is not yet wired (TODO, task #11/admin).

## RB-7 — Sanctions hit on a deposit/withdrawal address  `[STUB]`

Policy (screening not yet implemented): screen deposit-source and withdrawal-
destination addresses; on a hit, quarantine the deposit (do not credit) / block
the withdrawal, and page for manual review. The Tron sender is not visible
pre-bridge, so screening on the TRC-20 leg is weaker. Decide the on-receipt
disposition (freeze vs reject vs quarantine) before enabling deposits.

## RB-8 — Withdrawal outage  `[STUB]`

`CryptoRail.PrepareWithdrawal` is fail-closed (`ErrRailNotConfigured`) until the
signer is implemented (task #12, custody-gated). No withdrawals are broadcast yet.

## RB-9 — Symbiosis bridge outage (TRC-20 deposits)  `[STUB]`

The TRC-20 → BSC bridge intake is not built (spike-gated; see README open
decisions). When built: monitor bridge health, keep the bridge-receiver hot
wallet swept, and document a manual-credit path for in-flight bridges.
