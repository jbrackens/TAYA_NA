CREATE SEQUENCE segment_round_seq START 1;

create table segments (
  "id" serial primary key,
  "brandId" char(2) not null references brands,
  "name" varchar(30) not null
);

create table player_segments (
  "playerId" bigint not null references players on delete cascade,
  "segmentId" int not null references segments on delete cascade,
  "created" timestamptz not null default now(),
  "updated" timestamptz not null default now(),
  "counter" bigint
);

CREATE UNIQUE index "player_segments_playerId_segmentId_key" ON player_segments("playerId", "segmentId");
create index "player_segments_segmentId_idx" on player_segments("segmentId");

insert into segments ("brandId", "name") values
  ('LD', 'zero_deposit'),
  ('LD', 'one_deposit'),
  ('LD', 'welcome_package_used'),
  ('LD', 'churned'),
  ('LD', 'deposits500'),
  ('LD', 'deposits3000'),
  ('LD', 'vip'),
  ('LD', 'bad_session');
