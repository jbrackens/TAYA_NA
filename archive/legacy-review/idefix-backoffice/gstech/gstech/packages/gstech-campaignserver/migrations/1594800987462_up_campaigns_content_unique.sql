alter table campaigns_content drop constraint "campaigns_content_campaignId_contentTypeId_key";

create unique index "campaigns_content_campaignId_contentTypeId_key"
on campaigns_content ("campaignId", "contentTypeId") where "removedAt" is null;
