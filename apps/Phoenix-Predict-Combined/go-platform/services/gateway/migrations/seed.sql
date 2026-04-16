-- Development seed data

-- Sports
INSERT INTO sports (id, key, name, active) VALUES
  ('sport-001', 'football', 'Football', true),
  ('sport-002', 'basketball', 'Basketball', true),
  ('sport-003', 'tennis', 'Tennis', true)
ON CONFLICT (id) DO NOTHING;

-- Tournaments
INSERT INTO tournaments (id, sport_id, key, name, country_code, active) VALUES
  ('tournament-001', 'sport-001', 'premier-league', 'Premier League', 'GB', true),
  ('tournament-002', 'sport-001', 'la-liga', 'La Liga', 'ES', true),
  ('tournament-003', 'sport-002', 'nba', 'NBA', 'US', true)
ON CONFLICT (id) DO NOTHING;

-- Sample Punters
INSERT INTO punters (id, email, username, password_hash, status, country_code, created_at, last_login_at) VALUES
  ('punter-001', 'alice@example.com', 'alice', '$2a$10$fakehash1', 'active', 'GB', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('punter-002', 'bob@example.com', 'bob', '$2a$10$fakehash2', 'active', 'GB', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  ('punter-003', 'charlie@example.com', 'charlie', '$2a$10$fakehash3', 'inactive', 'US', CURRENT_TIMESTAMP - INTERVAL '30 days', NULL)
ON CONFLICT (id) DO NOTHING;

-- Sample Fixtures
INSERT INTO fixtures (id, sport_key, league_key, season_key, event_key, tournament, home_team, away_team, status, starts_at) VALUES
  ('fixture-001', 'football', 'premier-league', '2025-2026', 'event-001', 'Premier League', 'Arsenal', 'Manchester United', 'scheduled', CURRENT_TIMESTAMP + INTERVAL '2 days'),
  ('fixture-002', 'football', 'premier-league', '2025-2026', 'event-002', 'Premier League', 'Liverpool', 'Chelsea', 'scheduled', CURRENT_TIMESTAMP + INTERVAL '3 days'),
  ('fixture-003', 'football', 'la-liga', '2025-2026', 'event-003', 'La Liga', 'Barcelona', 'Real Madrid', 'scheduled', CURRENT_TIMESTAMP + INTERVAL '5 days'),
  ('fixture-004', 'basketball', 'nba', '2025-2026', 'event-004', 'NBA', 'Lakers', 'Celtics', 'in_progress', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
  ('fixture-005', 'football', 'premier-league', '2025-2026', 'event-005', 'Premier League', 'Manchester City', 'Tottenham', 'completed', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Sample Markets
INSERT INTO markets (id, fixture_id, sport_key, league_key, event_key, name, status, starts_at, min_stake_cents, max_stake_cents) VALUES
  ('market-001', 'fixture-001', 'football', 'premier-league', 'event-001', 'Match Winner', 'open', CURRENT_TIMESTAMP + INTERVAL '2 days', 50, 100000),
  ('market-002', 'fixture-001', 'football', 'premier-league', 'event-001', 'Over/Under 2.5 Goals', 'open', CURRENT_TIMESTAMP + INTERVAL '2 days', 50, 100000),
  ('market-003', 'fixture-002', 'football', 'premier-league', 'event-002', 'Match Winner', 'open', CURRENT_TIMESTAMP + INTERVAL '3 days', 50, 100000),
  ('market-004', 'fixture-004', 'basketball', 'nba', 'event-004', 'Point Spread', 'open', CURRENT_TIMESTAMP - INTERVAL '1 hour', 50, 100000),
  ('market-005', 'fixture-005', 'football', 'premier-league', 'event-005', 'Match Winner', 'closed', CURRENT_TIMESTAMP - INTERVAL '1 day', 50, 100000)
ON CONFLICT (id) DO NOTHING;

-- Sample Selections
INSERT INTO selections (id, market_id, name, odds, active) VALUES
  ('selection-001', 'market-001', 'Arsenal Win', 1.95, true),
  ('selection-002', 'market-001', 'Draw', 3.50, true),
  ('selection-003', 'market-001', 'Manchester United Win', 4.10, true),
  ('selection-004', 'market-002', 'Over 2.5 Goals', 1.85, true),
  ('selection-005', 'market-002', 'Under 2.5 Goals', 2.05, true),
  ('selection-006', 'market-003', 'Liverpool Win', 1.65, true),
  ('selection-007', 'market-003', 'Draw', 4.00, true),
  ('selection-008', 'market-003', 'Chelsea Win', 5.50, true),
  ('selection-009', 'market-004', 'Lakers -5.5', 1.90, true),
  ('selection-010', 'market-004', 'Celtics +5.5', 1.90, true)
ON CONFLICT (id) DO NOTHING;

-- Sample Wallets
INSERT INTO wallets (id, punter_id, balance_cents, bonus_balance_cents, currency_code) VALUES
  ('wallet-001', 'punter-001', 500000, 50000, 'GBP'),
  ('wallet-002', 'punter-002', 250000, 0, 'GBP'),
  ('wallet-003', 'punter-003', 100000, 0, 'GBP')
ON CONFLICT (id) DO NOTHING;

-- Sample Bets
INSERT INTO bets (id, punter_id, selection_id, market_id, fixture_id, stake_cents, odds_taken, status, result, potential_payout_cents, actual_payout_cents, placed_at, settled_at) VALUES
  ('bet-001', 'punter-001', 'selection-001', 'market-001', 'fixture-001', 5000, 1.95, 'pending', NULL, 9750, NULL, CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL),
  ('bet-002', 'punter-001', 'selection-004', 'market-002', 'fixture-001', 3000, 1.85, 'pending', NULL, 5550, NULL, CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL),
  ('bet-003', 'punter-002', 'selection-006', 'market-003', 'fixture-002', 10000, 1.65, 'pending', NULL, 16500, NULL, CURRENT_TIMESTAMP - INTERVAL '30 minutes', NULL),
  ('bet-004', 'punter-001', 'selection-009', 'market-004', 'fixture-004', 7500, 1.90, 'pending', NULL, 14250, NULL, CURRENT_TIMESTAMP - INTERVAL '30 minutes', NULL),
  ('bet-005', 'punter-002', 'selection-003', 'market-005', 'fixture-005', 5000, 4.10, 'won', 'won', 20500, 20500, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Sample Ledger Entries
INSERT INTO ledger_entries (id, wallet_id, punter_id, transaction_type, amount_cents, bonus_amount_cents, balance_before_cents, balance_after_cents, reference_type, reference_id, description) VALUES
  ('ledger-001', 'wallet-001', 'punter-001', 'deposit', 500000, 0, 0, 500000, 'bank_transfer', 'transfer-001', 'Initial deposit'),
  ('ledger-002', 'wallet-001', 'punter-001', 'bonus', 0, 50000, 500000, 500000, 'promotion', 'promo-001', 'Welcome bonus'),
  ('ledger-003', 'wallet-001', 'punter-001', 'bet_placed', -5000, 0, 500000, 495000, 'bet', 'bet-001', 'Bet placed on Arsenal'),
  ('ledger-004', 'wallet-002', 'punter-002', 'deposit', 250000, 0, 0, 250000, 'bank_transfer', 'transfer-002', 'Initial deposit'),
  ('ledger-005', 'wallet-002', 'punter-002', 'bet_placed', -10000, 0, 250000, 240000, 'bet', 'bet-003', 'Bet placed on Liverpool'),
  ('ledger-006', 'wallet-002', 'punter-002', 'bet_settlement', 20500, 0, 240000, 260500, 'bet', 'bet-005', 'Bet won settlement')
ON CONFLICT (id) DO NOTHING;

-- Sample Free Bets
INSERT INTO freebets (id, punter_id, amount_cents, currency_code, status, issued_at, expires_at, used_at) VALUES
  ('freebet-001', 'punter-001', 50000, 'GBP', 'active', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP + INTERVAL '23 days', NULL),
  ('freebet-002', 'punter-002', 100000, 'GBP', 'active', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '27 days', NULL),
  ('freebet-003', 'punter-003', 50000, 'GBP', 'expired', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP - INTERVAL '10 days', NULL)
ON CONFLICT (id) DO NOTHING;

-- Sample Odds Boosts
INSERT INTO odds_boosts (id, market_id, selection_id, boost_percentage, original_odds, boosted_odds, status, active_from, active_until) VALUES
  ('boost-001', 'market-001', 'selection-001', 5.00, 1.95, 2.04, 'active', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '6 days'),
  ('boost-002', 'market-003', 'selection-006', 10.00, 1.65, 1.81, 'active', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP + INTERVAL '6 days'),
  ('boost-003', 'market-002', 'selection-004', 3.00, 1.85, 1.90, 'expired', CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Sample Match Timelines
INSERT INTO match_timelines (id, fixture_id, status, score_home, score_away, last_update) VALUES
  ('timeline-001', 'fixture-001', 'scheduled', 0, 0, NULL),
  ('timeline-002', 'fixture-002', 'scheduled', 0, 0, NULL),
  ('timeline-003', 'fixture-004', 'in_progress', 45, 42, CURRENT_TIMESTAMP),
  ('timeline-004', 'fixture-005', 'completed', 2, 1, CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Sample Incidents
INSERT INTO incidents (id, match_timeline_id, fixture_id, incident_type, minute, team, player_name, description) VALUES
  ('incident-001', 'timeline-004', 'fixture-005', 'goal', 23, 'Manchester City', 'Erling Haaland', 'Header into the net'),
  ('incident-002', 'timeline-004', 'fixture-005', 'yellow_card', 34, 'Tottenham', 'Son Heung-min', 'Tactical foul'),
  ('incident-003', 'timeline-004', 'fixture-005', 'goal', 67, 'Manchester City', 'Jack Grealish', 'Left foot finish'),
  ('incident-004', 'timeline-004', 'fixture-005', 'goal', 78, 'Tottenham', 'Harry Kane', 'Penalty conversion'),
  ('incident-005', 'timeline-003', 'fixture-004', 'three_pointer', 15, 'Lakers', 'LeBron James', '3-point shot')
ON CONFLICT (id) DO NOTHING;
