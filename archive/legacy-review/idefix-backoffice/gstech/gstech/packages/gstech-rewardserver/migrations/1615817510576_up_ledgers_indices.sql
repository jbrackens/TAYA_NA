create index "ledgers_playerId_idx" on ledgers("playerId");
create index "ledgers_useDate_null_idx" on ledgers("useDate") where "useDate" is null;
create index "ledgers_creditDate_idx" on ledgers("creditDate");
create index "ledgers_rewardDefinitionId_idx" on ledgers("rewardDefinitionId");

