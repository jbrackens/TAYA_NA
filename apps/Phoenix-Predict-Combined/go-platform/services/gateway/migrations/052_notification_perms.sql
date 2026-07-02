-- 052: RBAC permissions for the notification-template editor (P1-6).
--
-- notifications:read  — view transactional message templates.
-- notifications:write — edit them.
-- Granted to the privileged operational roles only (not customer-support),
-- matching the finance/compliance/surveillance grant pattern.
-- +goose Up
INSERT INTO permissions (id, description, category) VALUES
    ('notifications:read',  'View notification templates', 'notifications'),
    ('notifications:write', 'Edit notification templates', 'notifications')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin',        'notifications:read'),
    ('super-admin',        'notifications:write'),
    ('operations-manager', 'notifications:read'),
    ('operations-manager', 'notifications:write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE permission_id IN ('notifications:read', 'notifications:write');
DELETE FROM permissions WHERE id IN ('notifications:read', 'notifications:write');
