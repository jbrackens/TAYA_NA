alter table content add column "subtype" varchar(255) null;

create table subscription_options (
  "id" serial primary key,
  "emails" varchar(255) not null default 'all',
  "smses" varchar(255) not null default 'all'
);

alter table players add column "subscriptionOptionsId" int null references subscription_options;
