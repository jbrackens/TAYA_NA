create table countries (
  "id" serial primary key,

  "brandId" varchar(2) not null,
  "code" varchar(2) not null,
  "name" varchar(255) not null,
  "minimumAge" int not null,
  "blocked" boolean not null,
  "registrationAllowed" boolean not null,

  unique("brandId", "code")
);

alter table players drop column "countryId";
alter table players add column "countryId" int not null references countries;
