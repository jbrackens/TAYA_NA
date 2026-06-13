-- All this is granted by default; if we don't revoke,
-- just `CONNECT TO DATABASE` permission would be enough for any user to do anything inside the DB.
REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

CREATE USER wallet WITH PASSWORD 'wallet';
GRANT CONNECT ON DATABASE wallet TO wallet;
GRANT USAGE ON SCHEMA public TO wallet;

CREATE USER wallet_liquibase WITH PASSWORD 'wallet_liquibase';
GRANT CONNECT ON DATABASE wallet TO wallet_liquibase;
GRANT CREATE, USAGE ON SCHEMA public TO wallet_liquibase;

ALTER DEFAULT PRIVILEGES
  FOR ROLE wallet_liquibase
  IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wallet;
ALTER DEFAULT PRIVILEGES
  FOR ROLE wallet_liquibase
  IN SCHEMA public
  GRANT SELECT, USAGE ON SEQUENCES TO wallet;
