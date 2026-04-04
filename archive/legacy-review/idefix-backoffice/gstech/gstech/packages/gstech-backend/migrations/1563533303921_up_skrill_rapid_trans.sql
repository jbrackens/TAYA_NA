insert into payment_methods ("id", "name", "requireVerification", "highRisk") values (20, 'RapidTransfer', false, false);
insert into payment_providers ("id", "name", "paymentMethodId", "deposits", "withdrawals") values (28, 'Skrill', 20, true, true);

insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (136, 20, 'LD', 'EUR', 2000, 200000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (137, 20, 'CJ', 'EUR', 2500, 200000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (138, 20, 'LD', 'SEK', 20000, 2000000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (139, 20, 'CJ', 'SEK', 25000, 200000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (140, 20, 'LD', 'USD', 2000, 200000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (141, 20, 'CJ', 'USD', 2500, 200000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (142, 20, 'LD', 'GBP', 2000, 200000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (143, 20, 'CJ', 'GBP', 2500, 200000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (144, 20, 'LD', 'NOK', 20000, 2000000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (145, 20, 'CJ', 'NOK', 25000, 2000000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (146, 20, 'KK', 'EUR', 2000, 200000, 0, 0);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (147, 20, 'OS', 'NOK', 20000, 2000000, 0, 0);
