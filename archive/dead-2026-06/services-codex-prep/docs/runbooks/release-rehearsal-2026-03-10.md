# Release Rehearsal — 2026-03-10

## Scope

Run the local release/runbook flow after the latest productionization pass and
capture any defects that still matter before staged rollout.

## Commands executed

1. Overlay validation

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep
./scripts/validate_k8s_overlays.sh
```

2. Fast regression before compose

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-betting-engine
go test ./...

cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-common
go test ./pkg/outbox

cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-gateway
go test ./integration -run TestComposeCashoutWalletFailureKeepsBetPending -count=1
```

3. Full compose-backed integration rehearsal

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-gateway
./scripts/run_compose_integration.sh
```

## Rehearsal result

- overlay validation: passed
- betting-engine regression: passed
- shared outbox regression: passed
- gateway integration regression: passed
- full compose integration: passed

## Newly verified scenarios

- settlement validation failures do not persist invalid settlement rows
- reconciliation permission failures do not persist invalid reconciliation rows
- wallet outage during bet placement does not persist a bet
- wallet outage during cashout leaves the bet pending and does not persist
  `BetCashedOut` or `WalletFundsReleased`
- settlement rollback with two pending bets:
  - a later missing-wallet failure returns `404`
  - no `settlement_batches` row is committed
  - no `settlement_batch_items` row is committed
  - both bets remain `pending`
  - no `BetSettled` or `WalletFundsReleased` events are committed
- withdrawal with a live reserved balance:
  - withdrawal request over available but below total balance returns `400`
  - wallet summary remains unchanged
  - no `WalletWithdrawalCreated` row or event is committed
- outbox retry followed by broker recovery publishes the row cleanly
- outbox backlog/backpressure with `BatchSize=2`:
  - first two rows accumulate retry counts
  - later rows remain untouched until capacity is available
  - all rows publish after recovery

## Defects found

### 1. Cashout-offer integration contract parsing

Status: fixed during rehearsal

- Symptom: integration test decoded `cashout_offer` as `float64`
- Reality: the API returns decimal values as JSON strings
- Fix: updated the test contract to decode `cashout_offer` as `string`

### 2. Transient free-port startup race in the compose harness

Status: open, non-blocking

- Symptom: one compose run failed because `phoenix-market-engine` attempted to
  bind a port that was reported free but was then taken before process start
- Impact: local test-harness flake only; no business-logic failure
- Current disposition: rerun passed cleanly, so release-readiness is not blocked
- Follow-up: harden the in-process service launcher if this recurs

## Release-readiness interpretation

For the current local productionization scope:

- implementation: complete
- docker verification baseline: already green before this rehearsal
- overlay validation: green
- compose happy-path/resilience/failure-path validation: green
- operational docs: present and exercised

## Remaining work after this rehearsal

1. Add more wallet/betting failure-path cases beyond place-bet and cashout
2. Add settlement rollback edge-case assertions
3. Execute the same runbook flow in a staged cluster, not only local compose
