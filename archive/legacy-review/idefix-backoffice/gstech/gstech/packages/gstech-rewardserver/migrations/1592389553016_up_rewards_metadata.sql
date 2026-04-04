alter table rewards add column "value" int null;
alter table rewards add column "price" int null;
alter table rewards add column "cost" int null;
alter table rewards add column "spins" int null;
alter table rewards add column "spinValue" int null;
alter table rewards add column "spinType" varchar(255) null;
alter table rewards add column "order" real null;
alter table rewards add column "game" varchar(255) null;
alter table rewards add column "currency" varchar(255) null;

alter table rewards add column "removedAt" timestamp with time zone null;
