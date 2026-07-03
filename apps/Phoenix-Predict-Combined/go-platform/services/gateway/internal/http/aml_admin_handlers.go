package http

import (
	"context"
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/aml"
	"phoenix-revival/platform/transport/httpx"
)

// amlAdminStore is what the AML back office needs from the store — a
// consumer-side interface so the route tests can stub it.
// *aml.Store satisfies it.
type amlAdminStore interface {
	ListRules(ctx context.Context) ([]aml.Rule, error)
	UpsertRule(ctx context.Context, r aml.Rule) (int64, error)
	ListAlerts(ctx context.Context, status string, limit, offset int) ([]aml.Alert, error)
	DismissAlert(ctx context.Context, alertID int64) error
	ListCases(ctx context.Context, status string, limit, offset int) ([]aml.Case, error)
	GetCase(ctx context.Context, caseID int64) (*aml.Case, error)
	OpenCase(ctx context.Context, title, priority, subjectID, openedBy string, alertIDs []int64) (*aml.Case, error)
	UpdateCaseStatus(ctx context.Context, caseID int64, status, resolution, sarReference string) (*aml.Case, error)
}

// amlScanner triggers a manual money-flow scan (the same ScanOnce the
// background worker runs). *aml.Scanner satisfies it.
type amlScanner interface {
	ScanOnce(ctx context.Context) (int, error)
}

func mapAMLError(err error) error {
	switch {
	case errors.Is(err, aml.ErrNotFound):
		return httpx.NotFound("not found")
	case errors.Is(err, aml.ErrResolutionRequired):
		return httpx.BadRequest("a resolution is required to close a case", map[string]any{"field": "resolution"})
	case errors.Is(err, aml.ErrCaseClosed):
		return httpx.Conflict("case is already closed and cannot be changed", nil)
	case errors.Is(err, aml.ErrInvalidInput):
		return httpx.BadRequest("invalid input", nil)
	default:
		return httpx.Internal("aml operation failed", err)
	}
}

// registerAMLAdminRoutes wires the money-flow AML back office (PAM spec §12
// KYC, AML, Risk, and Compliance + §19 Case Management). All reads are
// compliance:read; all mutations are compliance:write and audited.
//
//	GET  /api/v1/admin/aml/rules                         (compliance:read)
//	POST /api/v1/admin/aml/rules  {rule}                 (compliance:write) — load a threshold as data
//	GET  /api/v1/admin/aml/alerts?status=&limit=&offset= (compliance:read)
//	POST /api/v1/admin/aml/alerts/{id}/dismiss           (compliance:write)
//	POST /api/v1/admin/aml/scan                          (compliance:write) — run ScanOnce now
//	GET  /api/v1/admin/aml/cases?status=&limit=&offset=  (compliance:read)
//	POST /api/v1/admin/aml/cases  {title,priority,subjectId,alertIds}   (compliance:write)
//	GET  /api/v1/admin/aml/cases/{id}                    (compliance:read)
//	PUT  /api/v1/admin/aml/cases/{id}  {status,resolution,sarReference} (compliance:write)
func registerAMLAdminRoutes(mux *stdhttp.ServeMux, store amlAdminStore, scanner amlScanner) {
	mux.Handle("/api/v1/admin/aml/rules", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireAdminPermission(r, "compliance:read"); err != nil {
				return err
			}
			rules, err := store.ListRules(r.Context())
			if err != nil {
				return httpx.Internal("failed to list AML rules", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"rules": rules, "total": len(rules)})
		case stdhttp.MethodPost:
			if err := requireAdminPermission(r, "compliance:write"); err != nil {
				return err
			}
			var rule aml.Rule
			if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			// A rule name is a back-office compliance label (not launch-facing
			// user text), so it is validated for shape only — it legitimately
			// contains money-movement words like "deposit"/"withdrawal". The
			// store enforces the rest (non-empty + valid kind).
			rule.Name = strings.TrimSpace(rule.Name)
			if rule.Name == "" || len(rule.Name) > 120 {
				return httpx.BadRequest("name is required (max 120 chars)", map[string]any{"field": "name"})
			}
			id, err := store.UpsertRule(r.Context(), rule)
			if err != nil {
				return mapAMLError(err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "aml.rule_upserted",
				strconv.FormatInt(id, 10), map[string]any{"kind": rule.Kind, "enabled": rule.Enabled, "riskPoints": rule.RiskPoints})
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"id": id})
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	mux.Handle("/api/v1/admin/aml/alerts", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		status := strings.TrimSpace(r.URL.Query().Get("status"))
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
		alerts, err := store.ListAlerts(r.Context(), status, limit, offset)
		if err != nil {
			return httpx.Internal("failed to list AML alerts", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"alerts": alerts, "total": len(alerts)})
	}))

	const alertsPrefix = "/api/v1/admin/aml/alerts/"
	mux.Handle(alertsPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:write"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, alertsPrefix), "/")
		parts := strings.Split(rest, "/")
		if len(parts) != 2 || parts[1] != "dismiss" {
			return httpx.NotFound("unknown AML path")
		}
		alertID, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid alert id", nil)
		}
		if err := store.DismissAlert(r.Context(), alertID); err != nil {
			return mapAMLError(err)
		}
		recordProviderOpsAuditAction(userIDFromRequest(r), "aml.alert_dismissed",
			strconv.FormatInt(alertID, 10), nil)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"id": alertID, "status": "dismissed"})
	}))

	mux.Handle("/api/v1/admin/aml/scan", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:write"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		n, err := scanner.ScanOnce(r.Context())
		if err != nil {
			return httpx.Internal("AML scan failed", err)
		}
		recordProviderOpsAuditAction(userIDFromRequest(r), "aml.scan_run", "", map[string]any{"rowsExamined": n})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"rowsExamined": n})
	}))

	mux.Handle("/api/v1/admin/aml/cases", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireAdminPermission(r, "compliance:read"); err != nil {
				return err
			}
			status := strings.TrimSpace(r.URL.Query().Get("status"))
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			cases, err := store.ListCases(r.Context(), status, limit, offset)
			if err != nil {
				return httpx.Internal("failed to list AML cases", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"cases": cases, "total": len(cases)})
		case stdhttp.MethodPost:
			if err := requireAdminPermission(r, "compliance:write"); err != nil {
				return err
			}
			var body struct {
				Title     string  `json:"title"`
				Priority  string  `json:"priority"`
				SubjectID string  `json:"subjectId"`
				AlertIDs  []int64 `json:"alertIds"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			// Back-office compliance label (not launch-facing) — shape only.
			title := strings.TrimSpace(body.Title)
			if title == "" || len(title) > 200 {
				return httpx.BadRequest("title is required (max 200 chars)", map[string]any{"field": "title"})
			}
			c, err := store.OpenCase(r.Context(), title, body.Priority, strings.TrimSpace(body.SubjectID), userIDFromRequest(r), body.AlertIDs)
			if err != nil {
				return mapAMLError(err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "aml.case_opened",
				strconv.FormatInt(c.ID, 10), map[string]any{"subjectId": c.SubjectID, "alertCount": c.AlertCount})
			return httpx.WriteJSON(w, stdhttp.StatusCreated, c)
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	const casesPrefix = "/api/v1/admin/aml/cases/"
	mux.Handle(casesPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, casesPrefix), "/")
		if rest == "" || strings.Contains(rest, "/") {
			return httpx.NotFound("unknown AML path")
		}
		caseID, err := strconv.ParseInt(rest, 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid case id", nil)
		}
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireAdminPermission(r, "compliance:read"); err != nil {
				return err
			}
			c, err := store.GetCase(r.Context(), caseID)
			if err != nil {
				return mapAMLError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, c)
		case stdhttp.MethodPut:
			if err := requireAdminPermission(r, "compliance:write"); err != nil {
				return err
			}
			var body struct {
				Status       string `json:"status"`
				Resolution   string `json:"resolution"`
				SARReference string `json:"sarReference"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			// Back-office compliance disposition text — shape only (an AML
			// resolution legitimately references deposits/withdrawals/SARs).
			resolution := strings.TrimSpace(body.Resolution)
			if len(resolution) > 2000 {
				return httpx.BadRequest("resolution too long (max 2000 chars)", map[string]any{"field": "resolution"})
			}
			c, err := store.UpdateCaseStatus(r.Context(), caseID, strings.TrimSpace(body.Status), resolution, strings.TrimSpace(body.SARReference))
			if err != nil {
				return mapAMLError(err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "aml.case_updated",
				strconv.FormatInt(caseID, 10), map[string]any{
					"status":       c.Status,
					"sarReference": c.SARReference,
					"resolution":   resolution,
				})
			return httpx.WriteJSON(w, stdhttp.StatusOK, c)
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPut)
		}
	}))
}
