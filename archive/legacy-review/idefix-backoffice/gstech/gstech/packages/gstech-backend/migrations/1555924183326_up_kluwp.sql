insert into payment_methods (id, name, active, "requireVerification", "allowAutoVerification", "highRisk") values (17, 'VisaVoucher', true, false, false, false);
insert into payment_providers (id, name, deposits, withdrawals, "paymentMethodId", active) values (24, 'Kluwp', true, false, 17, true);

insert into payment_method_limits ("paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (17, 'LD', 'EUR', 2000, 1000000, 2500, 10000000);
insert into payment_method_limits ("paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (17, 'CJ', 'EUR', 2500, 1000000, 2500, 10000000);
insert into payment_method_limits ("paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (17, 'KK', 'EUR', 2000, 1000000, 2500, 10000000);
insert into payment_method_limits ("paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (17, 'OS', 'EUR', 2000, 1000000, 2500, 10000000);
