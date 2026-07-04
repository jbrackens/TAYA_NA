package http

import (
	"context"
	"database/sql"
	stdhttp "net/http"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/platform/transport/httpx"
)

// Cross-domain case center (PAM spec §19 Case Management, slice 1): a single
// read-only view over the compliance case stores that own their own tables today
// — AML cases (subject-scoped) and market-integrity surveillance cases
// (market-scoped). It aggregates them into one typed list so a reviewer sees the
// whole case landscape in one place. Read-only over existing tables: no new
// table, no migration, no writes — each domain keeps its own audited
// create/close workflow and its own write permission. The unified SHARED MODEL
// (a cases table with assignee/SLA/notes across all six §19 types) is slice 2 and
// needs a schema-reconciliation design decision (see the ledger).
//
// RBAC choice: gated on compliance:read. The center is a read-only compliance
// overview; surveillance cases are compliance-relevant, and mutations still route
// through each domain's own permission (compliance:write / surveillance:write).

const casesQueryTimeout = 20 * time.Second

type unifiedCase struct {
	ID        string `json:"id"` // domain-prefixed, e.g. "aml-7" / "surveillance-3"
	Type      string `json:"type"`
	Title     string `json:"title"`
	Status    string `json:"status"`
	Priority  string `json:"priority"`
	SubjectID string `json:"subjectId,omitempty"`
	OpenedBy  string `json:"openedBy"`
	CreatedAt string `json:"createdAt"`
}

// registerCasesAdminRoutes wires:
//
//	GET /api/v1/admin/cases?subjectId=&limit=   (compliance:read)
//
// subjectId filters to a player's cases — only AML cases carry a subject, so a
// subject-scoped query returns AML cases only (surveillance cases are per-market,
// not per-player). Without subjectId it returns the full cross-domain center.
func registerCasesAdminRoutes(mux *stdhttp.ServeMux, db *sql.DB) {
	if db == nil {
		return
	}
	mux.Handle("/api/v1/admin/cases", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		subjectID := strings.TrimSpace(r.URL.Query().Get("subjectId"))
		limit := 200
		if v := strings.TrimSpace(r.URL.Query().Get("limit")); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 500 {
				limit = n
			}
		}
		// Surveillance cases are shown only to callers who ALSO hold surveillance:read
		// (compliance:read alone gates AML cases). compliance:read is not a superset of
		// surveillance:read — the RBAC permissions are independently grantable — so
		// including surveillance rows under compliance:read alone would leak them to a
		// role denied them on the dedicated /admin/surveillance/cases route
		// (verification #23 MED). Least-privilege: gate the surveillance branch too.
		includeSurveillance := requireAdminPermission(r, "surveillance:read") == nil
		cases, err := listUnifiedCases(r.Context(), db, subjectID, limit, includeSurveillance)
		if err != nil {
			return httpx.Internal("failed to load cases", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"cases": cases})
	}))
}

// listUnifiedCases returns the merged, most-recent-first case list. The merge,
// ordering, and LIMIT are all done in SQL over a UNION ALL so the sort is a real
// timestamptz comparison (not a lexicographic string compare on a tz-dependent
// text rendering) and the limit is applied once to the combined set, not per
// domain. Case titles are NOT redacted: they are back-office compliance artifacts
// that legitimately name deposits/withdrawals/payouts, exactly like AML rule
// names and SAR resolutions (which are also un-redacted); applying the
// launch-copy word filter would gut them.
//
// AML cases are subject-scoped when subjectID is set. Surveillance cases are
// market-scoped (no subject) so they appear only in the full center AND only when
// includeSurveillance is true (caller holds surveillance:read).
func listUnifiedCases(ctx context.Context, db *sql.DB, subjectID string, limit int, includeSurveillance bool) ([]unifiedCase, error) {
	ctx, cancel := context.WithTimeout(ctx, casesQueryTimeout)
	defer cancel()

	var parts []string
	var args []any

	amlPart := `SELECT 'aml' AS domain, id, title, status, priority, subject_id, opened_by, created_at FROM aml_cases`
	if subjectID != "" {
		args = append(args, subjectID)
		amlPart += ` WHERE subject_id = $` + strconv.Itoa(len(args))
	}
	parts = append(parts, amlPart)

	if includeSurveillance && subjectID == "" {
		parts = append(parts, `SELECT 'surveillance' AS domain, id, title, status, priority, '' AS subject_id, opened_by, created_at FROM surveillance_cases`)
	}

	// Wrap the UNION and order/limit on the real created_at (not its text form).
	query := `SELECT domain, id, title, status, priority, subject_id, opened_by, CAST(created_at AS TEXT)
FROM (` + strings.Join(parts, " UNION ALL ") + `) AS c
ORDER BY created_at DESC
LIMIT ` + strconv.Itoa(limit)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []unifiedCase{}
	for rows.Next() {
		var domain string
		var id int64
		var title, status, priority, subj, openedBy, createdAt string
		if err := rows.Scan(&domain, &id, &title, &status, &priority, &subj, &openedBy, &createdAt); err != nil {
			return nil, err
		}
		out = append(out, unifiedCase{
			ID:        domain + "-" + strconv.FormatInt(id, 10),
			Type:      domain,
			Title:     title,
			Status:    status,
			Priority:  priority,
			SubjectID: subj,
			OpenedBy:  openedBy,
			CreatedAt: createdAt,
		})
	}
	return out, rows.Err()
}
