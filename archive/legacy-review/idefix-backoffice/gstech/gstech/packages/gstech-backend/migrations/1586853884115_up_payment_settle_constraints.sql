BEGIN;
ALTER TABLE payments DROP CONSTRAINT "accountIdForCompletePayment";
ALTER TABLE payments DROP CONSTRAINT "paymentProviderIdForAcceptedWithdrawal";
ALTER TABLE payments DROP CONSTRAINT "transactionIdForDeposit";
ALTER TABLE payments DROP CONSTRAINT "indexOfDeposit";

ALTER TABLE payments ADD CONSTRAINT "accountIdForCompletePayment" check("accountId" is not null or (status <> 'settled' and status <> 'complete' and status <> 'pending') or ("paymentType" <> 'withdraw' and "paymentType" <> 'deposit'));
ALTER TABLE payments ADD CONSTRAINT "paymentProviderIdForAcceptedWithdrawal" check("paymentType" <> 'withdraw' or "paymentProviderId" is not null or (status <> 'accepted' and status <> 'settled' and status <> 'complete' and status <> 'processing'));
ALTER TABLE payments ADD CONSTRAINT "transactionIdForDeposit" check("paymentType" <> 'deposit' or "transactionId" is not null or (status <> 'accepted' and status <> 'settled' and status <> 'complete'));
ALTER TABLE payments ADD CONSTRAINT "indexOfDeposit" check("index" is not null or ("paymentType" <> 'deposit' or (status <> 'settled' and status <> 'complete' and status <> 'pending')));

COMMIT;
