CREATE TABLE reporting_markets
(
    market_id  character varying NOT NULL PRIMARY KEY,
    fixture_id character varying NOT NULL
);

CREATE TABLE reporting_fixtures
(
    fixture_id character varying NOT NULL PRIMARY KEY,
    name       character varying NOT NULL,
    start_time timestamptz       NOT NULL
);