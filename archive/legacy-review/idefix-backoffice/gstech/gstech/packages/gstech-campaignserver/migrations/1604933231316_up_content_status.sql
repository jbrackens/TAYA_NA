alter table content add column "updatedAt" timestamptz not null default now();
alter table content add column "status" varchar(255) not null default 'draft';
update content set status='published';  -- Update already existing content to published
