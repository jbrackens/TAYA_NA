alter table game_progresses rename column permalink to "gameId";
alter table game_progresses alter column "gameId" type int using "gameId"::integer;
alter table game_progresses add constraint "game_progresses_gameId_fkey" foreign key ("gameId") references games (id);
