create table player_frauds (
  "id" serial primary key,
  "playerId" int not null references players on delete cascade,
  "fraudKey" varchar(40) not null,
  "fraudId" varchar(200) not null,
  "checked" boolean not null default false,
  "checkedBy" int references users,
  "checkedAt" timestamptz,
  "cleared" boolean not null default false,
  "points" int not null,
  "details" jsonb,
  "createdAt" timestamptz not null default now(),
  unique("playerId", "fraudKey", "fraudId")
);

create index "player_fraud_playerId_key" on player_frauds("playerId");
