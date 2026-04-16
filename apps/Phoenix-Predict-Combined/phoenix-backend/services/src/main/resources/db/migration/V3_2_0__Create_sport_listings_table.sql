CREATE TABLE sport_listings (
    sport_id character varying NOT NULL PRIMARY KEY,
    data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE tournament_listings (
    tournament_id character varying NOT NULL PRIMARY KEY,
    sport_id character varying NOT NULL,
    data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX "index_tournaments_sportId" ON tournament_listings (sport_id);

CREATE TABLE fixture_listings (
    fixture_id character varying NOT NULL PRIMARY KEY,
    tournament_id character varying NOT NULL,
    data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX "index_fixtures_tournamentId" ON fixture_listings (tournament_id);