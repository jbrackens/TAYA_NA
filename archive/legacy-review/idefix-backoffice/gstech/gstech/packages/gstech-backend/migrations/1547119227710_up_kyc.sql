create type kyc_document_type as enum('utility_bill', 'identification', 'payment_method', 'source_of_wealth', 'other');
create type kyc_document_status as enum('new', 'checked', 'outdated');

create table kyc_documents (
  "id" serial primary key,
  "playerId" serial not null references players on delete cascade,
  "accountId" int references accounts,
  "type" kyc_document_type,
  "status" kyc_document_status not null default 'new',
  "expiryDate" timestamptz,
  "name" varchar(255),
  "content" text,
  "photoId" varchar(200),
  "createdAt" timestamptz not null default now(),
  "fields" jsonb,
  constraint "photoId_or_content needed" check ("photoId" is not null or "content" is not null),
  constraint "accountId_needed_for_payment_method needed" check ("accountId" is not null or "type" <> 'payment_method'),
  constraint "type_needed_when_status_is_not_new" check ("type" is not null or "status" = 'new')
);
SELECT setval('kyc_documents_id_seq', 1000000);
