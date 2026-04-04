create table content_type (
  "id" serial primary key,

  "type" varchar(255) not null,
  "brandId" varchar(2) not null,

  unique ("type", "brandId")
);

create table content (
  "id" serial primary key,
  "contentTypeId" int not null references content_type,

  "name" varchar(255) not null,
  "content" json not null,

  unique ("contentTypeId", "name")
);

create table campaigns_content (
  "id" serial primary key,
  "campaignId" int not null references campaigns,
  "contentId" int not null references content,
  "contentTypeId" int not null references content_type,

  unique("campaignId", "contentTypeId")
);
