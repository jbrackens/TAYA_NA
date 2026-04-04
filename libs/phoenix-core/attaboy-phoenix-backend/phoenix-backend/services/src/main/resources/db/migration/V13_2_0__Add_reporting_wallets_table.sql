CREATE TABLE reporting_punter_daily_wallet_summary (
    punter_id character varying NOT NULL,
    day timestamptz NOT NULL,
    deposits decimal NOT NULL,
    withdrawals decimal NOT NULL,
    initial_balance decimal NOT NULL,
    closing_balance decimal NOT NULL,
    PRIMARY KEY(punter_id, day)
);
