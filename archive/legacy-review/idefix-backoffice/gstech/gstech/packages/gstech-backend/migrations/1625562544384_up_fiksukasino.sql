INSERT INTO brands ("id", "name") VALUES ('FK', 'Fiksu');

INSERT INTO languages ("id", "brandId") VALUES ('fi', 'FK');
INSERT INTO languages ("id", "brandId") VALUES ('en', 'FK');

INSERT INTO currencies ("brandId", "id") VALUES ('FK', 'EUR');
INSERT INTO countries VALUES ('FI', 'FK', 18, true, true, false, 'low', NULL);

INSERT INTO payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") VALUES (155, 15, 'FK', 'EUR', 2000, 1000000, 2500, 10000000);
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") VALUES (20, 'FK', 'EUR', 2000, 200000, 3000, 300000);
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('FK', 20, 'EUR');
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('FK', 20, 'FI');
