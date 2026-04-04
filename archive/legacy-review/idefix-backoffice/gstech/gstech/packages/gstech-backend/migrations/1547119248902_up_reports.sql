create table report_hourly_players (
  "playerId" int NOT NULL REFERENCES players on delete cascade,
  "hour" timestamptz NOT null,
  "type" transaction_type NOT null,
  "count" int NOT null,
  "amount" numeric(15,0) NOT NULL DEFAULT 0 CHECK (type = 'wallet_correction' OR "amount" >= 0),
  "bonusAmount" numeric(15,0) NOT NULL DEFAULT 0 CHECK ("bonusAmount" >= 0)
) PARTITION BY RANGE (hour);

CREATE UNIQUE index "report_hourly_players_pkey" ON report_hourly_players("playerId", "type", "hour");

SELECT partman.create_parent( p_parent_table => 'public.report_hourly_players',
  p_control => 'hour',
  p_type => 'native',
  p_interval => 'monthly');

CREATE TABLE report_daily_brands (
  "brandId" char(2) NOT NULL references brands,
  "currencyId" char(3) NOT NULL references base_currencies,
  "day" timestamptz NOT null,
  "type" transaction_type NOT null,
  "count" int NOT null,
  "amount" numeric(15,0) NOT NULL DEFAULT 0 CHECK (type = 'wallet_correction' OR "amount" >= 0),
  "bonusAmount" numeric(15,0) NOT NULL DEFAULT 0 CHECK ("bonusAmount" >= 0)
);

CREATE UNIQUE index "report_daily_brands_pkey" ON report_daily_brands("brandId", "currencyId", "type", date_trunc('day', "day" AT TIME zone 'Europe/Rome'));

CREATE TABLE report_daily_games_brands (
  "brandId" char(2) NOT NULL references brands,
  "gameId" int not null references games,
  "manufacturerId" varchar(3) references game_manufacturers("id"),
  "currencyId" char(3) NOT NULL references base_currencies,
  "day" timestamptz NOT null,
  "type" transaction_type NOT null,
  "count" int NOT null,
  "amount" numeric(15,0) NOT NULL DEFAULT 0 CHECK (type = 'wallet_correction' OR "amount" >= 0),
  "bonusAmount" numeric(15,0) NOT NULL DEFAULT 0 CHECK ("bonusAmount" >= 0)
);

CREATE UNIQUE index "report_daily_games_brands_pkey" ON report_daily_games_brands("brandId", "gameId", "manufacturerId", "currencyId", "type", date_trunc('day', "day" AT TIME zone 'Europe/Rome'));

create table report_daily_player_game_summary (
  "playerId" int NOT NULL REFERENCES players on delete cascade,
  "gameId" int not null references games,
  "manufacturerId" varchar(3) references game_manufacturers("id"),
  "day" timestamptz NOT null,
  "type" transaction_type NOT null,
  "count" int NOT null,
  "amount" numeric(15,0) NOT NULL DEFAULT 0 CHECK (type = 'wallet_correction' OR "amount" >= 0),
  "bonusAmount" numeric(15,0) NOT NULL DEFAULT 0 CHECK ("bonusAmount" >= 0)
) PARTITION BY RANGE (day);

SELECT partman.create_parent( p_parent_table => 'public.report_daily_player_game_summary',
  p_control => 'day',
  p_type => 'native',
  p_interval => 'monthly');
