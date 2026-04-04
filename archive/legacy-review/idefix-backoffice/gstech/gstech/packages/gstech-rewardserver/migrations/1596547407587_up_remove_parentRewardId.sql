alter table rewards drop column "parentRewardId";

create unique index "rewards_externalId_rewardDefinitionId_idx" ON rewards ("externalId", "rewardDefinitionId");
