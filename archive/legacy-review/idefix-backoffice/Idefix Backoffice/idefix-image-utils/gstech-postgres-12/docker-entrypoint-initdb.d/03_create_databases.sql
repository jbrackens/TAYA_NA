CREATE EXTENSION dblink;
CREATE EXTENSION pg_cron;

CREATE SCHEMA jobmon;
CREATE EXTENSION pg_jobmon SCHEMA jobmon;
INSERT INTO jobmon.dblink_mapping_jobmon (username, pwd, port) VALUES ('root', '1234', '5433');

CREATE SCHEMA IF NOT EXISTS partman;
CREATE EXTENSION IF NOT EXISTS pg_partman SCHEMA partman;