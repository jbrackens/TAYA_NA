create table game_manufacturers (
  "id" varchar(3) not null primary key,
  "name" varchar(50) not null,
  "parentId" varchar(3) references game_manufacturers("id"),
  "active" boolean not null default true
);

create table manufacturer_sessions (
  "id" bigserial not null primary key,
  "sessionId" bigint not null references sessions on delete cascade,
  "manufacturerId" varchar(3) not null references game_manufacturers,
  "type" varchar(10),
  "manufacturerSessionId" varchar(200),
  "parameters" jsonb,
  "expired" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  unique("manufacturerId", "manufacturerSessionId", "type")
);

create index "manufacturer_sessions_sessionId_idx" on manufacturer_sessions("sessionId");

create table games (
  "id" serial primary key,
  "gameId" varchar(200) not null,
  "name" varchar(200) not null,
  "manufacturerId" varchar(20) not null references game_manufacturers,
  "mobileGame" boolean not null default false,
  "playForFun" boolean not null default true,
  "manufacturerGameId" varchar(200) not null,
  "rtp" numeric(4,0),
  "parameters" jsonb,
  UNIQUE("manufacturerId", "manufacturerGameId"),
  UNIQUE("gameId")
);

SELECT setval('games_id_seq', 10000);

create table game_profiles (
  "id" serial primary key,
  "brandId" char(2) not null references brands,
  "name" varchar(200) not null,
  "wageringMultiplier" numeric(15) not null
);
SELECT setval('game_profiles_id_seq', 100);

create table brand_game_profiles (
  "gameId" int not null references games,
  "brandId" char(2) not null references brands,
  "gameProfileId" int not null references game_profiles,
  primary key ("gameId", "brandId")
);

create table game_rounds (
  "id" bigserial not null,
  "timestamp" timestamptz not null,
  "manufacturerSessionId" bigint references manufacturer_sessions on delete cascade,
  "manufacturerId" varchar(3) not null references game_manufacturers,
  "externalGameRoundId" varchar(200) not null,
  "gameId" int references games,
  "closed" boolean not null default false,
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

SELECT setval('game_rounds_id_seq', 1000000000);

create unique index "game_rounds_manufacturerId_externalGameRoundId_idx" on game_rounds("manufacturerId", "externalGameRoundId", timestamp);
CREATE index "game_round_manufacturerSessionId_idx" ON game_rounds("manufacturerSessionId");

SELECT partman.create_parent( p_parent_table => 'public.game_rounds',
  p_control => 'timestamp',
  p_type => 'native',
  p_interval => 'monthly');

