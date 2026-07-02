-- 051: RBAC permissions for market-integrity surveillance (P1-4).
--
-- surveillance:read  — view the alert queue and cases.
-- surveillance:write — dismiss alerts, run scans, open and disposition cases.
-- Granted to the privileged operational roles only (not customer-support),
-- matching the finance/compliance grant pattern in migration 040.
-- +goose Up
INSERT INTO permissions (id, description, category) VALUES
    ('surveillance:read',  'View market-integrity alerts and cases',        'surveillance'),
    ('surveillance:write', 'Triage surveillance alerts and manage cases',   'surveillance')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin',        'surveillance:read'),
    ('super-admin',        'surveillance:write'),
    ('operations-manager', 'surveillance:read'),
    ('operations-manager', 'surveillance:write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE permission_id IN ('surveillance:read', 'surveillance:write');
DELETE FROM permissions WHERE id IN ('surveillance:read', 'surveillance:write');
