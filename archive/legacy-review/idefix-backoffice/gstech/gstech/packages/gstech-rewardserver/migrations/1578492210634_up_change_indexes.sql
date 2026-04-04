drop index rewards_4col_idx;
drop index rewards_3col_idx;

create unique index rewards_3col_idx ON rewards ("parentRewardId", "externalId", "rewardDefinitionId")
where "parentRewardId" is not null;

create unique index rewards_2col_idx ON rewards ("externalId", "rewardDefinitionId")
where "parentRewardId" is null;

alter table ledgers add "rewardDefinitionId" int not null references reward_definitions;

create unique index ledgers_3col_idx ON ledgers ("rewardDefinitionId", "playerId", "externalId")
where "externalId" is not null;
