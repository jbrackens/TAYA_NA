-- +goose Up
CREATE TABLE fixtures (
    id VARCHAR(255) PRIMARY KEY,
    sport_key VARCHAR(255),
    league_key VARCHAR(255),
    season_key VARCHAR(255),
    event_key VARCHAR(255),
    tournament VARCHAR(255) NOT NULL,
    home_team VARCHAR(255) NOT NULL,
    away_team VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fixtures_tournament ON fixtures(tournament);
CREATE INDEX idx_fixtures_status ON fixtures(status);
CREATE INDEX idx_fixtures_starts_at ON fixtures(starts_at);
CREATE INDEX idx_fixtures_event_key ON fixtures(event_key);

-- +goose Down
DROP TABLE IF EXISTS fixtures;
