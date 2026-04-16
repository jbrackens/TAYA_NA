# 07 — Backoffice Plan: Admin/Editor Modules

**Date:** 2026-04-16

---

## Current Backoffice State

The backoffice at `talon-backoffice/packages/office/` has these admin sections:
- Dashboard, Reports, Users, Leaderboards, Loyalty (settings + accounts), Risk Management, Audit Logs, Trading (SettlementPanel)

**Missing:** Content management, campaign management, bonus administration.

---

## New Admin Sections

### 1. Content Management

**Route:** `/content`

**Pages:**

| Route | Purpose |
|---|---|
| `/content/pages` | List all content pages with status filter (draft/published/archived) |
| `/content/pages/new` | Create new page with slug, title, meta fields, block editor |
| `/content/pages/{id}` | Edit page, manage blocks, publish/unpublish |
| `/content/banners` | List banners with position filter, active/inactive toggle |
| `/content/banners/new` | Create banner: title, image URL, link, position, scheduling |
| `/content/banners/{id}` | Edit banner, toggle active, set date window |

**Content Block Editor:**
- Ordered list of blocks per page
- Block types: Text (rich text), Banner Reference, Promotion Reference, HTML, FAQ
- Drag to reorder (sort_order)
- Add/remove blocks
- Each block type has its own inline editor

**Permissions:** Requires `admin` role (existing auth middleware). Future: add `content_editor` role.

### 2. Campaign Management

**Route:** `/campaigns`

**Pages:**

| Route | Purpose |
|---|---|
| `/campaigns` | List campaigns with status filter (draft/active/paused/closed), date range |
| `/campaigns/new` | Campaign wizard: name, type, dates, rules (eligibility, trigger, reward, wagering) |
| `/campaigns/{id}` | Edit campaign, view claim statistics, lifecycle actions |
| `/campaigns/{id}/claims` | List players who claimed this campaign, with bonus status |

**Campaign Wizard Steps:**
1. **Basics:** Name, description, type (deposit match, freebet grant, etc.), dates
2. **Eligibility:** New players only? Min deposits? Tier requirement?
3. **Trigger:** What activates it? (deposit, signup, manual grant, bet placement)
4. **Reward:** Amount/percentage, caps, freebet params (min odds, sport filter)
5. **Wagering:** Multiplier, min qualifying odds, parlay multiplier, excluded sports
6. **Review:** Summary with calculated examples ("$100 deposit → $100 bonus → $1000 wagering required")

**Campaign Lifecycle Actions:**
- Draft → Activate (validates dates, rules completeness)
- Active → Pause (stops new claims, existing bonuses continue)
- Active/Paused → Close (stops everything, optionally forfeits uncompleted bonuses)

### 3. Player Bonus Administration

**Route:** `/bonuses`

**Pages:**

| Route | Purpose |
|---|---|
| `/bonuses` | List player bonuses with filters: user, status, campaign, date |
| `/bonuses/{id}` | Bonus detail: player, campaign, progress, wagering history |
| `/bonuses/grant` | Manual bonus grant form: select user, campaign, override amount |

**Bonus Detail View:**
- Player info (linked to users page)
- Campaign info (linked to campaign page)
- Status badge: Active / Completed / Expired / Forfeited
- Wagering progress bar with contribution history table
- Actions: Forfeit (with reason), Adjust amount
- Audit log: all mutations to this bonus

**Bonus Actions:**
- **Forfeit:** Admin can forfeit any active bonus. Requires reason text. Calls `POST /api/v1/admin/bonuses/{id}/forfeit`.
- **Grant:** Admin can manually grant a bonus for any campaign. Calls `POST /api/v1/admin/bonuses/grant`.
- **Adjust:** Modify wagering requirements (e.g., reduce for VIP). Future scope.

### 4. Parlay Rule Configuration

**Route:** `/campaigns/{id}` (within campaign detail)

**Parlay-Specific Campaign Rules:**
- Minimum leg count for parlay eligibility (e.g., 3+)
- Minimum odds per leg (e.g., 1.30)
- Minimum combined odds (e.g., 3.00)
- Wagering contribution multiplier for parlays (e.g., 1.5x vs 1.0x for singles)
- Excluded sports/markets for parlay bonuses

These are configured as `campaign_rules` with `rule_type = 'wagering'` and parlay-specific fields in the `rule_config` JSONB.

### 5. Settlement Panel Extension

**Route:** `/trading` (existing)

**Additions to existing SettlementPanel:**
- Show `bonus_funded_cents` per bet in settlement view
- Show `freebet_id` if a free bet was used
- For parlays: show per-leg outcome breakdown
- Warning indicator when settling a bet with active bonus implications
- Post-settlement: show wagering contribution that was applied

---

## API Client Additions

The backoffice API client at `talon-backoffice/packages/api-client/src/` needs new methods:

```typescript
// Content
listPages(filters)      → GET /api/v1/admin/content/pages
createPage(request)     → POST /api/v1/admin/content/pages
updatePage(id, request) → PUT /api/v1/admin/content/pages/{id}
publishPage(id)         → POST /api/v1/admin/content/pages/{id}/publish
unpublishPage(id)       → POST /api/v1/admin/content/pages/{id}/unpublish
listBanners(filters)    → GET /api/v1/admin/banners
createBanner(request)   → POST /api/v1/admin/banners
updateBanner(id, req)   → PUT /api/v1/admin/banners/{id}
deleteBanner(id)        → DELETE /api/v1/admin/banners/{id}

// Campaigns
listCampaigns(filters)  → GET /api/v1/admin/campaigns
createCampaign(request) → POST /api/v1/admin/campaigns
updateCampaign(id, req) → PUT /api/v1/admin/campaigns/{id}
activateCampaign(id)    → POST /api/v1/admin/campaigns/{id}/activate
pauseCampaign(id)       → POST /api/v1/admin/campaigns/{id}/pause
closeCampaign(id)       → POST /api/v1/admin/campaigns/{id}/close
getCampaignClaims(id)   → GET /api/v1/admin/campaigns/{id}/claims

// Player Bonuses
listBonuses(filters)    → GET /api/v1/admin/bonuses
grantBonus(request)     → POST /api/v1/admin/bonuses/grant
forfeitBonus(id, reason)→ POST /api/v1/admin/bonuses/{id}/forfeit
```

---

## Audit Requirements

Every admin action on content, campaigns, and bonuses must produce an entry in the existing `audit_logs` table (migration 009):

| Action | Logged Fields |
|---|---|
| Page publish/unpublish | actor, page_id, old_status, new_status |
| Campaign activate/pause/close | actor, campaign_id, old_status, new_status |
| Bonus grant | actor, user_id, campaign_id, amount_cents |
| Bonus forfeit | actor, bonus_id, reason |
| Banner create/update/delete | actor, banner_id, changes |

Pattern: follow existing audit logging in `services/gateway/migrations/009_audit_logs.sql`.

---

## File Path References

1. `talon-backoffice/packages/office/app/(dashboard)/` — existing admin route structure
2. `talon-backoffice/packages/office/app/(dashboard)/users/` — user management pattern
3. `talon-backoffice/packages/office/app/(dashboard)/loyalty/` — loyalty settings pattern
4. `talon-backoffice/packages/office/app/(dashboard)/trading/` — SettlementPanel
5. `talon-backoffice/packages/office/app/(dashboard)/audit-logs/` — audit log viewer
6. `talon-backoffice/packages/api-client/src/` — backoffice API client
7. `services/gateway/internal/http/loyalty_handlers.go` — admin handler pattern (tier CRUD, rule CRUD)
8. `services/gateway/migrations/009_audit_logs.sql` — audit logging schema
9. `services/gateway/internal/wallet/service.go:791-855` — CorrectionTask pattern (admin workflow)
10. `services/gateway/internal/http/handlers.go` — route registration pattern
