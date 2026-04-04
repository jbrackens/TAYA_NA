ALTER TABLE wallet_transactions ADD COLUMN line_id bigserial NOT NULL;
ALTER TABLE wallet_transactions DROP CONSTRAINT wallet_transactions_pkey;
ALTER TABLE wallet_transactions ADD PRIMARY KEY (line_id);