create table callback_logs (
  "id" serial primary key,
  "callbackId" int not null references callbacks on delete cascade,
  "playerId" int not null references players,

  "callbackDate" timestamptz not null default now(),
  "callbackUrl" text not null,
  "callbackResponse" text not null
);
