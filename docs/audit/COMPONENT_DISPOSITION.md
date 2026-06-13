# Component disposition — dead vs. repurposable (P2-02 / P2-03 input)

Investigation behind the deferred dead-code cleanup. Each "0-importer" component
was classified by **git provenance** (when/why it was added) and whether a
**live or wanted prediction capability** maps to it. Nothing here has been
archived — this is the decision input. Verdicts:

- **REPURPOSE** — backed by live or partially-built prediction machinery; wire
  it up, don't delete.
- **SUPERSEDED** — the prediction app already implements its own equivalent;
  safe to archive (reversible).
- **GENERIC** — framework-agnostic UI primitive, unused but reusable; low-stakes
  either way.
- **KEEP** — actively part of an in-flight prediction feature.

## App components (`talon-backoffice/packages/app/app/components/`)

| Component | Added | Verdict | Rationale |
|---|---|---|---|
| BonusBadge | 2026-04-16 | **REPURPOSE** | Bonus engine is live (`bonus.NewService`, `player_bonuses`/`campaigns` tables, `bonus-client.ts`, `useBonusSync.ts`). Relabel the sportsbook `freebet` type to a prediction-appropriate reward. |
| WageringProgress | 2026-04-16 | **REPURPOSE** | Wagering/parlay logic exists (`internal/wallet/wagering.go`, `internal/bonus/models.go`). Product call: do prediction bonuses carry wagering requirements? |
| BannerCarousel | 2026-04-16 | **REPURPOSE** | CMS banners table is live; promo carousel for prediction campaigns. |
| WalletBreakdown | 2026-04-16 | **REPURPOSE** | `getWalletBreakdown` (bonus-client) is wired; shows real/bonus balance split. |
| IdComplyModal | 2026-04-04 | **REPURPOSE** | Maps to prediction KYC (DB-backed, `NEXT_PUBLIC_FEATURE_KYC` on /profile). ID-verification UI. |
| MfaModal | 2026-04-04 | **REPURPOSE** | MFA is a wanted prediction account-security feature; no live equivalent yet. |
| NonCustodialCashierStatus | 2026-05-25 | **KEEP** | Part of the non-custodial cashier leg (P3-09). |
| ProtectedRoute | 2026-04-04 | **SUPERSEDED** | App uses `AuthProvider` (live) for route auth. |
| SessionTimer | 2026-04-04 | **SUPERSEDED** | `IdleActivityMonitor` (live, mounted in AuthProvider) handles idle/session. |
| LoginForm | 2026-04-04 | **SUPERSEDED** | Real login page at `app/auth/login/page.tsx`. |
| GeoComplyCheck | 2026-04-04 | **SUPERSEDED** | Server-side geo gate (Phase 1) is the enforcement; a client widget is not the control. |
| AcceptTermsModal | 2026-04-04 | SUPERSEDED? | Confirm the prediction signup/terms flow; likely superseded. |
| CurrentBalance | 2026-04-04 | SUPERSEDED? | Balance is shown via the live wallet client / TopBar; confirm. |
| BackdropScene, BrandMark | 2026-04-24 | **SUPERSEDED** | Superseded by the current P8 design shell + TopBar. |
| Avatar, Collapse, CountdownTimer, CountrySelect, DataTable, Pagination, StatusBadge, Tabs, StaticPage, OpenChatButton, MarketDetailLoading | 2026-04-04/08 | **GENERIC** | Unused UI primitives; reusable. Archiving saves little; keeping costs little. |

## Office (`talon-backoffice/packages/office/`) — ~145 dead files

All added 2026-04-16 (sportsbook import) and superseded by the live prediction
admin (`containers/prediction-markets`, `prediction-settlements`,
`provider-ops/cashier-review`):

| Tree | Verdict | Rationale |
|---|---|---|
| `containers/markets` (`SelectionOdd`, `TalonSingleMarketFixture`), `components/markets` | **SUPERSEDED** | Sportsbook market/odds admin; prediction uses `containers/prediction-markets`. No prediction analog for odds/selections. |
| `containers/fixed-exotics`, `components/sport`, `components/bets` | **SUPERSEDED (dead)** | Exotic-bet / sport / bet-grading admin — no prediction concept. |
| `containers/users`, `components/users` (~32 files), `ModifyPunterModal` | **SUPERSEDED** | Pages-router sportsbook punter admin; prediction uses the App-Router `access-control` / `users` RBAC surface. |
| `containers/market-categories`, `components/market-categories` | SUPERSEDED? | Confirm vs. the prediction category admin. |

## Recommended action

1. **Wire up or schedule** the REPURPOSE set (bonus/rewards: BonusBadge,
   WageringProgress, BannerCarousel, WalletBreakdown; compliance: IdComplyModal,
   MfaModal) — these represent real prediction features whose backends are
   already (partly) built. Track as feature work, not cleanup.
2. **Archive** the SUPERSEDED set (auth duplicates, design experiments, and the
   office sportsbook trees) once confirmed — reversible, build-gated.
3. **Leave** the GENERIC primitives in place (reusable; not worth the churn).

No archival performed yet — awaiting direction on which sets to action.
