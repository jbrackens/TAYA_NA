-- 041: split alpha-cashier withdrawal broadcast from approval.
--
-- SECURITY-REVIEW finding #8: every cashier withdrawal mutation required only
-- cashier:write, so one operator could both approve AND broadcast a payout —
-- the broadcaster≠approver check was identity-based only. A dedicated
-- cashier:broadcast permission lets RBAC enforce separation of duties at the
-- permission layer (grant approve to one role, broadcast to another).
--
-- +goose Up
INSERT INTO permissions (id, description, category) VALUES
    ('cashier:broadcast', 'Broadcast (release on-chain) an approved alpha cashier withdrawal', 'finance')
ON CONFLICT (id) DO NOTHING;

-- Seed-compatible default: grant to the roles that already hold cashier:write so
-- existing operator flows keep working; operators tighten this in the Role
-- Matrix to enforce true separation of duties.
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin',        'cashier:broadcast'),
    ('operations-manager', 'cashier:broadcast')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE permission_id = 'cashier:broadcast';
DELETE FROM permissions WHERE id = 'cashier:broadcast';
