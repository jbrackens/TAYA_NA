drop index "rewards_externalId_rewardDefinitionId_idx";

create unique index "rewards_externalId_rewardDefinitionId_idx" on rewards ("externalId", "rewardDefinitionId")
where "removedAt" is null;
