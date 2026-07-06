CREATE TABLE IF NOT EXISTS prediction_instruments (
  id UUID PRIMARY KEY,
  instrument_type VARCHAR(32) NOT NULL,
  symbol VARCHAR(64) NOT NULL,
  source VARCHAR(128) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (instrument_type, symbol)
);

CREATE TABLE IF NOT EXISTS prediction_market_templates (
  id UUID PRIMARY KEY,
  template_key VARCHAR(128) NOT NULL UNIQUE,
  market_type VARCHAR(64) NOT NULL,
  resolution_rule VARCHAR(128) NOT NULL,
  settlement_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prediction_markets (
  id UUID PRIMARY KEY,
  market_key VARCHAR(160) NOT NULL UNIQUE,
  market_type VARCHAR(64) NOT NULL,
  template_id UUID REFERENCES prediction_market_templates (id),
  instrument_id UUID REFERENCES prediction_instruments (id),
  status VARCHAR(32) NOT NULL,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  resolves_at TIMESTAMPTZ NOT NULL,
  settlement_source_key VARCHAR(128) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prediction_markets_status_idx ON prediction_markets (status);
CREATE INDEX IF NOT EXISTS prediction_markets_resolves_at_idx ON prediction_markets (resolves_at);

CREATE TABLE IF NOT EXISTS prediction_outcomes (
  id UUID PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES prediction_markets (id) ON DELETE CASCADE,
  outcome_key VARCHAR(64) NOT NULL,
  display_name VARCHAR(256) NOT NULL,
  outcome_index INT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (market_id, outcome_key),
  UNIQUE (market_id, outcome_index)
);

CREATE TABLE IF NOT EXISTS prediction_orders (
  id UUID PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES prediction_markets (id),
  outcome_id UUID REFERENCES prediction_outcomes (id),
  account_id VARCHAR(128) NOT NULL,
  client_order_id VARCHAR(128) NOT NULL,
  side VARCHAR(8) NOT NULL,
  order_type VARCHAR(16) NOT NULL,
  quantity NUMERIC(24, 8) NOT NULL,
  limit_price NUMERIC(24, 8),
  status VARCHAR(32) NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, client_order_id)
);

CREATE INDEX IF NOT EXISTS prediction_orders_market_status_idx
  ON prediction_orders (market_id, status);

CREATE TABLE IF NOT EXISTS prediction_trades (
  id UUID PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES prediction_markets (id),
  outcome_id UUID REFERENCES prediction_outcomes (id),
  taker_order_id UUID NOT NULL REFERENCES prediction_orders (id),
  maker_order_id UUID NOT NULL REFERENCES prediction_orders (id),
  price NUMERIC(24, 8) NOT NULL,
  quantity NUMERIC(24, 8) NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prediction_trades_market_executed_idx
  ON prediction_trades (market_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS prediction_positions (
  id UUID PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES prediction_markets (id),
  outcome_id UUID REFERENCES prediction_outcomes (id),
  account_id VARCHAR(128) NOT NULL,
  net_quantity NUMERIC(24, 8) NOT NULL DEFAULT 0,
  avg_price NUMERIC(24, 8),
  realized_pnl NUMERIC(24, 8) NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC(24, 8) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (market_id, outcome_id, account_id)
);
