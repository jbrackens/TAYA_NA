-- +goose Up
-- 027_rbac_admin.sql
-- Back-office Role-Based Access Control (RBAC).
--
-- This is the staff/operator authorization model — distinct from `punters`
-- (customers) and from the auth service's `auth_users` (the login identity).
-- `admin_users` is a gateway-owned, self-contained back-office directory:
-- profile + status + a bcrypt password hash. Roles and permissions are joined
-- many-to-many through `user_roles` and `role_permissions`.
--
-- Identity binding: enforcement maps a validated session to an admin_user by
-- email (the auth service's username == email).
--
-- This migration seeds ONLY environment-agnostic policy (roles, permissions,
-- and their default mappings). It deliberately does NOT seed any admin_users or
-- role assignments: those are identity/credential data, and because enforcement
-- binds by email while the auth service auto-seeds admin@phoenix.local, seeding
-- a bootstrap super-admin here would grant full back-office control to that
-- account in production. Dev bootstrap staff are seeded by cmd/seed (a dev-only
-- tool); production provisions its first super-admin out-of-band (see the note
-- at the bottom of this file).
--
-- Login wiring: the gateway does not yet consume admin_users.password_hash for
-- authentication (sessions are still issued by the auth service). The hash is
-- stored so the create-user flow is real (not a stub) and so a future SSO/login
-- unification has the credential it needs. See CLAUDE.md identity notes.

-- back-office staff accounts
CREATE TABLE admin_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- roles (id is a stable slug so seeds + join rows are deterministic/idempotent)
CREATE TABLE roles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    -- is_system marks the three seeded roles. Handlers refuse to delete these
    -- (they're load-bearing for bootstrap + enforcement); permissions on them
    -- remain editable.
    is_system   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- permissions (id IS the permission key, e.g. 'users:read'; category groups
-- the columns in the Role Matrix UI)
CREATE TABLE permissions (
    id          TEXT PRIMARY KEY,
    description TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT 'general',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- many-to-many: users <-> roles
CREATE TABLE user_roles (
    user_id    UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    role_id    TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by TEXT,
    PRIMARY KEY (user_id, role_id)
);

-- many-to-many: roles <-> permissions
CREATE TABLE role_permissions (
    role_id       TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

-- reverse-direction lookups (forward is covered by the composite PKs)
CREATE INDEX idx_user_roles_role ON user_roles (role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions (permission_id);

-- ── Seed: roles ────────────────────────────────────────────────────
INSERT INTO roles (id, name, description, is_system) VALUES
    ('super-admin',        'Super Admin',        'Full access to every back-office capability.',         true),
    ('operations-manager', 'Operations Manager', 'Runs day-to-day market operations and settlements.',  true),
    ('customer-support',   'Customer Support',   'Read-only access for assisting customers.',            true)
ON CONFLICT (id) DO NOTHING;

-- ── Seed: granular permissions ─────────────────────────────────────
INSERT INTO permissions (id, description, category) VALUES
    ('users:read',          'View back-office users and their roles',          'users'),
    ('users:write',         'Create users and change role assignments',        'users'),
    ('roles:read',          'View roles and their permissions',                'access_control'),
    ('roles:write',         'Edit role-to-permission mappings',                'access_control'),
    ('markets:read',        'View markets',                                    'markets'),
    ('markets:edit',        'Create and edit markets',                         'markets'),
    ('settlements:resolve', 'Resolve and settle markets',                      'markets'),
    ('finances:view',       'View financial reports and balances',             'finance')
ON CONFLICT (id) DO NOTHING;

-- ── Seed: default role -> permission mappings ──────────────────────
-- Super Admin: everything.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'super-admin', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Operations Manager: operate markets + settlements, view users/finances,
-- view (but not edit) access control.
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('operations-manager', 'users:read'),
    ('operations-manager', 'roles:read'),
    ('operations-manager', 'markets:read'),
    ('operations-manager', 'markets:edit'),
    ('operations-manager', 'settlements:resolve'),
    ('operations-manager', 'finances:view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Customer Support: read-only.
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('customer-support', 'users:read'),
    ('customer-support', 'markets:read'),
    ('customer-support', 'finances:view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── Bootstrap staff: intentionally NOT seeded in this migration ────
-- admin_users + role assignments are identity/credential data, not reference
-- data, so they must not be created in a migration that runs in every
-- environment (that was a privilege-escalation: enforcement binds by email and
-- the auth service auto-seeds admin@phoenix.local, so a super-admin seeded here
-- would grant full back-office control to that account in production).
--
-- Dev: seeded by cmd/seed via seed-data/seed_prediction.sql (a dev-only tool).
-- Prod: provision the first super-admin out-of-band, once, e.g.
--   INSERT INTO admin_users (email, name, password_hash, status)
--     VALUES ('you@company.com', 'Your Name', '<bcrypt hash>', 'active');
--   INSERT INTO user_roles (user_id, role_id)
--     SELECT id, 'super-admin' FROM admin_users WHERE email = 'you@company.com';

-- +goose Down
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS admin_users;
