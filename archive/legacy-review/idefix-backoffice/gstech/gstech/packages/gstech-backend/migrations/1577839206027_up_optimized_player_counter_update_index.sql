CREATE index "player_counters_update_idx" ON player_counters("type", "playerId", "id") WHERE active=TRUE AND amount <= "limit";
