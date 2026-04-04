ALTER TABLE bets
    ADD COLUMN bet_status character varying NOT NULL;

CREATE
INDEX "index_bet_status" ON bets USING btree (bet_status);

ALTER TABLE punter_bets_history
    ADD COLUMN cancelled_at timestamptz NULL;