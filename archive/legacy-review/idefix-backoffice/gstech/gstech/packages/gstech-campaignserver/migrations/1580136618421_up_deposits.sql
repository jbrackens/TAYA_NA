create table deposits (
  "id" serial primary key,
  "playerId" int not null references players("playerId"),

  "paymentId" int unique not null,
  "timestamp" timestamptz not null,
  "amount" int not null,
  "perPlayerCount" int not null,

  unique("playerId", "perPlayerCount")
);
