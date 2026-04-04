create table bonuses (
  "id" serial primary key,
  "name" varchar(40) not null,
  "description" text,
  "brandId" char(2) not null references brands,
  "archived" boolean not null default false,
  "active" boolean not null default true,
  "depositBonus" boolean not null default false,
  "depositCount" int check ("depositCount" >= 0),
  "depositCountMatch" boolean check ("depositCount" is null or "depositCountMatch" is not null),
  "wageringRequirementMultiplier" numeric(15) not null check ("wageringRequirementMultiplier" >= 0),
  "daysUntilExpiration" numeric(15) not null default 60 check ("daysUntilExpiration" > 0),
  "depositMatchPercentage" numeric(5) check ("depositMatchPercentage" >= 0),
  "creditOnce" boolean not null default true,
  constraint "depositBonusHasDepositMatchPercentage" check(("depositMatchPercentage" is not null) or "depositBonus" = false)
);
create unique index bonuses_name_unique_idx on bonuses("brandId", "name") where active = true;

SELECT setval('bonuses_id_seq', 1000);
create table bonus_limits (
  "bonusId" int not null references bonuses on delete cascade,
  "currencyId" char(3) not null references base_currencies,
  "minAmount" numeric(15) not null,
  "maxAmount" numeric(15) not null,
  unique("bonusId", "currencyId")
);

create type player_bonus_status as enum('available', 'active', 'completed', 'expired', 'forfeited');

create table player_bonuses (
  "id" serial primary key,
  "bonusId" serial not null references bonuses on delete cascade,
  "playerId" serial not null references players on delete cascade,
  "status" player_bonus_status not null default 'active',
  "balance" numeric(15,0) not null default 0 check ("balance" >= 0),
  "initialBalance" numeric(15,0) default 0 check ("initialBalance" > 0 or status = 'available'),
  "wageringRequirement" numeric(15,0) not null default 0 check ("wageringRequirement" >= 0 or status = 'available'),
  "wagered" numeric(15,0) not null default 0 check ("wagered" >= 0),
  "expiryDate" timestamptz,
  "creditUserId" int references users,
  "forfeitUserId" int references users,
  "createdAt" timestamptz not null default now(),
  "completedAt" timestamptz,
  constraint "nonActiveBonusMustHaveCompletionTimestamp" check(status = 'available' or status = 'active' or "completedAt" is not null)
);
SELECT setval('player_bonuses_id_seq', 10000000);
create unique index "player_bonuses_one_instance_available_per_bonusId" on player_bonuses("playerId", "bonusId") where status='available';
