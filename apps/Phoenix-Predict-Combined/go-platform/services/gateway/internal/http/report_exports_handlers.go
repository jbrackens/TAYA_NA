package http

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/csv"
	"errors"
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

// maxCSVReportRows caps how many rows a buffered CSV export may materialise. It
// is a memory safety valve, not a normal-operation limit: a reporting-period
// export is far under it, but it prevents an all-time full-table dump (the money
// ledger can reach tens of millions of rows) from buffering multiple gigabytes in
// a single request and OOMing the gateway (GAP-73 verification-#21 HIGH). A var,
// not a const, only so a test can lower it. ~250k rows ≈ 40 MB buffered.
var maxCSVReportRows = 250_000

// errReportTooLarge is returned by cappedCSVWriter when the row cap is reached;
// writeCSVReport translates it into a 413 with an actionable message. Nothing is
// written to the client, so the caller gets a clean error, never a partial file.
var errReportTooLarge = errors.New("report exceeds the export row limit")

// cappedCSVWriter wraps a csv.Writer and refuses to buffer past a row cap, so a
// fill closure that would otherwise read an unbounded result set stops early.
type cappedCSVWriter struct {
	cw  *csv.Writer
	n   int
	max int
}

func (c *cappedCSVWriter) write(record []string) error {
	if c.n >= c.max {
		return errReportTooLarge
	}
	c.n++
	return c.cw.Write(record)
}

// writeCSVReport buffers the report in memory (up to maxCSVReportRows) and flushes
// it to the ResponseWriter only after fill has read the full result set
// successfully. This closes GAP-73 (§24 audit-evidence integrity): with direct
// streaming, the first row write commits HTTP 200, so a mid-scan failure — most
// realistically the 20s statement timeout firing during a large sequential scan —
// left the client with a TRUNCATED CSV delivered as a successful download, with no
// signal it was incomplete. Now any fill error (query, scan, rows.Err, or the row
// cap) returns BEFORE a single byte reaches w, so httpx maps it to a clean error
// with no partial body. The audit entry is recorded only once the extraction has
// fully materialised, so the audit log reflects a completed export rather than a
// possibly-truncated one. Memory is bounded by the row cap: a result set larger
// than the cap is refused with a 413 (narrow the query) rather than buffered
// unbounded — correctness AND a bounded footprint, not one at the cost of the other.
func writeCSVReport(w stdhttp.ResponseWriter, filename string, audit func(), fill func(*cappedCSVWriter) error) error {
	var buf bytes.Buffer
	capped := &cappedCSVWriter{cw: csv.NewWriter(&buf), max: maxCSVReportRows}
	if err := fill(capped); err != nil {
		if errors.Is(err, errReportTooLarge) {
			return httpx.NewError(stdhttp.StatusRequestEntityTooLarge, "export_too_large",
				fmt.Sprintf("report exceeds the %d-row export limit; narrow the query (e.g. ?from= & ?to= on the wallet-ledger export)", maxCSVReportRows),
				nil, nil)
		}
		return err // nothing has been written to w — httpx emits a clean error
	}
	capped.cw.Flush()
	if err := capped.cw.Error(); err != nil {
		return httpx.Internal("failed to encode CSV report", err)
	}
	if audit != nil {
		audit()
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.Header().Set("Cache-Control", "no-store")
	_, err := buf.WriteTo(w)
	return err
}

// exportWalletLedger renders the wallet ledger as CSV for period reconciliation
// (Scenario 15). Read-only: it queries wallet_ledger through the shared *sql.DB
// exactly as the AML scanner does — it never imports or mutates the protected
// wallet package. Optional from/to (YYYY-MM-DD, inclusive) bound the export to a
// reporting period; both are validated before the query so a bad date is a 400,
// not a silent full-table dump. Buffered via writeCSVReport so a mid-scan error
// never yields a truncated 200.
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

	return writeCSVReport(w, "wallet-ledger.csv",
		func() { recordProviderOpsAuditAction(actorID, "report.exported", "wallet-ledger", details) },
		func(cw *cappedCSVWriter) error {
			rows, err := db.QueryContext(ctx, query, args...)
			if err != nil {
				return httpx.Internal("failed to query wallet ledger", err)
			}
			defer rows.Close()
			if err := cw.write([]string{"id", "user_id", "entry_type", "fund_type", "amount_cents", "balance_cents", "idempotency_key", "reason", "transaction_time"}); err != nil {
				return err
			}
			for rows.Next() {
				var (
					id, amount, balance                                  int64
					userID, entryType, fundType, idemKey, reason, txTime string
				)
				if err := rows.Scan(&id, &userID, &entryType, &fundType, &amount, &balance, &idemKey, &reason, &txTime); err != nil {
					return httpx.Internal("failed to scan wallet ledger row", err)
				}
				if err := cw.write([]string{
					fmt.Sprintf("%d", id), csvSafeCell(userID), csvSafeCell(entryType), csvSafeCell(fundType),
					fmt.Sprintf("%d", amount), fmt.Sprintf("%d", balance),
					csvSafeCell(idemKey), csvSafeCell(reason), csvSafeCell(txTime),
				}); err != nil {
					return err
				}
			}
			if err := rows.Err(); err != nil {
				return httpx.Internal("failed to read wallet ledger", err)
			}
			return nil
		})
}

func exportKYCStatuses(ctx context.Context, w stdhttp.ResponseWriter, db *sql.DB, actorID string) error {
	ctx, cancel := context.WithTimeout(ctx, reportExportDBTimeout)
	defer cancel()
	return writeCSVReport(w, "kyc-statuses.csv",
		func() { recordProviderOpsAuditAction(actorID, "report.exported", "kyc-statuses", nil) },
		func(cw *cappedCSVWriter) error {
			rows, err := db.QueryContext(ctx, `
SELECT user_id, status, risk_level, COALESCE(provider,''),
       COALESCE(CAST(last_verified_at AS TEXT),''), COALESCE(rejection_reason,''),
       CAST(updated_at AS TEXT)
FROM kyc_status ORDER BY updated_at DESC`)
			if err != nil {
				return httpx.Internal("failed to query kyc statuses", err)
			}
			defer rows.Close()
			if err := cw.write([]string{"user_id", "status", "risk_level", "provider", "last_verified_at", "rejection_reason", "updated_at"}); err != nil {
				return err
			}
			for rows.Next() {
				var userID, status, risk, provider, lastVerified, reason, updated string
				if err := rows.Scan(&userID, &status, &risk, &provider, &lastVerified, &reason, &updated); err != nil {
					return httpx.Internal("failed to scan kyc status row", err)
				}
				if err := cw.write([]string{
					csvSafeCell(userID), csvSafeCell(status), csvSafeCell(risk), csvSafeCell(provider),
					csvSafeCell(lastVerified), csvSafeCell(reason), csvSafeCell(updated),
				}); err != nil {
					return err
				}
			}
			if err := rows.Err(); err != nil {
				return httpx.Internal("failed to read kyc statuses", err)
			}
			return nil
		})
}

func exportSurveillanceAlerts(ctx context.Context, w stdhttp.ResponseWriter, db *sql.DB, actorID string) error {
	ctx, cancel := context.WithTimeout(ctx, reportExportDBTimeout)
	defer cancel()
	return writeCSVReport(w, "surveillance-alerts.csv",
		func() { recordProviderOpsAuditAction(actorID, "report.exported", "surveillance-alerts", nil) },
		func(cw *cappedCSVWriter) error {
			rows, err := db.QueryContext(ctx, `
SELECT id, kind, severity, subject_id, COALESCE(market_id,''), summary, status,
       COALESCE(CAST(case_id AS TEXT),''), CAST(detected_at AS TEXT)
FROM surveillance_alerts ORDER BY detected_at DESC`)
			if err != nil {
				return httpx.Internal("failed to query surveillance alerts", err)
			}
			defer rows.Close()
			if err := cw.write([]string{"id", "kind", "severity", "subject_id", "market_id", "summary", "status", "case_id", "detected_at"}); err != nil {
				return err
			}
			for rows.Next() {
				var id, kind, sev, subject, market, summary, status, caseID, detected string
				if err := rows.Scan(&id, &kind, &sev, &subject, &market, &summary, &status, &caseID, &detected); err != nil {
					return httpx.Internal("failed to scan surveillance alert row", err)
				}
				if err := cw.write([]string{
					csvSafeCell(id), csvSafeCell(kind), csvSafeCell(sev), csvSafeCell(subject),
					csvSafeCell(market), csvSafeCell(summary), csvSafeCell(status), csvSafeCell(caseID), csvSafeCell(detected),
				}); err != nil {
					return err
				}
			}
			if err := rows.Err(); err != nil {
				return httpx.Internal("failed to read surveillance alerts", err)
			}
			return nil
		})
}
