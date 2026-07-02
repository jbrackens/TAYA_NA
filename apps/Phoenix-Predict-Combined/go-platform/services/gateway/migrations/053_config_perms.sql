-- 053: RBAC permissions for the DB-backed feature-flag / config editor (P2-1).
--
-- config:read  — view platform config flags.
-- config:write — edit them.
-- Granted to super-admin only: config flags can change fail-closed compliance
-- posture, so editing them is the most privileged operation, not an
-- operations-manager routine. (Read is also super-admin-only to keep the
-- surface tight until a policy says otherwise.)
-- +goose Up
INSERT INTO permissions (id, description, category) VALUES
    ('config:read',  'View platform configuration flags', 'platform'),
    ('config:write', 'Edit platform configuration flags', 'platform')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin', 'config:read'),
    ('super-admin', 'config:write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE permission_id IN ('config:read', 'config:write');
DELETE FROM permissions WHERE id IN ('config:read', 'config:write');
