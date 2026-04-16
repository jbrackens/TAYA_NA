# 05 — API Contracts and Service Responsibilities

**Date:** 2026-04-16

---

## Compatibility Rules

All new endpoints follow existing gateway patterns:
- Auth: `access_token` cookie or `Authorization: Bearer` header (no change to `middleware.go`)
- CSRF: `X-CSRF-Token` header on mutating requests (no change)
- Response format: JSON with `snake_case` fields (frontend normalizes to camelCase in `client.ts`)
- Error format: `{"error": "message", "code": "ERROR_CODE"}` (existing `httpx/errors.go` pattern)
- Admin endpoints: require `role: admin` in auth context

---

## Content Delivery API (Player-Facing)

### `GET /api/v1/content/{slug}`

Fetch a published content page by slug.

```
Request:  GET /api/v1/content/about-us
Auth:     Not required (public)

Response 200:
{
  "page_id": 42,
  "slug": "about-us",
  "title": "About TAYA NA!",
  "meta_title": "About Us | TAYA NA!",
  "meta_description": "Learn about TAYA NA...",
  "blocks": [
    {"block_type": "text", "content": {"body": "<p>...</p>"}, "sort_order": 0},
    {"block_type": "promo_ref", "content": {"campaign_id": 5}, "sort_order": 1}
  ],
  "published_at": "2026-04-15T10:00:00Z"
}

Response 404: {"error": "page not found"}
```

### `GET /api/v1/banners?position={position}`

Fetch active banners for a placement position.

```
Request:  GET /api/v1/banners?position=hero
Auth:     Not required (public)

Response 200:
{
  "banners": [
    {
      "banner_id": 1,
      "title": "Welcome Bonus",
      "image_url": "https://cdn.example.com/banner1.jpg",
      "link_url": "/promotions",
      "position": "hero",
      "sort_order": 0
    }
  ]
}
```

### `GET /api/v1/promotions`

Already exists. No changes needed — currently returns list of active promotions.

---

## Bonus API (Player-Facing)

### `GET /api/v1/bonuses/active`

List the player's active bonuses with progress.

```
Request:  GET /api/v1/bonuses/active
Auth:     Required (player)

Response 200:
{
  "bonuses": [
    {
      "bonus_id": 101,
      "campaign_name": "Welcome Deposit Match",
      "bonus_type": "deposit_match",
      "status": "active",
      "granted_amount_cents": 5000,
      "remaining_amount_cents": 5000,
      "wagering_required_cents": 50000,
      "wagering_completed_cents": 12500,
      "wagering_progress_pct": 25.0,
      "expires_at": "2026-05-16T00:00:00Z",
      "granted_at": "2026-04-16T12:00:00Z"
    }
  ]
}
```

### `POST /api/v1/bonuses/claim`

Claim an eligible campaign bonus.

```
Request:
{
  "campaign_id": 5,
  "trigger_reference": "deposit:txn_abc123"  // optional: deposit that triggered eligibility
}
Auth:     Required (player)

Response 201:
{
  "bonus_id": 101,
  "campaign_name": "Welcome Deposit Match",
  "granted_amount_cents": 5000,
  "wagering_required_cents": 50000,
  "expires_at": "2026-05-16T00:00:00Z"
}

Response 409: {"error": "bonus already claimed for this campaign"}
Response 403: {"error": "not eligible for this campaign"}
```

### `GET /api/v1/bonuses/{id}/progress`

Detailed wagering progress for a specific bonus.

```
Request:  GET /api/v1/bonuses/101/progress
Auth:     Required (player, must own the bonus)

Response 200:
{
  "bonus_id": 101,
  "wagering_required_cents": 50000,
  "wagering_completed_cents": 12500,
  "progress_pct": 25.0,
  "recent_contributions": [
    {
      "bet_id": "bet_xyz",
      "bet_type": "parlay",
      "stake_cents": 1000,
      "contribution_cents": 1500,
      "odds_decimal": 3.50,
      "leg_count": 3,
      "contributed_at": "2026-04-16T14:00:00Z"
    }
  ]
}
```

---

## Wallet API (Player-Facing Extension)

### `GET /api/v1/wallet/{userId}/breakdown`

Expose the existing `BalanceWithBreakdown()` method (currently no HTTP endpoint exists).

```
Request:  GET /api/v1/wallet/user123/breakdown
Auth:     Required (player, must be own userId)

Response 200:
{
  "real_money_cents": 15000,
  "bonus_fund_cents": 5000,
  "total_cents": 20000,
  "currency": "USD",
  "active_bonus_count": 1
}
```

**Implementation note:** This calls existing `wallet.BalanceWithBreakdown(userID)` from `service.go:288-310`. Only new code is the HTTP handler.

---

## Parlay API (Extension to Existing Betting Endpoints)

### `POST /api/v1/bets/place/` — Extended

No new endpoint. Existing endpoint gains parlay-specific validation and response fields.

**New request fields (optional, backward-compatible):**

```json
{
  "user_id": "user123",
  "bets": [
    {"fixture_id": "f1", "market_id": "m1", "selection_id": "s1", "odds": 1.50},
    {"fixture_id": "f2", "market_id": "m2", "selection_id": "s2", "odds": 2.00},
    {"fixture_id": "f3", "market_id": "m3", "selection_id": "s3", "odds": 1.80}
  ],
  "stake": 1000,
  "freebet_id": "fb_001",
  "bet_type": "parlay"
}
```

**New response fields:**

```json
{
  "bet_id": "bet_abc",
  "bet_type": "parlay",
  "leg_count": 3,
  "combined_odds": 5.40,
  "bonus_funded_cents": 0,
  "freebet_applied_cents": 1000,
  "potential_return_cents": 5400,
  "legs": [
    {"leg_index": 0, "fixture_id": "f1", "market_id": "m1", "selection_id": "s1", "odds": 1.50},
    {"leg_index": 1, "fixture_id": "f2", "market_id": "m2", "selection_id": "s2", "odds": 2.00},
    {"leg_index": 2, "fixture_id": "f3", "market_id": "m3", "selection_id": "s3", "odds": 1.80}
  ]
}
```

---

## Content Admin API (Backoffice)

### `POST /api/v1/admin/content/pages`

```
Request:
{
  "slug": "about-us",
  "title": "About TAYA NA!",
  "content": "",
  "meta_title": "About Us",
  "status": "draft"
}
Auth: admin role
Response 201: full page object
```

### `PUT /api/v1/admin/content/pages/{id}`
### `DELETE /api/v1/admin/content/pages/{id}`
### `POST /api/v1/admin/content/pages/{id}/publish`
### `POST /api/v1/admin/content/pages/{id}/unpublish`

Standard CRUD + lifecycle transitions.

### `POST /api/v1/admin/banners`
### `PUT /api/v1/admin/banners/{id}`
### `DELETE /api/v1/admin/banners/{id}`

Banner management with position, sort order, scheduling (start_at/end_at).

---

## Campaign Admin API (Backoffice)

### `POST /api/v1/admin/campaigns`

```
Request:
{
  "name": "Welcome Deposit Match",
  "campaign_type": "deposit_match",
  "start_at": "2026-04-20T00:00:00Z",
  "end_at": "2026-05-20T00:00:00Z",
  "rules": [
    {"rule_type": "eligibility", "rule_config": {"min_deposits": 0, "new_players_only": true}},
    {"rule_type": "trigger", "rule_config": {"event": "deposit", "min_amount_cents": 1000}},
    {"rule_type": "reward", "rule_config": {"match_pct": 100, "max_bonus_cents": 50000}},
    {"rule_type": "wagering", "rule_config": {"multiplier": 10, "min_odds_decimal": 1.5}}
  ]
}
Auth: admin role
Response 201: full campaign object with rules
```

### `PUT /api/v1/admin/campaigns/{id}`
### `POST /api/v1/admin/campaigns/{id}/activate`
### `POST /api/v1/admin/campaigns/{id}/pause`
### `POST /api/v1/admin/campaigns/{id}/close`

Campaign lifecycle transitions: draft → active → paused → closed.

### `GET /api/v1/admin/campaigns`
### `GET /api/v1/admin/campaigns/{id}`

List and detail with claim statistics.

---

## Player Bonus Admin API (Backoffice)

### `POST /api/v1/admin/bonuses/grant`

```
Request:
{
  "user_id": "user123",
  "campaign_id": 5,
  "override_amount_cents": 2500,
  "reason": "VIP courtesy bonus"
}
Auth: admin role
```

### `POST /api/v1/admin/bonuses/{id}/forfeit`

```
Request:
{
  "reason": "suspected abuse"
}
Auth: admin role
```

### `GET /api/v1/admin/bonuses?user_id={userId}&status={status}`

List player bonuses with filters.

---

## Service Responsibility Matrix

| Endpoint Group | Handler File | Service Package | DB Tables |
|---|---|---|---|
| Content delivery | `content_handlers.go` | `content/` | `content_pages`, `banners`, `content_blocks` |
| Content admin | `content_handlers.go` | `content/` | Same |
| Bonus player | `bonus_handlers.go` | `bonus/` | `player_bonuses`, `wagering_contributions` |
| Bonus admin | `bonus_handlers.go` | `bonus/` | `campaigns`, `campaign_rules`, `player_bonuses` |
| Wallet breakdown | `wallet_handlers.go` | `wallet/` | `wallet_balances` |
| Bet placement (extended) | `bet_handlers.go` | `bets/`, `wallet/`, `bonus/` | `bets`, `bet_legs`, `wagering_contributions` |

---

## File Path References

1. `services/gateway/internal/http/handlers.go` — existing route registration pattern
2. `services/gateway/internal/http/wallet_handlers.go` — existing wallet endpoints
3. `services/gateway/internal/http/bet_handlers.go` — existing bet endpoints
4. `services/gateway/internal/http/loyalty_handlers.go` — admin endpoint patterns
5. `services/gateway/internal/wallet/service.go:288-310` — BalanceWithBreakdown (to expose)
6. `services/gateway/internal/wallet/service.go:313-319` — CreditBonus (called by bonus)
7. `services/gateway/internal/freebets/service.go` — freebet lifecycle
8. `modules/platform/transport/httpx/errors.go` — error response pattern
9. `modules/platform/transport/httpx/handler.go` — JSON response helpers
10. `talon-backoffice/packages/app/app/lib/api/client.ts` — base API client (snake→camel normalization)
11. `talon-backoffice/packages/app/app/lib/api/betting-client.ts` — placeParlay() existing contract
