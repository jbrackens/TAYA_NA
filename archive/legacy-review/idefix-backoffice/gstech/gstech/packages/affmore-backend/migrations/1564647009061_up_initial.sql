create table users (
  "id" serial primary key,
  "email" varchar(255) unique not null,
  "password" varchar(255) not null
);

create table roles (
  "id" serial primary key,
  "name" varchar(40) not null
);

create table user_roles (
  "userId" int not null references users on delete cascade,
  "roleId" int not null references roles on delete cascade,
  primary key ("userId", "roleId")
);

INSERT INTO roles ("id", "name") VALUES ('1', 'admin');
INSERT INTO roles ("id", "name") VALUES ('2', 'user');
INSERT INTO users ("id", "email", "password") VALUES ('0', 'admin@luckydino.com', '$2b$10$nrN4HbpibDjZXwWyA9nQ9eJpzi3ddmwqeZEKsQtjxgkfi2bVIPGr.');
INSERT INTO users ("id", "email", "password") VALUES ('1', 'user@luckydino.com', '$2b$10$nrN4HbpibDjZXwWyA9nQ9eJpzi3ddmwqeZEKsQtjxgkfi2bVIPGr.');

INSERT INTO user_roles("userId", "roleId") VALUES ('0', '1');
INSERT INTO user_roles("userId", "roleId") VALUES ('1', '2');

create type pin_code_type as enum ('activate', 'login', 'reset');
create table pin_codes (
  "id" serial primary key,
  "email" varchar(255) unique not null,
  "pinCode" varchar(6) not null,
  "pinType" pin_code_type not null,
  "createdAt" timestamptz not null default now(),
  "expires" timestamptz not null
);

create table affiliates (
  "id" serial primary key,

  "hash" text not null,
  "salt" varchar(255) not null,

  "name" varchar(255) not null,
  "contactName" varchar(255) not null,
  "email" varchar(255) unique not null,
  "phone" varchar(255) null,
  "skype" varchar(255) null,
  "vatNumber" varchar(255) null,
  "info" text null,
  "allowEmails" boolean not null,

  "paymentMinAmount" numeric(12,0) not null,
  "paymentMethod" varchar(255) not null,
  "paymentMethodDetails" json null,

  "allowNegativeFee" boolean not null,
  "isInternal" boolean not null,
  "userId" int null references users,

  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,

  "lastLoginDate" timestamptz null
);

create table sub_affiliates (
  "id" serial primary key,
  "parentId" int not null references affiliates,
  "affiliateId" int not null references affiliates,
  "commissionShare" numeric(12,0) not null,
  unique ("parentId", "affiliateId")
);

create table plans (
  "id" serial primary key,

  "name" varchar(255) unique not null,
  "nrs" numeric(12,1) null,
  "cpa" numeric(12,0) not null,

  "createdBy" int not null references users,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null
);

create table rules (
  "id" serial primary key,
  "planId" int not null references plans on delete cascade,

  "countryId" char(2) null,
  "nrs" numeric(12,1) not null,
  "cpa" numeric(12,0) not null,
  "deposit" numeric(12,0) not null,
  "deposit_cpa" numeric(12,0) not null
);

create unique index rules_one_per_country_idx ON rules ("planId", "countryId") where "countryId" is not null;
create unique index rules_one_per_plan_idx ON rules ("planId") where "countryId" is null;

create table deals (
  "id" serial primary key,
  "affiliateId" int not null references affiliates,
  "planId" int not null references plans,

  "brandId" char(2) not null,

  "createdBy" int not null references users,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  unique ("brandId", "affiliateId")
);

create table links (
  "id" serial primary key,
  "affiliateId" int not null references affiliates,
  "planId" int null references plans,

  "code" varchar(255) unique not null,
  "name" varchar(255) not null,
  "landingPage" varchar(255) not null
);

create table clicks (
  "id" serial primary key,
  "linkId" int not null references links on delete cascade,
  "clickDate" timestamptz not null,

  "referralId" varchar(255) null,
  "segment" varchar(255) null,
  "queryParameters" json null,
  "ipAddress" inet not null,
  "userAgent" text not null,
  "referer" text null
);

create table players (
  "id" serial primary key,
  "affiliateId" int not null references affiliates,
  "planId" int not null references plans,
  "linkId" int not null references links,
  "clickId" int null references clicks,

  "brandId" char(2) not null,
  "countryId" char(2) not null,
  "registrationDate" timestamptz not null
);

create table activities (
  "id" serial primary key,
  "playerId" int not null references players,

  "activityDate" date not null,
  "deposits" numeric(12,0) not null default 0,
  "turnover" numeric(12,0) not null default 0,
  "grossRevenue" numeric(12,0) not null default 0,
  "bonuses" numeric(12,0) not null default 0,
  "adjustments" numeric(12,0) not null default 0,

  "fees" numeric(12,0) not null default 0,
  "tax" numeric(12,0) not null default 0,
  "netRevenue" numeric(12,0) not null default 0,
  "commission" numeric(12,0) not null default 0,
  "cpa" numeric(12,0) not null default 0,
  unique ("playerId", "activityDate")
);

create table logs (
  "id" serial primary key,
  "affiliateId" int not null references affiliates,

  "note" text not null,
  "attachmentUrl" text null,

  "createdBy" int not null references users,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null
);

create table payments (
  "id" serial primary key,
  "affiliateId" int not null references affiliates,

  "transactionId" varchar(255) unique not null,
  "transactionDate" timestamptz not null,
  "month" smallint null,
  "year" smallint null,
  "type" varchar(255) not null,
  "description" text not null,
  "amount" numeric(12,0) not null
);

create table landings (
  "id" serial primary key,
  "brandId" char(2) not null,
  "landingPage" varchar(255) not null,

  "createdBy" int not null references users,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null
);
