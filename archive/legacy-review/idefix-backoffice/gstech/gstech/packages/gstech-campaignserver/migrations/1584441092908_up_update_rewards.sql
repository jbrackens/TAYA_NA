alter table reward_rules add column "quantity" int not null default 1;
alter table reward_rules rename column "creditOnce" to "creditMultiple";

alter table credited_rewards rename column "creditOnce" to "creditMultiple";

drop index credited_rewards_player_id_reward_rules_id;
create unique index credited_rewards_player_id_reward_rules_id
on credited_rewards ("playerId", "rewardRulesId") where "creditMultiple" is false;
