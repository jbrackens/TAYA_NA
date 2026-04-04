insert into payment_methods ("id", "name", "requireVerification", "highRisk") values (24, 'JetonGO', false, false);
insert into payment_providers ("id", "name", "paymentMethodId", "deposits", "withdrawals") values (34, 'Jeton', 24, true, true);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (154, 24, 'LD', 'EUR', 2000, 200000, 3000, 300000);
