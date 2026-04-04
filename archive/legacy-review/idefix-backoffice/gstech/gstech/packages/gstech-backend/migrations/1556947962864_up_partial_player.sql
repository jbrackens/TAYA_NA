alter table players add column partial boolean not null default false;

alter table players alter column "username" drop not null;
alter table players alter column "hash" drop not null;
alter table players alter column "email" drop not null;
alter table players alter column "firstName" drop not null;
alter table players alter column "lastName" drop not null;
alter table players alter column "address" drop not null;
alter table players alter column "postCode" drop not null;
alter table players alter column "city" drop not null;
alter table players alter column "countryId" drop not null;
alter table players alter column "dateOfBirth" drop not null;
alter table players alter column "mobilePhone" drop not null;

alter table players add constraint "username_not_null" check (partial or "username" is not null);
alter table players add constraint "hash_not_null" check (partial or "hash" is not null);
alter table players add constraint "email_not_null" check (partial or "email" is not null);
alter table players add constraint "firstName_not_null" check (partial or "firstName" is not null);
alter table players add constraint "lastName_not_null" check (partial or "lastName" is not null);
alter table players add constraint "address_not_null" check (partial or "address" is not null);
alter table players add constraint "postCode_not_null" check (partial or "postCode" is not null);
alter table players add constraint "city_not_null" check (partial or "city" is not null);
alter table players add constraint "countryId_not_null" check (partial or "countryId" is not null);
alter table players add constraint "dateOfBirth_not_null" check (partial or "dateOfBirth" is not null);
alter table players add constraint "mobilePhone_not_null" check (partial or "mobilePhone" is not null);
