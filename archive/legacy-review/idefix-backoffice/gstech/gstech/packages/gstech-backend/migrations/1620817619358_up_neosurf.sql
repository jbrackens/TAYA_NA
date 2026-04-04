insert into payment_methods ("id", "name", "requireVerification", "highRisk") values (25, 'Neosurf', false, false);
insert into payment_providers ("id", "name", "paymentMethodId", "deposits", "withdrawals") values (36, 'Neosurf', 25, true, true);
insert into payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (36, 'LD', 'EUR', 2000, 200000, 3000, 300000);
insert into payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 36, 'EUR');
