# PRD — Prediction Markets Filter Bar

| | |
|---|---|
| **ID** | PMF-001 |
| **Status** | Draft |
| **Date** | 2026-04-25 |
| **Surface** | `/prediction/markets`, `/prediction/categories/[categoryKey]` |
| **Component** | `packages/app-core/components/pages/prediction/index.tsx` |
| **Reference** | pariflow.com (filter strip), Polymarket (curated tabs) |
| **Author** | JB |

---

## 1. Problem statement

The `/prediction/markets` page exposes only a status filter today (`All / Live / Open`). At pre-launch with **100+ seed markets** and a **browser-first** primary user — someone scanning to discover what's interesting, not searching for a specific market — this is insufficient. Browsers need to see "what's hot," "what's new," "what's closing soon," and "what's in my topic of interest" without leaving the markets surface, configuring dropdowns, or memorizing URL params.

Without this, launch reduces to a flat list of seed markets. That undersells breadth, leaves discovery to luck, and creates a first impression that reads as incomplete relative to incumbents the user will compare against (Polymarket, pariflow, etc.).

## 2. Goals

| # | Goal | Measurement |
|---|---|---|
| G1 | Discovery without configuration. First-time visitors land on a curated default that surfaces high-signal markets. | Time-to-first-card-impression < 3s; zero clicks required to see ≥ 6 active markets. |
| G2 | Single-click scope refinement. View change (e.g. Trending → Ending Soon) and category change (All → Crypto) each take exactly one click. | No dropdowns, no nested menus, no modals on the markets page. |
| G3 | Reuse existing components. No net-new styled components. | `PredictionFilterRow` and `PredictionFilterPill` cover the entire UI surface; diff to `index.styled.ts` adds ≤ 10 lines. |
| G4 | URL-driven, shareable, back/forward-safe state. | `?view=` and `?category=` params drive every filter change; refresh and deep links preserve state. |
| G5 | Migration safety for existing links. | Bookmarks of `?status=live` continue working via read-time alias for ≥ 90 days post-launch. |

## 3. Non-goals (v1)

| # | Out of scope | Why |
|---|---|---|
| N1 | Saved filters / "my view" | No return-user cohort to validate against pre-launch. |
| N2 | Multi-select on categories | Adds combinatorial complexity. Single-category filter is sufficient at 100-market scale. |
| N3 | Creator / author filter | No creator concept exposed in v1. |
| N4 | Outcome-bias filter (Yes/No-leaning) | Niche power-user need. Reconsider after observing real traffic. |
| N5 | Advanced search syntax (operators, quoted phrases) | Search input is rendered but routes to the existing search endpoint. Advanced query is its own spec. |
| N6 | Mobile-specific bottom-sheet filter UX | Mobile uses horizontal scroll + collapse-to-dropdown for categories. Anything beyond is v2. |
| N7 | Click-tracking analytics | Covered by the separate `Analytics & Telemetry` spec. Not blocking. |

## 4. Target users

**Primary: Browser** — Lands without a specific market in mind. Decides what to bet on by scanning. Wants the system to make recommendations. Optimizing for this user is the explicit choice for v1.

**Secondary: Trader** — Has a specific strategy. Will use Ending Soon, High Volume, and category filters. Benefits from this work but is not the optimization target.

**Out of scope for v1 user testing:** returning power users (no return cohort exists), whales/professional traders (no segment yet).

## 5. Design summary

Two-row filter bar inside the existing `PredictionSectionHeader`. Replaces today's three-pill `All / Live / Open` row.

```
PredictionSectionHeader
├── PredictionSectionTitleBlock   ← unchanged: eyebrow / title / copy
└── PredictionFilterRow           ← extended
    ├── Row 1 (curated views):  [ Trending* ]  [ New ]  [ Ending soon ]  [ High volume ]   [ 🔍 Search ]
    └── Row 2 (categories):     [ All* ] Politics  Crypto  Sports  Economy  Culture
```

`*` indicates default-active. Active states use **two distinct colors by role**:

- **Row 1 active = green-tinted** (`rgba(0,231,0,0.13)` background, `rgba(0,231,0,0.4)` border) — signals "curated view" (filter + sort + editorial logic baked in).
- **Row 2 active = white-tinted** (`rgba(255,255,255,0.09)` background, `rgba(255,255,255,0.26)` border) — signals "scope filter" (additive narrowing).

Stacked semantics: Row 1 ∩ Row 2. "Trending in Crypto" = Trending logic applied within Crypto category. No combinatorial matrix; the filter pipeline composes.

## 6. Curated view definitions

Explicit semantics. Lock these in v1, deprecate or rename in writing if changed later.

| Chip | Definition | Sort |
|---|---|---|
| **Trending** | All markets where `status ∈ {live, open}` | `score = volume_24h × recency_weight` (recency_weight: linear 1.0 → 0.5 over 14 days from creation) |
| **New** | Markets created in the last 7 days | `created_at` desc |
| **Ending soon** | Markets where `closes_at - now < 72h` AND `status = open` | `volume_total` desc (so the busiest closing markets surface first, not the deadest) |
| **High volume** | All markets where `status ∈ {live, open}` | `volume_total` desc |

**Open question (E1):** "Trending" requires a backend endpoint or a new query parameter. Existing `/prediction/markets` API may or may not support `view=trending` natively. See §10.

## 7. Category list (v1)

Initial set, ordered by expected seed-market volume:

```
All  ·  Politics  ·  Crypto  ·  Sports  ·  Economy  ·  Culture
```

Six chips total. Cap at six in v1. **Open question (P1):** confirm against actual seed market distribution before launch — drop any category with < 5 seed markets, add any cluster that has > 15.

## 8. URL state model

| Param | Values | Default | Notes |
|---|---|---|---|
| `view` | `trending`, `new`, `ending-soon`, `high-volume` | `trending` | Required; default applied on read if absent. |
| `category` | `all`, `politics`, `crypto`, `sports`, `economy`, `culture` | `all` | Falls through to existing `buildPredictionCategoryPath` for canonical category routes. |
| `q` | free text | (none) | Search query. Empty = no search filter applied. |

**Backwards-compat aliases (read-only, deprecate after 90d):**
- `?status=live` → `?view=trending`
- `?status=open` → `?view=trending`
- `?status=` (no value) → no-op, defaults applied

**Routing decision:** stay on `/prediction/markets` with query params for view/category. Don't introduce path segments like `/prediction/markets/trending`. Rationale: query params keep the "switch view" interaction client-side (no full route transition), and the existing `PredictionPage` component already reads URL state.

## 9. User stories

Format: JSON for TaskPacket conversion. Each story includes acceptance criteria as Given/When/Then arrays, priority (P0/P1/P2), and `files_touched` for scoping work packets.

```json
[
  {
    "id": "PMF-S1",
    "title": "Default to Trending + All on first load",
    "as": "first-time visitor on /prediction/markets",
    "i_want": "to land on a curated 'Trending' view across all categories",
    "so_that": "I see what's interesting immediately without configuring filters",
    "priority": "P0",
    "acceptance_criteria": [
      "GIVEN a user visits /prediction/markets with no query params",
      "WHEN the page renders",
      "THEN the 'Trending' chip in row 1 shows the active green-tinted state",
      "AND the 'All' chip in row 2 shows the active white-tinted state",
      "AND market cards render ordered by trending score (volume_24h × recency_weight)",
      "AND no spinner persists more than 800ms after first paint"
    ],
    "files_touched": [
      "packages/app-core/components/pages/prediction/index.tsx"
    ]
  },
  {
    "id": "PMF-S2",
    "title": "Switch curated view in one click",
    "as": "browser",
    "i_want": "to switch between Trending / New / Ending soon / High volume by clicking a chip",
    "so_that": "I can change the lens without learning anything new",
    "priority": "P0",
    "acceptance_criteria": [
      "GIVEN any view chip is currently active",
      "WHEN I click a different view chip",
      "THEN the URL updates to ?view=<new-view> within 100ms",
      "AND the previously active chip loses its active style",
      "AND the new chip shows the green-tinted active style",
      "AND the market grid re-orders/re-filters within 800ms",
      "AND the active category chip in row 2 is preserved (does not reset to All)"
    ],
    "files_touched": [
      "packages/app-core/components/pages/prediction/index.tsx",
      "packages/app-core/lib/product-routing.ts"
    ]
  },
  {
    "id": "PMF-S3",
    "title": "Filter by category in one click",
    "as": "browser",
    "i_want": "to narrow markets to a single topic by clicking a category chip",
    "so_that": "I can focus on the topics I care about",
    "priority": "P0",
    "acceptance_criteria": [
      "GIVEN any category chip is currently active (defaulting to 'All')",
      "WHEN I click a different category chip",
      "THEN the URL updates to ?category=<key>",
      "AND the previously active category chip loses its active style",
      "AND the new chip shows the white-tinted active style",
      "AND the market grid filters to only markets whose primary category matches the chip's key",
      "AND the active view chip in row 1 is preserved (does not reset to Trending)",
      "AND empty results show the existing PredictionEmptyState ('No prediction markets match the current filter.')"
    ],
    "files_touched": [
      "packages/app-core/components/pages/prediction/index.tsx",
      "packages/app-core/lib/product-routing.ts"
    ]
  },
  {
    "id": "PMF-S4",
    "title": "Compose view + category",
    "as": "browser",
    "i_want": "view and category to compose (e.g. 'Trending in Crypto')",
    "so_that": "I can drill into a topic without losing the curated lens",
    "priority": "P0",
    "acceptance_criteria": [
      "GIVEN view='trending' and category='all' are active",
      "WHEN I click the 'Crypto' category chip",
      "THEN the URL becomes ?view=trending&category=crypto",
      "AND the market grid shows only markets in Crypto, ordered by trending score",
      "AND the section title updates to reflect the active filter (e.g. 'Trending in Crypto')"
    ],
    "files_touched": [
      "packages/app-core/components/pages/prediction/index.tsx"
    ]
  },
  {
    "id": "PMF-S5",
    "title": "Backwards-compatible status param",
    "as": "user with a bookmarked /prediction/markets?status=live link",
    "i_want": "my old bookmark to keep working",
    "so_that": "I don't see a broken or unexpected page",
    "priority": "P0",
    "acceptance_criteria": [
      "GIVEN a user visits /prediction/markets?status=live",
      "WHEN the page renders",
      "THEN it behaves identically to /prediction/markets?view=trending",
      "AND the URL is rewritten to ?view=trending via router.replace (no extra history entry)",
      "GIVEN a user visits /prediction/markets?status=open",
      "WHEN the page renders",
      "THEN it behaves identically to /prediction/markets?view=trending",
      "AND a console.warn fires (dev mode only) noting the deprecated alias"
    ],
    "files_touched": [
      "packages/app-core/components/pages/prediction/index.tsx",
      "packages/app-core/lib/product-routing.ts"
    ]
  },
  {
    "id": "PMF-S6",
    "title": "Mobile: row 1 horizontal scroll, row 2 dropdown",
    "as": "browser on a 375px viewport",
    "i_want": "the filter bar to remain usable without overflowing or wrapping awkwardly",
    "so_that": "the experience matches desktop quality",
    "priority": "P0",
    "acceptance_criteria": [
      "GIVEN viewport width < 768px",
      "WHEN the page renders",
      "THEN row 1 (curated views) renders as a horizontal-scrollable rail with the active chip pinned visible at scroll start",
      "AND row 2 (categories) collapses into a single 'All categories ▾' dropdown that opens a native or styled select",
      "AND total filter bar vertical height is ≤ 80px"
    ],
    "files_touched": [
      "packages/app-core/components/pages/prediction/index.styled.ts",
      "packages/app-core/components/pages/prediction/index.tsx"
    ]
  },
  {
    "id": "PMF-S7",
    "title": "Search input wired to existing search",
    "as": "trader who knows the market title",
    "i_want": "to type a query and filter the list to matching markets",
    "so_that": "I can find a specific market quickly",
    "priority": "P1",
    "acceptance_criteria": [
      "GIVEN the user types in the search input",
      "WHEN they pause typing for 300ms",
      "THEN the URL updates with ?q=<query>",
      "AND the market grid filters to markets whose title contains the query (case-insensitive)",
      "AND clearing the input removes the q param and restores the unfiltered list",
      "AND search composes with view and category (q narrows within view+category scope)"
    ],
    "files_touched": [
      "packages/app-core/components/pages/prediction/index.tsx"
    ]
  },
  {
    "id": "PMF-S8",
    "title": "Empty state per filter combination",
    "as": "browser",
    "i_want": "a useful empty state when my filter combo returns nothing",
    "so_that": "I'm not stuck staring at a dead page",
    "priority": "P1",
    "acceptance_criteria": [
      "GIVEN any combination of view + category + q yields zero markets",
      "WHEN the grid renders",
      "THEN the existing PredictionEmptyState renders with copy: 'No markets in [Category] match [View]. Try [primary CTA: clear category].'",
      "AND a 'Clear category' button resets category to 'all'",
      "AND a 'Reset all' button resets to view=trending&category=all"
    ],
    "files_touched": [
      "packages/app-core/components/pages/prediction/index.tsx"
    ]
  }
]
```

## 10. Open questions

| ID | Question | Owner | Blocking? |
|---|---|---|---|
| E1 | Does the existing `/prediction/markets` API support `view=trending\|new\|ending-soon\|high-volume` server-side, or do we filter/sort client-side from a single payload? | Engineering | **YES** — gates implementation approach. |
| E2 | Where does category metadata live? Hard-coded in `prediction-market-seed.ts` or fetched per-market? Need a stable category key (`crypto`, `politics`) on each market record. | Engineering | **YES** |
| D1 | Are the green/white active-state colors brand-approved? Specifically `rgba(0,231,0,0.13)` for view-active and `rgba(255,255,255,0.09)` for category-active. | Design | NO — can adjust during build. |
| P1 | Confirm seed market category distribution before locking the v1 category list. Drop any category with < 5 markets. | PM | NO — last-mile decision before launch. |
| L1 | Is "prediction markets" categorization regulated in any v1 launch jurisdiction? (e.g., does showing "Sports" alongside "Politics" trigger a content rule.) | Legal | NO if launch jurisdictions are confirmed; **YES** if expanding regulated geos. |

## 11. Success metrics

**Leading (week 1–2 post-launch):**
- ≥ 60% of sessions click at least one filter chip beyond the default (proxy for "they're using it, not just looking at it")
- ≥ 30% of sessions click into a market detail from a non-default view (Trending → click is baseline; New / Ending soon / High volume → click measures discovery lift)
- < 5% of sessions hit the empty state

**Lagging (month 1+):**
- Markets-page → market-detail click-through rate increases ≥ 20% vs. pre-launch baseline (current All/Live/Open filter)
- Median markets viewed per session increases ≥ 30%
- Drop-off at the markets page (bounce) decreases

**Targets are hypotheses.** Measure, don't hold engineering accountable to specific numbers — hold them accountable to instrumenting the events.

## 12. Timeline & phasing

**Phase 1 — Core filter bar (P0 stories: S1–S6).**
Deliverable: v1 ships with default Trending+All, view chips, category chips, mobile responsive, status alias. Estimated 2–3 days of work for one engineer with the existing components.

**Phase 2 — Search (P1: S7).**
Deliverable: search input wired to existing endpoint. Estimated 1 day. Can ship same release if E1/E2 resolve fast, otherwise fast-follow.

**Phase 3 — Polished empty states (P1: S8).**
Deliverable: contextual empty-state copy + reset CTAs. Estimated 0.5 day. Same-release if time, fast-follow if not.

**Hard constraint:** must ship before public launch. No regulatory or contractual deadline beyond that.

## 13. TaskPacket handoff notes

This PRD is structured for direct conversion into TaskPackets. Each user story (PMF-S1 through PMF-S8) maps to one or two task packets. Suggested chunking:

| Story | Suggested packets |
|---|---|
| S1 + S2 | Single packet: "Implement view chip row with default + state transitions" |
| S3 + S4 | Single packet: "Implement category chip row + composition with view" |
| S5 | Single packet: "Status param backwards-compat alias" |
| S6 | Single packet: "Mobile responsive treatment" |
| S7 | Single packet: "Search input wiring" |
| S8 | Single packet: "Empty state polish + reset CTAs" |

Each packet should reference this PRD by section + story ID (e.g. "PMF-001 §9 PMF-S1") so workers can resolve ambiguity by reading back to source.

---

## Appendix A: Visual reference

See mockup rendered in conversation 2026-04-25. Default state: Trending (active, green-tinted) + All (active, white-tinted). Six representative market cards in a 2-column grid below.

## Appendix B: Code locations

| Concern | Path |
|---|---|
| Page route | `packages/app/pages/prediction/markets/index.tsx` |
| Page component | `packages/app-core/components/pages/prediction/index.tsx` (current filter row at ~L736) |
| Styled components | `packages/app-core/components/pages/prediction/index.styled.ts` |
| Routing helpers | `packages/app-core/lib/product-routing.ts` (`buildPredictionMarketsPath`, `buildPredictionCategoryPath`) |
| Seed data + types | `packages/app-core/lib/prediction-market-seed.ts` |
| Market card component | Exported from `index.styled.ts` as `PredictionMarketCard` and friends |
