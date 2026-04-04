alter table reward_rules rename reward to "rewardId";
alter table reward_rules alter column "rewardId" set data type int using "rewardId"::integer;
alter table reward_rules alter column "rewardId" drop not null;
