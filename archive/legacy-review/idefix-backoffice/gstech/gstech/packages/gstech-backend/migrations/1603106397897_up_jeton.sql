insert into payment_methods ("id", "name", "requireVerification", "highRisk") values (23, 'JetonWallet', false, false);
insert into payment_providers ("id", "name", "paymentMethodId", "deposits", "withdrawals") values (33, 'Jeton', 23, true, true);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (153, 23, 'LD', 'EUR', 2000, 200000, 3000, 300000);
