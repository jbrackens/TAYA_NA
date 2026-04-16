-- Prediction Platform — Development Seed Data
-- Run after 014_prediction_schema.sql creates the schema (which also seeds categories).
-- This script is idempotent via ON CONFLICT clauses.
--
-- Deterministic UUIDs are generated via md5(slug)::uuid so seeds can be re-run
-- and the same slug always maps to the same UUID — great for integration tests.

BEGIN;

-- ============================================================
-- TEST USERS (punters table uses VARCHAR ids, matching sportsbook schema)
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
  ('wallet-001', 'user-001', 100000, 0, 'USD'),
  ('wallet-002', 'user-002', 50000, 0, 'USD'),
  ('wallet-003', 'user-003', 250000, 0, 'USD'),
  ('wallet-bot', 'user-bot', 1000000, 0, 'USD')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SERIES (recurring event templates)
-- Category lookup inlined via SELECT to avoid hardcoding UUIDs.
-- ============================================================
INSERT INTO prediction_series (id, slug, title, description, category_id, frequency, tags) VALUES
  (md5('series-btc-daily')::uuid,
   'btc-daily-close',
   'Bitcoin Daily Close',
   'Daily markets on whether BTC closes above key price levels',
   (SELECT id FROM prediction_categories WHERE slug = 'crypto'),
   'daily',
   ARRAY['bitcoin', 'crypto', 'daily']),

  (md5('series-fed-rates')::uuid,
   'fed-rate-decisions',
   'Federal Reserve Rate Decisions',
   'Markets on Federal Reserve interest rate decisions at each FOMC meeting',
   (SELECT id FROM prediction_categories WHERE slug = 'economics'),
   'monthly',
   ARRAY['fed', 'rates', 'fomc', 'economics']),

  (md5('series-us-elections')::uuid,
   'us-elections-2026',
   'US 2026 Midterm Elections',
   'Markets on US midterm election outcomes',
   (SELECT id FROM prediction_categories WHERE slug = 'politics'),
   'one-off',
   ARRAY['elections', 'us', 'politics', 'midterms']),

  (md5('series-ai-milestones')::uuid,
   'ai-milestones-2026',
   'AI Milestones 2026',
   'Markets on major AI achievements and releases',
   (SELECT id FROM prediction_categories WHERE slug = 'tech'),
   'one-off',
   ARRAY['ai', 'tech', 'milestones']),

  (md5('series-champions-league')::uuid,
   'ucl-2025-26',
   'UEFA Champions League 2025/26',
   'Markets on Champions League match outcomes and tournament winner',
   (SELECT id FROM prediction_categories WHERE slug = 'sports'),
   'weekly',
   ARRAY['football', 'ucl', 'champions-league']),

  (md5('series-box-office')::uuid,
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
  (md5('evt-btc-100k')::uuid, md5('series-btc-daily')::uuid,
   'Bitcoin Above $100K — April 30',
   'Will Bitcoin (BTC/USD) trade above $100,000 at any point before April 30, 2026 midnight UTC?',
   (SELECT id FROM prediction_categories WHERE slug = 'crypto'),
   'open', true, NOW(), NOW() + INTERVAL '14 days',
   '{"asset": "bitcoin", "threshold": 100000}'),

  (md5('evt-eth-5k')::uuid, md5('series-btc-daily')::uuid,
   'Ethereum Above $5K — May 2026',
   'Will Ethereum (ETH/USD) exceed $5,000 before June 1, 2026?',
   (SELECT id FROM prediction_categories WHERE slug = 'crypto'),
   'open', false, NOW(), NOW() + INTERVAL '45 days',
   '{"asset": "ethereum", "threshold": 5000}'),

  (md5('evt-sol-300')::uuid, md5('series-btc-daily')::uuid,
   'Solana Above $300 — Q2 2026',
   'Will Solana (SOL/USD) trade above $300 before July 1, 2026?',
   (SELECT id FROM prediction_categories WHERE slug = 'crypto'),
   'open', false, NOW(), NOW() + INTERVAL '75 days',
   '{"asset": "solana", "threshold": 300}')
ON CONFLICT (id) DO NOTHING;

-- Economics events
INSERT INTO prediction_events (id, series_id, title, description, category_id, status, featured, open_at, close_at, metadata) VALUES
  (md5('evt-fed-may')::uuid, md5('series-fed-rates')::uuid,
   'May 2026 FOMC Decision',
   'What will the Federal Reserve do with interest rates at the May 2026 FOMC meeting?',
   (SELECT id FROM prediction_categories WHERE slug = 'economics'),
   'open', true, NOW(), '2026-05-07 18:00:00+00',
   '{"meeting_date": "2026-05-07", "current_rate": 4.50}'),

  (md5('evt-us-recession')::uuid, md5('series-fed-rates')::uuid,
   'US Recession by End of 2026',
   'Will the NBER declare a US recession beginning before January 1, 2027?',
   (SELECT id FROM prediction_categories WHERE slug = 'economics'),
   'open', false, NOW(), '2026-12-31 23:59:59+00',
   '{"indicator": "nber_recession_declaration"}')
ON CONFLICT (id) DO NOTHING;

-- Politics events
INSERT INTO prediction_events (id, series_id, title, description, category_id, status, featured, open_at, close_at, metadata) VALUES
  (md5('evt-senate-control')::uuid, md5('series-us-elections')::uuid,
   '2026 US Senate Control',
   'Which party will control the US Senate after the 2026 midterm elections?',
   (SELECT id FROM prediction_categories WHERE slug = 'politics'),
   'open', true, NOW(), '2026-11-03 23:59:59+00',
   '{"election_date": "2026-11-03", "chamber": "senate"}'),

  (md5('evt-house-control')::uuid, md5('series-us-elections')::uuid,
   '2026 US House Control',
   'Which party will control the US House after the 2026 midterms?',
   (SELECT id FROM prediction_categories WHERE slug = 'politics'),
   'open', false, NOW(), '2026-11-03 23:59:59+00',
   '{"election_date": "2026-11-03", "chamber": "house"}')
ON CONFLICT (id) DO NOTHING;

-- Tech events
INSERT INTO prediction_events (id, series_id, title, description, category_id, status, featured, open_at, close_at, metadata) VALUES
  (md5('evt-gpt5-release')::uuid, md5('series-ai-milestones')::uuid,
   'GPT-5 Released Before July 2026',
   'Will OpenAI release GPT-5 (or equivalent next-gen model) before July 1, 2026?',
   (SELECT id FROM prediction_categories WHERE slug = 'tech'),
   'open', true, NOW(), '2026-07-01 00:00:00+00',
   '{"company": "openai", "product": "gpt-5"}'),

  (md5('evt-apple-ai')::uuid, md5('series-ai-milestones')::uuid,
   'Apple Ships On-Device LLM in 2026',
   'Will Apple ship a large language model running fully on-device in an iOS/macOS update in 2026?',
   (SELECT id FROM prediction_categories WHERE slug = 'tech'),
   'open', false, NOW(), '2026-12-31 23:59:59+00',
   '{"company": "apple", "feature": "on-device-llm"}')
ON CONFLICT (id) DO NOTHING;

-- Sports events
INSERT INTO prediction_events (id, series_id, title, description, category_id, status, featured, open_at, close_at, metadata) VALUES
  (md5('evt-ucl-winner')::uuid, md5('series-champions-league')::uuid,
   'Champions League 2025/26 Winner',
   'Which club will win the 2025/26 UEFA Champions League?',
   (SELECT id FROM prediction_categories WHERE slug = 'sports'),
   'open', false, NOW(), '2026-05-30 20:00:00+00',
   '{"competition": "ucl", "season": "2025-26"}')
ON CONFLICT (id) DO NOTHING;

-- Entertainment events
INSERT INTO prediction_events (id, series_id, title, description, category_id, status, featured, open_at, close_at, metadata) VALUES
  (md5('evt-avatar3-box-office')::uuid, md5('series-box-office')::uuid,
   'Avatar 3 Opening Weekend > $200M',
   'Will Avatar 3: Fire and Ash gross over $200M in its domestic opening weekend?',
   (SELECT id FROM prediction_categories WHERE slug = 'entertainment'),
   'open', false, NOW(), '2026-12-19 23:59:59+00',
   '{"movie": "avatar-3", "threshold_millions": 200}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- MARKETS (binary contracts within events)
-- ============================================================

-- Crypto
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  (md5('mkt-btc-100k-yes')::uuid, md5('evt-btc-100k')::uuid,
   'BTC-100K-APR26', 'Bitcoin above $100K by April 30',
   'Resolves YES if BTC/USD trades at or above $100,000 on any major exchange before April 30, 2026 23:59 UTC.',
   'open', 62, 38, 200, 50000,
   'api-feed-crypto', 'price_above', '{"asset": "bitcoin", "threshold": 100000}',
   NOW() + INTERVAL '14 days', 1245000, 890000),

  (md5('mkt-eth-5k-yes')::uuid, md5('evt-eth-5k')::uuid,
   'ETH-5K-MAY26', 'Ethereum above $5K by June 1',
   'Resolves YES if ETH/USD trades at or above $5,000 before June 1, 2026.',
   'open', 28, 72, 150, 30000,
   'api-feed-crypto', 'price_above', '{"asset": "ethereum", "threshold": 5000}',
   NOW() + INTERVAL '45 days', 567000, 340000),

  (md5('mkt-sol-300-yes')::uuid, md5('evt-sol-300')::uuid,
   'SOL-300-Q2', 'Solana above $300 by Q2 end',
   'Resolves YES if SOL/USD trades at or above $300 before July 1, 2026.',
   'open', 15, 85, 100, 20000,
   'api-feed-crypto', 'price_above', '{"asset": "solana", "threshold": 300}',
   NOW() + INTERVAL '75 days', 234000, 156000)
ON CONFLICT (id) DO NOTHING;

-- Economics
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  (md5('mkt-fed-cut-may')::uuid, md5('evt-fed-may')::uuid,
   'FED-CUT-MAY26', 'Fed cuts rates at May FOMC',
   'Resolves YES if the Federal Reserve reduces the federal funds rate at the May 6-7, 2026 FOMC meeting.',
   'open', 45, 55, 250, 75000,
   'admin-manual', 'binary_outcome', '{"meeting": "2026-05-07"}',
   '2026-05-07 18:00:00+00', 2340000, 1560000),

  (md5('mkt-fed-hold-may')::uuid, md5('evt-fed-may')::uuid,
   'FED-HOLD-MAY26', 'Fed holds rates at May FOMC',
   'Resolves YES if the Federal Reserve keeps rates unchanged at the May 2026 FOMC meeting.',
   'open', 48, 52, 250, 75000,
   'admin-manual', 'binary_outcome', '{"meeting": "2026-05-07"}',
   '2026-05-07 18:00:00+00', 1890000, 1200000),

  (md5('mkt-us-recession')::uuid, md5('evt-us-recession')::uuid,
   'US-RECESSION-2026', 'US recession declared by end of 2026',
   'Resolves YES if NBER officially declares a recession that began before January 1, 2027.',
   'open', 22, 78, 200, 40000,
   'admin-manual', 'binary_outcome', '{}',
   '2026-12-31 23:59:59+00', 890000, 450000)
ON CONFLICT (id) DO NOTHING;

-- Politics
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  (md5('mkt-senate-dem')::uuid, md5('evt-senate-control')::uuid,
   'SENATE-DEM-2026', 'Democrats control Senate after 2026 midterms',
   'Resolves YES if the Democratic Party holds a majority (or 50 seats + VP tiebreaker) in the US Senate after the 2026 midterms.',
   'open', 41, 59, 300, 100000,
   'admin-manual', 'binary_outcome', '{"party": "democrat", "chamber": "senate"}',
   '2026-11-03 23:59:59+00', 4560000, 3200000),

  (md5('mkt-senate-gop')::uuid, md5('evt-senate-control')::uuid,
   'SENATE-GOP-2026', 'Republicans control Senate after 2026 midterms',
   'Resolves YES if the Republican Party holds 51+ seats in the US Senate after the 2026 midterms.',
   'open', 59, 41, 300, 100000,
   'admin-manual', 'binary_outcome', '{"party": "republican", "chamber": "senate"}',
   '2026-11-03 23:59:59+00', 4120000, 2900000),

  (md5('mkt-house-dem')::uuid, md5('evt-house-control')::uuid,
   'HOUSE-DEM-2026', 'Democrats win House majority in 2026',
   'Resolves YES if Democrats win 218+ seats in the US House of Representatives in the 2026 midterms.',
   'open', 52, 48, 300, 100000,
   'admin-manual', 'binary_outcome', '{"party": "democrat", "chamber": "house"}',
   '2026-11-03 23:59:59+00', 3450000, 2100000)
ON CONFLICT (id) DO NOTHING;

-- Tech
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  (md5('mkt-gpt5-jul')::uuid, md5('evt-gpt5-release')::uuid,
   'GPT5-JUL26', 'GPT-5 released before July 2026',
   'Resolves YES if OpenAI publicly releases a model marketed as GPT-5 (or equivalent successor) before July 1, 2026.',
   'open', 35, 65, 200, 50000,
   'admin-manual', 'binary_outcome', '{"company": "openai"}',
   '2026-07-01 00:00:00+00', 1780000, 1100000),

  (md5('mkt-apple-llm')::uuid, md5('evt-apple-ai')::uuid,
   'APPLE-LLM-2026', 'Apple ships on-device LLM in 2026',
   'Resolves YES if Apple includes a large language model running fully on-device in any iOS or macOS release in calendar year 2026.',
   'open', 68, 32, 150, 30000,
   'admin-manual', 'binary_outcome', '{"company": "apple"}',
   '2026-12-31 23:59:59+00', 920000, 670000)
ON CONFLICT (id) DO NOTHING;

-- Sports (multi-outcome decomposed to binary)
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  (md5('mkt-ucl-real')::uuid, md5('evt-ucl-winner')::uuid,
   'UCL-REAL-2526', 'Real Madrid wins Champions League 2025/26',
   'Resolves YES if Real Madrid wins the 2025/26 UEFA Champions League final.',
   'open', 22, 78, 150, 25000,
   'admin-manual', 'binary_outcome', '{"club": "real-madrid"}',
   '2026-05-30 20:00:00+00', 780000, 450000),

  (md5('mkt-ucl-city')::uuid, md5('evt-ucl-winner')::uuid,
   'UCL-CITY-2526', 'Manchester City wins Champions League 2025/26',
   'Resolves YES if Manchester City wins the 2025/26 UEFA Champions League final.',
   'open', 18, 82, 150, 25000,
   'admin-manual', 'binary_outcome', '{"club": "manchester-city"}',
   '2026-05-30 20:00:00+00', 650000, 380000),

  (md5('mkt-ucl-barca')::uuid, md5('evt-ucl-winner')::uuid,
   'UCL-BARCA-2526', 'Barcelona wins Champions League 2025/26',
   'Resolves YES if Barcelona wins the 2025/26 UEFA Champions League final.',
   'open', 14, 86, 150, 25000,
   'admin-manual', 'binary_outcome', '{"club": "barcelona"}',
   '2026-05-30 20:00:00+00', 520000, 290000)
ON CONFLICT (id) DO NOTHING;

-- Entertainment
INSERT INTO prediction_markets (id, event_id, ticker, title, description, status,
  yes_price_cents, no_price_cents, amm_liquidity_param, amm_subsidy_cents,
  settlement_source_key, settlement_rule, settlement_params, close_at,
  volume_cents, open_interest_cents) VALUES

  (md5('mkt-avatar3-200m')::uuid, md5('evt-avatar3-box-office')::uuid,
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
WHERE NOT EXISTS (
  SELECT 1 FROM prediction_lifecycle_events le
  WHERE le.market_id = prediction_markets.id AND le.event_type = 'created'
);

INSERT INTO prediction_lifecycle_events (market_id, event_type, actor_type, reason, occurred_at)
SELECT id, 'opened', 'system', 'seed data — auto-opened', NOW() - INTERVAL '30 minutes'
FROM prediction_markets
WHERE status = 'open'
AND NOT EXISTS (
  SELECT 1 FROM prediction_lifecycle_events le
  WHERE le.market_id = prediction_markets.id AND le.event_type = 'opened'
);

-- ============================================================
-- SAMPLE TRADES (give markets some activity history)
-- ============================================================
INSERT INTO prediction_orders (id, user_id, market_id, side, action, order_type,
  price_cents, quantity, filled_quantity, remaining_quantity, total_cost_cents,
  status, filled_at, created_at, updated_at) VALUES
  (md5('ord-001')::uuid, 'user-001', md5('mkt-btc-100k-yes')::uuid, 'yes', 'buy', 'market', 60, 20, 20, 0, 1200, 'filled', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  (md5('ord-002')::uuid, 'user-002', md5('mkt-btc-100k-yes')::uuid, 'no', 'buy', 'market', 40, 15, 15, 0, 600, 'filled', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '90 minutes'),
  (md5('ord-003')::uuid, 'user-001', md5('mkt-fed-cut-may')::uuid, 'yes', 'buy', 'market', 45, 50, 50, 0, 2250, 'filled', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
  (md5('ord-004')::uuid, 'user-003', md5('mkt-senate-dem')::uuid, 'yes', 'buy', 'market', 41, 100, 100, 0, 4100, 'filled', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes'),
  (md5('ord-005')::uuid, 'user-002', md5('mkt-gpt5-jul')::uuid, 'no', 'buy', 'market', 65, 30, 30, 0, 1950, 'filled', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
  (md5('ord-006')::uuid, 'user-003', md5('mkt-apple-llm')::uuid, 'yes', 'buy', 'market', 68, 25, 25, 0, 1700, 'filled', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prediction_trades (id, market_id, buy_order_id, buyer_id, side, price_cents, quantity, fee_cents, is_amm_trade, traded_at) VALUES
  (md5('trd-001')::uuid, md5('mkt-btc-100k-yes')::uuid, md5('ord-001')::uuid, 'user-001', 'yes', 60, 20, 0, true, NOW() - INTERVAL '2 hours'),
  (md5('trd-002')::uuid, md5('mkt-btc-100k-yes')::uuid, md5('ord-002')::uuid, 'user-002', 'no', 40, 15, 0, true, NOW() - INTERVAL '90 minutes'),
  (md5('trd-003')::uuid, md5('mkt-fed-cut-may')::uuid, md5('ord-003')::uuid, 'user-001', 'yes', 45, 50, 0, true, NOW() - INTERVAL '1 hour'),
  (md5('trd-004')::uuid, md5('mkt-senate-dem')::uuid, md5('ord-004')::uuid, 'user-003', 'yes', 41, 100, 0, true, NOW() - INTERVAL '45 minutes'),
  (md5('trd-005')::uuid, md5('mkt-gpt5-jul')::uuid, md5('ord-005')::uuid, 'user-002', 'no', 65, 30, 0, true, NOW() - INTERVAL '30 minutes'),
  (md5('trd-006')::uuid, md5('mkt-apple-llm')::uuid, md5('ord-006')::uuid, 'user-003', 'yes', 68, 25, 0, true, NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prediction_positions (user_id, market_id, side, quantity, avg_price_cents, total_cost_cents) VALUES
  ('user-001', md5('mkt-btc-100k-yes')::uuid, 'yes', 20, 60, 1200),
  ('user-002', md5('mkt-btc-100k-yes')::uuid, 'no', 15, 40, 600),
  ('user-001', md5('mkt-fed-cut-may')::uuid, 'yes', 50, 45, 2250),
  ('user-003', md5('mkt-senate-dem')::uuid, 'yes', 100, 41, 4100),
  ('user-002', md5('mkt-gpt5-jul')::uuid, 'no', 30, 65, 1950),
  ('user-003', md5('mkt-apple-llm')::uuid, 'yes', 25, 68, 1700)
ON CONFLICT (user_id, market_id, side) DO NOTHING;

COMMIT;
