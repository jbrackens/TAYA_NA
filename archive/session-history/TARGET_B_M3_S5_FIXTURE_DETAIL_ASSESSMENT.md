# Target B — M3-S5 Assessment: Fixture Detail Restoration

Date: 2026-03-20
Owner: Claude CLI

---

## 1. Executive Summary

**Decision: Defer to post-M3. This is a medium-sized slice that does NOT block the M3 exit gate.**

The fixture detail page needs 4 fixes to become functional:
1. Route alignment: `admin/trading/fixtures/:id` → `admin/fixtures/:id`
2. Response normalizer: Go returns snake_case Event, Talon expects TalonFixture
3. Markets handling: Go Event has no markets; page renders markets list
4. Lifecycle route: freeze/unfreeze calls a dead route

None of these block M3 — the page cannot load data, so its controls are not exposed.

---

## 2. Current Backend Truth

- `GET /admin/fixtures/{eventID}` — works, returns Event model (snake_case)
- Event model: name, sport, league, home_team, away_team, status, live_score, etc.
- **No markets field** in Event model
- Markets queryable separately via `GET /admin/markets?event_id={eventID}`
- `PUT /admin/fixtures/{eventID}/status` — works for scheduled/postponed/cancelled

---

## 3. Current Talon Surface Truth

- Fixture detail page route exists at `/risk-management/fixtures/[id]`
- Data fetch uses dead route `admin/trading/fixtures/:id` → 404
- `fixturesDetailsSlice` stores response directly — no Go normalizer
- Page expects `fixtureName`, `markets`, `score`, `scoreHistory` in TalonFixture shape
- Fixture list is functional (different slice with normalizer)

---

## 4. Exact Transport/Semantic Gaps

| Gap | Type | Fix Needed |
|-----|------|-----------|
| GET route dead | Transport | Fix from `admin/trading/fixtures/:id` to `admin/fixtures/:id` |
| No response normalizer | Transport | Add `normalizeGoFixtureDetail` to fixturesDetailsSlice |
| No markets in response | Transport | Fetch markets separately via `GET /admin/markets?event_id=` |
| Lifecycle route dead | Transport | Create fixture-specific freeze component (like market suspend) |
| Edit route dead | Transport | `admin/trading/fixtures/:id` POST doesn't exist in Go |

---

## 5. Decision: Defer

**Defer to post-M3.** This is 4+ changes across backend and frontend, none of which block M3. The fixture detail page is not effectively mounted (can't load data). Its controls are never exposed to operators.

Post-M3 implementation should be a single "Fixture Detail Restoration" slice that addresses all 4 gaps together.

---

## 6. QA Gate (for future implementation)

### Unit
- Go fixture detail response includes expected fields
- Talon normalizer maps Go Event → TalonFixture correctly
- Markets fetch returns results for event_id filter

### Integration
- Gateway routes fixture detail GET correctly
- TypeScript clean
- Talon Jest green

### End-to-End
- Navigate to fixture detail via drill-down (must restore list link)
- Verify fixture name, score, status render
- Verify markets section renders (empty or populated)
- Verify freeze/unfreeze works

---

## 7. Re-Plan Triggers
- If a mounted surface starts depending on fixture detail (e.g., market detail links to fixture), this becomes more urgent
- If the M3 gate interpretation changes to include "pages that exist as routes" rather than "pages that can load data"
