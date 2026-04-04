WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('ISX', 't', 't', 'f', 'f')
  ON CONFLICT ("name") DO NOTHING
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'ISX', 'f', 't', id, 't', 100, 'f'
  FROM ins_payment_method
  ON CONFLICT ("paymentMethodId", "name") DO NOTHING
  RETURNING id
),
currency_limits AS (
  SELECT * FROM (VALUES
    ('EUR', 0, 0, 3000, 300000),
    ('NOK', 0, 0, 25000, 2000000)
  ) AS t(currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal)
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal
FROM ins_payment_provider, currency_limits
ON CONFLICT ("brandId", "paymentProviderId", "currencyId") DO NOTHING;

WITH ins_payment_provider AS (
  SELECT id
  FROM payment_providers
  WHERE name = 'ISX'
  ORDER BY ctid DESC
  LIMIT 1
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, 'EUR'
FROM ins_payment_provider
UNION ALL
SELECT 'LD', id, 'NOK'
FROM ins_payment_provider
ON CONFLICT ("brandId","paymentProviderId","currencyId") DO NOTHING;

WITH ins_payment_provider AS (
  SELECT id
  FROM payment_providers
  WHERE name = 'ISX'
  ORDER BY ctid DESC
  LIMIT 1
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT 'LD', id, 'NO'
FROM ins_payment_provider
ON CONFLICT ("brandId", "paymentProviderId", "countryId") DO NOTHING;
