CREATE DATABASE backend;
REVOKE ALL PRIVILEGES ON DATABASE backend FROM PUBLIC;

\connect backend;
-- All this is granted by default; if we don't revoke,
-- just `CONNECT TO DATABASE` permission would be enough for any user to do anything inside the DB.
REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

GRANT CONNECT ON DATABASE backend TO backend;
GRANT USAGE ON SCHEMA public TO backend;
-- TBD: we don't grant ANY privileges to 'backend' role on existing objects !!!!

-- CREATE on database is needed to create `fuzzystrmatch` extension
-- (in earlier Postgres version, superuser was required for that).
GRANT CONNECT, CREATE ON DATABASE backend TO backend_flyway;
GRANT CREATE, USAGE ON SCHEMA public TO backend_flyway;

-- All tables and sequences created by 'backend_flyway' (FOR ROLE ...) in 'public' schema
-- will by default have certain permissions granted to 'backend' user (TO ...).
-- Note that the below statements say nothing about the privileges
-- for the owner of the newly-created objects (backend_flyway itself).
ALTER DEFAULT PRIVILEGES
  FOR ROLE backend_flyway
  IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO backend;
ALTER DEFAULT PRIVILEGES
  FOR ROLE backend_flyway
  IN SCHEMA public
  GRANT SELECT, USAGE ON SEQUENCES TO backend;
