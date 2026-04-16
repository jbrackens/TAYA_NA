-- Prediction Platform — Development Seed Data
-- Run after 014_prediction_schema.sql
-- Categories are seeded in the migration; this adds series, events, markets, and test users.

BEGIN;

-- ============================================================
-- TEST USERS (reuse punters table from sportsbook schema)
-- ============================================================
-- Password for all: "predict123" (bcrypt cost 10)
INSERT INTO punters (id, email, username, password_hash, status, country_code, created_at, last_login_at) VALUES
  ('user-001', 'alice@predict.dev', 'alice', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'active', 'US', NOW(), NOW()),
  ('user-002', 'bob@predict.dev', 'bob', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'active', 'GB', NOW() - INTERVAL '14 days', NOW() - INTERVAL '1 day'),
  ('user-003', 'charlie@predict.dev', 'charlie', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'active', 'US', NOW() - INTERVAL '30 days', NOW()),
  ('user-bot', 'bot@predict.dev', 'tradebot', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'active', 'US', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Wallets for test users
INSERT INTO wallets (id, punter_id, balance_cents, bonus_balance_cents, currency_code) VALUES
  ('wallet-001', 'user-001', 100000, 0, 'USD'),   -- $1,000.00
  ('wallet-002', 'user-002', 50000, 0, 'USD'),    -- $500.00
  ('wallet-003', 'user-003', 250000, 0, 'USD'),   -- $2,500.00
  ('wallet-bot', 'user-bot', 1000000, 0, 'USD')   -- $10,000.00
ON CONFLICT (punter_id) DO NOTHING;

-- ============================================================
-- SERIES (recurring event templates)
-- ============================================================
INSERT INTO prediction_series (id, slug, title, description, category_id, frequency, tags) VALUES
  ('series-btc-daily',
   'btc-daily-close',
   'Bitcoin Daily Close',
   'Daily markets on whether BTC closes above key price levels',
   (SELECT id FROM prediction_categories WHERE slug = 'crypto'),
   'daily',
   ARRAY['bitcoin', 'crypto', 'daily']),

  ('series-fed-rates',
   'fed-rate-decisions',
   'Federal Reserve Rate Decisions',
   'Markets on Federal Reserve interest rate decisions at each FOMC meeting',
   (SELECT id FROM prediction_categories WHERE slug = 'economics'),
   'monthly',
   ARRAY['fed', 'rates', 'fomc', 'economics']),

  ('series-us-elections',
   'us-elections-2026',
   'US 2026 Midterm Elections',
   'Markets on US midterm election outcomes',
   (SELECT id FROM prediction_categories WHERE slug = 'politics'),
   'one-off',
   ARRAY['elections', 'us', 'politics', 'midterms']),

  ('series-ai-milestones',
   'ai-milestones-2026',
   'AI Milestones 2026',
   'Markets on major AI achievements and releases',
   (SELECT id FROM prediction_categories WHERE slug = 'tech'),
   'one-off',
   ARRAY['ai', 'tech', 'milestones']),

  ('series-champions-league',
   'ucl-2025-26',
   'UEFA Champions League 2025/26',
   'Markets on Champions League match outcomes and tournament winner',
   (SELECT id FROM prediction_categories WHERE slug = 'sports'),
   'weekly',
   ARRAY['football', 'ucl', 'champions-league']),

  ('series-box-office',
   'summer-box-office-2026',
   'Summer Box Office 2026',
   'Markets on opening weekend box office performance',
   (SELECT id FROM prediction_categories WHERE slug = 'entertainment'),
   'weekly',
   ARRAY['movies', 'box-office', 'entertainment'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- EVENTS
-- ============================================================

-- Crypto events
INSERT INTO prediction_events (id, series_id, title, description, category_id, status, featured, open_at, close_at, metadata) VALUES
  ('evt-btc-100k',
   'series-btc-daily',
   'Bitcoin Above $100K — April 30',
   'Will Bitcoin (BTC/USD) trade above $100,000 at any point before April 30, 2026 midnight UTC?',
   (SELECT id FROM prediction_categories WHERE slug = 'crypto'),
   'open', true, NOW(), NOW() + INTERVAL '14 days',
   '{"asset": "bitcoin", "threshold": 100000}'),

  ('evt-eth-5k',
   'series-btc-daily',
   'Ethereum Above $5K — May 2026',
   'Will Ethereum (ETH/USD) exceed $5,000 before June 1, 2026?',
   (SELECT id FROM prediction_categories WHERE slug = 'crypto'),
   'open', false, NOW(), NOW() + INTERVAL '45 days',
   '{"asset": "ethereum", "threshold": 5000}'),

  ('evt-sol-300',
   'series-btc-daily',
   'Solana Above $300 — Q2 2026',
   'Will Solana (SOL/USD) trade above $300 before July 1, 2026?',
   (SELECT id FROM prediction_categories WHERE slug = 'crypto'),
   'open', false, NOW(), NOW() + INTERVAL '75 days',
   '{"asset": "solana", "threshold": 300}')
ON CONFLICT (id) DO NOTHING;

-- Economics events
INSERT INTO prediction_events (id, series_id, title, description, category_id, status, featured, open_at, close_at, metadata) VALUES
  ('evt-fed-may',
   'series-fed-rates',
   'May 2026 FOMC Decision',
   'What will the Federal Reserve do with interest rates at the May 2026 FOMC meeting?',
   (SELECT id FROM prediction_categories WHERE slug = 'economics'),
   'open', true, NOW(), '2026-05-07 18:00:00+00',
   '{"meeting_date": "2026-05-07", "current_rate": 4.50}'),

  ('evt-us-recession',
   'series-fed-rates',
   'US Recession by End of 2026',
   'Will the NBER declare a US recession beginning before January 1, 2027?',
   (SELECT id FROM prediction_categories WHERE slug = 'economics'),
   'open', false, NOW(), '2026-12-31 23:59:59+00',
   '{"indicator": "nber_recession_declaration"}')
ON CONFLICT (id) DO NOTHING;

-- Politics events
INSERT INTO prediction_events (id, series_id, title, description, category_id, status, featured, open_at, close_at, metadata) VALUES
  ('evt-senate-control',
   'series-us-elections',
   '2026 US Senate Control',
   'Which party will control the US Senate after the 2026 midterm elections?',
   (SELECT id FROM prediction_categories WHERE slug = 'politics'),
   'open', true, NOW(), '2026-11-03 23:59:59+00',
   '{"election_date": "2026-11-03", "chamber": "senate"}'),

  ('evt-house-control',
   'series-us-elections',
   '2026 US House Control',
   'Which party will control the US House after the 2026 midterms?',
   (SELECT id FROM prediction_categories WHERE slug = 'politics'),
   'open', false, NOW(), '2026-11-03 23:59:59+00',
   '{"election_date": "2026-11-03", "chamber": "house"}')
ON CONFLICT (id) DO NOTHING;

-- Tech events
INSERT INTO prediction_events (id, series_id, title, description, category_id, status, featured, open_at, close_at, metadata) VALUES
  ('evt-gpt5-release',
   'series-ai-milestones',
   'GPT-5 Released Before July 2026',
   'Will OpenAI release GPT-5 (or equivalent next-gen model) before July 1, 2026?',
   (SELECT id FROM prediction_categories WHERE slug = 'tech'),
   'open', true, NOW(), '2026-07-01 00:00:00+00',
   '{"company": "openai", "product": "gpt-5"}'),

  ('evt-apple-ai',
   'series-ai-milestones',
   'Apple Ships On-Device LLM in 2026',
   'Will Apple ship a large language model running fully on-device in an iOS/macOS update in 2026?',
   (SELECT id FROM prediction_categories WHERE slug = 'tech'),
   'open', false, NOW(), '2026-12-31 23:59:59+00',
   '{"company": "apple", "feature": "on-device-llm"}')
ON CONFLICT (id) DO NOTHING;

-- Sports events
INSERT INTO prediction_events (id, series_id, title, description, category_id, status, featured, open_at, close_at, metadata) VALUES
  ('evt-ucl-winner',
   'series-champions-league',
   'Champions League 2025/26 Winner',
   'Which club will win the 2025/26 UEFA Champions League?',
   (SELECT id FROM prediction_categories WHERE slug = 'sports'),
   'open', false, NOW(), '2026-05-30 20:00:00+00',
   '{"competition": "ucl", "season": "2025-26"}')
ON CONFLICT (id) DO NOTHING;

-- Entertainment events
INSERT INTO prediction_events (id, series_id, title, description, category_id, status, featured, open_at, close_at, metadata) VALUES
  ('evt-avatar3-box-office',
   'series-box-office',
   'Avatar 3 Opening Weekend > $200M',
   'Will Avatar 3: Fire and Ash gross over $200M in its domestic opening weekend?',
   (SELECT id FROM prediction_categories WHERE slug = 'entertainment'),
   'open', false, NOW(), '2026-12-19 23:59:59+00',
   '{"movie": "avatar-3", "threshold_millions": 200}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- MARKETS (binary contracts within events)
-- ============================================================

-- Crypto markets
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  ('mkt-btc-100k-yes', 'evt-btc-100k',
   'BTC-100K-APR26', 'Bitcoin above $100K by April 30',
   'Resolves YES if BTC/USD trades at or above $100,000 on any major exchange before April 30, 2026 23:59 UTC.',
   'open', 62, 38, 200, 50000,
   'api-feed-crypto', 'price_above', '{"asset": "bitcoin", "threshold": 100000}',
   NOW() + INTERVAL '14 days', 1245000, 890000),

  ('mkt-eth-5k-yes', 'evt-eth-5k',
   'ETH-5K-MAY26', 'Ethereum above $5K by June 1',
   'Resolves YES if ETH/USD trades at or above $5,000 before June 1, 2026.',
   'open', 28, 72, 150, 30000,
   'api-feed-crypto', 'price_above', '{"asset": "ethereum", "threshold": 5000}',
   NOW() + INTERVAL '45 days', 567000, 340000),

  ('mkt-sol-300-yes', 'evt-sol-300',
   'SOL-300-Q2', 'Solana above $300 by Q2 end',
   'Resolves YES if SOL/USD trades at or above $300 before July 1, 2026.',
   'open', 15, 85, 100, 20000,
   'api-feed-crypto', 'price_above', '{"asset": "solana", "threshold": 300}',
   NOW() + INTERVAL '75 days', 234000, 156000)
ON CONFLICT (id) DO NOTHING;

-- Economics markets
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  ('mkt-fed-cut-may', 'evt-fed-may',
   'FED-CUT-MAY26', 'Fed cuts rates at May FOMC',
   'Resolves YES if the Federal Reserve reduces the federal funds rate at the May 6-7, 2026 FOMC meeting.',
   'open', 45, 55, 250, 75000,
   'admin-manual', 'binary_outcome', '{"meeting": "2026-05-07"}',
   '2026-05-07 18:00:00+00', 2340000, 1560000),

  ('mkt-fed-hold-may', 'evt-fed-may',
   'FED-HOLD-MAY26', 'Fed holds rates at May FOMC',
   'Resolves YES if the Federal Reserve keeps rates unchanged at the May 2026 FOMC meeting.',
   'open', 48, 52, 250, 75000,
   'admin-manual', 'binary_outcome', '{"meeting": "2026-05-07"}',
   '2026-05-07 18:00:00+00', 1890000, 1200000),

  ('mkt-us-recession', 'evt-us-recession',
   'US-RECESSION-2026', 'US recession declared by end of 2026',
   'Resolves YES if NBER officially declares a recession that began before January 1, 2027.',
   'open', 22, 78, 200, 40000,
   'admin-manual', 'binary_outcome', '{}',
   '2026-12-31 23:59:59+00', 890000, 450000)
ON CONFLICT (id) DO NOTHING;

-- Politics markets
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  ('mkt-senate-dem', 'evt-senate-control',
   'SENATE-DEM-2026', 'Democrats control Senate after 2026 midterms',
   'Resolves YES if the Democratic Party holds a majority (or 50 seats + VP tiebreaker) in the US Senate after the 2026 midterms.',
   'open', 41, 59, 300, 100000,
   'admin-manual', 'binary_outcome', '{"party": "democrat", "chamber": "senate"}',
   '2026-11-03 23:59:59+00', 4560000, 3200000),

  ('mkt-senate-gop', 'evt-senate-control',
   'SENATE-GOP-2026', 'Republicans control Senate after 2026 midterms',
   'Resolves YES if the Republican Party holds 51+ seats in the US Senate after the 2026 midterms.',
   'open', 59, 41, 300, 100000,
   'admin-manual', 'binary_outcome', '{"party": "republican", "chamber": "senate"}',
   '2026-11-03 23:59:59+00', 4120000, 2900000),

  ('mkt-house-dem', 'evt-house-control',
   'HOUSE-DEM-2026', 'Democrats win House majority in 2026',
   'Resolves YES if Democrats win 218+ seats in the US House of Representatives in the 2026 midterms.',
   'open', 52, 48, 300, 100000,
   'admin-manual', 'binary_outcome', '{"party": "democrat", "chamber": "house"}',
   '2026-11-03 23:59:59+00', 3450000, 2100000)
ON CONFLICT (id) DO NOTHING;

-- Tech markets
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  ('mkt-gpt5-jul', 'evt-gpt5-release',
   'GPT5-JUL26', 'GPT-5 released before July 2026',
   'Resolves YES if OpenAI publicly releases a model marketed as GPT-5 (or equivalent successor) before July 1, 2026.',
   'open', 35, 65, 200, 50000,
   'admin-manual', 'binary_outcome', '{"company": "openai"}',
   '2026-07-01 00:00:00+00', 1780000, 1100000),

  ('mkt-apple-llm', 'evt-apple-ai',
   'APPLE-LLM-2026', 'Apple ships on-device LLM in 2026',
   'Resolves YES if Apple includes a large language model running fully on-device in any iOS or macOS release in calendar year 2026.',
   'open', 68, 32, 150, 30000,
   'admin-manual', 'binary_outcome', '{"company": "apple"}',
   '2026-12-31 23:59:59+00', 920000, 670000)
ON CONFLICT (id) DO NOTHING;

-- Sports markets (multi-outcome decomposed to binary)
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  ('mkt-ucl-real', 'evt-ucl-winner',
   'UCL-REAL-2526', 'Real Madrid wins Champions League 2025/26',
   'Resolves YES if Real Madrid wins the 2025/26 UEFA Champions League final.',
   'open', 22, 78, 150, 25000,
   'admin-manual', 'binary_outcome', '{"club": "real-madrid"}',
   '2026-05-30 20:00:00+00', 780000, 450000),

  ('mkt-ucl-city', 'evt-ucl-winner',
   'UCL-CITY-2526', 'Manchester City wins Champions League 2025/26',
   'Resolves YES if Manchester City wins the 2025/26 UEFA Champions League final.',
   'open', 18, 82, 150, 25000,
   'admin-manual', 'binary_outcome', '{"club": "manchester-city"}',
   '2026-05-30 20:00:00+00', 650000, 380000),

  ('mkt-ucl-barca', 'evt-ucl-winner',
   'UCL-BARCA-2526', 'Barcelona wins Champions League 2025/26',
   'Resolves YES if Barcelona wins the 2025/26 UEFA Champions League final.',
   'open', 14, 86, 150, 25000,
   'admin-manual', 'binary_outcome', '{"club": "barcelona"}',
   '2026-05-30 20:00:00+00', 520000, 290000)
ON CONFLICT (id) DO NOTHING;

-- Entertainment markets
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  ('mkt-avatar3-200m', 'evt-avatar3-box-office',
   'AVATAR3-200M', 'Avatar 3 opens above $200M domestic',
   'Resolves YES if Avatar 3: Fire and Ash grosses over $200M in its domestic opening weekend (Fri-Sun).',
   'open', 55, 45, 150, 30000,
   'admin-manual', 'binary_outcome', '{"movie": "avatar-3", "threshold_millions": 200}',
   '2026-12-19 23:59:59+00', 340000, 210000)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- LIFECYCLE EVENTS (audit trail for seed markets)
-- ============================================================
INSERT INTO prediction_lifecycle_events (market_id, event_type, actor_type, reason, occurred_at)
SELECT id, 'created', 'system', 'seed data', NOW() - INTERVAL '1 hour'
FROM prediction_markets
ON CONFLICT DO NOTHING;

INSERT INTO prediction_lifecycle_events (market_id, event_type, actor_type, reason, occurred_at)
SELECT id, 'opened', 'system', 'seed data — auto-opened', NOW() - INTERVAL '30 minutes'
FROM prediction_markets WHERE status = 'open'
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE TRADES (give markets some history)
-- ============================================================
INSERT INTO prediction_orders (id, user_id, market_id, side, action, order_type,
  price_cents, quantity, filled_quantity, remaining_quantity, total_cost_cents,
  status, filled_at, created_at, updated_at) VALUES
  ('ord-001', 'user-001', 'mkt-btc-100k-yes', 'yes', 'buy', 'market', 60, 20, 20, 0, 1200, 'filled', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  ('ord-002', 'user-002', 'mkt-btc-100k-yes', 'no', 'buy', 'market', 40, 15, 15, 0, 600, 'filled', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '90 minutes'),
  ('ord-003', 'user-001', 'mkt-fed-cut-may', 'yes', 'buy', 'market', 45, 50, 50, 0, 2250, 'filled', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
  ('ord-004', 'user-003', 'mkt-senate-dem', 'yes', 'buy', 'market', 41, 100, 100, 0, 4100, 'filled', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes'),
  ('ord-005', 'user-002', 'mkt-gpt5-jul', 'no', 'buy', 'market', 65, 30, 30, 0, 1950, 'filled', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
  ('ord-006', 'user-003', 'mkt-apple-llm', 'yes', 'buy', 'market', 68, 25, 25, 0, 1700, 'filled', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prediction_trades (id, market_id, buy_order_id, buyer_id, side, price_cents, quantity, fee_cents, is_amm_trade, traded_at) VALUES
  ('trd-001', 'mkt-btc-100k-yes', 'ord-001', 'user-001', 'yes', 60, 20, 0, true, NOW() - INTERVAL '2 hours'),
  ('trd-002', 'mkt-btc-100k-yes', 'ord-002', 'user-002', 'no', 40, 15, 0, true, NOW() - INTERVAL '90 minutes'),
  ('trd-003', 'mkt-fed-cut-may', 'ord-003', 'user-001', 'yes', 45, 50, 0, true, NOW() - INTERVAL '1 hour'),
  ('trd-004', 'mkt-senate-dem', 'ord-004', 'user-003', 'yes', 41, 100, 0, true, NOW() - INTERVAL '45 minutes'),
  ('trd-005', 'mkt-gpt5-jul', 'ord-005', 'user-002', 'no', 65, 30, 0, true, NOW() - INTERVAL '30 minutes'),
  ('trd-006', 'mkt-apple-llm', 'ord-006', 'user-003', 'yes', 68, 25, 0, true, NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prediction_positions (user_id, market_id, side, quantity, avg_price_cents, total_cost_cents) VALUES
  ('user-001', 'mkt-btc-100k-yes', 'yes', 20, 60, 1200),
  ('user-002', 'mkt-btc-100k-yes', 'no', 15, 40, 600),
  ('user-001', 'mkt-fed-cut-may', 'yes', 50, 45, 2250),
  ('user-003', 'mkt-senate-dem', 'yes', 100, 41, 4100),
  ('user-002', 'mkt-gpt5-jul', 'no', 30, 65, 1950),
  ('user-003', 'mkt-apple-llm', 'yes', 25, 68, 1700)
ON CONFLICT (user_id, market_id, side) DO NOTHING;

COMMIT;
