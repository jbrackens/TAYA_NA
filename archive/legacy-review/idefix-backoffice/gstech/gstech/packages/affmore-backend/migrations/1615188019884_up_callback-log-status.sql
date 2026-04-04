alter table callback_logs add column "status" varchar(255) null;
update callback_logs set "status" = 'OK';
alter table callback_logs alter column "status" set not null;
