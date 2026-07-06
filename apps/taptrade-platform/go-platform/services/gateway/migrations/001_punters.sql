-- +goose Up
CREATE TABLE punters (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255),
    password_hash VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    country_code VARCHAR(2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_punters_email ON punters(email);
CREATE INDEX idx_punters_status ON punters(status);
CREATE INDEX idx_punters_created_at ON punters(created_at);

-- +goose Down
DROP TABLE IF EXISTS punters;
