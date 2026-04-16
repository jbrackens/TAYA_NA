# 04 — Data Model Plan: Schema Additions and Migrations

**Date:** 2026-04-16

---

## Existing Schema (Reused As-Is)

These tables already exist and require NO migration changes:

| Table | Migration | Key Columns | Reuse |
|---|---|---|---|
| `wallet_balances` | 006 | `balance_cents`, `bonus_balance_cents` | Bonus funds already tracked |
| `wallet_ledger` | 006 | `fund_type DEFAULT 'real'` | Bonus entries already distinguishable |
| `wallet_reservations` | 006 | `reference_type`, `reference_id`, `status` | Hold/capture for bonus-funded bets |
| `freebets` | 007 | `campaign_id`, `remaining_amount_cents`, `min_odds_decimal`, `expires_at` | Connected to campaigns via campaign_id |
| `odds_boosts` | 007 | `campaign_id`, `boost_percentage`, `expires_at` | Connected to campaigns via campaign_id |

---

## New Migrations

All migrations are **additive** (CREATE TABLE, ADD COLUMN). No ALTER/DROP on existing tables.

### Migration 011: CMS Content

```sql
-- 011_content.sql

CREATE TABLE content_pages (
  id         BIGSERIAL PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  meta_title TEXT,
  meta_description TEXT,
  status     TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE banners (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  image_url  TEXT NOT NULL,
  link_url   TEXT,
  position   TEXT NOT NULL DEFAULT 'hero',
  sort_order INT NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT FALSE,
  start_at   TIMESTAMPTZ,
  end_at     TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE content_blocks (
  id         BIGSERIAL PRIMARY KEY,
  page_id    BIGINT REFERENCES content_pages(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL
               CHECK (block_type IN ('text', 'banner_ref', 'promo_ref', 'html', 'faq')),
  content    JSONB NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_content_blocks_page ON content_blocks (page_id, sort_order);
```

### Migration 012: Campaigns and Bonuses

```sql
-- 012_campaigns_bonuses.sql

CREATE TABLE campaigns (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  campaign_type TEXT NOT NULL
                 CHECK (campaign_type IN (
                   'deposit_match', 'freebet_grant', 'odds_boost_grant',
                   'signup_bonus', 'reload_bonus', 'referral_bonus',
                   'custom'
                 )),
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'active', 'paused', 'closed')),
  start_at     TIMESTAMPTZ NOT NULL,
  end_at       TIMESTAMPTZ NOT NULL,
  budget_cents BIGINT,             -- optional total budget cap
  spent_cents  BIGINT NOT NULL DEFAULT 0,
  max_claims   INT,                -- optional per-campaign claim limit
  claim_count  INT NOT NULL DEFAULT 0,
  rules        JSONB NOT NULL DEFAULT '{}',
  created_by   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_rules (
  id           BIGSERIAL PRIMARY KEY,
  campaign_id  BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  rule_type    TEXT NOT NULL
                 CHECK (rule_type IN (
                   'eligibility',   -- who qualifies
                   'trigger',       -- what activates (deposit, signup, bet)
                   'reward',        -- what they get
                   'wagering'       -- completion requirements
                 )),
  rule_config  JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_campaign_rules_campaign ON campaign_rules (campaign_id, rule_type);

-- Example rule_config for each type:
-- eligibility: {"min_deposits": 1, "tier_min": "silver", "registered_after": "2026-01-01"}
-- trigger:     {"event": "deposit", "min_amount_cents": 1000}
-- reward:      {"type": "deposit_match", "match_pct": 100, "max_bonus_cents": 50000}
-- wagering:    {"multiplier": 10, "min_odds_decimal": 1.5, "parlay_multiplier": 1.5,
--               "excluded_sports": [], "max_stake_contribution_cents": null}

CREATE TABLE player_bonuses (
  id             BIGSERIAL PRIMARY KEY,
  user_id        TEXT NOT NULL,
  campaign_id    BIGINT REFERENCES campaigns(id),
  bonus_type     TEXT NOT NULL,        -- matches campaign_type
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'completed', 'expired', 'forfeited')),
  granted_amount_cents    BIGINT NOT NULL,
  remaining_amount_cents  BIGINT NOT NULL,
  wagering_required_cents BIGINT NOT NULL DEFAULT 0,
  wagering_completed_cents BIGINT NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ NOT NULL,
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  forfeited_at   TIMESTAMPTZ,
  forfeited_by   TEXT,                 -- admin user or 'system'
  metadata       JSONB DEFAULT '{}',   -- campaign snapshot at grant time
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, campaign_id)        -- one bonus per campaign per player
);
CREATE INDEX idx_player_bonuses_user_status ON player_bonuses (user_id, status);
CREATE INDEX idx_player_bonuses_expires ON player_bonuses (expires_at) WHERE status = 'active';

CREATE TABLE wagering_contributions (
  id              BIGSERIAL PRIMARY KEY,
  player_bonus_id BIGINT NOT NULL REFERENCES player_bonuses(id),
  bet_id          TEXT NOT NULL,
  bet_type        TEXT NOT NULL DEFAULT 'single'
                    CHECK (bet_type IN ('single', 'parlay', 'system')),
  stake_cents     BIGINT NOT NULL,
  contribution_cents BIGINT NOT NULL,  -- after multiplier application
  odds_decimal    NUMERIC(10,4),
  leg_count       INT DEFAULT 1,
  contributed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_bonus_id, bet_id)     -- idempotent per bet
);
CREATE INDEX idx_wagering_contrib_bonus ON wagering_contributions (player_bonus_id);
```

### Migration 013: Parlay Bet Legs

```sql
-- 013_bet_legs.sql

-- Add parlay fields to existing bets table
ALTER TABLE bets ADD COLUMN IF NOT EXISTS bet_type TEXT DEFAULT 'single'
  CHECK (bet_type IN ('single', 'parlay', 'system'));
ALTER TABLE bets ADD COLUMN IF NOT EXISTS leg_count INT DEFAULT 1;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS bonus_funded_cents BIGINT DEFAULT 0;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS freebet_id TEXT;

CREATE TABLE bet_legs (
  id             BIGSERIAL PRIMARY KEY,
  bet_id         BIGINT NOT NULL,  -- references bets(id)
  leg_index      INT NOT NULL,
  fixture_id     TEXT NOT NULL,
  market_id      TEXT NOT NULL,
  selection_id   TEXT NOT NULL,
  odds_decimal   NUMERIC(10,4) NOT NULL,
  outcome        TEXT DEFAULT 'pending'
                   CHECK (outcome IN ('pending', 'won', 'lost', 'void', 'push', 'dead_heat')),
  settled_at     TIMESTAMPTZ,
  void_reason    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bet_id, leg_index)
);
CREATE INDEX idx_bet_legs_bet ON bet_legs (bet_id);
CREATE INDEX idx_bet_legs_market ON bet_legs (market_id);
```

---

## Entity Relationship Diagram

```
campaigns ──1:N── campaign_rules
    │
    │ 1:N
    ▼
player_bonuses ──1:N── wagering_contributions
    │                         │
    │                         │ N:1
    │                         ▼
    │                      bets ──1:N── bet_legs
    │                         │
    │                         │ N:1
    │                         ▼
    └─────────────────► wallet_balances
                              │
                              │ 1:N
                              ▼
                         wallet_ledger
                         (fund_type: real/bonus)

content_pages ──1:N── content_blocks
banners (standalone)
freebets ──N:1── campaigns (via campaign_id FK)
odds_boosts ──N:1── campaigns (via campaign_id FK)
```

---

## Migration Sequence

```
Current: 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010

Plan:    011_content.sql         (Phase B: CMS)
         012_campaigns_bonuses.sql (Phase A: foundation)
         013_bet_legs.sql        (Phase C: parlay)
```

All three migrations are independent — they can be applied in any order. None reference each other's tables. This allows parallel development workstreams.

**Non-breaking guarantee:** All changes are CREATE TABLE or ADD COLUMN with defaults. No ALTER COLUMN, no DROP, no constraint changes on existing tables. Existing application code continues to work unchanged.

---

## File Path References

1. `services/gateway/migrations/006_wallets_ledger.sql` — existing wallet schema
2. `services/gateway/migrations/007_freebets_oddsboosts.sql` — existing bonus tables
3. `services/gateway/internal/wallet/service.go:1372-1403` — ensureSchema() with wallet_balances, wallet_ledger, wallet_reservations
4. `modules/platform/canonical/v1/types.go:252-266` — Freebet struct with CampaignID
5. `modules/platform/canonical/v1/types.go:277-295` — OddsBoost struct with CampaignID
6. `services/gateway/internal/bets/service.go:181-212` — Bet struct with Legs []BetLeg
7. `services/codex-prep/migrations/016_create_cms.sql` — codex-prep CMS schema (reference for design, not reused directly)
8. `services/gateway/internal/wallet/service.go:282-286` — BalanceBreakdown struct
9. `services/gateway/internal/wallet/service.go:313-319` — CreditBonus method
10. `services/gateway/internal/wallet/service.go:60-69` — LedgerEntry struct
