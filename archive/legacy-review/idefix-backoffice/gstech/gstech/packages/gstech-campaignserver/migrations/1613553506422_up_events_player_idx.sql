create index "events_playerId_idx" on events ("playerId");
create index "events_campaignContentId_idx" on events ("campaignContentId");

create index "campaigns_content_contentId_idx" on campaigns_content ("contentId");
create index "campaigns_content_campaignId_idx" on campaigns_content ("campaignId");
