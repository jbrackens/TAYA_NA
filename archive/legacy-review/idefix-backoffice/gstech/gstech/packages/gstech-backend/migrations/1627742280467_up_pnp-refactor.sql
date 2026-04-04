drop table deposit_drafts;
drop type deposit_drafts_status;

create type partial_login_status as enum ('started', 'verified', 'completed', 'failed');
create table partial_logins (
	"id" serial not null primary key,
	"timestamp" timestamptz default now() not null,
  "transactionKey" varchar(80) not null unique,
	"amount" numeric(15) not null,
  "status" partial_login_status not null default 'started',
	"paymentMethod" varchar(80) not null,
  "bonusCode" varchar(80) null,
	"languageId" char(2) not null,
	"countryId" char(2),
  "currencyId" char(3) not null references base_currencies,
  "playerId" int null references players on delete cascade,
	"ipAddress" inet not null,
	"tcVersion" integer default 0 not null,
	"affiliateRegistrationCode" text,
	"registrationSource" text
);
