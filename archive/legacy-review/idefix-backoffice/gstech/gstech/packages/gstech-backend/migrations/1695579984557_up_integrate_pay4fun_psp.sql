WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('Pay4Fun', 'f', 't', 'f', 'f')
  ON CONFLICT ("name") DO NOTHING
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'Pay4Fun', 't', 't', id, 't', 100, 'f'
  FROM ins_payment_method
  ON CONFLICT ("paymentMethodId", "name") DO NOTHING
  RETURNING id
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, 'BRL'
FROM ins_payment_provider
ON CONFLICT ("brandId","paymentProviderId","currencyId") DO NOTHING;

WITH ins_payment_provider AS (
  SELECT id
  FROM payment_providers
  WHERE name = 'Pay4Fun'
  ORDER BY ctid DESC
  LIMIT 1
),
currency_limits AS (
  SELECT * FROM (VALUES
    ('BRL', 2500, 500000, 5000, 500000)
  ) AS t(currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal)
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal
FROM ins_payment_provider, currency_limits
ON CONFLICT ("brandId", "paymentProviderId", "currencyId") DO NOTHING;

INSERT INTO countries ("id", "brandId", "minimumAge", "registrationAllowed", "loginAllowed", "blocked", "riskProfile", "monthlyIncomeThreshold")
VALUES
  ('BR', 'KK', 18, 't', 't', 'f', 'medium', 50000),
  ('BR', 'SN', 18, 't', 't', 'f', 'medium', 50000),
  ('BR', 'VB', 18, 't', 't', 'f', 'medium', 50000)
ON CONFLICT ("id", "brandId") DO NOTHING;

WITH ins_payment_provider AS (
  SELECT id
  FROM payment_providers
  WHERE name = 'Pay4Fun'
  ORDER BY ctid DESC
  LIMIT 1
),
country_blocks AS (
  SELECT * FROM (VALUES
    ('CJ', 'BR'),
    ('LD', 'BR'),
    ('KK', 'BR'),
    ('SN', 'BR'),
    ('VB', 'BR')
  ) AS t(brand_id, country_id)
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT brand_id, id, country_id
FROM ins_payment_provider, country_blocks
ON CONFLICT ("brandId", "paymentProviderId", "countryId") DO NOTHING;
