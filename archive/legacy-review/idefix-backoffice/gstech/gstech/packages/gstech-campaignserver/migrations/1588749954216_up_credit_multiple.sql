alter table reward_rules drop column "creditMultiple";
alter table campaigns add column "creditMultiple" boolean not null default false;

alter table credited_rewards add column "campaignId" int not null references campaigns;

drop index credited_rewards_player_id_reward_rules_id;
create unique index credited_rewards_player_id_campaign_id
on credited_rewards ("playerId", "campaignId") where "creditMultiple" is false;
