alter table progresses drop column "isCompleted";
alter table progresses add column "startedAt" timestamptz not null default now();
alter table progresses add column "completedAt" timestamptz null;
