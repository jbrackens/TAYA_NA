create type status as enum ('draft', 'running', 'archived');
create type audience_type as enum ('dynamic', 'static');

create table campaigns (
  "id" serial primary key,

  "brandId" varchar(2) not null,
  "name" varchar(255) not null,
  "status" status not null,
  "startTime" timestamptz null,
  "endTime" timestamptz null,
  "audienceType" audience_type not null
);

create table campaigns_players (
  "id" serial primary key,
  "campaignId" int not null references campaigns,
  "playerId" int not null references players,

  "addedAt" timestamptz not null default now(),
  "removedAt" timestamptz null
);

create table rules (
  "id" serial primary key,
  "campaignId" int not null references campaigns,

  "name" varchar(255) not null,
  "operator" varchar(20) not null,
  "values" json not null,
  "not" boolean not null default false
)
