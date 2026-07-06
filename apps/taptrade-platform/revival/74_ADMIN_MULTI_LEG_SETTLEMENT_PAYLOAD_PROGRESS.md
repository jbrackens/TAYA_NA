# Admin Multi-Leg Settlement Payload Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 9 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Extended admin settle request contract to support structured multi-leg payloads:
   - `winningSelectionIds: string[]` (new)
   - backward-compatible `winningSelectionId: string` (existing)
2. Added normalization in admin HTTP handler so:
   - if `winningSelectionIds` is provided, it is trimmed, deduplicated (case-insensitive), and joined into canonical settle input
   - otherwise, legacy `winningSelectionId` is used
3. Added explicit request validation guard:
   - returns `400` if both `winningSelectionIds` and `winningSelectionId` are effectively empty.
4. Added integration tests covering:
   - settling an accepted builder multi-leg bet via `winningSelectionIds`
   - rejection when settlement payload omits both fields.
5. Added normalization helper unit coverage for dedupe + legacy fallback behavior.

## Key Files

1. Admin settle endpoint contract + normalization:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
2. Integration tests:
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Remaining

1. Add explicit backoffice form UX for structured multi-leg settlement authoring (checkbox/list-based selection IDs instead of raw payload entry).
2. Add API docs snippet examples showing both legacy and structured settle payloads.
