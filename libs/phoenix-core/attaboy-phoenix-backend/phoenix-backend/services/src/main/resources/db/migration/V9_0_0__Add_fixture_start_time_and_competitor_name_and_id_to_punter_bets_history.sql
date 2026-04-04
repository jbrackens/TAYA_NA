ALTER TABLE punter_bets_history
    ADD COLUMN fixture_start_time timestamptz NOT NULL;

ALTER TABLE punter_bets_history
    ADD COLUMN competitor_id character varying NOT NULL;

ALTER TABLE punter_bets_history
    ADD COLUMN competitor_name character varying NOT NULL;