> **Abandoned workstream — specification only.** `services/cashier-api/` is not a running
> service and this document describes nothing that exists. The product moved to
> non-redeemable points; the gateway's cashier, crypto and payment routes are
> unmounted by default and refuse to boot in production or staging. See
> `services/cashier-api/README.md` for why this tree is still in the repository, and
> `docs/archive/cashier/` for the design record.

# Cashier Migration Rollback

The cashier schema rollback exists for local development and test databases.
Production rollback must be approved as an incident action because these tables
hold wallet, deposit, withdrawal, provider callback, recovery, and audit state.

## Local Apply

```bash
psql "$DATABASE_URL" -f services/cashier-api/migrations/001_cashier_core.sql
psql "$DATABASE_URL" -f services/cashier-api/seeds/local_cashier_seed.sql
```

## Local Rollback

```bash
psql "$DATABASE_URL" -f services/cashier-api/migrations/001_cashier_core.rollback.sql
```

## Production Requirements

Before any production rollback:

- Capture a point-in-time backup.
- Export `cashier_audit_events`, `deposit_intents`, `withdrawal_intents`,
  `bridge_events`, `recovery_cases`, and `reconciliation_reports`.
- Confirm no non-terminal deposit, withdrawal, relayer, or recovery rows remain.
- Record the operator approval and incident identifier outside the affected
  database.

The rollback drops tables in dependency order and then removes the transition
guard functions. It does not attempt to preserve cashier state.
