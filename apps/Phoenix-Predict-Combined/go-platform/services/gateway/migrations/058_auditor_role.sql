-- 058: Auditor (read-only) role + audit:read permission (GAP-80, PAM spec §6
-- User Roles / §7 Permission Model / §27 Security).
--
-- §6 defines an "Auditor (read-only) — full read + audit-log access, no writes"
-- persona and §7 lists `audit` as an RBAC resource, but no audit:read permission
-- and no read-only Auditor role existed: the audit-log LIST route rode the coarse
-- role==admin check, so ANY back-office admin read the full audit trail and no
-- least-privilege read-only role was distinguishable from full admin. This adds
-- the missing permission + persona so the audit surface is least-privilege
-- scoped like the other resources; the audit-log read route now gates on
-- audit:read (registerAdminAuditLogsList). Idempotent (ON CONFLICT DO NOTHING).
-- +goose Up
INSERT INTO permissions (id, description, category) VALUES
    ('audit:read', 'View the compliance audit log', 'audit')
ON CONFLICT (id) DO NOTHING;

-- Auditor persona: is_system=false (customizable/removable per jurisdiction,
-- like the GAP-14 compliance personas — unlike the three bootstrap-critical
-- system roles from migration 027).
INSERT INTO roles (id, name, description, is_system) VALUES
    ('auditor', 'Auditor', 'Read-only across the back office plus the compliance audit log; no writes.', false)
ON CONFLICT (id) DO NOTHING;

-- Auditor: every READ permission in the catalog + audit:read; NO writes/edits/
-- resolve/broadcast. This is the "full read + audit-log access, no writes" §6
-- persona. All granted ids exist in the catalog (migrations 027 + 040/044/046/
-- 048/053/055 + the cashier/config/notifications/partners/segments perms).
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('auditor', 'users:read'),
    ('auditor', 'roles:read'),
    ('auditor', 'markets:read'),
    ('auditor', 'finances:view'),
    ('auditor', 'finances:read'),
    ('auditor', 'compliance:read'),
    ('auditor', 'surveillance:read'),
    ('auditor', 'config:read'),
    ('auditor', 'cashier:read'),
    ('auditor', 'notifications:read'),
    ('auditor', 'partners:read'),
    ('auditor', 'segments:read'),
    ('auditor', 'audit:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant audit:read to the roles that legitimately review the audit trail:
-- super-admin (holds everything — a new permission is NOT auto-granted by the
-- one-time seed in migration 027, so grant it explicitly) and the two compliance
-- personas. Operations Manager and Customer Support do NOT receive it
-- (least-privilege: they operate markets / support customers, not audit review)
-- — the intended §7 tightening away from "any admin reads the full trail".
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin',        'audit:read'),
    ('compliance-officer', 'audit:read'),
    ('risk-fraud-analyst', 'audit:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE permission_id = 'audit:read';
DELETE FROM role_permissions WHERE role_id = 'auditor';
DELETE FROM roles WHERE id = 'auditor';
DELETE FROM permissions WHERE id = 'audit:read';
