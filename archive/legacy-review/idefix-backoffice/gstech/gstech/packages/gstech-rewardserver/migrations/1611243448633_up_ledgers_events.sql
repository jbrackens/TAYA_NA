create table ledgers_events
(
    "id"         serial primary key,
    "ledgerId"   int          not null references ledgers,
    "event"      varchar(255) not null,
    "comment"    varchar(255) not null default '',
    "parameters" jsonb        null
);

CREATE INDEX ledgers_events_user_id_idx ON ledgers_events ((parameters -> 'userId'));