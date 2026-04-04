create type transaction_type as enum(
  'wallet_deposit', 'wallet_withdrawal', 'wallet_withdrawal_processed', 'wallet_correction', 'wallet_compensation', 'wallet_transaction_fee', 'wallet_transaction_fee_return',
  'bonus_credit', 'turn_bonus_to_real', 'bonus_forfeit', 'bonus_lost',
  'bet', 'win', 'win_jackpot', 'win_local_jackpot', 'win_freespins',
  'cancel_bet', 'cancel_win', 'wallet_cancel_withdrawal');

create table transactions (
  "id" bigserial not null,
  "timestamp" timestamptz not null,
  "playerId" bigint not null references players on delete cascade,
  "type" transaction_type not null,
  "amount" numeric(15,0) not null check (type = 'wallet_correction' or "amount" >= 0),
  "bonusAmount" numeric(15,0) not null check (type = 'wallet_correction' or "bonusAmount" >= 0),
  "balance" numeric(15,0) not null check ("balance" >= 0),
  "bonusBalance" numeric(15,0) not null check ("bonusBalance" >= 0),
  "reservedBalance" numeric(15,0) not null check ("reservedBalance" >= 0),
  "manufacturerId" varchar(3) references game_manufacturers,
  "externalTransactionId" varchar(200),
  "subTransactionId" smallint not null default 0,
  "targetTransactionId" bigint,
  "gameRoundId" bigint /* references game_rounds on delete cascade*/,
  "playerBonusId" bigint references player_bonuses on delete cascade
  ,constraint "wallet_deposit_externalTransactionId" check (type <> 'wallet_deposit' or "externalTransactionId" is not null)
  ,constraint "bet_externalTransactionId" check (type <> 'bet' or "externalTransactionId" is not null)
  ,constraint "win_externalTransactionId" check (type <> 'win' or "externalTransactionId" is not null)
  ,constraint "cancel_bet_externalTransactionId" check (type <> 'cancel_bet' or "externalTransactionId" is not null)
  ,constraint "cancel_win_externalTransactionId" check (type <> 'cancel_win' or "externalTransactionId" is not null)
  ,constraint "jackpot_externalTransactionId" check (type <> 'win_jackpot' or "externalTransactionId" is not null)
  ,constraint "freespins_externalTransactionId" check (type <> 'win_freespins' or "externalTransactionId" is not null)
  ,constraint "local_jackpot_externalTransactionId" check (type <> 'win_local_jackpot' or "externalTransactionId" is not null)
  ,constraint "bet_manufacturerId" check (type <> 'bet' or "manufacturerId" is not null)
  ,constraint "win_manufacturerId" check (type <> 'win' or "manufacturerId" is not null)
  ,constraint "cancel_bet_manufacturerId" check (type <> 'cancel_bet' or "manufacturerId" is not null)
  ,constraint "cancel_win_manufacturerId" check (type <> 'cancel_win' or "manufacturerId" is not null)
  ,constraint "bet_gameRoundId" check (type <> 'bet' or "gameRoundId" is not null)
  ,constraint "bonus_credit" check (type <> 'bonus_credit' or "playerBonusId" is not null or "externalTransactionId" = 'migrated')
  ,constraint "turn_bonus_to_real" check (type <> 'turn_bonus_to_real' or "playerBonusId" is not null or "externalTransactionId" = 'migrated')
  ,constraint "bonus_bet" check (type <> 'bet' or ("playerBonusId" is not null or "bonusAmount" = 0 or "externalTransactionId" = 'migrated'))
  ,constraint "bonus_win" check (type <> 'win' or ("playerBonusId" is not null or "bonusAmount" = 0 or "externalTransactionId" = 'migrated'))
  ,constraint "bonus_forfeit" check (type <> 'bonus_forfeit' or "playerBonusId" is not null or "externalTransactionId" = 'migrated')
  ,constraint "wallet_cancel_withdrawal_targetTransactionId" check (type <> 'wallet_cancel_withdrawal' or "targetTransactionId" is not null or "externalTransactionId" = 'migrated')
  ,constraint "cancel_bet_targetTransactionId" check (type <> 'cancel_bet' or "targetTransactionId" is not null)
  ,constraint "cancel_win_targetTransactionId" check (type <> 'cancel_win' or "targetTransactionId" is not null)
  ,PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);
create unique index "transactions_manufacturerId_externalTransactionId" on transactions("playerId", "manufacturerId", "externalTransactionId", "subTransactionId", timestamp) where "manufacturerId" is not null and "externalTransactionId" <> 'migrated';
create unique index "transactions_targetTransactionId_must_be_unique" on transactions("targetTransactionId", timestamp) where "targetTransactionId" is not null;
CREATE index "transactions_playerId_idx" on transactions("playerId");
CREATE index "transactions_playerId_date_idx" on transactions using btree ("playerId", date_trunc('day', "timestamp" at time zone 'Europe/Rome'));
CREATE index "transactions_gameRoundId_type_idx" ON transactions("gameRoundId","type");

SELECT partman.create_parent( p_parent_table => 'public.transactions',
  p_control => 'timestamp',
  p_type => 'native',
  p_interval => 'monthly');

SELECT setval('transactions_id_seq', 10000000000);

create table account_statements (
  "playerId" bigint not null references players on delete cascade,
  "month" timestamptz NOT null,
  "balance" numeric(15,0) not null default 0 check ("balance" >= 0),
  "bonusBalance" numeric(15,0) not null default 0 check ("bonusBalance" >= 0),
  "reservedBalance" numeric(15,0) not null default 0 check ("reservedBalance" >= 0),
  PRIMARY KEY ("playerId", month)
) PARTITION BY RANGE (month);

CREATE UNIQUE index "account_statement_pkey" ON account_statements("playerId", month);

SELECT partman.create_parent( p_parent_table => 'public.account_statements',
  p_control => 'month',
  p_type => 'native',
  p_interval => 'monthly');
