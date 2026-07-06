-- +goose Up
CREATE TABLE audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    punter_id VARCHAR(255) REFERENCES punters(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'success',
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_punter_id ON audit_logs(punter_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_details ON audit_logs USING GIN(details);

-- +goose Down
DROP TABLE IF EXISTS audit_logs;
