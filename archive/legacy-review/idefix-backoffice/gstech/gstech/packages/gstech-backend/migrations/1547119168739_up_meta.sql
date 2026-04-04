create schema if not exists public;
CREATE SCHEMA if not exists partman;
CREATE EXTENSION pg_partman SCHEMA partman;
ALTER SCHEMA partman OWNER TO root;
CREATE EXTENSION pg_cron;
GRANT USAGE ON SCHEMA cron TO root;
SELECT cron.schedule('@hourly', $$SELECT partman.run_maintenance()$$);
create extension if not exists btree_gin;
create extension if not exists pg_trgm;
create extension if not exists hstore;
create extension if not exists citext;
create extension if not exists "uuid-ossp";

create function exist_inline(hstore, text) returns bool as $$ select $1 ? $2; $$ language sql;

CREATE TABLE IF NOT EXISTS base_countries (
  "id" char(2) NOT NULL PRIMARY key,
  "name" varchar(45) NOT NULL
);

create table brands (
  "id" char(2) primary key,
  "name" varchar(100) not null
);

create table base_currencies (
  "id" char(3) not null primary key,
  "symbol" varchar(5) not null,
  "defaultConversion" numeric(10,5) not null
);

create table currencies (
  "id" char(3) not null references base_currencies,
  "brandId" char(2) not null references brands,
  primary key("id", "brandId")
);

create table conversion_rate_histories (
  "id" serial not null primary key,
  "currencyId" char(3) not null references base_currencies,
  "conversionRate" numeric(10,5) not null,
  "timestamp" timestamptz not null default now()
);


create materialized view monthly_conversion_rates as
  SELECT "currencyId", avg("conversionRate") "conversionRate", date_trunc('month', timestamp) AS "month" FROM conversion_rate_histories GROUP BY date_trunc('month', timestamp), "currencyId";

create materialized view conversion_rates as
  select distinct on ("currencyId") "currencyId","conversionRate" from conversion_rate_histories order by "currencyId", "timestamp" desc;

create type country_risk_profile as enum('low', 'medium', 'high');

create table countries (
  "id" char(2) not null references base_countries,
  "brandId" char(2) not null references brands,
  "minimumAge" int not null default 18,
  "registrationAllowed" boolean not null default true,
  "loginAllowed" boolean not null default true,
  "blocked" boolean not null default false,
  "riskProfile" country_risk_profile not null default 'low',
  "monthlyIncomeThreshold" numeric(15,0) null,
  primary key("id", "brandId")
);

create table base_languages (
  "id" char(2) not null primary key,
  "name" varchar(20) not null
);

create table languages (
  "id" char(2) not null references base_languages,
  "brandId" char(2) not null references brands,
  primary key("id", "brandId")
);
