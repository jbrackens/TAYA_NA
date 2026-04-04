INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk")
VALUES (39, 'Brite', 't', 't', 't', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries")
VALUES (50, 'Brite', 't', 't', 39, 't', 100, 'f');
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal")
VALUES (50, 'LD', 'EUR', 1000, 200000, 3000, 300000);
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId")
VALUES ('LD', 50, 'EUR');
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId")
VALUES ('LD', 50, 'FI');
