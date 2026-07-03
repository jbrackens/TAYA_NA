package http

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	stdhttp "net/http"
	"strings"
	"time"

	"phoenix-revival/platform/transport/httpx"
)

// Finance aggregate reports (PAM spec §23 Reporting, Dashboards, and Exports —
// the statutory "daily balance / transaction summary" report). These are
// read-only JSON aggregates over wallet_ledger that feed the finance dashboard;
// they never import or mutate the protected wallet package (raw *sql.DB, the
// AML-scanner precedent). RBAC-gated on finances:read.
//
// The per-day credit/debit classification is byte-for-byte the same CASE
// expression used by wallet.reconciliationSummaryFromDB, so the daily buckets
// sum exactly to the whole-period reconciliation summary — auditors can tie the
// two reports together.

const financeReportDBTimeout = 20 * time.Second

// registerFinanceReportRoutes wires:
//
//	GET /api/v1/admin/reports/daily-balance   (finances:read)
func registerFinanceReportRoutes(mux *stdhttp.ServeMux, db *sql.DB) {
	if db == nil {
		return
	}

	mux.Handle("/api/v1/admin/reports/daily-balance", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "finances:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		payload, err := dailyBalanceReport(r.Context(), db, r.URL.Query().Get("from"), r.URL.Query().Get("to"))
		if err != nil {
			return err
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, payload)
	}))

	slog.Info("admin finance-report (JSON) routes registered")
}

type dailyBalanceRow struct {
	Date          string `json:"date"`
	CreditsCents  int64  `json:"creditsCents"`
	DebitsCents   int64  `json:"debitsCents"`
	NetCents      int64  `json:"netCents"`
	EntryCount    int64  `json:"entryCount"`
	DistinctUsers int64  `json:"distinctUsers"`
}

type dailyBalanceReportResult struct {
	Unit string            `json:"unit"`
	From string            `json:"from,omitempty"`
	To   string            `json:"to,omitempty"`
	Days []dailyBalanceRow `json:"days"`
}

// dailyBalanceReport groups wallet_ledger money movement into UTC-day buckets.
// Optional from/to (YYYY-MM-DD, inclusive of the whole 'to' day) bound the
// report; a malformed date is a 400 before any query runs.
func dailyBalanceReport(ctx context.Context, db *sql.DB, fromStr, toStr string) (dailyBalanceReportResult, error) {
	ctx, cancel := context.WithTimeout(ctx, financeReportDBTimeout)
	defer cancel()

	var conds []string
	var args []any
	out := dailyBalanceReportResult{Unit: "PTS", Days: []dailyBalanceRow{}}
	if fromStr = strings.TrimSpace(fromStr); fromStr != "" {
		from, err := time.Parse("2006-01-02", fromStr)
		if err != nil {
			return dailyBalanceReportResult{}, httpx.BadRequest("invalid 'from' date; expected YYYY-MM-DD", nil)
		}
		args = append(args, from)
		conds = append(conds, fmt.Sprintf("transaction_time >= $%d", len(args)))
		out.From = fromStr
	}
	if toStr = strings.TrimSpace(toStr); toStr != "" {
		to, err := time.Parse("2006-01-02", toStr)
		if err != nil {
			return dailyBalanceReportResult{}, httpx.BadRequest("invalid 'to' date; expected YYYY-MM-DD", nil)
		}
		args = append(args, to.AddDate(0, 0, 1))
		conds = append(conds, fmt.Sprintf("transaction_time < $%d", len(args)))
		out.To = toStr
	}

	// UTC-day buckets (deterministic regardless of server tz); credit/debit
	// CASE mirrors wallet.reconciliationSummaryFromDB exactly.
	query := `
SELECT to_char(date_trunc('day', transaction_time AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
       COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount_cents ELSE 0 END), 0) AS credits,
       COALESCE(SUM(CASE WHEN entry_type = 'debit'  THEN amount_cents ELSE 0 END), 0) AS debits,
       COUNT(1) AS entry_count,
       COUNT(DISTINCT user_id) AS distinct_users
FROM wallet_ledger`
	if len(conds) > 0 {
		query += " WHERE " + strings.Join(conds, " AND ")
	}
	query += " GROUP BY day ORDER BY day ASC"

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return dailyBalanceReportResult{}, httpx.Internal("failed to query daily balance", err)
	}
	defer rows.Close()

	for rows.Next() {
		var row dailyBalanceRow
		if err := rows.Scan(&row.Date, &row.CreditsCents, &row.DebitsCents, &row.EntryCount, &row.DistinctUsers); err != nil {
			return dailyBalanceReportResult{}, httpx.Internal("failed to scan daily balance row", err)
		}
		row.NetCents = row.CreditsCents - row.DebitsCents
		out.Days = append(out.Days, row)
	}
	if err := rows.Err(); err != nil {
		return dailyBalanceReportResult{}, httpx.Internal("failed to read daily balance", err)
	}
	return out, nil
}
