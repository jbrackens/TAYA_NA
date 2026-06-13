-- 037_multitenancy_foundation.sql
-- ADR-0005 (P3-01), Option A: single-DB shared-schema multi-tenancy. This is the
-- foundation — epic step 1: the tenants directory + a tenant_id discriminator on
-- the core transactional tables. It is deliberately ADDITIVE and DORMANT:
--
--   * tenant_id is NOT NULL DEFAULT 'hula', so every existing row backfills to
--     the live brand with ZERO data migration and zero downtime (Postgres 11+
--     adds a constant-default column as a metadata-only change).
--   * nothing reads tenant_id yet — query-boundary scoping, the auth claim, RLS,
--     and per-tenant RBAC are later epic steps (2-6). Until those land, behavior
--     is identical to today.
--
-- Spike note: applied against the seeded dev DB (orders ~7.7k rows) to confirm
-- additivity; not deployed until the epic continues.
--
-- Tables covered here are the ADR's "6 core". The epic extends tenant_id to the
-- remaining tenant-owned tables (wallet_ledger, wallet_reservations, events,
-- series, categories, …). On very large tables the epic should ADD COLUMN
-- without the FK, then ADD CONSTRAINT ... NOT VALID + VALIDATE to avoid a long
-- validating lock; at current row counts the inline FK validates instantly.

-- +goose Up

CREATE TABLE IF NOT EXISTS tenants (
  id           TEXT PRIMARY KEY,           -- slug, e.g. 'hula'
  display_name TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The default tenant must exist before the FK columns reference it.
INSERT INTO tenants (id, display_name, status)
  VALUES ('hula', 'Hula Na!', 'active')
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE punters              ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'hula' REFERENCES tenants(id);
ALTER TABLE prediction_markets   ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'hula' REFERENCES tenants(id);
ALTER TABLE prediction_orders    ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'hula' REFERENCES tenants(id);
ALTER TABLE prediction_positions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'hula' REFERENCES tenants(id);
ALTER TABLE prediction_payouts   ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'hula' REFERENCES tenants(id);
ALTER TABLE wallet_balances      ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'hula' REFERENCES tenants(id);

CREATE INDEX idx_punters_tenant              ON punters(tenant_id);
CREATE INDEX idx_pred_markets_tenant         ON prediction_markets(tenant_id);
CREATE INDEX idx_pred_orders_tenant          ON prediction_orders(tenant_id);
CREATE INDEX idx_pred_positions_tenant       ON prediction_positions(tenant_id);
CREATE INDEX idx_pred_payouts_tenant         ON prediction_payouts(tenant_id);
CREATE INDEX idx_wallet_balances_tenant      ON wallet_balances(tenant_id);

-- +goose Down
DROP INDEX IF EXISTS idx_wallet_balances_tenant;
DROP INDEX IF EXISTS idx_pred_payouts_tenant;
DROP INDEX IF EXISTS idx_pred_positions_tenant;
DROP INDEX IF EXISTS idx_pred_orders_tenant;
DROP INDEX IF EXISTS idx_pred_markets_tenant;
DROP INDEX IF EXISTS idx_punters_tenant;
ALTER TABLE wallet_balances      DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE prediction_payouts   DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE prediction_positions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE prediction_orders    DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE prediction_markets   DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE punters              DROP COLUMN IF EXISTS tenant_id;
DROP TABLE IF EXISTS tenants;
