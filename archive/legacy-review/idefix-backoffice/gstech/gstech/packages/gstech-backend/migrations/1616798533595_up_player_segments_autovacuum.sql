ALTER TABLE player_segments SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE player_segments SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE player_segments SET (autovacuum_vacuum_cost_limit = 2000);

