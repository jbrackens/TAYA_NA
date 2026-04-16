CREATE TABLE IF NOT EXISTS prediction_settlement_sources (
  id UUID PRIMARY KEY,
  source_key VARCHAR(128) NOT NULL UNIQUE,
  source_type VARCHAR(64) NOT NULL,
  source_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prediction_settlement_events (
  id UUID PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES prediction_markets (id),
  source_id UUID NOT NULL REFERENCES prediction_settlement_sources (id),
  external_event_id VARCHAR(160) NOT NULL,
  settlement_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, external_event_id)
);

CREATE INDEX IF NOT EXISTS prediction_settlement_events_market_observed_idx
  ON prediction_settlement_events (market_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS prediction_settlements (
  id UUID PRIMARY KEY,
  market_id UUID NOT NULL UNIQUE REFERENCES prediction_markets (id),
  settlement_event_id UUID REFERENCES prediction_settlement_events (id),
  winning_outcome_id UUID REFERENCES prediction_outcomes (id),
  status VARCHAR(32) NOT NULL,
  settled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prediction_payouts (
  id UUID PRIMARY KEY,
  settlement_id UUID NOT NULL REFERENCES prediction_settlements (id),
  account_id VARCHAR(128) NOT NULL,
  amount NUMERIC(24, 8) NOT NULL,
  currency VARCHAR(16) NOT NULL,
  state VARCHAR(32) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prediction_payouts_settlement_idx
  ON prediction_payouts (settlement_id);

CREATE TABLE IF NOT EXISTS bot_accounts (
  id UUID PRIMARY KEY,
  account_key VARCHAR(128) NOT NULL UNIQUE,
  display_name VARCHAR(256) NOT NULL,
  status VARCHAR(32) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_api_keys (
  id UUID PRIMARY KEY,
  bot_account_id UUID NOT NULL REFERENCES bot_accounts (id) ON DELETE CASCADE,
  key_id VARCHAR(128) NOT NULL UNIQUE,
  key_hash VARCHAR(512) NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  status VARCHAR(32) NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bot_api_keys_account_status_idx
  ON bot_api_keys (bot_account_id, status);

CREATE TABLE IF NOT EXISTS bot_nonces (
  id UUID PRIMARY KEY,
  bot_account_id UUID NOT NULL REFERENCES bot_accounts (id) ON DELETE CASCADE,
  nonce VARCHAR(160) NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bot_account_id, nonce)
);

CREATE TABLE IF NOT EXISTS bot_rate_limit_tiers (
  id UUID PRIMARY KEY,
  tier_key VARCHAR(64) NOT NULL UNIQUE,
  requests_per_minute INT NOT NULL,
  burst_limit INT NOT NULL,
  stream_connections INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_account_tiers (
  bot_account_id UUID PRIMARY KEY REFERENCES bot_accounts (id) ON DELETE CASCADE,
  rate_limit_tier_id UUID NOT NULL REFERENCES bot_rate_limit_tiers (id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
