ALTER TABLE reporting_bets ADD COLUMN initial_settlement_data timestamptz NULL;
UPDATE reporting_bets set initial_settlement_data = closed_at;