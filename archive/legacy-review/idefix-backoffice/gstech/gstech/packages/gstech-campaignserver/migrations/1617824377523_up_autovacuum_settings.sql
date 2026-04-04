ALTER TABLE players SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE players SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE players SET (autovacuum_vacuum_cost_limit = 2000);

ALTER TABLE deposits SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE deposits SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE deposits SET (autovacuum_vacuum_cost_limit = 2000);

ALTER TABLE campaigns_players SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE campaigns_players SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE campaigns_players SET (autovacuum_vacuum_cost_limit = 2000);

ALTER TABLE subscription_options SET (autovacuum_vacuum_scale_factor = 0);
ALTER TABLE subscription_options SET (autovacuum_vacuum_threshold = 10000);
ALTER TABLE subscription_options SET (autovacuum_vacuum_cost_limit = 2000);
