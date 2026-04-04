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

create type payment_type as enum ('deposit', 'withdraw', 'compensation', 'correction');
create type payment_status as enum('created', 'pending', 'accepted', 'processing', 'complete', 'settled', 'failed', 'expired', 'cancelled');

-- gstech.payments
create table "Transactions" (
	-- id
  "TransactionID" bigserial primary key,
	-- playerId
  "PlayerID" int not null references "Customers" on delete cascade,
	-- timestamp
  "TransactionDate" timestamptz not null default now(),
	-- paymentType
  "TransactionType" payment_type not null,
	-- amount
  "TransactionAmount" numeric(15,0) not null default 0 check ("TransactionType" = 'correction' or "TransactionAmount" >= 0),
	--? is this accessible?
	"Platform" text,
	-- status
  "Status" payment_status not null default 'created',
	-- updatedAt
	"LastUpdated" timestamptz not null default now()
);

comment on column "Transactions"."TransactionID" is 'Unique transaction identifier';
comment on column "Transactions"."PlayerID" is 'Unique player identifier';
comment on column "Transactions"."TransactionDate" is 'Transaction date';
comment on column "Transactions"."TransactionType" is 'Transaction type (e.g. Deposit, Withdrawal, Bonus)';
comment on column "Transactions"."TransactionAmount" is 'Monetary value of the transaction Platform s tring The platform which the transaction made from (e.g. Web, Mobile, Download)';
comment on column "Transactions"."Status" is 'Transaction status (e.g. Approved, Rejected, Pending)';
comment on column "Transactions"."LastUpdated" is 'Date when the record was last modified or added (Mandatory in case of DB to DB connections)';