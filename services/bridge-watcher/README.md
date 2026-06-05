# Tiangge Bridge Watcher

Reconciliation worker for Tron-source deposits and EVM destination settlement.

Responsibilities:

- Poll or subscribe to provider request status.
- Reconcile provider status with source and destination chain evidence.
- Deduplicate callbacks, status polls, and regenerated child requests.
- Move ambiguous deposits into recovery rather than crediting them.
- Emit audit events for support and compliance review.

This service must be restart-safe. Reprocessing the same source transaction,
deposit address, callback, or destination transaction must not change balances
twice.

Additional design docs:

- [State machine](./STATE_MACHINE.md)
- [Provider adapter contract](./PROVIDER_ADAPTER_CONTRACT.md)
- `fixtures/provider-scenarios.manifest.json`
- `fixtures/relay-source-detected.json`
- `fixtures/relay-callback-source-detected.json`
- `fixtures/relay-destination-confirmed.json`
- `fixtures/relay-duplicate-callback-replay.json`
- `fixtures/relay-quarantined-unknown-request.json`
- `fixtures/relay-quarantined-under-minimum.json`
- `fixtures/relay-quarantined-destination-mismatch.json`
- `fixtures/relay-failed-expired-quote.json`
- `fixtures/relay-failed-after-source-detection.json`
- `fixtures/relay-quarantined-missing-destination-evidence.json`
- `fixtures/relay-quarantined-sanctions-review.json`
