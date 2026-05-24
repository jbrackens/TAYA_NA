# Cashier — overnight build summary (2026-05-23 → 24)

You said "continue uninterrupted for 8h." Here's what landed while you slept. All
work is on **`feat/hula-na-cashier`** in the dedicated worktree
`/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict-cashier`. **Nothing pushed.**
Your `feat/ai-market-drafting` main checkout was never touched.

## What got built — the BSC USDT deposit flow (custodial), end to end

Detect on-chain USDT transfers → record with exactly-once guarantees → credit the
existing cents ledger after finality. All in `internal/payments/`, all
**fail-closed** (the rail stays dark until ops set `CRYPTO_RPC_URL` /
`CRYPTO_ASSET_CONTRACT` / `CRYPTO_DEPOSIT_ADDRESS_SOURCE`). No real keys, no
mainnet crediting, no smart contracts.

Commits (newest first), each test-backed:
- `test(cashier): e2e — watcher credits the real wallet ledger once`
- `feat(cashier): fail-closed deposit-watcher factory from env`
- `feat(cashier): startup decimals guard (fail-closed on 18-vs-6)`
- `feat(cashier): deposit watcher — detect, finalize, credit exactly once`
- `feat(cashier): minimal EVM JSON-RPC client + ERC-20 Transfer decode`
- `feat(cashier): track on-chain deposits with exactly-once credit`
- `feat(cashier): add USDT<->cents conversion at the rail boundary`
- `docs(cashier):` design record, on-chain decimals confirmation

## Verification

Full `go build ./...` clean; full `internal/payments` suite green, including
Postgres integration + a real-`wallet.Service` E2E (balance 0 → 100 → 100,
proving exactly-once on the actual ledger). Re-run:
```
WALLET_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable" \
  go test ./internal/payments/...
```
(Integration tests skip cleanly when no DB is configured.)

## Decisions I made for you (all reversible — see DECISIONS.md)

- **D1** credit via `wallet.Credit`, not synthetic `payment_transactions`.
- **D2** std-lib JSON-RPC client, no go-ethereum dependency.
- **D3** built the watcher as a component but did **not** edit the gateway
  bootstrap unattended (couldn't run the full stack to verify).

## What needs YOU (in priority order)

1. **Deposit-address custody source** (HD-wallet+KMS vs custody provider) — this
   gates the deposit-address derivation and the withdrawal signer. Biggest blocker.
   See README "Open decisions".
2. **Gateway wiring** (task #11) — mount the rail routes + start the watcher loop;
   needs a full gateway+auth run to verify together.
3. **Symbiosis TRC-20 spike** — public docs suggest wallet-signed swaps, not
   passive per-user deposit addresses; this may break the Maria-friendly TRC-20 flow.
4. Deposit UI shell, admin pause, sanctions screening — pending.

## Known limitations / TODOs noted in code

- Watcher cursor IS persisted now (`crypto_watcher_cursor` + `RunCycle`): a
  restart resumes from the last scanned block.
- `eth_getLogs` isn't chunked for huge ranges yet (fine for incremental scans;
  chunk a cold-start backfill before production).
