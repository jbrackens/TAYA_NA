create table locks (
  "playerId" int not null references players on delete cascade,
  "userId" int not null references users on delete cascade,
  "userSessionId" uuid not null,
  unique("playerId")
);
