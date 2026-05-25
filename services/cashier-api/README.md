# Hula Na! Cashier API

API boundary for non-custodial wallet and cashier state.

Responsibilities:

- Resolve user identity to an embedded EVM wallet and smart-wallet address.
- Create idempotent deposit intents.
- Expose deposit status to the frontend.
- Verify provider callback signatures before state transitions.
- Persist auditable state without treating the Go cents ledger as fund custody.

Non-goals:

- No private-key custody.
- No HD deposit-address derivation.
- No direct calls to `wallet.Credit` for crypto deposits.

Every mutating endpoint must require an idempotency key.

Additional design docs:

- [API contract](./API_CONTRACT.md)
- [Recovery API contract](./RECOVERY_API_CONTRACT.md)
- [Schema sketch](./SCHEMA.md)
- [Migration rollback guide](./MIGRATION_ROLLBACK.md)
- `openapi.yaml`
- `observability-events.json`
- `migrations/001_cashier_core.sql`
- `migrations/001_cashier_core.rollback.sql`
- `seeds/local_cashier_seed.sql`
- `src/handlers.mjs`
- `src/repository.mjs`
- `src/dashboard.mjs`
- `cashier_runtime_flags` defaults all money movement to disabled.
- `fixtures/wallet.resolved.json`
- `fixtures/deposit-intent.created.json`
- `fixtures/deposit-intent.evm-direct.created.json`
- `fixtures/withdrawal-intent.created.json`
- `fixtures/compliance-decision.quarantine.json`
- `fixtures/audit-event.recovery-created.json`
- `fixtures/recovery-case.destination-mismatch.json`
- `fixtures/recovery-approval.operator-a.json`
- `fixtures/canary-result.ok.json`
- `fixtures/runtime-flags.default.json`
- `fixtures/reconciliation-report.daily-ok.json`
