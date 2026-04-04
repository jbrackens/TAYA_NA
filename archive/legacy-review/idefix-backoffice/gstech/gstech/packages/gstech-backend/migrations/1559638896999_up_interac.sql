insert into payment_methods ("id", "name", "requireVerification", "highRisk") values (18, 'InteracOnline', false, false);
insert into payment_methods ("id", "name", "requireVerification", "highRisk") values (19, 'InteracETransfer', false, false);

insert into payment_providers ("id", "name", "paymentMethodId", "deposits", "withdrawals") values (26, 'Interac', 18, true, false);
insert into payment_providers ("id", "name", "paymentMethodId", "deposits", "withdrawals") values (27, 'Interac', 19, true, true);

insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (132, 18, 'LD', 'CAD', 2000, 200000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (133, 18, 'CJ', 'CAD', 2500, 250000, 0, 0);

insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (134, 19, 'LD', 'CAD', 2000, 200000, 3000, 300000);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (135, 19, 'CJ', 'CAD', 2500, 250000, 3000, 300000);
