# Gateway Cashier Domain

Credential-free, provider-independent cashier rules used by Go gateway/service
handlers during the non-custodial migration.

Current scope:

- Fail-closed state transitions for deposits, withdrawals, relayer submissions,
  and recovery cases.
- Conservative bridge-event reducer for deposit status changes.
- Compliance policy decisions for caps, geo policy, address screening, and pause
  state.
- Runtime flag helpers that fail closed for missing or unknown flags.
- Deterministic idempotency-key builders for deposit, withdrawal, and relayer
  operations.
- Explicit decimal metadata for Tron USDT, BSC USDT, Polygon USDC, and hUSD.
- Provider callback raw-body SHA-256 and HMAC verification helpers.
- Two-person recovery approval helper that requires distinct approving operators.
- Relayer policy evaluator for allowlisted targets/selectors, amount caps,
  paymaster runway, duplicate submissions, compliance decisions, pause state, and
  authorization expiry.

Non-goals:

- No provider SDKs.
- No chain RPC calls.
- No custodial wallet crediting.
- No secrets or live money movement.

Keep this package boring: deterministic inputs, deterministic outputs, and tests
for every money-path decision.
