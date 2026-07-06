# Gateway Seed Operator Wording Cleanup Artifact

Generated: 2026-06-29

## Files Changed

- `go-platform/services/gateway/cmd/seed/demo.go`
- `go-platform/services/gateway/cmd/seed/demo_phase5_settle.go`
- `go-platform/services/gateway/cmd/seed/cleanup.go`
- `go-platform/services/gateway/cmd/seed/cleanup_test.go`

## Evidence

Focused checks:

```txt
go test . -run 'TestSeedCLIVisibleAmountsUsePoints|TestSeedCleanupVisibleCommentsStayPointNative|TestDemoSeedLaunchVisiblePlansStayPointNative|TestStalePendingCutoff'
ok  	phoenix-revival/gateway/cmd/seed	0.271s

go test ./cmd/seed -run Test
ok  	phoenix-revival/gateway/cmd/seed	(cached)

git diff --check
passed
```

Focused runtime-file scan:

```txt
rg -n "stuck cash|reserved cash|refund the cash|payouts created|payouts=|delete demo payouts|purge demo payout|reset payout pool" \
  demo.go demo_phase5_settle.go cleanup.go

no matches
```

Governance:

```txt
make qa-preservation-modifications
Classified 409 modified artifacts for preservation review.
Wrote artifact: revival/artifacts/preservation_modification_map_20260629_160638.md

make qa-rc-completion-audit
failed as intended: scenarios 4, 6, 7, 9, 10, 11, and 12 remain Partial.
Wrote artifact: revival/artifacts/rc_completion_audit_gate_20260629_160638.md
```

## Preservation Note

This artifact intentionally does not claim that every internal settlement
schema name is renamed. The preserved internal table name
`prediction_payouts` and idempotency prefix `prediction_payout:*` remain in
place. The launch-facing improvement is the seed/operator wording around
those contracts.
