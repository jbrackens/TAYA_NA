
CREATE TABLE wallet_transactions(
    transaction_id character varying NOT NULL PRIMARY KEY,
    wallet_id character varying NOT NULL,
    bet_id character varying,
    reason character varying NOT NULL,
    amount jsonb NOT NULL,
    created_at timestamptz NOT NULL,
    pre_balance jsonb NOT NULL,
    post_balance jsonb NOT NULL
);

CREATE INDEX "index_walletId" ON wallet_transactions USING btree (wallet_id);