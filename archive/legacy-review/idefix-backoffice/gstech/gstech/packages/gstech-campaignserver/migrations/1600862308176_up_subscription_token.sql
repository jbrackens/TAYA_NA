create extension if not exists "uuid-ossp";

alter table players add column "subscriptionToken" uuid not null default uuid_generate_v1();
