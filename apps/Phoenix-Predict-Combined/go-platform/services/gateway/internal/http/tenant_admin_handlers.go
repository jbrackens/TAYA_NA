package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	stdhttp "net/http"
	"strings"
	"time"

	"phoenix-revival/platform/transport/httpx"
)

// Tenant/brand admin surface (PAM P2-1 peripheral): CRUD over the tenants
// directory (migration 037). This reads/writes only the tenants table — it
// does NOT scope the trading/wallet core (that is the protected-core epic in
// docs/pam/designs/p2-1-design.md). Gated on config:* (super-admin only, same
// as the platform-config editor — tenant onboarding is the same privilege
// class) and audited.

const tenantAdminDBTimeout = 10 * time.Second

var (
	errTenantExists  = errors.New("tenant already exists")
	errTenantInvalid = errors.New("tenant id and display name are required")
)

type tenantRow struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
}

// registerTenantAdminRoutes wires:
//
//	GET  /api/v1/admin/tenants          -> list                 (config:read)
//	POST /api/v1/admin/tenants          -> create {id,displayName} (config:write)
//	PUT  /api/v1/admin/tenants/{id}     -> {status} update      (config:write)
func registerTenantAdminRoutes(mux *stdhttp.ServeMux, db *sql.DB) {
	if db == nil {
		return
	}

	mux.Handle("/api/v1/admin/tenants", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireAdminPermission(r, "config:read"); err != nil {
				return err
			}
			tenants, err := listTenants(r.Context(), db)
			if err != nil {
				return httpx.Internal("failed to list tenants", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"tenants": tenants})
		case stdhttp.MethodPost:
			if err := requireAdminPermission(r, "config:write"); err != nil {
				return err
			}
			var body struct {
				ID          string `json:"id"`
				DisplayName string `json:"displayName"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			id := strings.TrimSpace(strings.ToLower(body.ID))
			name := strings.TrimSpace(body.DisplayName)
			// Both the slug and the display name are checked against
			// launch-prohibited copy — a slug like "cashout-brand" is as
			// undesirable as a display name would be.
			if err := validateLaunchFacingReason("id", id); err != nil {
				return err
			}
			if err := validateLaunchFacingReason("displayName", name); err != nil {
				return err
			}
			t, err := createTenant(r.Context(), db, id, name)
			if err != nil {
				switch err {
				case errTenantInvalid:
					return httpx.BadRequest("id and displayName are required; id must be a slug", nil)
				case errTenantExists:
					return httpx.Conflict("a tenant with that id already exists", nil)
				default:
					return httpx.Internal("failed to create tenant", err)
				}
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "tenant.created", id, map[string]any{"displayName": name})
			return httpx.WriteJSON(w, stdhttp.StatusCreated, t)
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	const prefix = "/api/v1/admin/tenants/"
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "config:write"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPut {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPut)
		}
		id := strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
		if id == "" || strings.Contains(id, "/") {
			return httpx.NotFound("unknown tenant path")
		}
		var body struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		status := strings.TrimSpace(strings.ToLower(body.Status))
		if status != "active" && status != "suspended" {
			return httpx.BadRequest("status must be 'active' or 'suspended'", map[string]any{"field": "status"})
		}
		t, err := updateTenantStatus(r.Context(), db, id, status)
		if err != nil {
			if err == sql.ErrNoRows {
				return httpx.NotFound("tenant not found")
			}
			return httpx.Internal("failed to update tenant", err)
		}
		recordProviderOpsAuditAction(userIDFromRequest(r), "tenant.status_updated", id, map[string]any{"status": status})
		return httpx.WriteJSON(w, stdhttp.StatusOK, t)
	}))

	slog.Info("admin tenant routes registered")
}

func listTenants(ctx context.Context, db *sql.DB) ([]tenantRow, error) {
	ctx, cancel := context.WithTimeout(ctx, tenantAdminDBTimeout)
	defer cancel()
	rows, err := db.QueryContext(ctx, `
SELECT id, display_name, status, CAST(created_at AS TEXT)
FROM tenants ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []tenantRow{}
	for rows.Next() {
		var t tenantRow
		if err := rows.Scan(&t.ID, &t.DisplayName, &t.Status, &t.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func createTenant(ctx context.Context, db *sql.DB, id, displayName string) (*tenantRow, error) {
	if id == "" || displayName == "" || strings.ContainsAny(id, " /") {
		return nil, errTenantInvalid
	}
	ctx, cancel := context.WithTimeout(ctx, tenantAdminDBTimeout)
	defer cancel()
	res, err := db.ExecContext(ctx, `
INSERT INTO tenants (id, display_name, status) VALUES ($1, $2, 'active')
ON CONFLICT (id) DO NOTHING`, id, displayName)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, errTenantExists
	}
	return getTenant(ctx, db, id)
}

func updateTenantStatus(ctx context.Context, db *sql.DB, id, status string) (*tenantRow, error) {
	ctx, cancel := context.WithTimeout(ctx, tenantAdminDBTimeout)
	defer cancel()
	res, err := db.ExecContext(ctx, `UPDATE tenants SET status = $2 WHERE id = $1`, id, status)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, sql.ErrNoRows
	}
	return getTenant(ctx, db, id)
}

func getTenant(ctx context.Context, db *sql.DB, id string) (*tenantRow, error) {
	t := &tenantRow{}
	err := db.QueryRowContext(ctx, `
SELECT id, display_name, status, CAST(created_at AS TEXT) FROM tenants WHERE id = $1`, id).
		Scan(&t.ID, &t.DisplayName, &t.Status, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}
