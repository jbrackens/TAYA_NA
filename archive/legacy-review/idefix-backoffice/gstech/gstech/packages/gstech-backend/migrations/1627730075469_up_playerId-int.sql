alter table deposit_drafts drop column "playerId";
alter table deposit_drafts add column "playerId" int null references players on delete cascade;