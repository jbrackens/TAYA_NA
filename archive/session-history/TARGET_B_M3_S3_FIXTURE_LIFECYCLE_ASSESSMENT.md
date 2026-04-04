# Target B — M3-S3 Assessment: Fixture Lifecycle Freeze/Unfreeze

Date: 2026-03-20
Owner: Claude CLI
Scope: Truth-check whether mounted fixture freeze/unfreeze can be implemented as a narrow M3 slice.

---

## 1. Executive Summary

**Decision: Defer M3-S3. The fixture detail page is not effectively mounted.**

The fixture detail page exists as a Next.js route (`/risk-management/fixtures/[id]`) but its data-fetch call uses `GET admin/trading/fixtures/:id` — a route that does NOT exist in the Go gateway. The page shows a perpetual loading skeleton. The freeze/unfreeze buttons never render because `basicData` is always empty.

This means the freeze/unfreeze controls are NOT "exposed admin mutations" — they are unreachable on a non-functional page. **This does not block the M3 exit gate.**

Making fixture freeze/unfreeze work would require:
1. Fix the detail GET route (`admin/trading/fixtures/:id` → `admin/fixtures/:id`)
2. Handle missing markets embedding (the page expects `markets` in the fixture response)
3. Fix the lifecycle route (`admin/trading/fixtures/:id/lifecycle/:action` → Go's `PUT admin/fixtures/:id/status`)

This is a larger slice than a narrow lifecycle fix. It should be re-scoped as a fixture detail restoration slice (which includes freeze/unfreeze as a component).

**Gotcha logged:** Before classifying a page as "mounted with dead controls," verify the page's data-fetch route actually works.

---

## 2. Current Backend Truth

### Route
`PUT /admin/fixtures/{fixtureID}/status`

### Auth
JWT required. Roles: `operator`, `admin`, `data-provider`

### Accepted Statuses
- `scheduled` — active, available for trading
- `postponed` — temporarily held, not available
- `cancelled` — permanently terminated

### State Machine
None — any status can transition to any of the 3 allowed values.

### Atomicity
YES — uses `SELECT ... FOR UPDATE` inside a transaction.

### Audit/Events
- Outbox → Kafka event emitted (`phoenix.event.live-score-updated` topic)
- No explicit audit log table write (unlike market engine)

### Request Shape
```json
{ "status": "postponed" }
```

---

## 3. Current Talon Surface Truth

### Fixture Detail Page
- **Mounted:** YES — at `/risk-management/fixtures/[id]`
- **Reachable from list:** NO — drill-down link is disabled in fixtures list
- **Reachable by direct URL:** YES
- **Page roles:** ADMIN, TRADER

### Freeze/Unfreeze Buttons
- **Rendered:** YES — via shared `LifecycleSuspend` component
- **Visible:** For all statuses except GAME_ABANDONED and POST_GAME
- **Active state:** `BREAK_IN_PLAY` maps to "frozen" (lock icon)
- **Dead:** YES — calls `POST /admin/trading/fixtures/:id/lifecycle/freeze` which doesn't exist in Go

### API Call Shape (Current — Dead)
```
POST /admin/trading/fixtures/:id/lifecycle/freeze
Body: {}
```
```
POST /admin/trading/fixtures/:id/lifecycle/unfreeze
Body: {}
```

---

## 4. Request/Response Contract Gaps

| Gap | Talon | Go | Fix |
|-----|-------|-----|-----|
| Route | `POST .../lifecycle/freeze` | `PUT .../status` | Fixture-specific component |
| Method | POST | PUT | Fixture-specific component |
| Body | `{}` | `{ status: "postponed" }` | Map freeze→postponed, unfreeze→scheduled |
| Concept | freeze/unfreeze toggle | status enum | Semantic mapping |
| Visibility | GAME_ABANDONED/POST_GAME hidden | Any → any allowed | Align visibility to meaningful transitions |

---

## 5. Decision: Defer

**Defer M3-S3. Re-scope as a fixture detail restoration slice if needed.**

Justification:
1. The fixture detail page data-fetch route (`admin/trading/fixtures/:id`) does NOT exist in Go gateway
2. The page shows a perpetual loading skeleton — no controls ever render
3. The freeze/unfreeze buttons are NOT "exposed admin mutations" — they're unreachable
4. Fixing freeze/unfreeze alone would still leave the page non-functional (broken GET)
5. Making the page functional requires fixing GET route + handling missing markets embedding + fixing lifecycle route — this is a larger slice

**Does this block M3 exit?** No. The M3 exit gate applies to "exposed admin mutations" — controls that operators can see and interact with. The fixture detail page cannot load, so its controls are not exposed.

---

## 6. Slice Spec: M3-S3 Fixture Lifecycle — Freeze/Unfreeze

### Slice Header
- **Name:** M3-S3: Fixture Lifecycle — Freeze/Unfreeze
- **Classification:** blocks Target B only
- **Milestone:** 3
- **Owner services:** `phoenix-events` (backend minor — add state machine), Talon fixture detail (frontend)
- **User-visible surfaces:** Mounted fixture detail page (`/risk-management/fixtures/[id]`)

### Problem Statement
- **What is broken:** Fixture detail page renders freeze/unfreeze buttons that call `POST /admin/trading/fixtures/:id/lifecycle/freeze` — a route that doesn't exist in Go. The buttons are dead.
- **Why it matters:** M3 exit gate requires no exposed mutation with transport but no semantics. These are live buttons on a mounted page.
- **Truthfulness gap:** Buttons exist and appear functional but silently fail.

### Existing Behavior
- **Go route:** `PUT /admin/fixtures/{fixtureID}/status` → accepts `{ status: "scheduled|postponed|cancelled" }`
- **Go auth:** operator, admin, data-provider
- **Go execution:** Atomic (FOR UPDATE + tx)
- **Go state machine:** None — any → any allowed
- **Talon:** Calls dead route `POST /admin/trading/fixtures/:id/lifecycle/freeze|unfreeze`

### Desired Behavior
**Backend:**
1. Add state machine validation:
   - `scheduled` → `postponed` allowed (freeze)
   - `postponed` → `scheduled` allowed (unfreeze)
   - `scheduled` → `cancelled` allowed
   - `postponed` → `cancelled` allowed
   - `live` → `postponed` allowed (freeze during live)
   - `cancelled` → anything blocked (terminal)
   - `completed` → anything blocked (terminal)
   - `abandoned` → anything blocked (terminal)
2. Transition validation inside the existing FOR UPDATE transaction
3. Invalid transitions return clear error

**Frontend:**
1. Create fixture-specific freeze/unfreeze component using `PUT admin/fixtures/:id/status`
2. Map freeze → `{ status: "postponed" }`, unfreeze → `{ status: "scheduled" }`
3. Only visible for states where freeze/unfreeze is valid (scheduled, postponed, live)
4. Role-gated to operator/admin only (not trader — backend doesn't include trader)
5. After success, page refreshes and shows updated status

### Execution Plan
**Backend:**
1. Add `isValidFixtureTransition(from, to string) bool` in service
2. Call it inside the existing `updateEventMetadata` transaction (after FOR UPDATE read)
3. Return `ErrInvalidInput` for invalid transitions
4. Add tests for valid and invalid transitions

**Frontend:**
1. Create `GoFixtureFreeze` component at `components/fixtures/lifecycle/freeze/go-freeze.tsx`
2. Uses `PUT admin/fixtures/:id/status` with `Method.PUT`
3. Import in fixture detail container, replacing the dead shared `LifecycleSuspend` usage
4. Gate by role (operator/admin only)

### Re-Plan Triggers
- Talon fixture detail page has dependencies that prevent modifying it without also touching the markets-in-fixture embedding
- Go fixture status update response shape doesn't match Talon's expected refresh response
- Go status values don't map cleanly to Talon's FixtureStatusEnum values

---

## 7. QA Gate

### Unit (MANDATORY)
| Check | Command | Pass | Failure |
|-------|---------|------|---------|
| phoenix-events | `go test -race ./...` | All green + transition tests | Any failure |
| gateway regression | `go test -race ./...` | All green | Any failure |

### Integration (MANDATORY)
| Check | Command | Pass | Failure |
|-------|---------|------|---------|
| Talon TS | `tsc --noEmit` | 0 errors | TS errors |
| Talon Jest | key suites | Green | Failures |

### End-to-End (MANDATORY if stack available)
| Check | Method | Pass | Failure |
|-------|--------|------|---------|
| Navigate to fixture detail | Direct URL | Page loads with freeze button | Dead page |
| Freeze fixture | Click button | Status → postponed visually | Error or no change |
| Unfreeze fixture | Click button | Status → scheduled visually | Error or no change |
| Network trace | Browser dev tools | `PUT /admin/fixtures/:id/status` | Wrong route |

### Security (MANDATORY)
| Check | Method | Pass | Failure |
|-------|--------|------|---------|
| Trader hidden | Trader login → fixture detail | No freeze button | Button visible |
| Player forbidden | Player JWT | 403 | 200 |
| Terminal blocked | cancelled → scheduled | Error | Silent success |

---

## 8. Re-Plan Triggers

1. The Talon fixture detail container can't be modified without also importing fixture-markets embedding
2. The Go fixture status update response doesn't include the full fixture data Talon expects for refresh
3. The status enum mapping between Go (`scheduled`/`postponed`) and Talon (`PRE_GAME`/`IN_PLAY`/etc.) breaks the UI
4. The fixture detail page uses `admin/trading/fixtures/:id` for its GET call (different from `admin/fixtures/:id`)
