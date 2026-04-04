-- gstech.game_rounds
create table "Games" (
	-- game_rounds.id (avoid indexing on GameDate of composite PK to update rounds)
  "GameRoundID" bigserial primary key,
	-- game_rounds.timestamp
  "GameDate" timestamptz not null default now(),
	-- game_rounds.gameId
  "GameID" serial not null references "GameTypesAndCategories",

	--* game_rounds.manufacturerSessionId -> (manufacturer_sessions.id,manufacturer_sessions.sessionId) -> sessions.id => {{{
	-- sessions.playerId
  "PlayerID" bigint not null references "Customers" on delete cascade,
	-- sessions.userAgent
	"Platform" text,
	--* }}}

	-- aggregate from gstech.transactions {{{
  "RealBetAmount" numeric(15,0) not null default 0 check ("RealBetAmount" >= 0),
  "RealWinAmount" numeric(15,0) not null default 0 check ("RealWinAmount" >= 0),
  "BonusBetAmount" numeric(15,0) not null default 0 check ("BonusBetAmount" >= 0),
  "BonusWinAmount" numeric(15,0) not null default 0 check ("BonusWinAmount" >= 0),
  "NetGamingRevenue" numeric(15,0), -- nullable
	"NumberofRealBets" integer not null default 0 check ("NumberofRealBets" >= 0),
	"NumberofBonusBets" integer not null default 0 check ("NumberofBonusBets" >= 0),
	"NumberofSessions" integer, -- nullable
	"NumberofRealWins" integer not null default 0 check ("NumberofRealWins" >= 0),
	"NumberofBonusWins" integer not null default 0 check ("NumberofBonusWins" >= 0)
	-- }}}

	-- primary key ("GameDate", "GameID", "PlayerID",  "Platform")
);

comment on column "Games"."GameDate" is 'Date of the game';
comment on column "Games"."PlayerID" is 'Unique player identifier';
comment on column "Games"."GameID" is 'Game type identifier PK Platform string Web\iOS\Android etc.';
comment on column "Games"."RealBetAmount" is 'Monetary real value that was wagered';
comment on column "Games"."RealWinAmount" is 'Monetary real value that was won';
comment on column "Games"."BonusBetAmount" is 'Total bonus amount that was wagered';
comment on column "Games"."BonusWinAmount" is 'Total bonus amount that was won';
comment on column "Games"."NetGamingRevenue" is 'Total revenue (after bonuses deduction) from daily sessions, in case of daily aggregation';
comment on column "Games"."NumberofRealBets" is 'Total amount of real bets played';
comment on column "Games"."NumberofBonusBets" is 'Total amount of bonus bets played';
comment on column "Games"."NumberofSessions" is 'Total number of sessions played';
comment on column "Games"."NumberofRealWins" is 'Total amount of real bets won';
comment on column "Games"."NumberofBonusWins" is 'Total amount of bonus bets won';