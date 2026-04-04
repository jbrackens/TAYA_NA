create type reward_type as enum ('bounty', 'wheelSpin', 'coin', 'reward', 'shopItem');
create type credit_type as enum ('freeSpins', 'real', 'bonus', 'depositBonus', 'physical', 'wheelSpin', 'coin');
create type brand_id as enum ('KK', 'CJ', 'LD', 'OS');

create table reward_definitions (
  "id" serial primary key,
  "rewardType" reward_type not null,
  "brandId" brand_id not null,
  "promotion" varchar(255) null,

  unique ("rewardType", "brandId")
);

create table rewards (
  "id" serial primary key,
  "rewardDefinitionId" int not null references reward_definitions,
  "parentRewardId" int null references rewards,

  "creditType" credit_type not null,
  "bonusCode" varchar(255) not null,
  "description" varchar(255) not null,

  "externalId" varchar(255) not null,
  "metadata" json null,

  "oncePerPlayer" boolean not null default false,

  unique ("externalId", "bonusCode")
);

create unique index rewards_4col_idx ON rewards ("parentRewardId", "externalId", "bonusCode", "rewardDefinitionId")
where "parentRewardId" is not null;

create unique index rewards_3col_idx ON rewards ("externalId", "bonusCode", "rewardDefinitionId")
where "parentRewardId" is null;

create table ledgers (
  "id" bigserial primary key,
  "rewardId" int not null references rewards,

  "playerId" int not null,
  "creditDate" timestamptz not null,
  "useDate" timestamptz null,

  "externalId" varchar(255) null
);

create table progresses (
  "id" bigserial primary key,
  "rewardDefinitionId" int not null references reward_definitions,

  "isCompleted" boolean not null default false,
  "perRewardDefinitionCount" int not null default 1,
  "playerId" int not null,
  "betCount" int not null default 0,
  "betAmount" int not null default 0,
  "winAmount" int not null default 0,
  "target" int not null,

  unique ("rewardDefinitionId", "perRewardDefinitionCount", "playerId")
);

create unique index progresses_2col_idx ON progresses ("rewardDefinitionId", "playerId") where "isCompleted" is not true;

create table progresses_rewards (
  "id" serial primary key,
  "progressId" int not null references progresses,
  "rewardId" int not null references rewards
);

create table progresses_ledgers (
  "id" serial primary key,
  "progressId" int not null references progresses,
  "ledgerId" int not null references ledgers
);

create table game_progresses (
  "id" bigserial primary key,
  "progressId" int not null references progresses,

  "gameId" varchar(255) not null,
  "betCount" int not null default 0,
  "betAmount" int not null default 0,
  "winAmount" int not null default 0,

  unique ("progressId", "gameId")
);
