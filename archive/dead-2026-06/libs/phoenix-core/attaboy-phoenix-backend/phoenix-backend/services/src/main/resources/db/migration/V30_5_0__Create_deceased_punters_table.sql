CREATE TABLE reporting_deceased_punters (
  punter_id        character varying  NOT NULL PRIMARY KEY,
  client_ip        character varying,
  device           character varying,
  suspended_at     timestamptz        NOT NULL,
  created_at       timestamptz        NOT NULL
);
