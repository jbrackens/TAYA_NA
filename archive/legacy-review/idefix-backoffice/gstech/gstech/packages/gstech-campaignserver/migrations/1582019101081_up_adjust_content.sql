alter table content drop constraint "content_contentTypeId_name_key";

alter table content add column "externalId" varchar(255) not null;

create unique index "content_externalId_contentTypeId_key" on content ("externalId", "contentTypeId");
