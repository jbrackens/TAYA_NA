create extension if not exists hstore;

create table players (
  "id" serial primary key,
  "playerId" int unique not null,
  "brandId" varchar(2) not null,
  "username" varchar(255) not null,
  "email" varchar(255) not null,
  "firstName" varchar(255) not null,
  "mobilePhone" varchar(20) not null check ("mobilePhone" ~ '^[0-9]+$'),
  "countryId" char(2) not null,
  "languageId" char(2) not null,
  "currencyId" varchar(3) not null,
  "allowEmailPromotions" boolean not null,
  "allowSMSPromotions" boolean not null,
  "createdAt" timestamptz not null,
  "numDeposits" int not null,
  "gamblingProblem" boolean not null,
  "tags" hstore not null default '',
  "segments" hstore not null default ''
);

create index tagshindex on players using GIST(tags);
create index segmentshindex on players using GIST(segments);
