alter table game_progresses
    add column "playerId" int not null default 0;

update game_progresses gp
set "playerId" = p."playerId"
from game_progresses gp2
         inner join progresses p on gp2."progressId" = p.id
where gp."playerId" = gp2."playerId";

alter table game_progresses
    alter column "playerId" drop default;