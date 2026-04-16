
CREATE TABLE sports (
    sport_id character varying NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    abbreviation character varying NOT NULL
);

CREATE TABLE fixtures (
    fixture_id character varying NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    sport_id character varying NOT NULL,
    start_time timestamptz NOT NULL,
    competitors jsonb NOT NULL
);

CREATE INDEX "index_sportId" ON fixtures (sport_id);