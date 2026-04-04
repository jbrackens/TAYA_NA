CREATE UNIQUE index "payments_paymentProviderId_externalTransactionId_key" ON payments ("paymentProviderId", "externalTransactionId") WHERE "paymentProviderId" IS NOT null;

ALTER TABLE payments DROP CONSTRAINT "payments_paymentMethodId_externalTransactionId_key";
