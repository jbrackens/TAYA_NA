-- 050: read permission for the back-office KYC review surface (P0-3).
--
-- The review queue, per-user KYC detail, and document-binary views are
-- sensitive reads (identity documents) but not decisions, so they get their
-- own permission distinct from compliance:write. Granted to the same roles
-- that hold compliance:write — viewing identity documents is NOT extended to
-- customer-support.
-- +goose Up
INSERT INTO permissions (id, description, category) VALUES
    ('compliance:read', 'View the KYC review queue and identity documents', 'compliance')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin',        'compliance:read'),
    ('operations-manager', 'compliance:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE permission_id = 'compliance:read';
DELETE FROM permissions WHERE id = 'compliance:read';
