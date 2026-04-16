CREATE TABLE reporting_wallet_transactions (
    transaction_id character varying NOT NULL PRIMARY KEY,
    punter_id character varying NOT NULL,
    amount decimal NOT NULL,
    transaction_type character varying NOT NULL,
    started_at timestamptz NOT NULL,
    closed_at timestamptz NULL
);

CREATE INDEX "index_started_at" ON reporting_wallet_transactions USING btree (started_at);
CREATE INDEX "index_closed_at" ON reporting_wallet_transactions USING btree (closed_at);