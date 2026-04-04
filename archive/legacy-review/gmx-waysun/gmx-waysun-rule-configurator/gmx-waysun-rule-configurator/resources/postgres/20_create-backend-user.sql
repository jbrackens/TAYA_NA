-- All this is granted by default; if we don't revoke,
-- just `CONNECT TO DATABASE` permission would be enough for any user to do anything inside the DB.
REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

CREATE USER rule_configurator WITH PASSWORD 'rule_configurator';
GRANT CONNECT ON DATABASE rule_configurator TO rule_configurator;
GRANT USAGE ON SCHEMA public TO rule_configurator;

CREATE USER rule_configurator_liquibase WITH PASSWORD 'rule_configurator_liquibase';
GRANT CONNECT ON DATABASE rule_configurator TO rule_configurator_liquibase;
GRANT CREATE, USAGE ON SCHEMA public TO rule_configurator_liquibase;

ALTER DEFAULT PRIVILEGES
  FOR ROLE rule_configurator_liquibase
  IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rule_configurator;
ALTER DEFAULT PRIVILEGES
  FOR ROLE rule_configurator_liquibase
  IN SCHEMA public
  GRANT SELECT, USAGE ON SEQUENCES TO rule_configurator;
