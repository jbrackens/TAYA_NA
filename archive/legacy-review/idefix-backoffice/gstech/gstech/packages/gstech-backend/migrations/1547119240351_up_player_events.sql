create type player_event_type as enum('note', 'fraud', 'account', 'activity', 'transaction');

create table player_events (
  "id" bigserial primary key,
  "playerId" int not null references players on delete cascade,
  "userId" int references users on delete cascade,
  "type" player_event_type not null,
  "key" varchar(200),
  "archived" boolean not null default false,
  "content" text,
  "details" jsonb,
  "createdAt" timestamptz not null default now()
  ,constraint "note_requires_content" check (type <> 'note' or "content" is not null)
  ,constraint "other_type_requires_key" check (type = 'note' or "key" is not null)
);

create index "player_events_playerId_key" on player_events("playerId");
create index "player_events_userId_key" on player_events("userId");
