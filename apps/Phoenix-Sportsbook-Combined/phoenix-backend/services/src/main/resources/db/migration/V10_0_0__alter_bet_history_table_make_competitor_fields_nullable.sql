ALTER TABLE punter_bets_history
    ALTER COLUMN competitor_id DROP NOT NULL;

ALTER TABLE punter_bets_history
    ALTER COLUMN competitor_name DROP NOT NULL;
