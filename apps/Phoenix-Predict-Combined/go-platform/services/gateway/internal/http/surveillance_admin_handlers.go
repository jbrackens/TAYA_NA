package http

import (
	"context"
	"encoding/json"
	"log/slog"
	stdhttp "net/http"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/surveillance"
	"phoenix-revival/platform/transport/httpx"
)

// surveillanceStore is the consumer-side slice of *surveillance.Store the
// admin routes need, so handler tests can stub it.
type surveillanceStore interface {
	ListAlerts(ctx context.Context, status string, limit, offset int) ([]surveillance.Alert, error)
	DismissAlert(ctx context.Context, alertID int64) error
	ListCases(ctx context.Context, limit, offset int) ([]surveillance.Case, error)
	GetCase(ctx context.Context, caseID int64) (*surveillance.Case, error)
	OpenCase(ctx context.Context, title, priority, openedBy string, alertIDs []int64) (*surveillance.Case, error)
	UpdateCaseStatus(ctx context.Context, caseID int64, status, resolution string) (*surveillance.Case, error)
}

// surveillanceScanner runs detectors on demand (the batch worker also calls it).
type surveillanceScanner interface {
	Scan(ctx context.Context, lookbackHours int) ([]surveillance.ScanResult, error)
}

// surveillanceScannerAdapter adapts *surveillance.Engine (duration-based) to
// the hours-based admin API. A non-positive request defaults to 24h.
type surveillanceScannerAdapter struct {
	engine *surveillance.Engine
}

func (a surveillanceScannerAdapter) Scan(ctx context.Context, lookbackHours int) ([]surveillance.ScanResult, error) {
	if lookbackHours <= 0 {
		lookbackHours = 24
	}
	if lookbackHours > 24*90 {
		lookbackHours = 24 * 90 // cap a manual scan at 90 days
	}
	return a.engine.Scan(ctx, time.Duration(lookbackHours)*time.Hour)
}

// registerSurveillanceAdminRoutes wires the market-integrity back office:
//
//	GET  /api/v1/admin/surveillance/alerts?status=&limit=&offset=   (surveillance:read)
//	POST /api/v1/admin/surveillance/alerts/{id}/dismiss             (surveillance:write)
//	POST /api/v1/admin/surveillance/scan  {lookbackHours}           (surveillance:write)
//	GET  /api/v1/admin/surveillance/cases?limit=&offset=            (surveillance:read)
//	POST /api/v1/admin/surveillance/cases  {title,priority,alertIds} (surveillance:write)
//	GET  /api/v1/admin/surveillance/cases/{id}                      (surveillance:read)
//	PUT  /api/v1/admin/surveillance/cases/{id}  {status,resolution} (surveillance:write)
func registerSurveillanceAdminRoutes(mux *stdhttp.ServeMux, store surveillanceStore, scanner surveillanceScanner) {
	mux.Handle("/api/v1/admin/surveillance/alerts", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "surveillance:read"); err != nil {
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
			return httpx.Internal("failed to list surveillance alerts", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"alerts": alerts, "total": len(alerts)})
	}))

	const alertsPrefix = "/api/v1/admin/surveillance/alerts/"
	mux.Handle(alertsPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "surveillance:write"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, alertsPrefix), "/")
		parts := strings.Split(rest, "/")
		if len(parts) != 2 || parts[1] != "dismiss" {
			return httpx.NotFound("unknown surveillance path")
		}
		alertID, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid alert id", nil)
		}
		if err := store.DismissAlert(r.Context(), alertID); err != nil {
			return mapSurveillanceError(err)
		}
		recordProviderOpsAuditAction(userIDFromRequest(r), "surveillance.alert_dismissed",
			strconv.FormatInt(alertID, 10), nil)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"id": alertID, "status": "dismissed"})
	}))

	mux.Handle("/api/v1/admin/surveillance/scan", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "surveillance:write"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var body struct {
			LookbackHours int `json:"lookbackHours"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		results, err := scanner.Scan(r.Context(), body.LookbackHours)
		if err != nil {
			return httpx.Internal("surveillance scan failed", err)
		}
		recordProviderOpsAuditAction(userIDFromRequest(r), "surveillance.scan_run", "", map[string]any{
			"lookbackHours": body.LookbackHours,
			"results":       results,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"results": results})
	}))

	mux.Handle("/api/v1/admin/surveillance/cases", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireAdminPermission(r, "surveillance:read"); err != nil {
				return err
			}
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			cases, err := store.ListCases(r.Context(), limit, offset)
			if err != nil {
				return httpx.Internal("failed to list cases", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"cases": cases, "total": len(cases)})
		case stdhttp.MethodPost:
			if err := requireAdminPermission(r, "surveillance:write"); err != nil {
				return err
			}
			var body struct {
				Title    string  `json:"title"`
				Priority string  `json:"priority"`
				AlertIDs []int64 `json:"alertIds"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			title := strings.TrimSpace(body.Title)
			if err := validateLaunchFacingReason("title", title); err != nil {
				return err
			}
			c, err := store.OpenCase(r.Context(), title, body.Priority, userIDFromRequest(r), body.AlertIDs)
			if err != nil {
				return mapSurveillanceError(err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "surveillance.case_opened",
				strconv.FormatInt(c.ID, 10), map[string]any{"alertCount": c.AlertCount})
			return httpx.WriteJSON(w, stdhttp.StatusCreated, c)
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	const casesPrefix = "/api/v1/admin/surveillance/cases/"
	mux.Handle(casesPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, casesPrefix), "/")
		if rest == "" || strings.Contains(rest, "/") {
			return httpx.NotFound("unknown surveillance path")
		}
		caseID, err := strconv.ParseInt(rest, 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid case id", nil)
		}
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireAdminPermission(r, "surveillance:read"); err != nil {
				return err
			}
			c, err := store.GetCase(r.Context(), caseID)
			if err != nil {
				return mapSurveillanceError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, c)
		case stdhttp.MethodPut:
			if err := requireAdminPermission(r, "surveillance:write"); err != nil {
				return err
			}
			var body struct {
				Status     string `json:"status"`
				Resolution string `json:"resolution"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			resolution := strings.TrimSpace(body.Resolution)
			if err := validateLaunchFacingReason("resolution", resolution); err != nil {
				return err
			}
			c, err := store.UpdateCaseStatus(r.Context(), caseID, strings.TrimSpace(body.Status), resolution)
			if err != nil {
				return mapSurveillanceError(err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "surveillance.case_updated",
				strconv.FormatInt(caseID, 10), map[string]any{"status": c.Status})
			return httpx.WriteJSON(w, stdhttp.StatusOK, c)
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPut)
		}
	}))

	slog.Info("admin surveillance routes registered")
}

func mapSurveillanceError(err error) error {
	switch err {
	case surveillance.ErrNotFound:
		return httpx.NotFound("surveillance record not found")
	case surveillance.ErrInvalidInput:
		return httpx.BadRequest("invalid surveillance request (need a title and at least one open alert)", nil)
	case surveillance.ErrResolutionRequired:
		return httpx.BadRequest("a resolution is required to close a case", map[string]any{"field": "resolution"})
	default:
		return httpx.Internal("surveillance operation failed", err)
	}
}
