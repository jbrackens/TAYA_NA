-- 054: RBAC permissions for back-office user segmentation / CRM (P2-2).
--
-- segments:read  — view tags and tag membership.
-- segments:write — create/delete tags and assign/unassign them to users.
-- Granted to the privileged operational roles (super-admin + operations-
-- manager), matching the finance/compliance/surveillance grant pattern.
-- +goose Up
INSERT INTO permissions (id, description, category) VALUES
    ('segments:read',  'View CRM tags and membership',         'crm'),
    ('segments:write', 'Manage CRM tags and user assignments', 'crm')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin',        'segments:read'),
    ('super-admin',        'segments:write'),
    ('operations-manager', 'segments:read'),
    ('operations-manager', 'segments:write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE permission_id IN ('segments:read', 'segments:write');
DELETE FROM permissions WHERE id IN ('segments:read', 'segments:write');
