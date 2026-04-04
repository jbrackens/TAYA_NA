-- +goose Up
CREATE TABLE sports (
    id VARCHAR(255) PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tournaments (
    id VARCHAR(255) PRIMARY KEY,
    sport_id VARCHAR(255) NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tournaments_sport_id ON tournaments(sport_id);
CREATE INDEX idx_tournaments_key ON tournaments(key);
CREATE INDEX idx_tournaments_active ON tournaments(active);

-- +goose Down
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS sports;
