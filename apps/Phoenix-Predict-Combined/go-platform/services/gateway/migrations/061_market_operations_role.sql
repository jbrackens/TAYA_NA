-- 061: Market Operations (least-privilege) role (GAP-92, PAM spec §6 User Roles /
-- §7 Permission Model — least-privilege + segregation of duties).
--
-- §6 defines a distinct "Market Operations — create/configure/suspend/resolve
-- markets, run settlement" persona. But the only non-super-admin role that could
-- operate markets + settlement was operations-manager, which per migrations 027 +
-- 040 ALSO holds finances:write + compliance:write (and, after migration 060, is
-- the money originator) — so running markets/settlement required a role that can
-- also move money and decide KYC/compliance, a direct SoD violation of §6/§7
-- least-privilege. This seeds the missing least-privilege persona: it can
-- view/create/edit markets (including lifecycle suspend/close via markets:edit)
-- and resolve/settle them (settlements:resolve), but holds NO finance, compliance,
-- KYC, user, or role mutation. is_system=false (customizable/removable per
-- jurisdiction, like the GAP-14/80/85/91 personas — unlike the three
-- bootstrap-critical system roles from migration 027). Idempotent (ON CONFLICT DO
-- NOTHING). All granted permission ids exist in the catalog (markets:read,
-- markets:edit, settlements:resolve — migration 027).
-- +goose Up
INSERT INTO roles (id, name, description, is_system) VALUES
    ('market-operations', 'Market Operations', 'Create, configure, suspend, resolve, and settle markets. No finance, compliance, KYC, user, or role mutation.', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('market-operations', 'markets:read'),
    ('market-operations', 'markets:edit'),
    ('market-operations', 'settlements:resolve')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE role_id = 'market-operations';
DELETE FROM roles WHERE id = 'market-operations';
