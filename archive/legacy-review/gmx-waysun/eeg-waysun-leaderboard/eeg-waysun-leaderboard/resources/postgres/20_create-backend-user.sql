-- All this is granted by default; if we don't revoke,
-- just `CONNECT TO DATABASE` permission would be enough for any user to do anything inside the DB.
REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

CREATE USER leaderboard WITH PASSWORD 'leaderboard';
GRANT CONNECT ON DATABASE leaderboard TO leaderboard;
GRANT USAGE ON SCHEMA public TO leaderboard;

CREATE USER leaderboard_liquibase WITH PASSWORD 'leaderboard_liquibase';
GRANT CONNECT ON DATABASE leaderboard TO leaderboard_liquibase;
GRANT CREATE, USAGE ON SCHEMA public TO leaderboard_liquibase;

ALTER DEFAULT PRIVILEGES
  FOR ROLE leaderboard_liquibase
  IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO leaderboard;
ALTER DEFAULT PRIVILEGES
  FOR ROLE leaderboard_liquibase
  IN SCHEMA public
  GRANT SELECT, USAGE ON SEQUENCES TO leaderboard;
