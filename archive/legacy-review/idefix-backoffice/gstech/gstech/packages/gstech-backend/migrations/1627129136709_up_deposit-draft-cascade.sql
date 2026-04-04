alter table deposit_drafts drop column "playerId";
alter table deposit_drafts add column "playerId" bigint null references players on delete cascade;
