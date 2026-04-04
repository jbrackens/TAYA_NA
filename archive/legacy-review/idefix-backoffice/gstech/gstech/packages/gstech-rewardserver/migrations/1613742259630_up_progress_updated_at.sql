alter table progresses
    add column "updatedAt" timestamptz null default now();

update progresses
set "updatedAt" = progresses."startedAt";
update progresses
set "updatedAt" = progresses."completedAt"
where "completedAt" is not null;

alter table progresses
    alter column "updatedAt" set not null;