-- gstech.players
create table "Customers" (
	-- id
  "PlayerID" serial primary key, 
	-- createdAt
  "RegisteredDate" timestamptz not null default now(),
	-- email
  "Email" varchar(255) not null,
	-- mobilePhone
  "MobilePhone" varchar(20) not null check ("MobilePhone" ~ '^[0-9]+$'),
	--? FirstDepositDate resolved from first transaction or payment entry for player?
  "FirstDepositDate" timestamptz,
	-- dateOfBirth
  "DateOfBirth" date,
  --? taken from allowEmailPromotions or allowSMSPromotions?
	"IsOptIn" boolean default false,
	-- loginBlocked
  "IsBlocked" boolean default false,
	-- testPlayer
  "IsTest" boolean default false,
	-- brandId 
  "CasinoName" char(2),
	-- username
  "Alias" varchar(40),
  "Gender" varchar(20), -- nullable
	-- countryId
  "Country" char(2),
	-- currencyId
  "Currency" char(3),
	-- firstName
  "FirstName" varchar(40),
	-- lastName
  "LastName" varchar(40),
  "ReferralType" varchar(40), -- nullable
	-- affiliateId
  "AffiliateID" varchar(20),
	-- languageId
  "Language" char(2),
	-- registrationSource
  "RegisteredPlatform" text,
	-- balance
  "Balance" numeric(15,0) default 0 check ("Balance" >= 0),
	-- lastLogin
  "LastLoginDate" timestamptz default now(),
	-- updatedAt
	"LastUpdated" timestamptz default now()

);

comment on column "Customers"."PlayerID" is 'Unique player identifier';
comment on column "Customers"."RegisteredDate" is 'Date the player registered';
comment on column "Customers"."Email" is 'Mandatory when using Optimail or if required by external ESP';
comment on column "Customers"."MobilePhone" is 'Mandatory if required by external service provider';
comment on column "Customers"."FirstDepositDate" is 'The date of the player’s first deposit';
comment on column "Customers"."DateOfBirth" is 'Player’s date of birth';
comment on column "Customers"."IsOptIn" is 'Determines whether it is acceptable to send promotional messages to the specified email address';
comment on column "Customers"."IsBlocked" is '0 = regular player; 1 = blocked player (e.g.  fraud)';
comment on column "Customers"."IsTest" is '0 = regular player; 1 = test player';
comment on column "Customers"."CasinoName" is 'When multiple casino platforms exist';
comment on column "Customers"."Alias" is 'User name';
comment on column "Customers"."Gender" is 'Player’s gender';
comment on column "Customers"."Country" is 'Player’s country';
comment on column "Customers"."Currency" is 'Player’s currency';
comment on column "Customers"."FirstName" is 'Player’s first name';
comment on column "Customers"."LastName" is 'Player’s last name';
comment on column "Customers"."ReferralType" is 'The method the player was referred to your site (e.g. SEO, Affiliate, Advertising, Marketing, etc.)';
comment on column "Customers"."AffiliateID" is 'Affiliate identifier or name';
comment on column "Customers"."Language" is 'Player’s language';
comment on column "Customers"."RegisteredPlatform" is 'The platform the player had registered with (e.g. Web, Android App, iOS App, etc.)';
comment on column "Customers"."Balance" is 'The monetary value of a player’s current balance';
comment on column "Customers"."LastLoginDate" is 'The date of the player’s last login to the website';
comment on column "Customers"."LastUpdated" is 'Date when the record was last modified or added (Mandatory in case of DB to DB connection)';
