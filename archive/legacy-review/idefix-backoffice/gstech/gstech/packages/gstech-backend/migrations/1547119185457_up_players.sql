create table affiliates (
  "id" varchar(20) primary key,
  "name" text not null
);

create type player_risk_profile as enum('low', 'medium', 'high');

create type communication_method_status as enum('unknown', 'unverified', 'verified', 'failed');

create table players (
  "id" serial primary key,
  "username" varchar(40) not null,
  "hash" varchar(80) not null,
  "brandId" char(2) not null references brands,
  "email" citext not null,
  "firstName" varchar(40) not null,
  "lastName" varchar(40) not null,
  "address" varchar(80) not null,
  "postCode" varchar(15) not null,
  "city" varchar(80) not null,
  "countryId" char(2) not null,
  "dateOfBirth" date not null,
  "mobilePhone" varchar(20) not null check ("mobilePhone" ~ '^[0-9]+$'),
  "languageId" char(2) not null,

  "currencyId" char(3) not null references base_currencies,
  "balance" numeric(15,0) not null default 0 check ("balance" >= 0),
  "reservedBalance" numeric(15,0) not null default 0 check ("reservedBalance" >= 0),
  "bonusBalance" numeric(15,0) not null default 0 check ("bonusBalance" >= 0),

  "ipAddress" inet not null,
  "affiliateRegistrationCode" text,
  "affiliateId" varchar(20) references affiliates,

  "badLoginCount" int not null default 0,
  "lastLogin" timestamptz not null default now(),
  "lastBadLogin" timestamptz,
  "loginBlocked" boolean not null default false,

  "activated" boolean not null default false,
  "allowGameplay" boolean not null default true,
  "allowTransactions" boolean not null default true,
  "verified" boolean not null default false,
  "accountSuspended" boolean not null default false,
  "accountClosed" boolean not null default false,
  "gamblingProblem" boolean not null default false,

  "riskProfile" player_risk_profile not null default 'low',
  "depositLimitReached" timestamptz null,

  "allowEmailPromotions" boolean not null default false,
  "allowSMSPromotions" boolean not null default false,

  "numDeposits" int not null default 0,

  "tags" hstore,

  "registrationSource" text,
  "emailStatus" communication_method_status not null default 'unknown',
  "mobilePhoneStatus" communication_method_status not null default 'unknown',
  "tcVersion" int not null default 0,

  "testPlayer" boolean not null default false,

  "createdAt" timestamptz not null default now(),
  foreign key("brandId", "currencyId") references currencies("brandId", "id"),
  foreign key("brandId", "countryId") references countries("brandId", "id"),
  foreign key("brandId", "languageId") references languages("brandId", "id")
);

SELECT setval('players_id_seq', 3000000);

create unique index "players_brandid_username_key" on players("brandId", "username");
create unique index "players_brandId_email_key" on players("brandId", "email") where "accountClosed" = false;
create unique index "players_brandId_mobilePhone_key" on players("brandId", "mobilePhone") where "accountClosed" = false;
create type player_token_type as enum ('activation', 'password');

create table player_tokens (
  "token" uuid not null default uuid_generate_v1() primary key,
  "type" player_token_type not null,
  "playerId" bigint not null references players on delete cascade,
  "createAt" timestamptz not null default now(),
  "expires" timestamptz not null
);

create type session_end_reason as enum('logout', 'expired', 'login');

create table sessions (
  "id" bigserial primary key,
  "ipAddress" inet not null,
  "playerId" bigint not null references players on delete cascade,
  "timestamp" timestamptz not null default now(),
  "endTimestamp" timestamptz,
  "endReason" session_end_reason,
  "realBet" numeric(15,0) not null default 0 check ("realBet" >= 0),
  "realWin" numeric(15,0) not null default 0 check ("realWin" >= 0),
  "bonusBet" numeric(15,0) not null default 0 check ("bonusBet" >= 0),
  "bonusWin" numeric(15,0) not null default 0 check ("bonusWin" >= 0)
);
SELECT setval('sessions_id_seq', 1000000000);
create index "sessions_endReason" on sessions("endReason") where "endReason" is null;

create table player_closure_reasons (
  "playerId" bigint not null references players on delete cascade,
  "type" varchar(20) not null,
  "createAt" timestamptz not null default now(),
  "userId" int references users,
  primary key ("playerId", "type")
);

create table questionnaires (
  "id" serial primary key,
  "brandId" char(2) not null references brands,
  "name" varchar(20) not null,
  "description" text not null,
  "active" boolean not null default false,
  unique("brandId", "name")
);

create table questionnaire_questions (
  "id" serial primary key,
  "questionnaireId" int not null references questionnaires,
  "key" varchar(20) not null,
  "description" text not null,
  "required" boolean not null default false,
  unique("questionnaireId", "key")
);

create table player_questionnaires (
  "id" serial primary key,
  "playerId" bigint not null references players on delete cascade,
  "questionnaireId" int not null references questionnaires,
  "answeredAt" timestamptz not null default now()
);
create index "player_questionnaires_playerId_key" on player_questionnaires("playerId");

create table player_questionnaire_answers (
  "id" serial primary key,
  "questionId" int not null references questionnaire_questions,
  "playerQuestionnaireId" int not null references player_questionnaires on delete cascade,
  "answer" text not null
);

create index "player_questionnaire_answers_playerQuestionnaireId_key" on player_questionnaire_answers("playerQuestionnaireId");
