ALTER TABLE punter_bets_history
    DROP COLUMN cancelled_at;

ALTER TABLE punter_bets_history
    ADD COLUMN voided_at timestamptz NULL;
