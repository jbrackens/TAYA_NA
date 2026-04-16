ALTER TABLE wallet_transactions
    ALTER COLUMN payment_method TYPE jsonb
    USING payment_method::jsonb;