CREATE TABLE tournaments (
    tournament_id character varying NOT NULL PRIMARY KEY,
    sport_id character varying NOT NULL,
    name character varying NOT NULL,
    start_time timestamptz NOT NULL
);

CREATE INDEX "index_tournament_sportId" ON tournaments (sport_id);