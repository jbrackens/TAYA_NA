ALTER TABLE progresses SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE progresses SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE progresses SET (autovacuum_vacuum_cost_limit = 2000);

ALTER TABLE ledgers SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE ledgers SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE ledgers SET (autovacuum_vacuum_cost_limit = 2000);

ALTER TABLE game_progresses SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE game_progresses SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE game_progresses SET (autovacuum_vacuum_cost_limit = 2000);

