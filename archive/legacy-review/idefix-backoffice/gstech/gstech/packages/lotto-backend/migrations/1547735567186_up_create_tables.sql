create table currency (
  "currency_code" char(3) not null primary key,
  "fx_rate" varchar(100) not null,
  "lastupdate" timestamptz not null default now()
);

create table game_type (
  "gametypeid" int not null primary key,
  "name" varchar(100) not null,
  "cutoffhours" int not null,
  "currency" char(3) not null references currency,
  "country" varchar(100) not null,
  "isplayable" int not null,
  "numberscount" int not null,
  "extranumberscount" int not null,
  "bonusnumberscount" int not null,
  "refundnumberscount" int not null,
  "numbermin" int not null,
  "numbermax" int not null,
  "bonusnumbermin" int not null,
  "bonusnumbermax" int not null,
  "refundnumbermin" int not null,
  "refundnumbermax" int not null,
  "currentjackpot" numeric(12,0) null,
  "nextdrawid" int null,
  "numbersperrow" int not null default 10,
  "bonusnumbersperrow" int not null default 9,
  "gameid" varchar(100) null
);

create table ticket_price (
  "gametypeid" int not null,
  "currencycode" char(3) not null references currency,
  "priceperrow"  numeric(12,0) not null,
  primary key("gametypeid", "currencycode")
);

create table drawing (
  "drawid" int not null primary key,
  "gametypeid" int not null references game_type,
  "drawdateutc" timestamptz not null,
  "drawdatelocal" timestamptz null,
  "jackpotsize" numeric(12,0) null,
  "jackpotcurrency" char(3) null references currency,
  "numbers" int[] not null default '{}',
  "extranumbers" int[] not null default '{}',
  "bonusnumbers" int[] not null default '{}',
  "refundnumbers" int[] not null default '{}',
  "winningscalculated" int null,
  "acceptingbets" int null,
  "jackpotBooster1" int null,
  "jackpotBooster2" int null,
  "cutoff" timestamptz null
);

create table drawing_schedule (
  "gametypeid" int not null primary key references game_type,
  "dayofweek" int not null,
  "drawingtimeutc" varchar(10) not null,
  "localtimeoffset" varchar(10) not null,
  "drawingtimelocal" varchar(10) not null,
  "drawingtimezone" varchar(100) not null
);

create table payout (
  "payoutid" serial not null primary key,
  "drawid" int not null references drawing,
  "numbers" int not null,
  "extranumbers" int not null,
  "bonusnumbers" int not null,
  "refundnumbers" int not null,
  "probability" numeric(12,0) not null,
  "payout" numeric(12,0) not null,
  "payoutcurrency" char(3) not null references currency,
  "sortorder" int not null,
  "id" int
);

create table ticket (
  "ticketid" serial not null primary key,
  "gametypeid" int not null references game_type,
  "playerid" int not null,
  "currency" char(3) not null references currency,
  "drawings" int not null,
  "purchasedate" timestamptz not null
);

create table ticket_line (
  "lineid" serial not null primary key,
  "ticketid" int not null references ticket ON DELETE CASCADE,
  "price" numeric(12,0) not null,
  "ordernr" int not null,
  "drawid" int null references drawing,
  "betnumbers" int[] not null,
  "betbonusnumbers" int[] not null
);

create table winning (
  "betid" int not null primary key,
  "drawid" int,
  "correctnumbers" int,
  "correctextranumbers" int,
  "correctbonusnumbers" int,
  "correctrefundnumbers" int,
  "payout" numeric(12,0),
  "payoutcurrency" char(3),
  "payoutusercurrency" numeric(12,0),
  "usercurrency" char(3),
  "drawingsremaining" int,
  "externalid" varchar(100),
  "externaluserid" varchar(100)
);

create table free_line (
  "playerid" int not null,
  "gametypeid" int not null references game_type,
  "freelinescount" int not null default 0,
  primary key("playerid", "gametypeid")
);
