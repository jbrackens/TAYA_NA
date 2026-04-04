insert into base_currencies ("id", "symbol", "defaultConversion") values ('INR', '₹', 100);
INSERT INTO currencies ("id", "brandId", "isActive") VALUES ('INR', 'LD', false);

insert into conversion_rate_histories ("currencyId", "conversionRate") values ('INR', 100);
refresh materialized view conversion_rates;
refresh materialized view monthly_conversion_rates;

insert into payment_methods ("id", "name", "requireVerification", "highRisk") values (22, 'QPay', false, false);
insert into payment_providers ("id", "name", "paymentMethodId", "deposits", "withdrawals") values (32, 'QPay', 22, true, false);
insert into payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") values (152, 22, 'LD', 'INR', 100000, 1000000, 0, 0);
