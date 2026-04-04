ALTER TABLE wallet_transactions
    ADD COLUMN reservation_id character varying;

ALTER TABLE wallet_transactions
    ADD COLUMN external_id character varying;

ALTER TABLE wallet_transactions
    ADD COLUMN payment_method character varying;

