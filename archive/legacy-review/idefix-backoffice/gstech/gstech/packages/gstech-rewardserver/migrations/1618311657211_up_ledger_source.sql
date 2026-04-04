create type ledger_source as enum ('marketing', 'wagering', 'manual', 'exchange');
alter table ledgers
    add column source ledger_source;

update ledgers
set source = 'manual';

update ledgers
set source = 'wagering'
from progresses_ledgers
where ledgers.id = progresses_ledgers."ledgerId";

create index "ledgers_source_idx" on ledgers (source);
alter table ledgers
    alter column source set not null;