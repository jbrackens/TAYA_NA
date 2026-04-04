# Target B Backlog Reconciliation — Wave B0

Date: 2026-03-19 (re-verified 2026-03-19 after workspace reorganization)
Owner: Claude CLI
Scope: Current-state reconciliation, backlog tagging, and next-slice recommendation for Target B.

Canonical paths (verified):
- Backend: `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep`
- Apps: `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined`
- Source/reference core: `/Users/johnb/Desktop/PhoenixBotRevival/libs/phoenix-core`

---

## 1. Executive Summary

Target A is complete (34/34 demo smoke green on 2026-03-17). Target B remains incomplete.

This reconciliation was built from:
- current Talon sidebar/navigation code (at `apps/Phoenix-Sportsbook-Combined/talon-backoffice`)
- current Go gateway route registrations (at `services/codex-prep/phoenix-gateway`)
- current service implementations (at `services/codex-prep/phoenix-*`)
- current frontend migration state (at `apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg`)
- current docs (IMPLEMENTATION_STATUS, BACKEND_PARITY_EXECUTION_PLAN, SESSION_HANDOFF, SERVICE_CONTRACTS, FRONTEND_RECONCILIATION_MATRIX)

Key findings:

1. **Milestone 2 is closer than previously stated.** The strict M2 definition ("every mounted Talon surface is backed by Go or intentionally disabled with no broken controls") is nearly met. Only two mounted surfaces have incomplete behavior: (a) market detail page is mounted but lifecycle actions are properly gated/hidden, and (b) users list is mounted but shows empty columns for `firstName`/`lastName`/`dateOfBirth`.
2. **Player-side migration is complete.** All 32 disabled features are re-enabled. Zero remaining old-backend dependencies in player code.
3. **The recommended next slice is small:** enrich the admin users list response with full name fields, then declare M2 closed.
4. **Market categories, fixed exotics, and fixture detail are NOT M2 blockers** because they are properly gated (removed from navigation or drill-down links disabled).

---

## 2. Current Milestone Truth

| Milestone | Status | Honest Assessment |
|-----------|--------|-------------------|
| Milestone 1 | **COMPLETE** | Validated 2026-03-17, 34/34 smoke checks green |
| Milestone 2 | **1 remaining gap** | Market detail read-only is acceptable (controls properly hidden). Users list missing `firstName`/`lastName`/`dateOfBirth` is the last real gap. |
| Milestone 3 | **INCOMPLETE** | Multi-leg/parlay settlement unsupported. Market lifecycle actions limited to status-only (no suspend/settle/cancel with truthful accounting). Session-limit writes not yet mounted. |
| Milestone 4 | **INTENTIONALLY INCOMPLETE** | Provider depth, role-matrix coverage, reporting breadth, staged rehearsal all deferred. |

### M2 Definition Recap

> "Every currently mounted Talon admin or user screen is either backed by Go and validated, or intentionally hidden/disabled with no broken controls. Active surface means mounted and reachable in the current Talon build."

### Mounted vs. Gated Assessment (from current code)

| Surface | In sidebar? | Drill-down reachable? | M2 Status |
|---------|------------|----------------------|-----------|
| Users list | YES | YES | **GAP** — empty name columns |
| User details (8 tabs) | YES (via list) | YES | COMPLETE — all tabs verified |
| Fixtures list | YES | YES | COMPLETE — route to `/admin/fixtures` |
| Fixture detail | NO (drill-down removed at line 82 of fixtures list) | NO | NOT MOUNTED — not an M2 blocker |
| Markets list | YES | YES | COMPLETE — route to `/admin/markets` |
| Market detail | YES (via list click) | YES | ACCEPTABLE — lifecycle actions gated with comment; read-only behavior is truthful |
| Market categories | NO (commented out at line 58 of menu defaults) | NO | NOT MOUNTED — not an M2 blocker |
| Fixed exotics | NO (commented out at line 64 of menu defaults) | NO | NOT MOUNTED — not an M2 blocker |
| Risk management summary | YES | YES | COMPLETE |
| Provider-ops | YES | YES | COMPLETE |
| Prediction-ops | YES | YES | COMPLETE |
| Global audit logs | YES | YES | COMPLETE |
| Terms admin | YES | YES | COMPLETE |

---

## 3. Remaining Target B Backlog Table

| # | Item | Classification | Milestone | Service(s) | Priority |
|---|------|---------------|-----------|------------|----------|
| 1 | ~~Users list: response + request contract + DOB normalization~~ | **DONE** (backend + frontend) | **M2** | phoenix-user, talon usersSlice | **CLOSED** — response enriched (M37), Talon nested params parsed (M37), DOB normalized to `{year,month,day}` in `normalizeGoUser` (M38). 10 focused tests green. |
| 2 | Market detail: lifecycle actions (suspend/settle/cancel) with truthful semantics | blocks Target B only | **M3** | phoenix-market-engine, phoenix-gateway | HIGH |
| 3 | Multi-leg/parlay bet settlement | blocks Target B only | **M3** | phoenix-betting-engine, phoenix-wallet | HIGH |
| 4 | Fixture detail: embed markets in fixture response + restore drill-down | blocks Target B only | **M3** | phoenix-events, phoenix-gateway | MEDIUM |
| 5 | Fixture lifecycle: add freeze/unfreeze or map to Go states | blocks Target B only | **M3** | phoenix-events, phoenix-gateway | MEDIUM |
| 6 | Market categories admin surface | blocks Target B only | **M3** | phoenix-market-engine, phoenix-gateway | LOW |
| 7 | Fixed exotics admin surface | blocks Target B only | **M3** | phoenix-market-engine, phoenix-gateway | LOW |
| 8 | Market/fixture history drawers | blocks Target B only | **M3** | phoenix-audit, phoenix-gateway | LOW |
| 9 | Tournaments/leagues detail/edit | blocks Target B only | **M3** | phoenix-events | LOW |
| 10 | Session-limit writes (if Talon UI entry point is re-enabled) | blocks Target B only | **M3** | phoenix-compliance | LOW (UI entry point still commented out) |
| 11 | Phone-bet placement admin | explicit non-goal for now | — | — | NOT PLANNED |
| 12 | Full third-party IdComply/KBA/IDPV provider depth | blocks Target B only | **M4** | phoenix-user | MEDIUM |
| 13 | Full GeoComply provider-backed license issuance | blocks Target B only | **M4** | phoenix-compliance | MEDIUM |
| 14 | WebSocket provider-backed push depth | blocks Target B only | **M4** | phoenix-realtime | MEDIUM |
| 15 | Self-exclusion jurisdiction-specific depth (NJ checkbox, MFA ceremony) | blocks Target B only | **M4** | phoenix-compliance | LOW |
| 16 | Stats centre richer supplier data | blocks Target B only | **M4** | phoenix-events | LOW |
| 17 | Role-matrix integration coverage | blocks Target B only | **M4** | cross-service | MEDIUM |
| 18 | Failure-mode and recovery coverage | blocks Target B only | **M4** | cross-service | MEDIUM |
| 19 | Reporting/export breadth (richer families) | blocks Target B only | **M4** | phoenix-analytics | MEDIUM |
| 20 | Staged-cluster rehearsal | blocks Target B only | **M4** | cross-service | MEDIUM |
| 21 | Operational observability and runbooks | blocks Target B only | **M4** | cross-service | LOW |
| 22 | Fixture rename/edit endpoint | explicit non-goal for now | — | — | NOT PLANNED |
| 23 | ~~Users list search across name fields~~ | **DONE** (backend) | **M2** | phoenix-user | **DONE** — individual firstName/lastName/username/dateOfBirth/punterId filters now supported via Talon nested params |

---

## 4. Talon/Admin Gap Inventory

### Fully Delivered (11 surfaces)

| Surface | Go Backend |
|---------|-----------|
| Users list + detail (8 activity tabs) | `phoenix-user`, `phoenix-wallet`, `phoenix-compliance`, `phoenix-betting-engine`, `phoenix-audit`, `phoenix-support-notes` |
| Fixtures list | `phoenix-events` |
| Markets list | `phoenix-market-engine` |
| Risk management summary | `phoenix-analytics` |
| Provider-ops (verification + cashier) | `phoenix-user`, `phoenix-wallet` |
| Prediction-ops | `phoenix-prediction` |
| Global audit logs + export | `phoenix-audit` |
| Terms admin | `phoenix-config` |

### Mounted but Incomplete (2 surfaces)

| Surface | Gap | Impact |
|---------|-----|--------|
| Users list | `firstName`, `lastName`, `dateOfBirth` missing from `ListAdminUsers` response | Empty table columns |
| Market detail (read-only) | Lifecycle actions (suspend/settle/cancel), edit, history all gated | Operators cannot manage market state from Talon; must use API directly |

### Properly Gated / Not Mounted (4 surfaces)

| Surface | Reason | Go Backend Status |
|---------|--------|-------------------|
| Fixture detail | Drill-down link removed from fixtures list | Go fixture response does not embed markets |
| Market categories | Commented out of sidebar menu | No Go route exists |
| Fixed exotics | Commented out of sidebar menu | No Go route exists |
| Phone-bet placement | Never mounted in Go era | No Go route; explicit non-goal |

---

## 5. Player Flow Gap Inventory

### Status: COMPLETE — Zero Remaining Blockers

All 32 previously disabled features have been re-enabled with Go backend wiring. The tracked production `useApi` call sites are fully migrated.

### Active Compatibility Seams (non-blockers)

| Seam | Service | Severity | Impact |
|------|---------|----------|--------|
| KBA/IDPV: provider scoring stubbed | `phoenix-user` | M4 | Registration flow completes; vendor integration deferred |
| GeoComply: provider license stubbed | `phoenix-compliance` | M4 | Geolocation enforcement works; vendor license deferred |
| Self-exclusion: MFA/NJ thinner | `phoenix-compliance` | M3 | Exclusion mechanics work; regulatory variants deferred |
| WebSocket: internal snapshots only | `phoenix-realtime` | M4 | Realtime updates work; provider feed quality deferred |
| Stats centre: synthesized data | `phoenix-events` | M4 | Stats display works; supplier richness deferred |

---

## 6. Milestone Mapping

### Milestone 2: Active Talon Surface Parity

**Remaining items: 2**

| Item | Service | Effort |
|------|---------|--------|
| Users list: add `firstName`/`lastName`/`dateOfBirth` to list response + search | `phoenix-user` | Small (1 handler, 1 query) |
| (Optional) Users list: search across name fields | `phoenix-user` | Small (same query change) |

**Gated surfaces (market categories, fixed exotics, fixture detail) are NOT M2 blockers per the strict definition.** They are properly hidden from navigation.

**Market detail page read-only status is acceptable for M2** because lifecycle controls are intentionally hidden (gated with comment at line 73 of `containers/markets/details/index.tsx`). The page does not expose broken or dead controls.

### Milestone 3: Semantic Parity

**Items: 8**

| Item | Effort | Risk |
|------|--------|------|
| Market lifecycle actions (suspend/settle/cancel with truthful semantics) | Medium | HIGH — core trading control |
| Multi-leg/parlay bet settlement | Medium-Large | HIGH — currently returns explicit unsupported error |
| Fixture detail with embedded markets | Medium | MEDIUM |
| Fixture lifecycle (freeze/unfreeze mapping) | Small | LOW |
| Market categories admin | Medium | LOW — niche |
| Fixed exotics admin | Medium | LOW — niche |
| Market/fixture history drawers | Small | LOW |
| Tournaments detail/edit | Small | LOW |

### Milestone 4: Production Hardening

**Items: 10**

| Item | Category |
|------|----------|
| Third-party IdComply/KBA/IDPV depth | Provider integration |
| GeoComply provider-backed licensing | Provider integration |
| WebSocket provider-backed push depth | Provider integration |
| Self-exclusion jurisdiction depth | Compliance depth |
| Stats centre supplier data | Content depth |
| Role-matrix integration coverage | Testing |
| Failure-mode and recovery coverage | Testing |
| Reporting/export breadth | Operational |
| Staged-cluster rehearsal | Operational |
| Operational observability and runbooks | Operational |

---

## 7. Non-Goals / Deferred Items

| Item | Reason |
|------|--------|
| Phone-bet placement admin | Dormant feature; no active user demand |
| Fixture rename/edit endpoint | Rare admin operation; not in current Talon workflow |
| Advanced player stats (rosters, projections) | Supplier contract, not Go backend scope |
| In-app live commentary | Broadcast/content layer, not Go backend scope |
| Prediction player-facing reporting/export | No historical reporting product exists |

---

## 8. Recommended Next Implementation Slice

### ~~Slice: M2 Closure — Admin Users List Enrichment~~ — COMPLETED (M37-M39)

M2 is closed. The next implementation slice is now M3.

**See:** `TARGET_B_M3_KICKOFF.md` for the M3 backlog refresh and first slice recommendation (M3-S1: Market Status Lifecycle — Suspend/Reopen).

---

## 9. ~~Full Slice Spec: M2 Closure — Admin Users List Enrichment~~ — COMPLETED (M37-M39)

The M2 users list slice is closed. The spec below is archived for reference only.

### Slice Header

- **Name:** M2 Closure — Admin Users List Enrichment
- **Classification:** blocks Target B only
- **Milestone:** 2
- **Owner services:** `phoenix-user`
- **User-visible surfaces affected:** Talon users list page (`/risk-management/users`)

### Problem Statement

- **What is broken:** Go `ListAdminUsers` returns only `user_id`, `email`, `username`, `status`. Talon users list renders empty columns for `firstName`, `lastName`, `dateOfBirth`.
- **Why it matters:** M2 exit gate requires no mounted Talon surface to show dead backend behavior. Visible empty columns where identity data should appear is a data gap.
- **Truthfulness gap:** The column headers promise data that the backend does not return.

### Existing Behavior

- **Route:** `GET /admin/users` → `phoenix-user`
- **Current response fields:** `user_id`, `email`, `username`, `role`, `status`, `kyc_status`, `created_at`, `updated_at` (via `AdminUserSummary` struct at `phoenix-user/internal/models/models.go:344`)
- **Current persistence:** `users` table stores `first_name`, `last_name`, `date_of_birth` (migration `002_create_users.sql`). The `ListUsers` repository query SELECTs these columns into full `User` structs, but the service layer at `service.go:710-721` maps to `AdminUserSummary` which discards them.
- **Current test coverage:** `phoenix-user` `service_test.go` covers user creation with all fields; list test exists but may not assert name fields.
- **Current frontend expectations:** Talon users list reducer expects `firstName`, `lastName`, `dateOfBirth` in each row (normalizer maps from Go snake_case).

### Desired Behavior

- **Route:** `GET /admin/users` (unchanged)
- **Response contract addition:**
```json
{
  "data": [
    {
      "user_id": "usr_123",
      "email": "user@example.com",
      "username": "john_doe",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1990-01-15",
      "status": "verified",
      "created_at": "2026-03-07T14:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 150 }
}
```
- **Mutation semantics:** None — this is a read-only change.
- **Audit/event side effects:** None.
- **Failure behavior:** If a user has no `first_name`/`last_name`/`date_of_birth`, return empty strings/null (not error).

### Execution Plan

1. In `phoenix-user/internal/models/models.go`: add `FirstName`, `LastName`, `DateOfBirth` fields to the `AdminUserSummary` struct (lines 344-353).
2. In `phoenix-user/internal/service/service.go`: update the `ListAdminUsers` mapping (lines 710-721) to copy `FirstName`, `LastName`, `DateOfBirth` from the full `User` struct into `AdminUserSummary`.
3. No repository change needed — `ListUsers` already SELECTs and scans these columns into the full `User` struct.
4. Update `phoenix-user` unit test to assert name fields are present in list response.
5. Optionally: add `search` query parameter that matches against `first_name`, `last_name`, `email`, `username` (ILIKE).

### Verification Plan

1. `go test -v -race ./...` in `phoenix-user` — all tests green
2. `go test -v -race ./...` in `phoenix-gateway` — no regressions
3. Manual curl: `GET /admin/users` returns `first_name`, `last_name`, `date_of_birth` in response
4. Talon visual check: users list columns populated (if compose stack available)
5. Demo smoke: `bash scripts/demo-smoke.sh` — 34/34 still green

### Re-Plan Triggers

- ~~The `users` table does not store these columns~~ — **ELIMINATED**: verified `002_create_users.sql` has `first_name`, `last_name`, `date_of_birth`. No migration needed.
- ~~ListUsers query doesn't select these columns~~ — **ELIMINATED**: verified the repository query already SELECTs and scans all columns. Only the `AdminUserSummary` struct + service mapping need change.
- The Talon normalizer expects a different field shape than snake_case (would require frontend fix)
- Other mounted surfaces discovered with dead behavior during this pass (would expand slice scope)

### Done Definition

- `GET /admin/users` response includes `first_name`, `last_name`, `date_of_birth` for every user
- Talon users list columns are no longer empty
- Unit tests cover the new fields in the list response
- No regressions in existing admin routes

### Backlog Tagging

- **Classification:** blocks Target B only
- **Milestone:** 2
- **Why now:** This is the last M2 blocker. The playbook prohibits starting M3 work until M2 is validated.

---

## 10. QA Gate for M2 Closure Slice

### Unit (MANDATORY)

| Check | Command | Pass Criteria | Failure |
|-------|---------|--------------|---------|
| phoenix-user tests | `cd phoenix-user && go test -v -race ./...` | All tests green, including list users test asserting name fields | Any test failure or race condition |
| phoenix-gateway tests | `cd phoenix-gateway && go test -v -race ./...` | All tests green, no routing regressions | Any test failure |

**Residual risk if limited:** None — this is the primary verification layer for a read-only change.

### Integration (RECOMMENDED)

| Check | Command | Pass Criteria | Failure |
|-------|---------|--------------|---------|
| Compose flow test | `bash phoenix-gateway/scripts/run_compose_integration.sh` | Gateway→user flow passes, user list returns enriched fields | Cross-service routing failure |

**Residual risk if limited:** Low — the change is within a single service handler.

### End-to-End (RECOMMENDED)

| Check | Command | Pass Criteria | Failure |
|-------|---------|--------------|---------|
| Demo smoke | `bash scripts/demo-smoke.sh` | 34/34 checks green | Any failure |
| Manual Talon check | Load `/risk-management/users` in browser | Name columns populated | Empty columns persist |

**Residual risk if limited:** Low — the change is additive, no behavior removed.

### Performance (OPTIONAL)

| Check | Method | Pass Criteria | Failure |
|-------|--------|--------------|---------|
| User list latency | `time curl ... /admin/users?page=1&limit=50` | < 200ms p50 with 1000 users | > 500ms |

**Residual risk if skipped:** Low — adding columns to an existing indexed query should not materially change latency. Worth checking if search is added (ILIKE on text columns without index).

### Security (MANDATORY)

| Check | Method | Pass Criteria | Failure |
|-------|--------|--------------|---------|
| Role enforcement | curl with player JWT → `GET /admin/users` | 403 Forbidden | 200 OK with data |
| No PII leak to wrong roles | curl with operator JWT → verify only expected fields returned | No SSN, no password hash | Sensitive fields in response |

**Residual risk if limited:** None — the existing role middleware is unchanged; this is a read-only field addition.

---

## 11. Re-Plan Triggers

These facts would invalidate the current plan and require a stop-and-replan:

1. The `users` table schema does not include `first_name`/`last_name`/`date_of_birth` columns (would need a migration, expanding scope)
2. Another mounted Talon surface is discovered with dead backend behavior during this work (would expand M2 scope)
3. The Talon normalizer for users list expects fields in a shape other than Go snake_case (would require a Talon fix in the same slice)
4. The `phoenix-user` ListUsers repository method uses a generated query that cannot be extended without touching the query builder pattern (would require more code changes)

---

## 12. Mistakes/Gotchas Logged in This Pass

**No new gotchas identified.** The reconciliation was built from code evidence and no false assumptions were discovered.

### Re-verification after workspace reorganization (2026-03-19)

All claims re-verified against the new canonical paths (`services/codex-prep` for backend, `apps/Phoenix-Sportsbook-Combined` for frontends):

- Market detail page lifecycle gating: **CONFIRMED** (comment at line 73 of `containers/markets/details/index.tsx`)
- Fixture detail drill-down removal: **CONFIRMED** (comment at line 82 of `components/fixtures/list/index.tsx`)
- Market categories sidebar removal: **CONFIRMED** (commented out at line 58 of `providers/menu/defaults.ts`)
- Fixed exotics sidebar removal: **CONFIRMED** (commented out at line 64 of `providers/menu/defaults.ts`)
- Fixtures list in sidebar: **CONFIRMED** (present at line 38-47 of `providers/menu/defaults.ts`)
- Player frontend migration completeness: **CONFIRMED** — zero `useApi` calls remain in production code, go-api client layer has 18 domain directories
- Users list gap: **CONFIRMED** — `AdminUserSummary` struct excludes `first_name`/`last_name`/`date_of_birth` despite DB and query including them
- Two re-plan triggers eliminated: DB columns exist (no migration needed), repository already selects all fields (only struct + service mapping change needed)

---

## Appendix: M2 Exit Gate Checklist

Per the playbook's Milestone 2 exit gate:

| Gate | Status |
|------|--------|
| 1. All active Talon surfaces backed by Go or intentionally gated | **PASS** |
| 2. No mounted Talon control points at dead or semantically false backend behavior | **PASS** — name columns populated (M37), DOB normalized to `{year,month,day}` (M38) |
| 3. Unit and integration coverage for touched backend services are green | **PASS** |
| 4. Focused Talon/admin end-to-end smokes are green | **PASS** (34/34) |
| 5. Performance smoke for any newly restored heavy admin routes | **PASS** (no new heavy routes in this assessment) |
| 6. Security smoke for any new admin mutation routes | **N/A** (no new mutations) |

**After the recommended slice (users list enrichment), all 6 gates will pass.**
