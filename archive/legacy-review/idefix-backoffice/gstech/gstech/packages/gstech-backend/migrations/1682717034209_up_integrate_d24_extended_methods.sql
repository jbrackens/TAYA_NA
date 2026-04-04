
--- Brazil Bank
WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('BrazilBank', 'f', 't', 'f', 'f')
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'Directa24', 't', 'f', id, 't', 100, 'f'
  FROM ins_payment_method
  RETURNING id
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, 'BRL'
FROM ins_payment_provider
UNION ALL
SELECT 'LD', id, 'USD'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'BrazilBank'
  LIMIT 1
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT 'LD', id, 'BR'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'BrazilBank'
  LIMIT 1
),
currency_limits AS (
  SELECT * FROM (VALUES
    ('BRL', 2500, 500000, 0, 0),
    ('USD', 500, 100000, 0, 0)
  ) AS t(currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal)
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal
FROM ins_payment_provider, currency_limits;


--- Brazil Voucher
WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('BrazilVoucher', 'f', 't', 'f', 'f')
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'Directa24', 't', 'f', id, 't', 100, 'f'
  FROM ins_payment_method
  RETURNING id
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, 'BRL'
FROM ins_payment_provider
UNION ALL
SELECT 'LD', id, 'USD'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'BrazilVoucher'
  LIMIT 1
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT 'LD', id, 'BR'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'BrazilVoucher'
  LIMIT 1
),
currency_limits AS (
  SELECT * FROM (VALUES
    ('BRL', 2500, 500000, 0, 0),
    ('USD', 500, 100000, 0, 0)
  ) AS t(currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal)
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal
FROM ins_payment_provider, currency_limits;

--- Chile Bank
INSERT INTO "countries" (
    "id",
    "brandId",
    "minimumAge",
    "registrationAllowed",
    "loginAllowed",
    "blocked",
    "riskProfile",
    "monthlyIncomeThreshold"
  )
VALUES ('CL', 'LD', 18, 't', 't', 'f', 'medium', 100000)
ON CONFLICT ("id", "brandId") DO NOTHING;
WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('ChileBank', 'f', 't', 'f', 'f')
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'Directa24', 't', 'f', id, 't', 100, 'f'
  FROM ins_payment_method
  RETURNING id
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, 'CLP'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'ChileBank'
  LIMIT 1
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT 'LD', id, 'CL'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'ChileBank'
  LIMIT 1
),
currency_limits AS (
  SELECT * FROM (VALUES
    ('CLP', 900000, 600000000, 0, 0)
  ) AS t(currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal)
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal
FROM ins_payment_provider, currency_limits;

--- Chile Voucher
WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('ChileVoucher', 'f', 't', 'f', 'f')
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'Directa24', 't', 'f', id, 't', 100, 'f'
  FROM ins_payment_method
  RETURNING id
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, 'CLP'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'ChileVoucher'
  LIMIT 1
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT 'LD', id, 'CL'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'ChileVoucher'
  LIMIT 1
),
currency_limits AS (
  SELECT * FROM (VALUES
    ('CLP', 900000, 600000000, 0, 0)
  ) AS t(currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal)
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal
FROM ins_payment_provider, currency_limits;

--- Peru Bank
INSERT INTO "countries" (
    "id",
    "brandId",
    "minimumAge",
    "registrationAllowed",
    "loginAllowed",
    "blocked",
    "riskProfile",
    "monthlyIncomeThreshold"
  )
VALUES ('PE', 'LD', 18, 't', 't', 'f', 'medium', 50000)
ON CONFLICT ("id", "brandId") DO NOTHING;

WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('PeruBank', 'f', 't', 'f', 'f')
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'Directa24', 't', 'f', id, 't', 100, 'f'
  FROM ins_payment_method
  RETURNING id
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, 'PEN'
FROM ins_payment_provider
UNION ALL
SELECT 'LD', id, 'USD'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'PeruBank'
  LIMIT 1
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT 'LD', id, 'PE'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'PeruBank'
  LIMIT 1
),
currency_limits AS (
  SELECT * FROM (VALUES
    ('PEN', 2000, 300000, 0, 0),
    ('USD', 1000, 100000, 0, 0)
  ) AS t(currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal)
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal
FROM ins_payment_provider, currency_limits;


--- Peru Voucher
WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('PeruVoucher', 'f', 't', 'f', 'f')
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'Directa24', 't', 'f', id, 't', 100, 'f'
  FROM ins_payment_method
  RETURNING id
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, 'PEN'
FROM ins_payment_provider
UNION ALL
SELECT 'LD', id, 'USD'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'PeruVoucher'
  LIMIT 1
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT 'LD', id, 'PE'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'PeruVoucher'
  LIMIT 1
),
currency_limits AS (
  SELECT * FROM (VALUES
    ('PEN', 2000, 300000, 0, 0),
    ('USD', 1000, 100000, 0, 0)
  ) AS t(currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal)
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal
FROM ins_payment_provider, currency_limits;

--- Peru TuPay
WITH ins_payment_method AS (
  INSERT INTO payment_methods ("name", "active", "requireVerification", "allowAutoVerification", "highRisk")
  VALUES ('TuPay', 'f', 't', 'f', 'f')
  RETURNING id
),
ins_payment_provider AS (
  INSERT INTO payment_providers ("name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
  SELECT 'Directa24', 't', 'f', id, 't', 100, 'f'
  FROM ins_payment_method
  RETURNING id
)
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
SELECT 'LD', id, 'PEN'
FROM ins_payment_provider
UNION ALL
SELECT 'LD', id, 'USD'
FROM ins_payment_provider;
WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'TuPay'
  LIMIT 1
)
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
SELECT 'LD', id, 'PE'
FROM ins_payment_provider;

WITH ins_payment_provider AS (
  SELECT payment_providers.id
  FROM payment_providers
  JOIN payment_methods ON payment_methods.id = payment_providers."paymentMethodId"
  WHERE payment_methods.name = 'TuPay'
  LIMIT 1
),
currency_limits AS (
  SELECT * FROM (VALUES
    ('PEN', 2000, 300000, 0, 0),
    ('USD', 1000, 100000, 0, 0)
  ) AS t(currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal)
)
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
SELECT id, 'LD', currency, min_deposit, max_deposit, min_withdrawal, max_withdrawal
FROM ins_payment_provider, currency_limits;