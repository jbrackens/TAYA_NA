# 06 — Player App Plan: Frontend Changes

**Date:** 2026-04-16

---

## New API Clients

### `app/lib/api/content-client.ts`

```
getPage(slug)         → GET /api/v1/content/{slug}     (60s TTL)
getBanners(position)  → GET /api/v1/banners?position=X  (30s TTL)
```

### `app/lib/api/bonus-client.ts`

```
getActiveBonuses()          → GET /api/v1/bonuses/active          (15s TTL)
claimBonus(campaignId, ref) → POST /api/v1/bonuses/claim
getBonusProgress(bonusId)   → GET /api/v1/bonuses/{id}/progress   (15s TTL)
getWalletBreakdown(userId)  → GET /api/v1/wallet/{userId}/breakdown (15s TTL)
```

Pattern: follow existing `app/lib/api/client.ts` base class with `get<T>()`, `post<T>()`, snake→camel normalization, `credentials: 'include'`.

---

## Component Architecture

### CMS Components

**`app/components/ContentPage.tsx`** — Renders CMS-driven pages
- Fetches page by slug via `content-client.getPage(slug)`
- Renders `blocks[]` array with block-type switch:
  - `text` → rich text HTML
  - `banner_ref` → inline banner component
  - `promo_ref` → promotion card (link to promotions page)
  - `html` → raw HTML (sanitized)
  - `faq` → accordion FAQ
- Fallback: hardcoded content if API unavailable (existing pattern from `bonus-rules/page.tsx`)

**`app/components/BannerCarousel.tsx`** — Hero banner rotation
- Fetches banners via `content-client.getBanners('hero')`
- Auto-rotates with configurable interval
- Respects `sort_order` for display sequence

**New pages using CMS:**
- Update `/about`, `/terms`, `/privacy-policy`, `/responsible-gaming`, `/betting-rules`, `/bonus-rules` to use `ContentPage` component instead of hardcoded content

### Bonus Components

**`app/components/WalletBreakdown.tsx`** — Real + Bonus balance display
- Replaces single `availableBalance` in `CurrentBalance.tsx`
- Shows: Real Money | Bonus Funds | Total
- Tooltip: "Bonus funds have wagering requirements"

```
┌─────────────────────────────┐
│  Balance                     │
│  ┌───────────┐ ┌──────────┐ │
│  │ $150.00   │ │ $50.00   │ │
│  │ Real      │ │ Bonus    │ │
│  └───────────┘ └──────────┘ │
│  Total: $200.00              │
└─────────────────────────────┘
```

**`app/components/WageringProgress.tsx`** — Bonus completion progress
- Fetches via `bonus-client.getBonusProgress(bonusId)`
- Progress bar: `wagering_completed_cents / wagering_required_cents`
- Shows: "$125 of $500 wagered (25%)"
- Expiry countdown: "Expires in 29 days"

**`app/components/BonusBadge.tsx`** — Small indicator on bet history
- Shows "Bonus" tag on bets placed with bonus funds
- Shows "Free Bet" tag on freebet-funded bets

### Betslip Changes

**`app/components/BetslipProvider.tsx`** — Extend existing provider
- Add `bonusEligibility` state: which active bonuses apply to current selections
- When parlay mode is on and selections meet campaign min-legs + min-odds:
  - Show "Parlay Boost Eligible" badge
  - Show estimated wagering contribution

**`app/components/BetslipPanel.tsx`** — Extend existing panel
- Add bonus wallet indicator in stake section
- Show which balance funds the bet (real, bonus, or mixed)
- Add "Use Free Bet" dropdown if eligible freebets exist for this bet type
- Add wagering contribution estimate: "This bet contributes $15 toward your bonus"

### My Bets Changes

**`app/bets/page.tsx`** — Extend existing page
- Add `bonus_funded_cents` and `freebet_id` columns from API response
- Show `BonusBadge` component per bet
- For parlays: show per-leg outcomes (won/lost/void/push)
- Show wagering contribution amount per settled bet

---

## State Management Changes

### New Redux Slice: `bonusSlice.ts`

```typescript
interface BonusState {
  activeBonuses: PlayerBonus[];
  walletBreakdown: WalletBreakdown | null;
  lastFetchedAt: number | null;
}

// Actions:
// setActiveBonuses(bonuses)
// setWalletBreakdown(breakdown)
// clearBonusState()  — on logout
```

### Existing Slice Updates

**`cashierSlice.ts`** — Add `bonusBalance` alongside `currentBalance`
**`betSlice.ts`** — Add `bonusFundedCents`, `freebetId` to bet summary

### No New Redux Slice for Content

Content pages are fetched on-demand with React Query caching (60s TTL). No Redux storage needed — content doesn't change between page navigations frequently enough to justify global state.

---

## WebSocket Changes

### New Channel: `bonus_updates`

Handler: `app/lib/websocket/channels-data-handler/bonus-channel-handler.ts`

Events:
- `bonus.granted` — new bonus activated → refresh active bonuses
- `bonus.progress` — wagering contribution applied → update progress
- `bonus.completed` — wagering requirements met → show congratulations toast
- `bonus.expired` — bonus expired → remove from active list, show notification
- `bonus.forfeited` — admin forfeiture → remove and notify

Pattern: follows existing `wallets-channel-handler.ts` pattern (dispatch Redux action on message).

---

## i18n Additions

### New Namespace Files

**`public/static/locales/en/bonus.json`:**
```json
{
  "activeBonus": "Active Bonus",
  "wageringProgress": "Wagering Progress",
  "wageringRequired": "{{completed}} of {{required}} wagered",
  "expiresIn": "Expires in {{days}} days",
  "bonusFunds": "Bonus Funds",
  "realMoney": "Real Money",
  "claimBonus": "Claim Bonus",
  "bonusRules": "Bonus wagering requirements apply",
  "parlayBoostEligible": "Parlay Boost Eligible",
  "freeBetApplied": "Free Bet Applied",
  "wageringContribution": "This bet contributes {{amount}} toward your bonus",
  "bonusCompleted": "Bonus completed! Funds converted to real money.",
  "bonusExpired": "Your bonus has expired."
}
```

**`public/static/locales/en/content.json`:**
```json
{
  "loadingContent": "Loading...",
  "contentUnavailable": "Content temporarily unavailable",
  "readMore": "Read More"
}
```

Also add corresponding `de/bonus.json` and `de/content.json` files. Register both namespaces in `app/lib/i18n/config.ts` NAMESPACES array.

---

## File Path References

1. `talon-backoffice/packages/app/app/lib/api/client.ts` — base API client pattern
2. `talon-backoffice/packages/app/app/lib/api/wallet-client.ts` — wallet client (extend pattern)
3. `talon-backoffice/packages/app/app/lib/api/loyalty-client.ts` — loyalty client (similar pattern for bonus-client)
4. `talon-backoffice/packages/app/app/components/CurrentBalance.tsx` — current single-balance display (replace with WalletBreakdown)
5. `talon-backoffice/packages/app/app/components/BetslipProvider.tsx` — betslip state (extend)
6. `talon-backoffice/packages/app/app/components/BetslipPanel.tsx` — betslip UI (extend)
7. `talon-backoffice/packages/app/app/lib/store/` — Redux store (add bonusSlice)
8. `talon-backoffice/packages/app/app/lib/websocket/channels-data-handler/wallets-channel-handler.ts` — WebSocket handler pattern
9. `talon-backoffice/packages/app/app/lib/i18n/config.ts` — i18n namespace registration
10. `talon-backoffice/packages/app/public/static/locales/en/` — locale files directory
11. `talon-backoffice/packages/app/app/bets/page.tsx` — bet history page (extend)
12. `talon-backoffice/packages/app/app/bonus-rules/page.tsx` — existing bonus rules page (replace with CMS)
