select setval('payment_methods_id_seq', (select max(id) from payment_methods));
select setval('payment_providers_id_seq', (select max(id) from payment_providers));

WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('Flykk', 'f', 't', 'f', 'f')
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'Flykk', 't', 'f', id, 't', 100, 'f'
  FROM ins_payment_method
  RETURNING id
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', 'EUR', 1000, 200000, 3000, 300000
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT id
  FROM payment_providers
  WHERE name = 'Flykk'
  ORDER BY ctid DESC
  LIMIT 1
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, 'EUR'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT id
  FROM payment_providers
  WHERE name = 'Flykk'
  ORDER BY ctid DESC
  LIMIT 1
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT 'LD', id, 'NO'
FROM ins_payment_provider;

WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('MobulaPay', 'f', 't', 'f', 'f')
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'MobulaPay', 't', 'f', id, 't', 100, 'f'
  FROM ins_payment_method
  RETURNING id
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, 'EUR'
FROM ins_payment_provider
UNION ALL
SELECT 'LD', id, 'NOK'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT id
  FROM payment_providers
  WHERE name = 'MobulaPay'
  ORDER BY ctid DESC
  LIMIT 1
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT 'LD', id, 'NO'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT id
  FROM payment_providers
  WHERE name = 'MobulaPay'
  ORDER BY ctid DESC
  LIMIT 1
),
currencies AS (
  SELECT unnest(ARRAY['EUR', 'NOK']) AS currency
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', currency, 1000, 200000, 3000, 300000
FROM ins_payment_provider, currencies;
