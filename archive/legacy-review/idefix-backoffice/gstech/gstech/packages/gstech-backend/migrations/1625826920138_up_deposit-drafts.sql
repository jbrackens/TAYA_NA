create table deposit_drafts (
	"id" serial not null primary key,
	"timestamp" timestamp with time zone default now() not null,
	"transactionKey" varchar(80) not null unique,
	"amount" numeric(15) not null,
	"paymentMethod" varchar(80) not null,
	"bonusCode" varchar(80) null,
	"languageId" char(2) not null,
	"currencyId" char(3) not null references base_currencies,
	"countryId" char(2) null,
	"ipAddress" inet not null,
	"tcVersion" int not null default 0,
	"affiliateRegistrationCode" text,
	"registrationSource" text
);
