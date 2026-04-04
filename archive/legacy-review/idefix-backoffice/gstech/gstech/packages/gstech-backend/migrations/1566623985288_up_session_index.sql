create index "sessions_playerId_endReason_idx" on sessions("playerId") where "endReason" is null;
drop index "sessions_endReason";

