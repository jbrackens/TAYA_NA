INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk") VALUES (37, 'D24Visa', 't', 'f', 'f', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries") VALUES (48, 'Directa24', 't', 'f', 37, 't', 100, 'f');

INSERT INTO payment_methods ("id", "name", "active", "requireVerification", "allowAutoVerification", "highRisk") VALUES (38, 'D24MasterCard', 't', 'f', 'f', 'f');
INSERT INTO payment_providers ("id", "name", "deposits", "withdrawals", "paymentMethodId", "active", "priority", "blockCountries") VALUES (49, 'Directa24', 't', 'f', 38, 't', 100, 'f');
