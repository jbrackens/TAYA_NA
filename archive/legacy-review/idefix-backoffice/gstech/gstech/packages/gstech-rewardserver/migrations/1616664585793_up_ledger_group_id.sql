update ledgers
set "groupId" = nextval('ledgers_group_id_seq')
where "groupId" is null;

alter table ledgers
    alter column "groupId" set not null;