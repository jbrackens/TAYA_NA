package main

import (
	"database/sql"
	"fmt"
)

// Phase6Stats counts the rows written for the backoffice demo tables.
type Phase6Stats struct {
	AuditLogsInserted   int64
	LoyaltyRowsInserted int64
}

// Phase6WipeStats counts rows removed during wipe.
type Phase6WipeStats struct {
	AuditLogsDeleted       int64
	LoyaltyAccountsDeleted int64
}

// RunPhase6WipeBackoffice removes the rows that RunPhase6Backoffice wrote.
//   - audit_logs:      those with details->>'demo' = 'true'
//   - loyalty_accounts: those belonging to the five demo users (they have no
//     meaning outside the demo run; base seed does not create them).
func RunPhase6WipeBackoffice(db *sql.DB) (*Phase6WipeStats, error) {
	stats := &Phase6WipeStats{}

	res, err := db.Exec(`DELETE FROM audit_logs WHERE (details->>'demo')::boolean = true`)
	if err != nil {
		return stats, fmt.Errorf("delete demo audit_logs: %w", err)
	}
	stats.AuditLogsDeleted, _ = res.RowsAffected()

	res, err = db.Exec(`
		DELETE FROM loyalty_accounts
		WHERE user_id IN ('user-bot', 'u-1', 'user-001', 'user-002', 'user-003')
	`)
	if err != nil {
		return stats, fmt.Errorf("delete demo loyalty_accounts: %w", err)
	}
	stats.LoyaltyAccountsDeleted, _ = res.RowsAffected()

	return stats, nil
}

// RunPhase6Backoffice inserts demo rows into audit_logs and loyalty_accounts
// so the backoffice /audit-logs and /loyalty pages render data instead of
// empty tables.
//
// Rows are tagged so wipe mode removes them:
//   - audit_logs:    details JSONB contains {"demo": true}
//   - loyalty_accounts: no synthetic tag column exists, so we delete by
//     user_id IN (the five seeded demo users) during wipe — those accounts
//     have no meaning outside the demo and would be recreated fresh each run.
//
// All INSERTs use ON CONFLICT DO NOTHING so the phase is idempotent.
// Deterministic IDs: md5('audit-demo-<n>')::uuid matches the project-wide
// slug→uuid convention (grep for `md5(` in seed_prediction.sql).
//
// Admin actors are the seeded admin punter 'user-bot' (the only user with
// an admin-adjacent role in the base seed) plus the platform system user
// 'user-001'/'user-002'/'user-003' acting as operators/traders for variety.
// Resource IDs reference real markets from the base seed (md5 of market
// slug) — any FK on audit_logs.resource_id is advisory only (resource_id
// is VARCHAR(255), not a FK column per migration 009).
func RunPhase6Backoffice(db *sql.DB) (*Phase6Stats, error) {
	stats := &Phase6Stats{}

	// ── audit_logs ────────────────────────────────────────────────────────
	// 8 rows covering the full range of prediction admin actions:
	//   market_halt, market_resume, market_settle, market_void,
	//   punter_status_change, market_create, market_close, system_recon
	// Timestamps are backdated to simulate a realistic week of admin activity.
	// ip_address and user_agent are realistic but fake (no real user data).
	res, err := db.Exec(`
		INSERT INTO audit_logs
			(id, punter_id, action, resource_type, resource_id,
			 status, details, ip_address, user_agent, created_at)
		VALUES
		  -- 1: market halted while the official match source is reviewed
		  (md5('audit-demo-1')::uuid,
		   'user-bot',
		   'market_halt',
		   'prediction_market',
		   md5('mkt-mlbb-final-game1')::uuid::text,
		   'success',
		   '{"demo":true,"reason":"official_source_review","market_ticker":"MLBB-FINAL-G1"}',
		   '10.0.0.1',
		   'Go-SeedAdmin/1.0',
		   NOW() - INTERVAL '6 days'),

		  -- 2: market resumed after the source was confirmed
		  (md5('audit-demo-2')::uuid,
		   'user-bot',
		   'market_resume',
		   'prediction_market',
		   md5('mkt-mlbb-final-game1')::uuid::text,
		   'success',
		   '{"demo":true,"reason":"official_source_confirmed","market_ticker":"MLBB-FINAL-G1"}',
		   '10.0.0.1',
		   'Go-SeedAdmin/1.0',
		   NOW() - INTERVAL '6 days' + INTERVAL '2 hours'),

		  -- 3: senate market settled YES (demo settlement reference)
		  (md5('audit-demo-3')::uuid,
		   'user-bot',
		   'market_settle',
		   'prediction_market',
		   md5('mkt-senate-dem')::uuid::text,
		   'success',
		   '{"demo":true,"result":"yes","market_ticker":"SENATE-DEM-2026","settlementPointsCents":487200}',
		   '10.0.0.1',
		   'Go-SeedAdmin/1.0',
		   NOW() - INTERVAL '4 days'),

		  -- 4: GPT5 market settled NO
		  (md5('audit-demo-4')::uuid,
		   'user-bot',
		   'market_settle',
		   'prediction_market',
		   md5('mkt-gpt5-jul')::uuid::text,
		   'success',
		   '{"demo":true,"result":"no","market_ticker":"GPT5-JUL26","settlementPointsCents":195000}',
		   '10.0.0.1',
		   'Go-SeedAdmin/1.0',
		   NOW() - INTERVAL '4 days' + INTERVAL '30 minutes'),

		  -- 5: punter suspended for suspicious trading pattern
		  (md5('audit-demo-5')::uuid,
		   'user-001',
		   'punter_status_change',
		   'punter',
		   'user-002',
		   'success',
		   '{"demo":true,"old_status":"active","new_status":"suspended","reason":"unusual_trading_pattern"}',
		   '192.168.1.42',
		   'BackofficeApp/3.1 (admin-panel)',
		   NOW() - INTERVAL '3 days'),

		  -- 6: punter reinstated after review
		  (md5('audit-demo-6')::uuid,
		   'user-001',
		   'punter_status_change',
		   'punter',
		   'user-002',
		   'success',
		   '{"demo":true,"old_status":"suspended","new_status":"active","reason":"manual_review_cleared"}',
		   '192.168.1.42',
		   'BackofficeApp/3.1 (admin-panel)',
		   NOW() - INTERVAL '2 days' + INTERVAL '4 hours'),

		  -- 7: new market created (UCL City final)
		  (md5('audit-demo-7')::uuid,
		   'user-003',
		   'market_create',
		   'prediction_market',
		   md5('mkt-ucl-city')::uuid::text,
		   'success',
		   '{"demo":true,"market_ticker":"UCL-CITY-2526","yesPricePointsCents":38,"execution_mode":"order_book"}',
		   '172.16.0.5',
		   'BackofficeApp/3.1 (admin-panel)',
		   NOW() - INTERVAL '5 days'),

		  -- 8: system reconciliation job (no punter actor — NULL punter_id)
		  (md5('audit-demo-8')::uuid,
		   NULL,
		   'system_reconcile',
		   'wallet_ledger',
		   NULL,
		   'success',
		   '{"demo":true,"entries_checked":1847,"discrepancies":0,"duration_ms":312}',
		   NULL,
		   'GatewayReconciler/1.0',
		   NOW() - INTERVAL '1 day')

		ON CONFLICT (id) DO NOTHING
	`)
	if err != nil {
		return stats, fmt.Errorf("insert audit_logs: %w", err)
	}
	stats.AuditLogsInserted, _ = res.RowsAffected()

	// ── loyalty_accounts ─────────────────────────────────────────────────
	// 5 rows — one per seeded demo user — with varied points and tiers (0–5).
	// Tiers: 0=Bronze, 1=Silver, 2=Gold, 3=Platinum, 4=Diamond, 5=Obsidian
	// (exact label set is a UI concern; the schema uses SMALLINT 0–5).
	//
	// user-bot is the market-maker — high volume → Platinum (3).
	// u-1 (demo user) active trader → Gold (2).
	// user-001 (alice) medium activity → Silver (1).
	// user-002 (bob) light activity → Bronze (0).
	// user-003 (charlie) power trader → Diamond (4).
	res, err = db.Exec(`
		INSERT INTO loyalty_accounts
			(user_id, points_balance, tier, last_activity, created_at, updated_at)
		VALUES
		  ('user-bot',  284700, 3, NOW() - INTERVAL '1 hour',    NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 hour'),
		  ('u-1',        42350, 2, NOW() - INTERVAL '3 hours',   NOW() - INTERVAL '60 days', NOW() - INTERVAL '3 hours'),
		  ('user-001',   18900, 1, NOW() - INTERVAL '1 day',     NOW() - INTERVAL '45 days', NOW() - INTERVAL '1 day'),
		  ('user-002',    3150, 0, NOW() - INTERVAL '3 days',    NOW() - INTERVAL '14 days', NOW() - INTERVAL '3 days'),
		  ('user-003',   97600, 4, NOW() - INTERVAL '12 hours',  NOW() - INTERVAL '75 days', NOW() - INTERVAL '12 hours')
		ON CONFLICT (user_id) DO NOTHING
	`)
	if err != nil {
		return stats, fmt.Errorf("insert loyalty_accounts: %w", err)
	}
	stats.LoyaltyRowsInserted, _ = res.RowsAffected()

	return stats, nil
}
