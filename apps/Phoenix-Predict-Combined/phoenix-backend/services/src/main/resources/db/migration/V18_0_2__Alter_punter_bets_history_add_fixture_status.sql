ALTER TABLE punter_bets_history
    ADD COLUMN fixture_status character varying NOT NULL DEFAULT 'Unknown';
