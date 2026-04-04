alter table payment_method_limits add column "maxPendingDeposits" numeric(12,0);
update payment_method_limits set "maxPendingDeposits"=200000 where "paymentMethodId"=1 and "currencyId"='EUR';