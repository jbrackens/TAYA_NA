alter table player_segments drop column counter;
alter table player_segments drop column updated;
alter table player_segments add column "updateCounter" bigint;
alter table player_segments add column "insertCounter" bigint;

create index "player_segments_updateCounter_key" on player_segments("updateCounter");
create index "player_segments_insertCounter_key" on player_segments("insertCounter");
