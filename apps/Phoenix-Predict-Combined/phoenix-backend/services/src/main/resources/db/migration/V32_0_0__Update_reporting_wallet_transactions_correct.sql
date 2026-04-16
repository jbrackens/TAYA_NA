UPDATE reporting_wallet_transactions
SET transaction_reason = 'FUNDS_RESERVED_FOR_WITHDRAWAL'
WHERE started_at < NOW() - interval '24 hours' AND closed_at IS NULL
AND transaction_type = 'WITHDRAWAL';