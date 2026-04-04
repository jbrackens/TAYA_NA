alter table players alter column "username" set not null;
alter table players drop constraint "username_not_null";
