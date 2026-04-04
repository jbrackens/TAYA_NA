INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk") VALUES (32, 'BrazilBankWD', 't', 'f', 'f', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries") VALUES (43, 'Directa24', 't', 't', 32, 't', 100, 'f');

INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk") VALUES (33, 'PeruBankWD', 't', 'f', 'f', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries") VALUES (44, 'Directa24', 't', 't', 33, 't', 100, 'f');
