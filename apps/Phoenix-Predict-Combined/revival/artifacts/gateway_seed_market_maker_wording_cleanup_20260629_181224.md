# Gateway Seed Market-Maker Wording Cleanup Artifact

Generated: 2026-06-29

## Files Changed

- `go-platform/services/gateway/cmd/seed/demo_phase1_book.go`
- `go-platform/services/gateway/cmd/seed/cleanup.go`
- `go-platform/services/gateway/cmd/seed/cleanup_test.go`

## Evidence

Focused checks:

```txt
go test ./cmd/seed -run 'TestSeedCleanupVisibleCommentsStayPointNative|TestSeedMarketMakerVisibleWordingUsesPointCents|TestSeedCLIVisibleAmountsUsePoints|TestStalePendingCutoff'
ok  	phoenix-revival/gateway/cmd/seed	0.260s

go test ./cmd/seed -run Test
ok  	phoenix-revival/gateway/cmd/seed	(cached)

git diff --check
passed
```

Focused runtime-file scan:

```txt
rg -n 'resting cash|stakes|insufficient funds|\$|¢' \
  go-platform/services/gateway/cmd/seed/demo_phase1_book.go

no matches
```

Governance:

```txt
make qa-preservation-modifications
Classified 410 modified artifacts for preservation review.
Wrote artifact: revival/artifacts/preservation_modification_map_20260629_161156.md

make qa-rc-completion-audit
failed as intended: scenarios 4, 6, 7, 9, 10, 11, and 12 remain Partial.
Wrote artifact: revival/artifacts/rc_completion_audit_gate_20260629_161156.md
```

## Preservation Note

The seed still places the same market-maker orders through the inherited
prediction service. Only comments, operator error output labels, and regression
coverage changed.
