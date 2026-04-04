INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk") VALUES (30, 'PagoEfectivo', 't', 'f', 'f', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries") VALUES (41, 'Directa24', 't', 't', 30, 't', 100, 'f');

INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk") VALUES (31, 'BCP', 't', 'f', 'f', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries") VALUES (42, 'Directa24', 't', 't', 31, 't', 100, 'f');
