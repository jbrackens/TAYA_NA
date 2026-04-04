insert into payment_providers (id, name, deposits, withdrawals, "paymentMethodId", active) values (21, 'Mifinity', false, true, 4, true);
insert into payment_providers (id, name, deposits, withdrawals, "paymentMethodId", active) values (22, 'Euteller', true, true, 1, true);
insert into payment_methods (id, name, active, "requireVerification", "allowAutoVerification", "highRisk") values (16, 'Siirto', true, true, false, false);
insert into payment_providers (id, name, deposits, withdrawals, "paymentMethodId", active) values (23, 'Euteller', true, true, 16, true);
insert into payment_method_limits ("brandId", "paymentMethodId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values ('LD', 16, 'EUR', 2000, 2000000, 2500, 2000000);
