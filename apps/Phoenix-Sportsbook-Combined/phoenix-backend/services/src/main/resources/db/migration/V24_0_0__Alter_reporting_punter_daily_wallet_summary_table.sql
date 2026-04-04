ALTER TABLE reporting_punter_daily_wallet_summary 
ADD COLUMN lifetime_deposits decimal NOT NULL DEFAULT 0,
ADD COLUMN lifetime_withdrawals decimal NOT NULL DEFAULT 0,
ADD COLUMN turnover decimal NOT NULL DEFAULT 0;