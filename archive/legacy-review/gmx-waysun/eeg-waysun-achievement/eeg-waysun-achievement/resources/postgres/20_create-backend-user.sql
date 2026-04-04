-- All this is granted by default; if we don't revoke,
-- just `CONNECT TO DATABASE` permission would be enough for any user to do anything inside the DB.
REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

CREATE USER achievement WITH PASSWORD 'achievement';
GRANT CONNECT ON DATABASE achievement TO achievement;
GRANT USAGE ON SCHEMA public TO achievement;

CREATE USER achievement_liquibase WITH PASSWORD 'achievement_liquibase';
GRANT CONNECT ON DATABASE achievement TO achievement_liquibase;
GRANT CREATE, USAGE ON SCHEMA public TO achievement_liquibase;

ALTER DEFAULT PRIVILEGES
  FOR ROLE achievement_liquibase
  IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO achievement;
ALTER DEFAULT PRIVILEGES
  FOR ROLE achievement_liquibase
  IN SCHEMA public
  GRANT SELECT, USAGE ON SEQUENCES TO achievement;
