create extension if not exists hstore;

create table games (
  "id" serial primary key,
  "order" real not null,
  "brandId" varchar(2) not null,
  "permalink" varchar(255) not null,
  "name" varchar(255) not null,
  "manufacturer" varchar(255) not null,
  "primaryCategory" varchar(255) not null,
  "aspectRatio" varchar(255) not null,
  "viewMode" varchar(255) not null,
  "newGame" boolean not null default false,
  "jackpot" boolean not null default false,
  "thumbnail" varchar(255) not null,
  "searchOnly" boolean not null default false,
  "active" boolean not null default false,
  "keywords" varchar(255) not null default '',
  "tags" hstore not null default '',
  "parameters" jsonb null,

  unique("permalink", "brandId")
);

create index tagshindex on games using GIST(tags);

alter table rewards rename column "game" to "gameId";
alter table rewards alter column "gameId" type int using "gameId"::integer;
alter table rewards add constraint "rewards_gameId_fkey" foreign key ("gameId") references games (id);

