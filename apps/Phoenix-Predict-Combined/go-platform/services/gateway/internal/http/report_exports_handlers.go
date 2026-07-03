package http

import (
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"log/slog"
	stdhttp "net/http"
	"strings"
	"time"

	"phoenix-revival/platform/transport/httpx"
)

// Reporting exports (PAM P1-6, complementing the JSON aggregate reports in
// reports_handlers.go): read-only CSV downloads of core operational datasets
// for auditors. Each export runs a read-only query (no trading/settlement/
// wallet code touched), is RBAC-gated on the owning domain's read permission,
// and is audited as an export action — data extraction is itself sensitive.

const reportExportDBTimeout = 20 * time.Second

// registerReportExportRoutes wires:
//
//	GET /api/v1/admin/reports/kyc-statuses.csv        (compliance:read)
//	GET /api/v1/admin/reports/surveillance-alerts.csv (surveillance:read)
//	GET /api/v1/admin/reports/wallet-ledger.csv       (finances:read)
func registerReportExportRoutes(mux *stdhttp.ServeMux, db *sql.DB) {
	if db == nil {
		return
	}

	mux.Handle("/api/v1/admin/reports/kyc-statuses.csv", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return exportKYCStatuses(r.Context(), w, db, userIDFromRequest(r))
	}))

	mux.Handle("/api/v1/admin/reports/surveillance-alerts.csv", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "surveillance:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return exportSurveillanceAlerts(r.Context(), w, db, userIDFromRequest(r))
	}))

	mux.Handle("/api/v1/admin/reports/wallet-ledger.csv", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "finances:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return exportWalletLedger(r.Context(), w, db, userIDFromRequest(r), r.URL.Query().Get("from"), r.URL.Query().Get("to"))
	}))

	slog.Info("admin report-export (CSV) routes registered")
}

// exportWalletLedger streams the wallet ledger as CSV for period reconciliation
// (Scenario 15). Read-only: it queries wallet_ledger through the shared *sql.DB
// exactly as the AML scanner does — it never imports or mutates the protected
// wallet package. Optional from/to (YYYY-MM-DD, inclusive) bound the export to a
// reporting period; both are validated before the query so a bad date is a 400,
// not a silent full-table dump.
func exportWalletLedger(ctx context.Context, w stdhttp.ResponseWriter, db *sql.DB, actorID, fromStr, toStr string) error {
	ctx, cancel := context.WithTimeout(ctx, reportExportDBTimeout)
	defer cancel()

	var conds []string
	var args []any
	details := map[string]any{}
	if fromStr = strings.TrimSpace(fromStr); fromStr != "" {
		from, err := time.Parse("2006-01-02", fromStr)
		if err != nil {
			return httpx.BadRequest("invalid 'from' date; expected YYYY-MM-DD", nil)
		}
		args = append(args, from)
		conds = append(conds, fmt.Sprintf("transaction_time >= $%d", len(args)))
		details["from"] = fromStr
	}
	if toStr = strings.TrimSpace(toStr); toStr != "" {
		to, err := time.Parse("2006-01-02", toStr)
		if err != nil {
			return httpx.BadRequest("invalid 'to' date; expected YYYY-MM-DD", nil)
		}
		// Inclusive of the whole 'to' day: everything strictly before the next day.
		args = append(args, to.AddDate(0, 0, 1))
		conds = append(conds, fmt.Sprintf("transaction_time < $%d", len(args)))
		details["to"] = toStr
	}

	query := `
SELECT id, user_id, entry_type, fund_type, amount_cents, balance_cents,
       idempotency_key, COALESCE(reason,''), CAST(transaction_time AS TEXT)
FROM wallet_ledger`
	if len(conds) > 0 {
		query += " WHERE " + strings.Join(conds, " AND ")
	}
	query += " ORDER BY id ASC"

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return httpx.Internal("failed to query wallet ledger", err)
	}
	defer rows.Close()

	// Audit before streaming: exporting the money ledger is a sensitive extraction.
	recordProviderOpsAuditAction(actorID, "report.exported", "wallet-ledger", details)

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="wallet-ledger.csv"`)
	w.Header().Set("Cache-Control", "no-store")
	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"id", "user_id", "entry_type", "fund_type", "amount_cents", "balance_cents", "idempotency_key", "reason", "transaction_time"})
	for rows.Next() {
		var (
			id, amount, balance                                  int64
			userID, entryType, fundType, idemKey, reason, txTime string
		)
		if err := rows.Scan(&id, &userID, &entryType, &fundType, &amount, &balance, &idemKey, &reason, &txTime); err != nil {
			return httpx.Internal("failed to scan wallet ledger row", err)
		}
		_ = cw.Write([]string{
			fmt.Sprintf("%d", id), csvSafeCell(userID), csvSafeCell(entryType), csvSafeCell(fundType),
			fmt.Sprintf("%d", amount), fmt.Sprintf("%d", balance),
			csvSafeCell(idemKey), csvSafeCell(reason), csvSafeCell(txTime),
		})
	}
	if err := rows.Err(); err != nil {
		return httpx.Internal("failed to read wallet ledger", err)
	}
	cw.Flush()
	return cw.Error()
}

func exportKYCStatuses(ctx context.Context, w stdhttp.ResponseWriter, db *sql.DB, actorID string) error {
	ctx, cancel := context.WithTimeout(ctx, reportExportDBTimeout)
	defer cancel()
	rows, err := db.QueryContext(ctx, `
SELECT user_id, status, risk_level, COALESCE(provider,''),
       COALESCE(CAST(last_verified_at AS TEXT),''), COALESCE(rejection_reason,''),
       CAST(updated_at AS TEXT)
FROM kyc_status ORDER BY updated_at DESC`)
	if err != nil {
		return httpx.Internal("failed to query kyc statuses", err)
	}
	defer rows.Close()

	// Audit before streaming: the export is a sensitive data extraction.
	recordProviderOpsAuditAction(actorID, "report.exported", "kyc-statuses", nil)

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="kyc-statuses.csv"`)
	w.Header().Set("Cache-Control", "no-store")
	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"user_id", "status", "risk_level", "provider", "last_verified_at", "rejection_reason", "updated_at"})
	for rows.Next() {
		var userID, status, risk, provider, lastVerified, reason, updated string
		if err := rows.Scan(&userID, &status, &risk, &provider, &lastVerified, &reason, &updated); err != nil {
			return httpx.Internal("failed to scan kyc status row", err)
		}
		_ = cw.Write([]string{
			csvSafeCell(userID), csvSafeCell(status), csvSafeCell(risk), csvSafeCell(provider),
			csvSafeCell(lastVerified), csvSafeCell(reason), csvSafeCell(updated),
		})
	}
	if err := rows.Err(); err != nil {
		return httpx.Internal("failed to read kyc statuses", err)
	}
	cw.Flush()
	return cw.Error()
}

func exportSurveillanceAlerts(ctx context.Context, w stdhttp.ResponseWriter, db *sql.DB, actorID string) error {
	ctx, cancel := context.WithTimeout(ctx, reportExportDBTimeout)
	defer cancel()
	rows, err := db.QueryContext(ctx, `
SELECT id, kind, severity, subject_id, COALESCE(market_id,''), summary, status,
       COALESCE(CAST(case_id AS TEXT),''), CAST(detected_at AS TEXT)
FROM surveillance_alerts ORDER BY detected_at DESC`)
	if err != nil {
		return httpx.Internal("failed to query surveillance alerts", err)
	}
	defer rows.Close()

	recordProviderOpsAuditAction(actorID, "report.exported", "surveillance-alerts", nil)

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="surveillance-alerts.csv"`)
	w.Header().Set("Cache-Control", "no-store")
	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"id", "kind", "severity", "subject_id", "market_id", "summary", "status", "case_id", "detected_at"})
	for rows.Next() {
		var id, kind, sev, subject, market, summary, status, caseID, detected string
		if err := rows.Scan(&id, &kind, &sev, &subject, &market, &summary, &status, &caseID, &detected); err != nil {
			return httpx.Internal("failed to scan surveillance alert row", err)
		}
		_ = cw.Write([]string{
			csvSafeCell(id), csvSafeCell(kind), csvSafeCell(sev), csvSafeCell(subject),
			csvSafeCell(market), csvSafeCell(summary), csvSafeCell(status), csvSafeCell(caseID), csvSafeCell(detected),
		})
	}
	if err := rows.Err(); err != nil {
		return httpx.Internal("failed to read surveillance alerts", err)
	}
	cw.Flush()
	return cw.Error()
}
