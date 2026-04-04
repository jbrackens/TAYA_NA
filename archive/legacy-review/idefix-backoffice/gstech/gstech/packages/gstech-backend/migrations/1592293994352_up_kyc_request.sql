create type kyc_request_status as enum('new', 'received', 'archived');

create table kyc_requests (
  "id" serial primary key,
  "playerId" serial not null references players on delete cascade,
  "note" text,
  "message" text,
  "createdAt" timestamptz not null default now(),
  "createdBy" int references users
);

alter table kyc_documents add column "requestId" int references kyc_requests;
alter table kyc_documents drop constraint "photoId_or_content needed";
alter table kyc_documents add constraint "photoId_or_content_needed" check ("photoId" is not null or "content" is not null or status = 'requested');
alter table kyc_documents add constraint "requestId_needed_for_requests" check ("requestId" is not null or "status" != 'requested');