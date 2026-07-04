-- 059: Marketing/CRM (least-privilege) role (GAP-85, PAM spec §6 User Roles / §7
-- Permission Model — least-privilege + segregation of duties).
--
-- §6 lists a distinct "Marketing/CRM — segments, campaigns, bonuses (no financial
-- mutation)" persona, and Scenario 13 names it as the actor. But the only
-- non-super-admin role that could operate the CRM/segmentation surface was
-- operations-manager, which ALSO holds finances:write + compliance:write +
-- settlements:resolve + markets:edit — so running campaigns required a role that
-- can also move money and decide KYC, a direct SoD violation of §6's explicit
-- "no financial mutation" clause. This seeds the missing least-privilege persona:
-- it can build/assign segments, manage campaigns, and send communications, and
-- READ financial/player data for context, but holds NO write to money, compliance,
-- settlements, or markets. is_system=false (customizable per jurisdiction, like
-- the GAP-14 / GAP-80 personas). Idempotent (ON CONFLICT DO NOTHING). All granted
-- permission ids exist in the catalog (segments 054, notifications 052, finances
-- 055, users 027).
-- +goose Up
INSERT INTO roles (id, name, description, is_system) VALUES
    ('marketing-crm', 'Marketing/CRM', 'Segments, campaigns, and player communications; reads financial/player data for context. No financial, compliance, settlement, or market mutation.', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('marketing-crm', 'segments:read'),
    ('marketing-crm', 'segments:write'),
    ('marketing-crm', 'notifications:read'),
    ('marketing-crm', 'notifications:write'),
    ('marketing-crm', 'finances:read'),
    ('marketing-crm', 'users:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE role_id = 'marketing-crm';
DELETE FROM roles WHERE id = 'marketing-crm';
