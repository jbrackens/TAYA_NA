CREATE TABLE report_dsr (
  "day" timestamptz not null,
  "conversion" int not null,
  "nrc" int not null,
  "ndc" int not null,
  "activePlayers" int not null,
  "averageBet" numeric(15,2) not null,
  "bets" numeric(15,2) not null,
  "wins" numeric(15,2) not null,
  "ggr" numeric(15,2) not null,
  "margin" numeric(5,2) not null,
  "bonusTurnedReal" numeric(15,2) not null,
  "compensations" numeric(15,2) not null,
  "ngr" numeric(15,2) not null,
  "deposits" numeric(15,2) not null,
  "withdrawals" numeric(15,2) not null
);
