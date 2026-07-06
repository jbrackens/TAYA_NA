-- 038_partner_api_rbac.sql
-- P3-02 (partner API productization): the granular RBAC permissions that gate
-- operator-issued partner API keys, so a back-office operator holding
-- partners:write can onboard a partner (issue/list keys) with no code change.
--
-- Additive + idempotent. Depends on migration 027 (permissions /
-- role_permissions tables + the seeded super-admin role).

-- +goose Up
INSERT INTO permissions (id, description, category) VALUES
    ('partners:read',  'View partner API keys',                      'partners'),
    ('partners:write', 'Issue, rotate, and revoke partner API keys', 'partners')
ON CONFLICT (id) DO NOTHING;

-- Grant to super-admin (the seeded full-access role). Migration 027 granted all
-- THEN-existing permissions to super-admin via a SELECT; the role's permission
-- set is stored as role_permissions rows, so a permission added later needs its
-- own explicit grant (EffectivePermissions reads these rows — super-admin is not
-- code-special-cased for the permission check).
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin', 'partners:read'),
    ('super-admin', 'partners:write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE permission_id IN ('partners:read', 'partners:write');
DELETE FROM permissions WHERE id IN ('partners:read', 'partners:write');
