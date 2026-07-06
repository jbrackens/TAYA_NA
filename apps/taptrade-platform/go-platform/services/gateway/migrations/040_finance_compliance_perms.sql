-- 040: granular write permissions for money + compliance admin routes.
--
-- SECURITY-REVIEW finding #5: the wallet credit/debit, settlement, market
-- lifecycle, loyalty-adjust, and KYC-decision routes gated only on
-- requireAdminRole — so every back-office staffer (all authenticate via the
-- admin_users fallback with role=admin) could move money and decide KYC,
-- bypassing the granular RBAC roles. We add the missing write permissions and
-- grant them to the privileged roles only (NOT customer-support).
--
-- +goose Up
INSERT INTO permissions (id, description, category) VALUES
    ('finances:write',   'Adjust wallet balances, payouts, and loyalty (moves money)', 'finance'),
    ('compliance:write', 'Make KYC / identity-verification decisions',                 'compliance')
ON CONFLICT (id) DO NOTHING;

-- super-admin's grant in 027 was a one-time SELECT * snapshot taken before these
-- rows existed, so grant the new permissions explicitly. Operations Manager is
-- the senior operational role and keeps money/compliance reach; Customer Support
-- (read-only) deliberately does NOT receive these.
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin',        'finances:write'),
    ('super-admin',        'compliance:write'),
    ('operations-manager', 'finances:write'),
    ('operations-manager', 'compliance:write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE permission_id IN ('finances:write', 'compliance:write');
DELETE FROM permissions WHERE id IN ('finances:write', 'compliance:write');
