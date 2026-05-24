# Cashier — autonomous build decisions (overnight 2026-05-23 → 24)

Decisions made unattended while you slept (you said "continue uninterrupted for 8h").
All are reversible and fail-closed. Flag any you'd change; none move real money.

## D1 — Crypto deposits credit via `wallet.Credit`, not synthetic `payment_transactions`
The watcher credits on finality through `wallet.Credit` (the same money primitive
`processDepositApproval`/`HandleWebhook` use), with idempotency key
`crypto_deposit:<chainId>:<txHash>:<logIndex>`, and records the ledger entry id in
`crypto_deposits`. It does **not** create `payment_transactions` rows.
Why: `crypto_deposits` already gives exactly-once + on-chain audit; a parallel
`payment_transactions` row is dual-bookkeeping without extra safety.
Revisit if you want crypto deposits to show in the `payment_transactions`-based
admin/status surfaces (then have the watcher also open+approve a txn row).

## D2 — Minimal std-lib JSON-RPC client (no go-ethereum dependency)
The repo has no go-ethereum dep. Rather than pull in the large go-ethereum module,
the watcher uses a tiny read-only JSON-RPC client (`eth_chainId`, `eth_blockNumber`,
`eth_call` decimals, `eth_getLogs`) — std-lib only.
Revisit if we later need transaction signing / ABI codec / heavy chain interaction
(at which point go-ethereum earns its weight — that lands with the withdrawal signer).

## D3 — Watcher built as a component, NOT yet started from the gateway bootstrap
The deposit watcher is a self-contained, tested component. I did not start it from
`cmd/gateway/main.go`, because (a) the rail is fail-closed/unconfigured, and (b)
editing the shared gateway bootstrap unattended — when I can't run the full stack
(auth service, etc.) to verify — is a risk I won't take overnight. Wiring is a
small, guarded follow-up: start the watcher only when `rail.Configured()` is true.
