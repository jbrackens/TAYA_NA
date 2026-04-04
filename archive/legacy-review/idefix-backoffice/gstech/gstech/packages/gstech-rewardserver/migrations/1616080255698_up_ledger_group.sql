alter table ledgers
    add column "groupId" integer;

CREATE SEQUENCE ledgers_group_id_seq OWNED BY ledgers."groupId";

alter table ledgers
    alter column "groupId" set default nextval('ledgers_group_id_seq');