# Betby vs Phoenix Sportsbook Gap Analysis

Date: 2026-03-04

## 1) Goal
Compare Phoenix Sportsbook (current local stack) against Betby as a sportsbook maturity benchmark, with emphasis on **feature/function maturity** and **provider-agnostic architecture readiness**.

## 2) Sources Used

### Betby benchmark sources
1. Betby Sportsbook product page:
   - https://betby.com/sportsbook/
2. Betby.Games integration model page:
   - https://betby.com/games/
3. Betby AI Labs page:
   - https://betby.com/ai-labs/
4. Bet Builder expansion announcement:
   - https://betby.com/news/betby-takes-bet-builder-to-the-next-level/
5. Same Game Combo in esports announcement:
   - https://betby.com/blog/betby-unveils-same-game-combo-feature-for-esports-fans/
6. Live streams launch announcement:
   - https://betby.com/news/betby-live-streams-launch/
7. Betby demo shell + bundle:
   - https://demo.betby.com/sportsbook/tile/
   - https://demo.betby.com/static/js/app.135b4dafc66a27a70177.js

### Phoenix baseline sources
1. Feed-agnostic maturity baseline:
   - `revival/39_SPORTSBOOK_MATURITY_GAP_ANALYSIS_FEED_AGNOSTIC.md`
2. Architecture baseline:
   - `revival/01_ARCHITECTURE_BASELINE_AND_TARGET.md`
3. Backend websocket/public route model:
   - `phoenix-backend/services/src/main/scala/phoenix/websockets/WebSocketRoutes.scala`
   - `phoenix-backend/services/src/main/scala/phoenix/bets/infrastructure/http/BetEndpoints.scala`
4. Frontend sportsbook implementation surface:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/esports-bets/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/stream-bets/index.tsx`

## 3) Betby Capability Signals (Observed)
From Betby public sources and demo artifacts:

1. Large market/catalog coverage:
   - 210k+ monthly events, 125+ sports, 3,000+ markets, 30+ languages.
2. Multiple frontend layouts and widgetized surface.
3. Engagement toolkit explicitly listed:
   - Match tracker, Stats centre, Cashout, Freebets, Oddsboost.
4. Advanced combinatorics:
   - Bet Builder expansion (2,000+ builder markets across 8 sports).
   - Same Game Combo for esports.
5. Live stream depth:
   - official video streaming feeds integrated for selected sports/esports.
6. Integration flexibility:
   - Full integration, module mode, and odds feed integration models.
7. AI/ops maturity:
   - personalization, churn/LTV prediction, suspicious behavior detection, player risk segmentation.
8. Demo bundle confirms widget-level modules such as:
   - `betslip`, `live_stream`, `promo_tournament`, `combo_of_the_day`, `top_outright`.

## 4) Phoenix Current State (Observed)
1. Core sportsbook flow exists:
   - sportsbook routing, fixture/market pages, bet placement/status, history, websocket updates.
2. Frontend has in-play/upcoming/matches/results style navigation for esports.
3. Betslip supports single/multi bet placement and pending-bet status polling.
4. Provider ingestion remains provider-specific in legacy backend (not adapter-contract driven).
5. Advanced feature keywords are absent in core runtime paths:
   - no implementation hits for `cashout`, `betbuilder`, `same game combo`, `odds boost`, `freebets` in core backend/frontend service code paths.
6. `stream-bets` page exists but is currently placeholder-level (no integrated stream product flow).

## 5) Gap Matrix (Phoenix vs Betby Benchmark)

| Capability Area | Betby Signal | Phoenix State | Gap | Severity |
|---|---|---|---|---|
| Core odds + market catalog depth | Large cross-sport catalog and market depth | Esports-centric and existing core catalogs supported | Scale/depth expansion strategy not yet codified | High |
| Layout/widget productization | Multiple layouts + mature widget ecosystem | Core pages exist, but no equivalent widget catalog product layer | Missing modular widget product surface | Medium |
| Match tracker + stats center | Explicit product capabilities | No explicit equivalent product capabilities surfaced as first-class modules | Missing productized tracker/stats modules | High |
| Cashout | Explicit product capability | Not implemented as end-to-end capability in current stack | Missing real-time pricing/accept/settlement flow | Critical |
| Freebets + oddsboost | Explicit product capabilities | Free bet appears only in docs/glossary context, not mature product flow | Missing promo mechanics tied to bet lifecycle | High |
| Bet Builder / Same Game Combo | Builder markets + SGC support | No implementation found in sportsbook core paths | Missing combinability model + pricing + placement + settlement | Critical |
| Integrated live streams | Official feed integration announced | Placeholder stream page, no mature integrated stream-betting UX flow | Missing production stream integration capability | High |
| AI personalization + risk automation | Personalized events/combo, churn/LTV, suspicious behavior detection | No equivalent sportsbook AI layer in current product baseline | Missing personalization/AI risk capabilities | Medium |
| Integration modes (full/module/odds feed) | Multiple integration models | Current architecture still converging to provider-agnostic adapter model | Missing formalized provider adapter contracts + conformance packs | Critical |
| Feed-agnostic maturity | Provider modelled feed structures | Existing maturity gaps already identified in revival docs | Replay/lag/SLO/conformance work still needed | Critical |

## 6) Maturity Scorecard (Relative to Betby Benchmark)
Score is relative to a mature benchmark profile (not a claim that Phoenix is non-functional).

1. Core sportsbook operation: **70/100**
2. Advanced bet products (cashout/builder/sgc): **15/100**
3. Engagement tooling (stats/tracker/boost/freebets): **25/100**
4. Streaming-integrated betting UX: **20/100**
5. Provider-agnostic integration maturity: **35/100**
6. Personalization/risk AI: **15/100**

Overall benchmark maturity: **30/100**.

## 7) What This Means
The biggest delta is exactly what was identified in prior feed-agnostic planning:

1. Phoenix is functionally alive for core sportsbook operations.
2. Phoenix is **not yet mature** in premium sportsbook feature sets (cashout, builder/SGC, promotions mechanics, integrated stream UX).
3. Phoenix still needs a hardened provider-agnostic adapter layer and conformance discipline to scale beyond a single-feed implementation style.

## 8) Priority Build Tracks (Feature-First, Feed-Agnostic)

### Track A (P0): Premium betting capabilities
1. Cashout (pricing stream, acceptance semantics, wallet safety, reconciliation).
2. Bet Builder + Same Game Combo (selection graph, combinability constraints, pricing API, placement/settlement lifecycle).

### Track B (P0/P1): Engagement and conversion features
1. Productized match tracker + stats center module.
2. Freebets + odds-boost campaign mechanics wired into wallet/bet lifecycle.
3. Live-stream betting integration path (UI + latency/rights constraints + event synchronization).

### Track C (P0): Platform maturity for provider optionality
1. Canonical sportsbook event model and adapter contracts.
2. Replay/recovery + lag/gap observability + conformance packs.
3. Integration mode support (full stack vs odds-feed-only style adapters).

### Track D (P1): Intelligence layer
1. Personalized event/market ranking.
2. Churn and LTV scoring hooks for CRM actions.
3. Suspicious behavior and risk segmentation automation for trader/backoffice workflows.

## 9) Conclusion
Against Betby as a modern benchmark, Phoenix’s main gap is **maturity of advanced sportsbook features and integration architecture**, not basic ability to run a sportsbook.

This confirms the current north star:
1. keep data-feed agnostic architecture,
2. implement premium sportsbook capability layers,
3. harden operations and conformance so multiple providers can be supported without product rewrites.
