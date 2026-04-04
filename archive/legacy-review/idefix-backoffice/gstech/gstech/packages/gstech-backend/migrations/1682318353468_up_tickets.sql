create table tickets (
  "id" serial primary key,
  "externalTicketId" varchar(200) not null,
  "content" jsonb not null,

  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create unique index "tickets_externalTicketId_idx" on tickets("externalTicketId");
