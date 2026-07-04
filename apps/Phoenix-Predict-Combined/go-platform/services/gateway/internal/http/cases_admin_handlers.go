package http

import (
	"context"
	"database/sql"
	stdhttp "net/http"
	"sort"
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
		cases, err := listUnifiedCases(r.Context(), db, subjectID, limit)
		if err != nil {
			return httpx.Internal("failed to load cases", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"cases": cases})
	}))
}

func listUnifiedCases(ctx context.Context, db *sql.DB, subjectID string, limit int) ([]unifiedCase, error) {
	ctx, cancel := context.WithTimeout(ctx, casesQueryTimeout)
	defer cancel()

	out := []unifiedCase{}

	// AML cases — subject-scoped when a subjectId is supplied.
	amlQuery := `SELECT id, title, status, priority, subject_id, opened_by, CAST(created_at AS TEXT) FROM aml_cases`
	var amlArgs []any
	if subjectID != "" {
		amlQuery += ` WHERE subject_id = $1`
		amlArgs = append(amlArgs, subjectID)
	}
	amlQuery += ` ORDER BY created_at DESC LIMIT ` + strconv.Itoa(limit)
	amlRows, err := db.QueryContext(ctx, amlQuery, amlArgs...)
	if err != nil {
		return nil, err
	}
	for amlRows.Next() {
		var id int64
		var title, status, priority, subj, openedBy, createdAt string
		if err := amlRows.Scan(&id, &title, &status, &priority, &subj, &openedBy, &createdAt); err != nil {
			amlRows.Close()
			return nil, err
		}
		out = append(out, unifiedCase{
			ID:        "aml-" + strconv.FormatInt(id, 10),
			Type:      "aml",
			Title:     redactLaunchProhibitedUserText(title),
			Status:    status,
			Priority:  priority,
			SubjectID: subj,
			OpenedBy:  openedBy,
			CreatedAt: createdAt,
		})
	}
	if err := amlRows.Err(); err != nil {
		amlRows.Close()
		return nil, err
	}
	amlRows.Close()

	// Surveillance cases are per-market, not per-player, so they appear only in
	// the full center (no subject filter).
	if subjectID == "" {
		survRows, err := db.QueryContext(ctx,
			`SELECT id, title, status, priority, opened_by, CAST(created_at AS TEXT) FROM surveillance_cases ORDER BY created_at DESC LIMIT `+strconv.Itoa(limit))
		if err != nil {
			return nil, err
		}
		for survRows.Next() {
			var id int64
			var title, status, priority, openedBy, createdAt string
			if err := survRows.Scan(&id, &title, &status, &priority, &openedBy, &createdAt); err != nil {
				survRows.Close()
				return nil, err
			}
			out = append(out, unifiedCase{
				ID:        "surveillance-" + strconv.FormatInt(id, 10),
				Type:      "surveillance",
				Title:     redactLaunchProhibitedUserText(title),
				Status:    status,
				Priority:  priority,
				OpenedBy:  openedBy,
				CreatedAt: createdAt,
			})
		}
		if err := survRows.Err(); err != nil {
			survRows.Close()
			return nil, err
		}
		survRows.Close()
	}

	// Most-recent-first across both domains; cap at the requested limit.
	sort.SliceStable(out, func(i, j int) bool { return out[i].CreatedAt > out[j].CreatedAt })
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}
