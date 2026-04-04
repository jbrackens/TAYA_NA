ALTER TABLE players SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE players SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE players SET (autovacuum_vacuum_cost_limit = 2000);

ALTER TABLE player_counters SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE player_counters SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE player_counters SET (autovacuum_vacuum_cost_limit = 2000);

ALTER TABLE sessions SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE sessions SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE sessions SET (autovacuum_vacuum_cost_limit = 2000);

ALTER TABLE manufacturer_sessions SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE manufacturer_sessions SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE manufacturer_sessions SET (autovacuum_vacuum_cost_limit = 2000);

ALTER TABLE player_bonuses SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE player_bonuses SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE player_bonuses SET (autovacuum_vacuum_cost_limit = 2000);

ALTER TABLE payments SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE payments SET (autovacuum_vacuum_threshold = 5000);
ALTER TABLE payments SET (autovacuum_vacuum_cost_limit = 2000);

ALTER TABLE accounts SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE accounts SET (autovacuum_vacuum_threshold = 5000);
ALTER TABLE accounts SET (autovacuum_vacuum_cost_limit = 2000);
