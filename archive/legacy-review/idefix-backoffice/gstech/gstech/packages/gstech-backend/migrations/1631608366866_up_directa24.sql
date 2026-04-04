insert into payment_methods ("id", "name", "requireVerification", "highRisk") values (27, 'Directa24', false, false);
insert into payment_providers ("id", "name", "paymentMethodId", "deposits", "withdrawals", "blockCountries") values (38, 'Directa24', 27, true, true, false);
