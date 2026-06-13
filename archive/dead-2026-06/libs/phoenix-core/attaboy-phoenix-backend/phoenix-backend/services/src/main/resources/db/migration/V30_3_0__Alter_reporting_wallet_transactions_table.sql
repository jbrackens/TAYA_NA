ALTER TABLE reporting_wallet_transactions 
ADD COLUMN transaction_reason character varying,
ADD COLUMN backoffice_user_id character varying,
ADD COLUMN details character varying;

UPDATE reporting_wallet_transactions
SET transaction_reason = '';

ALTER TABLE reporting_wallet_transactions 
ALTER COLUMN transaction_reason SET NOT NULL;