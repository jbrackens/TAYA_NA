alter table progresses_ledgers
    add column "playerId" int not null default 0;
alter table progresses_rewards
    add column "playerId" int not null default 0;

update progresses_ledgers pl
set "playerId" = p."playerId"
from progresses_ledgers pl2
         inner join progresses p on pl2."progressId" = p.id
where pl."playerId" = pl2."playerId";

update progresses_rewards pr
set "playerId" = p."playerId"
from progresses_rewards pr2
         inner join progresses p on pr2."progressId" = p.id
where pr."playerId" = pr2."playerId";

alter table progresses_ledgers
    alter column "playerId" drop default;
alter table progresses_rewards
    alter column "playerId" drop default;
