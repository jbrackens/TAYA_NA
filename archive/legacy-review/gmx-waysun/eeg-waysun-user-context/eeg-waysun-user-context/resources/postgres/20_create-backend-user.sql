-- All this is granted by default; if we don't revoke,
-- just `CONNECT TO DATABASE` permission would be enough for any user to do anything inside the DB.
REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

CREATE USER user_context WITH PASSWORD 'user_context';
GRANT CONNECT ON DATABASE user_context TO user_context;
GRANT USAGE ON SCHEMA public TO user_context;

CREATE USER user_context_liquibase WITH PASSWORD 'user_context_liquibase';
GRANT CONNECT ON DATABASE user_context TO user_context_liquibase;
GRANT CREATE, USAGE ON SCHEMA public TO user_context_liquibase;

ALTER DEFAULT PRIVILEGES
  FOR ROLE user_context_liquibase
  IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO user_context;
ALTER DEFAULT PRIVILEGES
  FOR ROLE user_context_liquibase
  IN SCHEMA public
  GRANT SELECT, USAGE ON SEQUENCES TO user_context;
