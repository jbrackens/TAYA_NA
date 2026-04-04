INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk") VALUES (34, 'WebPay', 't', 'f', 'f', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries") VALUES (45, 'Directa24', 't', 'f', 34, 't', 100, 'f');

INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk") VALUES (35, 'MercadoPago', 't', 'f', 'f', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries") VALUES (46, 'Directa24', 't', 'f', 35, 't', 100, 'f');

INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk") VALUES (36, 'ChileBankWD', 't', 'f', 'f', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries") VALUES (47, 'Directa24', 't', 't', 36, 't', 100, 'f');
