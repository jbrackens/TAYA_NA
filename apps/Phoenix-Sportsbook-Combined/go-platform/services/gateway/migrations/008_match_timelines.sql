-- +goose Up
CREATE TABLE match_timelines (
    id VARCHAR(255) PRIMARY KEY,
    fixture_id VARCHAR(255) NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    score_home INT DEFAULT 0,
    score_away INT DEFAULT 0,
    last_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incidents (
    id VARCHAR(255) PRIMARY KEY,
    match_timeline_id VARCHAR(255) NOT NULL REFERENCES match_timelines(id) ON DELETE CASCADE,
    fixture_id VARCHAR(255) NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
    incident_type VARCHAR(50) NOT NULL,
    minute INT,
    team VARCHAR(50),
    player_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_match_timelines_fixture_id ON match_timelines(fixture_id);
CREATE INDEX idx_match_timelines_status ON match_timelines(status);
CREATE INDEX idx_incidents_match_timeline_id ON incidents(match_timeline_id);
CREATE INDEX idx_incidents_fixture_id ON incidents(fixture_id);
CREATE INDEX idx_incidents_type ON incidents(incident_type);

-- +goose Down
DROP TABLE IF EXISTS incidents;
DROP TABLE IF EXISTS match_timelines;
