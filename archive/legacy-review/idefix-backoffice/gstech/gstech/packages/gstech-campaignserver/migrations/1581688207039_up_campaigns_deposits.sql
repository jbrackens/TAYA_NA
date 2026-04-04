create table campaigns_deposits (
  "id" serial primary key,
  "campaignId" int not null references campaigns,
  "depositId" int not null references deposits
);

create unique index "campaigns_players_campaignId_playerId_removedAt"
on campaigns_players ("campaignId", "playerId") where "removedAt" is null;
