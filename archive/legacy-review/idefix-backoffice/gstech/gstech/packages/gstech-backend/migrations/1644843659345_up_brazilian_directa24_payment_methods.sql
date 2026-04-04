UPDATE payment_methods SET "name" = 'Pix' WHERE "id" = 27;

INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk") VALUES (28, 'Boleto', 't', 'f', 'f', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries") VALUES (39, 'Directa24', 't', 't', 28, 't', 100, 'f');

INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk") VALUES (29, 'Itau', 't', 'f', 'f', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries") VALUES (40, 'Directa24', 't', 't', 29, 't', 100, 'f');
