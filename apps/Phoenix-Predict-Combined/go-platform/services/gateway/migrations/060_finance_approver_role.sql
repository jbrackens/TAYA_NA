-- 060: finances:approve permission + Finance-Approver (checker-only) role
-- (GAP-91, PAM spec §7 Permission Model / §6 User Roles / §25 Admin Operations;
-- P0-6 segregation of duties).
--
-- §7 (spec.md:135) lists `approve` as a first-class action and mandates
-- maker != checker on dual-approval; §6 (spec.md:122) defines a distinct
-- "Finance Approver — checker for dual-approval adjustments/settlements" persona;
-- P0-6's approved design specified the approve endpoint on a DISTINCT permission.
-- But the maker-checker finance-adjustment approve/reject/execute endpoints
-- (makerchecker_handlers.go) gated on the SAME finances:write as the propose
-- endpoint, so four-eyes rested solely on the identity check (maker != checker by
-- actor) with no permission-level split, and no checker-only role could be
-- seeded. This adds the missing permission + persona: a Finance Approver can VIEW
-- the pending queue (finances:read) and APPROVE/REJECT/execute (finances:approve)
-- but CANNOT originate an adjustment (no finances:write) — enabling true SoD.
-- Idempotent (ON CONFLICT DO NOTHING).
-- +goose Up
INSERT INTO permissions (id, description, category) VALUES
    ('finances:approve', 'Approve, reject, or execute queued dual-approval financial adjustments (checker, not originator)', 'finance')
ON CONFLICT (id) DO NOTHING;

-- Finance Approver persona: is_system=false (customizable/removable per
-- jurisdiction, like the GAP-14/80/85 personas — unlike the three
-- bootstrap-critical system roles from migration 027). Checker-only: read the
-- pending queue + approve/reject/execute; NO finances:write, so it cannot
-- originate an adjustment — the SoD point.
INSERT INTO roles (id, name, description, is_system) VALUES
    ('finance-approver', 'Finance Approver', 'Checker for dual-approval financial adjustments: view the pending queue and approve/reject/execute, but cannot originate adjustments.', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('finance-approver', 'finances:read'),
    ('finance-approver', 'finances:approve')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant finances:approve to super-admin (the one-time all-permissions seed in
-- migration 027 does NOT auto-grant permissions created later, so grant it
-- explicitly — same as migrations 055/058/059). Operations Manager keeps
-- finances:write (it ORIGINATES adjustments) but is deliberately NOT granted
-- finances:approve, so an originator role cannot also disposition the queue — the
-- maker/checker separation §6/§7 require. A deployment that wants one human to do
-- both can assign both roles, but the identity check (maker != checker) still
-- forbids approving one's OWN proposal.
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin', 'finances:approve')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions WHERE permission_id = 'finances:approve';
DELETE FROM roles WHERE id = 'finance-approver';
DELETE FROM permissions WHERE id = 'finances:approve';
