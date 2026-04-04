create table promotions (
  "id" serial primary key,
  "brandId" char(2) not null references brands,
  "name" varchar(50) not null,
  "multiplier" int not null default 100,
  "autoStart" boolean not null,
  "archived" boolean not null default false,
  "active" boolean not null default true,
  "allGames" boolean not null default true,
  "calculateRounds" boolean not null default false,
  "minimumContribution" numeric(12,0) not null default 0,
  unique("brandId", "name")
);
SELECT setval('promotions_id_seq', 100);

create table promotion_games (
  "promotionId" int not null references promotions,
  "gameId" int not null references games,
  unique("promotionId", "gameId")
);

create type player_counter_type as enum('deposit_wager', 'promotion', 'deposit_amount', 'bet', 'loss');

create table player_counters (
  "id" serial primary key,
  "playerId" int not null references players on delete cascade,
  "promotionId" int references promotions on delete cascade,
  "paymentId" int references payments,
  "limitId" int references player_limits,
  "limit" numeric(15,0) default 0 check ("limit" >= 0 or "limit" is null),
  "amount" numeric(15,0) not null default 0,
  "active" boolean not null default true,
  "type" player_counter_type not null,
  "date" int,
  "month" int,
  "week" int,
  "createdAt" timestamptz not null default now(),
  constraint "player_counter_type_limitId_for_deposit_amount" check ("type" <> 'deposit_amount' or "limitId" is not null),
  constraint "player_counter_type_limitId_for_bet" check ("type" <> 'bet' or "limitId" is not null),
  constraint "player_counter_type_limitId_for_loss" check ("type" <> 'loss' or "limitId" is not null),

  constraint "player_counter_type_limit_deposit_amount_greater_than_zero" check ("type" <> 'deposit_amount' or "limit" > 0),
  constraint "player_counter_type_promotion_requires_promotionId" check ("type" <> 'promotion' or "promotionId" is not null),
  constraint "player_counter_type_wager_requires_paymentId" check ("type" <> 'deposit_wager' or "paymentId" is not null),
  constraint "player_counter_type_limit_bet_greater_than_zero" check ("type" <> 'bet' or "limit" > 0),
  unique("playerId", "limitId", "type", "month", "week", "date")
);
create unique index player_counter_promotionId_uniq_key on player_counters("playerId", "promotionId") where "promotionId" is not null;
create unique index player_counter_paymentId_uniq_key on player_counters("playerId", "paymentId") where "paymentId" is not null;
create unique index player_counter_limitId_uniq_key on player_counters("playerId", "limitId", "date", "month", "week") where "limitId" is not null;
create index player_counters_player_id_active_idx on player_counters("playerId", "active", "type");
create index player_counters_player_idx on player_counters("playerId");
create index player_counters_active_idx on player_counters("active");
create index player_counters_promotionId_idx on player_counters("promotionId");
SELECT setval('player_counters_id_seq', 1000000);
