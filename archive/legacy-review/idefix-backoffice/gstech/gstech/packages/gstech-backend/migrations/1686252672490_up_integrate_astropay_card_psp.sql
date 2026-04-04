WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('AstroPayCard', 'f', 't', 'f', 'f')
  ON CONFLICT ("name") DO NOTHING
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'AstroPayCard', 't', 't', id, 't', 100, 't'
  FROM ins_payment_method
  ON CONFLICT ("paymentMethodId", "name") DO NOTHING
  RETURNING id
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, currency
FROM ins_payment_provider, unnest(ARRAY['EUR', 'USD']) AS currency
ON CONFLICT ("brandId","paymentProviderId","currencyId") DO NOTHING;

WITH ins_payment_provider AS (
  SELECT id
  FROM payment_providers
  WHERE name = 'AstroPayCard'
  ORDER BY ctid DESC
  LIMIT 1
),
currency_limits AS (
  SELECT * FROM (VALUES
    ('EUR', 2000, 1000000, 2500, 1000000),
    ('USD', 2000, 1000000, 2500, 1000000)
  ) AS t(currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal)
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal
FROM ins_payment_provider, currency_limits
ON CONFLICT ("brandId", "paymentProviderId", "currencyId") DO NOTHING;


INSERT INTO countries ("id", "brandId", "minimumAge", "registrationAllowed", "loginAllowed", "blocked", "riskProfile", "monthlyIncomeThreshold")
VALUES
  ('US', 'OS', 18, 'f', 'f', 't', 'medium', 200000),
  ('US', 'FK', 18, 'f', 'f', 't', 'medium', 200000),
  ('US', 'SN', 18, 'f', 'f', 't', 'medium', 200000),
  ('US', 'VB', 18, 'f', 'f', 't', 'medium', 200000),
  ('IL', 'CJ', 18, 'f', 'f', 't', 'low', 200000),
  ('IL', 'FK', 18, 'f', 'f', 't', 'low', 200000),
  ('IL', 'KK', 18, 'f', 'f', 't', 'low', 200000),
  ('IL', 'LD', 18, 'f', 'f', 't', 'low', 200000),
  ('IL', 'OS', 18, 'f', 'f', 't', 'low', 200000),
  ('IL', 'SN', 18, 'f', 'f', 't', 'low', 200000),
  ('IL', 'VB', 18, 'f', 'f', 't', 'low', 200000)
ON CONFLICT ("id", "brandId") DO NOTHING;

WITH ins_payment_provider AS (
  SELECT id
  FROM payment_providers
  WHERE name = 'AstroPayCard'
  ORDER BY ctid DESC
  LIMIT 1
),
country_blocks AS (
  SELECT * FROM (VALUES
    ('LD', 'IL'),
    ('CJ', 'IL'),
    ('KK', 'IL'),
    ('OS', 'IL'),
    ('FK', 'IL'),
    ('SN', 'IL'),
    ('VB', 'IL'),
    ('LD', 'US'),
    ('CJ', 'US'),
    ('KK', 'US'),
    ('OS', 'US'),
    ('FK', 'US'),
    ('SN', 'US'),
    ('VB', 'US')
  ) AS t(brand_id, country_id)
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT brand_id, id, country_id
FROM ins_payment_provider, country_blocks
ON CONFLICT ("brandId", "paymentProviderId", "countryId") DO NOTHING;
