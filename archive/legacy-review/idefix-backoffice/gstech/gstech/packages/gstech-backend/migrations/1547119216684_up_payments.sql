create type payment_type as enum ('deposit', 'withdraw', 'compensation', 'correction');
create type payment_status as enum('created', 'pending', 'accepted', 'processing', 'complete', 'failed', 'expired', 'cancelled');

/*
States:

for deposits:
 - created, deposit created but not completed in the payment system
 - pending, deposit successful but not settled. Money credited to player account but withdrawals not possible.
 - accepted, not possible in deposits.
 - processing, not possible in deposits.
 - complete, money settled. Money credited to player account, transactionId not null
 - failed, deposit failed. Payment system rejected the deposit (with message)
 - expired, deposit was in pending state, but expired and money was never settled
 - cancelled, player cancelled the deposit from payment system

 for withdrawals:
 - created, not possible. Withdrawals always go to pending state on creation.
 - pending, Withdrawal was created and money debited from the player account, transactionId not null
 - accepted, Withdrawal was accepted but is not yet processed by payment system. paymentProviderId is required from this point
 - processing, withdrawal has been passed to the payment system. can go to complete or failed from this state.
 - complete, Withdrawal has been successfully passed to the payment system. reserved balance removed. externalTransactionId required.
 - failed, Withdrawal was accepted but payment failed
 - expired, not possible?
 - cancelled, withdrawal was requested and cancelled (by player or user). Reserved money credited back to player account. transactionId not null

*/

create table payments (
  "id" serial primary key,
  "timestamp" timestamptz not null default now(),
  "playerId" int not null references players on delete cascade,
  "index" int,
  "transactionKey" varchar(80) not null,
  "transactionId" bigint /* references transactions */,
  "status" payment_status not null default 'created',
  "amount" numeric(15,0) not null default 0 check ("paymentType" = 'correction' or "amount" >= 0),
  "paymentType" payment_type not null,
  "externalTransactionId" varchar(200),
  "paymentMethodId" int references payment_methods check ("paymentType" = 'correction' or "paymentType" = 'compensation' or "paymentMethodId" is not null),
  "paymentProviderId" int references payment_providers,
  "accountId" int references accounts on delete cascade,
  "bonusId" int references bonuses,
  "playerBonusId" int references player_bonuses on delete cascade,
  "parameters" jsonb,
  "paymentFee" numeric(10, 0),
  unique("transactionKey"),
  unique("paymentMethodId", "externalTransactionId"),
  constraint "accountIdForCompletePayment" check("accountId" is not null or (status <> 'complete' and status <> 'pending') or ("paymentType" <> 'withdraw' and "paymentType" <> 'deposit')),
  constraint "paymentProviderIdForAcceptedWithdrawal" check("paymentType" <> 'withdraw' or "paymentProviderId" is not null or (status <> 'accepted' and status <> 'complete' and status <> 'processing')),
  constraint "transactionIdForWithdrawal" check("paymentType" <> 'withdraw' or "transactionId" is not null),
  constraint "transactionIdForDeposit" check("paymentType" <> 'deposit' or "transactionId" is not null or (status <> 'accepted' and status <> 'complete')),
  constraint "paymentProviderIdForDeposit" check("paymentProviderId" is not null or "paymentType" <> 'deposit'),
  constraint "accountIdForWithdrawal" check("accountId" is not null or ("paymentType" <> 'withdraw')),
  constraint "indexOfDeposit" check("index" is not null or ("paymentType" <> 'deposit' or (status <> 'complete' and status <> 'pending')))
);
SELECT setval('payments_id_seq', 100000000);

create table payment_event_logs (
  "id" serial primary key,
  "paymentId" int not null references payments on delete cascade,
  "userId" int references users,
  "timestamp" timestamptz not null default now(),
  "status" payment_status not null default 'created',
  "transactionId" bigint /* references transactions */,
  "message" text,
  "rawTransaction" jsonb
);
