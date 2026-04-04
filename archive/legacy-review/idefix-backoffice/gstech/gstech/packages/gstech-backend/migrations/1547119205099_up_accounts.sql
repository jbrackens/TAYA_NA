create table payment_methods (
  "id" serial primary key,
  "name" varchar(50) not null,
  "active" boolean not null default true,
  "requireVerification" boolean not null default true,
  "allowAutoVerification" boolean not null default false,
  "highRisk" boolean not null default false,
  unique("name")
);

create table payment_providers (
  "id" serial primary key,
  "name" varchar(50) not null,
  "deposits" boolean not null,
  "withdrawals" boolean not null,
  "paymentMethodId" int not null references payment_methods,
  "active" boolean not null default true,
  unique("paymentMethodId", "name")
);

create table payment_method_limits (
  "id" serial primary key,
  "brandId" char(2) not null references brands,
  "paymentMethodId" int not null references payment_methods,
  "currencyId" char(3) not null,
  "minDeposit" numeric(12,0) not null,
  "maxDeposit" numeric(12,0) not null,
  "minWithdrawal" numeric(12,0) not null,
  "maxWithdrawal" numeric(12,0) not null,
  foreign key("brandId", "currencyId") references currencies("brandId", "id"),
  unique("brandId", "paymentMethodId", "currencyId")
);

create table accounts (
  "id" serial primary key,
  "playerId" int not null references players on delete cascade,
  "paymentMethodId" int not null references payment_methods,
  "account" varchar(200) not null,
  "accountHolder" varchar(200),
  "active" boolean not null default true,
  "withdrawals" boolean not null default true,
  "kycChecked" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "parameters" jsonb,
  unique("playerId", "paymentMethodId", "account")
);
SELECT setval('accounts_id_seq', 1000000);
