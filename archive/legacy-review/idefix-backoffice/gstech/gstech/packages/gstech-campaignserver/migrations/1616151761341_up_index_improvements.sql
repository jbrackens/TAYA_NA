create index "players_numDeposits_idx" on players("numDeposits");
create index "players_countryId_idx" on players("countryId");
create index "credited_rewards_playerId_idx" on credited_rewards("playerId");
create index "campaigns_deposits_campaignId_idx" on campaigns_deposits("campaignId");
create index "campaigns_players_removedAt_idx" on campaigns_players("removedAt");
create index "deposits_timestamp_idx" on deposits("timestamp");
create index "deposits_amount_idx" on deposits("amount");
create index "deposits_convertedAmount_idx" on deposits("convertedAmount");
create index "deposits_externalPlayerId_idx" on deposits("externalPlayerId");
create index "players_externalId_idx" on players("externalId");

create index "campaigns_players_emailSentAt_idx" on campaigns_players("emailSentAt");
create index "campaigns_players_smsSentAt_idx" on campaigns_players("smsSentAt");
