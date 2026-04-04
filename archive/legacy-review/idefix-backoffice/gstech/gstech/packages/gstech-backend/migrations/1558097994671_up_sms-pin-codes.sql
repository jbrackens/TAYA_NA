create type player_pin_type as enum ('activate', 'login', 'reset');

create table player_pins (
  "id" serial primary key,
  "mobilePhone" varchar(20) unique not null check ("mobilePhone" ~ '^[0-9]+$'),
  "code" varchar(6) not null,
  "type" player_pin_type not null,
  "createAt" timestamptz not null default now(),
  "expires" timestamptz not null
);
