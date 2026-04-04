alter table payments add column "createdBy" int not null references users default(0);
alter table payments alter column "createdBy" drop default;