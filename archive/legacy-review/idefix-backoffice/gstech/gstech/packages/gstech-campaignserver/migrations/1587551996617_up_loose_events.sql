alter table events rename column "campaignsContentId" to "campaignContentId";
alter table events add column "extras" jsonb null;

alter table events alter column "campaignContentId" drop not null;
alter table events alter column "playerId" drop not null;
