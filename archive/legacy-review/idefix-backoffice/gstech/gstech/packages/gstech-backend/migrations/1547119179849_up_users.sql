create type user_verification_code_status as enum('active', 'expired');

create table users (
  "id" serial primary key,
  "hash" varchar(80) not null,
  "email" varchar(255) not null,
  "handle" varchar(40) not null,
  "name" varchar(40) not null,
  "mobilePhone" varchar(15) not null check ("mobilePhone" ~ '^[0-9]+$'),
  "badLoginCount" int not null default 0,
  "lastBadLogin" timestamptz,
  "loginBlocked" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "lastSeen" timestamptz not null default now(),
  "lastPasswordReset" timestamptz not null default now(),
  "accountClosed" boolean not null default false,
  "administratorAccess" boolean not null default false,
  "reportingAccess" boolean not null default false,
  "campaignAccess" boolean not null default false,
  "requirePasswordChange" boolean not null default false
);

create unique index "users_email_key" on users(lower("email"));
create unique index "users_handle_key" on users(lower("handle"));
SELECT setval('users_id_seq', 1000);

create table user_events (
  "id" bigserial primary key,
  "userId" int references users on delete cascade,
  "content" text not null,
  "details" jsonb,
  "ipAddress" inet not null,
  "createdAt" timestamptz not null default now()
);
create index "user_events_userId_idx" on user_events("userId");

create table user_verification_codes (
  "id" serial primary key,
  "userId" int references users on delete cascade,
  "code" int not null,
  "ipAddress" inet not null,
  "createdAt" timestamptz not null default now(),
  "status" user_verification_code_status not null default 'active'
);
create index "user_verification_codes_code_key" on user_verification_codes("code");
