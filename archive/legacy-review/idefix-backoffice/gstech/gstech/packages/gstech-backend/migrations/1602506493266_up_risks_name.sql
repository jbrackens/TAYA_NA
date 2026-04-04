alter table risks add column "name" text not null default '';
update risks set name = title;

