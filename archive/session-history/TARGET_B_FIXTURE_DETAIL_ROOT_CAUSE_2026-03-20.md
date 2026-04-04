# Fixture Detail Page — Root Cause Analysis

**Date:** 2026-03-20 (R3 session)

---

## 1. Symptom

Fixture detail page at `/risk-management/fixtures/[id]` shows perpetual loading skeleton. No data ever loads. Controls (freeze, unfreeze) never render.

## 2. Exact Failing Path/Request

| Layer | Path | Result |
|-------|------|--------|
| Frontend | `GET admin/trading/fixtures/:id` | Sent by useApi at detail container line 58 |
| Gateway | Route match against `/admin/fixtures` prefix | **MISS** — `/admin/trading/fixtures/...` does not start with `/admin/fixtures` |
| Result | **404** | No route matched |

## 3. Backend Truth

**Route exists:** `GET /admin/fixtures/{eventID}` in phoenix-events (main.go line 110)
**Handler:** `GetEvent` — returns `Event` model
**Response shape:**
```json
{
  "event_id": "...",
  "name": "...",
  "sport": "...",
  "league": "...",
  "home_team": "...",
  "away_team": "...",
  "scheduled_start": "...",
  "status": "...",
  "live_score": {...},
  "created_at": "...",
  "updated_at": "..."
}
```

**Missing from backend response:**
- `markets[]` — not embedded in Event model
- `fixtureName` — backend has `name` (not camelCase)
- `scoreHistory` — not stored with event
- `competitors[]` — backend has `home_team`/`away_team` strings

## 4. Frontend Truth

**Expected response shape:** `TalonMarketsFixture`
```typescript
{
  fixtureId: string;
  fixtureName: string;
  markets: TalonMarket[];
  status: string;
  score: Score;
  scoreHistory: CompetitorScoreHistory[];
  competitors: Competitor[];
}
```

**Controls rendered when data loads:**
- Market cards with selections
- Score display
- Status tag
- Lifecycle buttons (freeze, unfreeze) — gated by status
- Score history drawer

## 5. Root Cause

**Two independent issues:**

### Issue A: Route path mismatch (PRIMARY)
Frontend requests `admin/trading/fixtures/:id`. Gateway has `admin/fixtures` prefix route. Prefix match fails because `/admin/trading/` ≠ `/admin/fixtures`. Result: 404.

### Issue B: Response shape incompatibility (SECONDARY)
Even if the route worked, the Go `Event` response does not include `markets[]`, `competitors[]`, or `scoreHistory[]`. The detail page would render an empty or broken view.

## 6. Smallest Truthful Next Slice

### Phase 1: Path normalization (trivial)
- Change `useApi("admin/trading/fixtures/:id")` → `useApi("admin/fixtures/:id")` in detail container
- Also fix any POST/PUT paths in the update sub-container
- **Files:** 2 container files, ~2 line changes each
- **Outcome:** Page loads, but markets section empty

### Phase 2: Response normalizer (small)
- Add normalizer to convert snake_case Go response → camelCase Talon shape
- Map `name` → `fixtureName`, `home_team`/`away_team` → `competitors[]`
- **Files:** detail container + normalizer function
- **Outcome:** Basic fixture data renders (name, status, teams, score)

### Phase 3: Markets loading (medium)
- Either: embed markets in Event response (backend change) or make separate `GET /admin/markets?fixture_id=X` call
- Market engine already has list endpoint; need filter support
- **Files:** backend handler + frontend dual-fetch
- **Outcome:** Full detail page with market cards

## 7. QA Gate for Phase 1

- Change useApi path
- Verify gateway routes `admin/fixtures/:id` → phoenix-events
- Verify phoenix-events returns 200 for valid fixture ID
- Verify page stops showing 404/loading skeleton
- Verify page renders at least fixture name and status (with normalizer)
- No lifecycle controls expected to work until markets are loaded
