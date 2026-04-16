ALTER TABLE reporting_punter_daily_wallet_summary 
ADD COLUMN adjustments decimal;

UPDATE reporting_punter_daily_wallet_summary
SET adjustments = 0;

ALTER TABLE reporting_punter_daily_wallet_summary 
ALTER COLUMN adjustments SET NOT NULL;