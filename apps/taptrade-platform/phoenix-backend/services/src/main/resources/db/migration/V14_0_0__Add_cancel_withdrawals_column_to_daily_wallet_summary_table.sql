ALTER TABLE reporting_punter_daily_wallet_summary
    RENAME COLUMN withdrawals TO confirmed_withdrawals;

ALTER TABLE reporting_punter_daily_wallet_summary
    ADD COLUMN cancelled_withdrawals DECIMAL NOT NULL DEFAULT 0;