CREATE index "player_events_key_idx" ON player_events("playerId","key", "createdAt" desc);
CREATE index "player_events_playerId" ON player_events("playerId");

