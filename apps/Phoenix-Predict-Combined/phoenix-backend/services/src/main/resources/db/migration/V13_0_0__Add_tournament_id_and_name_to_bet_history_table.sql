ALTER TABLE punter_bets_history
    ADD COLUMN tournament_id character varying NOT NULL;

ALTER TABLE punter_bets_history
    ADD COLUMN tournament_name character varying NOT NULL;