CREATE TABLE reporting_bet_events (
    event_id character varying NOT NULL PRIMARY KEY,
    event jsonb NOT NULL,
    created_at timestamptz NOT NULL
);

CREATE INDEX "index_reporting_bet_events_created_at" ON reporting_bet_events (created_at);