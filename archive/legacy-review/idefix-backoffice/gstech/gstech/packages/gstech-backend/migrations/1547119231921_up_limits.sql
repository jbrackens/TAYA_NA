create type player_limit_type as enum('exclusion', 'deposit_amount', 'bet', 'loss', 'session_length');
create type player_limit_period_type as enum('monthly', 'weekly', 'daily');

create table player_limits (
  "id" serial primary key,
  "exclusionKey" uuid not null,
  "type" player_limit_type not null,
  "periodType" player_limit_period_type,
  "limitValue" int,
  "createdAt" timestamptz not null default now(),
  "playerId" int not null references players on delete cascade,
  "active" boolean not null default true,
  "expires" timestamptz,
  "cancelled" timestamptz,
  "permanent" boolean not null default false,
  "reason" text not null,
  "userId" int references users on delete cascade,
  "cancelUserId" int references users on delete cascade,
  constraint "permanentHasNoExpireDate" check (("expires" is null and "permanent" is true) or ("expires" is not null and "permanent" is false)),
  constraint "cancelled_has_timestamp" check ("active" = true or "cancelled" is not null),
  constraint "periodType_null_for_exclusion" check ("type" <> 'exclusion' or "periodType" is null),
  constraint "periodType_required_for_deposit_amount_limit" check ("type" <> 'deposit_amount' or "periodType" is not null),
  constraint "periodType_required_for_bet_limit" check ("type" <> 'bet' or "periodType" is not null),
  constraint "periodType_required_for_loss_limit" check ("type" <> 'loss' or "periodType" is not null),
  constraint "periodType_not_allowed_for_session_length_limit" check ("type" <> 'session_length' or "periodType" is null),
  constraint "periodType_not_allowed_for_exclusion_limit" check ("type" <> 'exclusion' or "periodType" is null),
  constraint "limitValue_required_for_deposit_amount_limit" check ("type" <> 'deposit_amount' or "limitValue" > 0),
  constraint "limitValue_required_for_bet_limit" check ("type" <> 'bet' or "limitValue" > 0),
  constraint "limitValue_required_for_loss_limit" check ("type" <> 'loss' or "limitValue" > 0),
  constraint "limitValue_required_for_session_length_limit" check ("type" <> 'session_length' or "limitValue" > 0),
  unique("exclusionKey")
);
SELECT setval('player_limits_id_seq', 1000000);
create index "player_limits_playerId" on player_limits("playerId");
