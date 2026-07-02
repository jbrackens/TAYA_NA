-- 055: finances:read permission for the bonus/campaign admin read routes
-- (GAP-7). The mutating bonus routes (grant/forfeit, campaign create/lifecycle)
-- gate on the existing finances:write (migration 040); their reads previously
-- rode the coarse role==admin check. This adds the missing read permission so
-- the bonus admin surface is fully RBAC-scoped like the other money-adjacent
-- routes (SECURITY-REVIEW #5 pattern). Granted to the roles that already hold
-- finances:write; not extended to customer-support.
-- +goose Up
INSERT INTO permissions (id, description, category) VALUES
    ('finances:read', 'View bonuses, campaigns, and financial admin data', 'finance')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin',        'finances:read'),
    ('operations-manager', 'finances:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE permission_id = 'finances:read';
DELETE FROM permissions WHERE id = 'finances:read';
