-- +goose Up
-- GAP-14 (PAM spec §6 User Roles): seed the Compliance Officer and Risk/Fraud
-- Analyst personas. Migration 027 seeded only super-admin (Super Admin),
-- operations-manager (~ Finance/Payments Operator), and customer-support
-- (~ Support Agent) — so a real operator had no least-privilege role for
-- KYC/AML/sanctions/responsible-trading (Compliance Officer) or fraud/
-- market-integrity review (Risk/Fraud Analyst) and had to over-grant. These
-- two personas are is_system=false: unlike the three bootstrap-critical seeded
-- roles they may be customized or removed per jurisdiction. Idempotent
-- (ON CONFLICT DO NOTHING). All granted permission ids exist in the catalog
-- (migration 027 + the later *_perms migrations).
INSERT INTO roles (id, name, description, is_system) VALUES
    ('compliance-officer', 'Compliance Officer', 'KYC decisions, AML review, sanctions/PEP screening, responsible-trading.', false),
    ('risk-fraud-analyst', 'Risk/Fraud Analyst', 'Risk rules, fraud cases, duplicate detection, market-integrity surveillance.', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    -- Compliance Officer: owns the compliance decision surface; reads
    -- surveillance/finance/users for context. No user/role admin, no money moves.
    ('compliance-officer', 'compliance:read'),
    ('compliance-officer', 'compliance:write'),
    ('compliance-officer', 'surveillance:read'),
    ('compliance-officer', 'finances:view'),
    ('compliance-officer', 'users:read'),
    ('compliance-officer', 'roles:read'),
    -- Risk/Fraud Analyst: owns surveillance (fraud cases, market-integrity,
    -- duplicate detection); reads compliance/finance/users for context.
    ('risk-fraud-analyst', 'surveillance:read'),
    ('risk-fraud-analyst', 'surveillance:write'),
    ('risk-fraud-analyst', 'compliance:read'),
    ('risk-fraud-analyst', 'finances:view'),
    ('risk-fraud-analyst', 'users:read'),
    ('risk-fraud-analyst', 'roles:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE role_id IN ('compliance-officer', 'risk-fraud-analyst');
DELETE FROM roles WHERE id IN ('compliance-officer', 'risk-fraud-analyst');
