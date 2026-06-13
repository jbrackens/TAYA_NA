CREATE TABLE IF NOT EXISTS feed_jobs (
  id UUID PRIMARY KEY,
  feed_key VARCHAR(128) NOT NULL,
  market_type VARCHAR(64) NOT NULL,
  schedule VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feed_key, market_type)
);

CREATE TABLE IF NOT EXISTS feed_events (
  id UUID PRIMARY KEY,
  feed_job_id UUID NOT NULL REFERENCES feed_jobs (id) ON DELETE CASCADE,
  source_event_id VARCHAR(160) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feed_job_id, source_event_id)
);

CREATE INDEX IF NOT EXISTS feed_events_feedjob_observed_idx
  ON feed_events (feed_job_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS ops_incidents (
  id UUID PRIMARY KEY,
  incident_key VARCHAR(128) NOT NULL UNIQUE,
  market_id UUID REFERENCES prediction_markets (id),
  severity VARCHAR(16) NOT NULL,
  status VARCHAR(32) NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ops_overrides (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES ops_incidents (id),
  market_id UUID REFERENCES prediction_markets (id),
  override_type VARCHAR(64) NOT NULL,
  override_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  performed_by VARCHAR(128) NOT NULL,
  reason TEXT NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ops_overrides_market_performed_idx
  ON ops_overrides (market_id, performed_at DESC);

CREATE TABLE IF NOT EXISTS audit_event_log (
  id UUID PRIMARY KEY,
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(160) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  sequence_no BIGINT NOT NULL,
  schema_version INT NOT NULL DEFAULT 1,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  emitted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aggregate_type, aggregate_id, sequence_no)
);

CREATE INDEX IF NOT EXISTS audit_event_log_event_type_idx
  ON audit_event_log (event_type);

CREATE TABLE IF NOT EXISTS replay_checkpoints (
  id UUID PRIMARY KEY,
  stream_name VARCHAR(128) NOT NULL,
  checkpoint_key VARCHAR(128) NOT NULL,
  last_sequence_no BIGINT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stream_name, checkpoint_key)
);
