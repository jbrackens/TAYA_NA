create table reward_rules (
  "id" serial primary key,
  "campaignId" int not null references campaigns,

  "trigger" varchar(30) not null,
  "creditOnce" boolean not null default false,
  "minDeposit" int null,
  "maxDeposit" int null,
  "reward" varchar(255) not null,
  "wager" int not null
);

create table credited_rewards (
  "id" serial primary key,
  "playerId" int not null references players,
  "rewardRulesId" int not null references reward_rules,

  "creditOnce" boolean not null default false  -- Duplicated field from reward_rules for indexing
);

create unique index credited_rewards_player_id_reward_rules_id
on credited_rewards ("playerId", "rewardRulesId") where "creditOnce" is true;
