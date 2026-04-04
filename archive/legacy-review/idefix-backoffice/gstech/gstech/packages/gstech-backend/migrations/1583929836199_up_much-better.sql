INSERT INTO payment_methods (id, name, active, "requireVerification", "allowAutoVerification", "highRisk") VALUES (21, 'MuchBetter', true, false, false, false);
INSERT INTO payment_providers (id, name, deposits, withdrawals, "paymentMethodId", active) VALUES (30, 'MuchBetter', true, false, 21, true);

INSERT INTO payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") VALUES (148, 21, 'LD', 'EUR', 0, 1000000, 0, 10000000);
INSERT INTO payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") VALUES (149, 21, 'CJ', 'EUR', 0, 1000000, 0, 10000000);
INSERT INTO payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") VALUES (150, 21, 'KK', 'EUR', 0, 1000000, 0, 10000000);
INSERT INTO payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") VALUES (151, 21, 'OS', 'EUR', 0, 1000000, 0, 10000000);
