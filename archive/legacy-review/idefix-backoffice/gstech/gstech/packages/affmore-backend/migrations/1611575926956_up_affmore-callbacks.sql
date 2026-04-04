create table callbacks (
  "id" serial primary key,
  "affiliateId" int not null references affiliates,
  "linkId" int null references links,

  "brandId" char(2) not null,
  "method" varchar(255) not null,
  "trigger" varchar(255) not null,
  "url" varchar(255) not null,

  "enabled" boolean not null,
  "createdBy" int not null references users,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null
);

create unique index callbacks_one_per_link_idx ON callbacks ("affiliateId", "linkId", "brandId", "trigger") where "linkId" is not null;
create unique index callbacks_one_per_brand_idx ON callbacks ("affiliateId", "brandId", "trigger") where "linkId" is null;
