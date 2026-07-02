package http

import (
	"context"
	"encoding/json"
	"log/slog"
	stdhttp "net/http"
	"strings"

	"phoenix-revival/gateway/internal/platformconfig"
	"phoenix-revival/platform/transport/httpx"
)

// platformConfigAdmin is the consumer-side slice the admin routes need so
// handler tests can stub it. *platformconfig.Store satisfies it.
type platformConfigAdmin interface {
	List(ctx context.Context) ([]platformconfig.Flag, error)
	Get(ctx context.Context, key string) (*platformconfig.Flag, error)
	Upsert(ctx context.Context, f platformconfig.Flag, updatedBy string) (*platformconfig.Flag, error)
}

// registerPlatformConfigAdminRoutes wires the DB-backed feature-flag / config
// editor (PAM P2-1 peripheral):
//
//	GET /api/v1/admin/config/flags          -> list    (config:read)
//	GET /api/v1/admin/config/flags/{key}    -> one     (config:read)
//	PUT /api/v1/admin/config/flags/{key}    -> upsert  (config:write)
func registerPlatformConfigAdminRoutes(mux *stdhttp.ServeMux, store platformConfigAdmin) {
	mux.Handle("/api/v1/admin/config/flags", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "config:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		flags, err := store.List(r.Context())
		if err != nil {
			return httpx.Internal("failed to list config flags", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"flags": flags})
	}))

	const prefix = "/api/v1/admin/config/flags/"
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		key := strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
		if key == "" || strings.Contains(key, "/") {
			return httpx.NotFound("unknown config path")
		}
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireAdminPermission(r, "config:read"); err != nil {
				return err
			}
			f, err := store.Get(r.Context(), key)
			if err != nil {
				if err == platformconfig.ErrNotFound {
					return httpx.NotFound("config flag not found")
				}
				return httpx.Internal("failed to read config flag", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, f)
		case stdhttp.MethodPut:
			if err := requireAdminPermission(r, "config:write"); err != nil {
				return err
			}
			var body struct {
				Value       string `json:"value"`
				Description string `json:"description"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			if err := validateLaunchFacingReason("description", strings.TrimSpace(body.Description)); err != nil {
				return err
			}
			f, err := store.Upsert(r.Context(), platformconfig.Flag{
				Key: key, Value: body.Value, Description: body.Description,
			}, userIDFromRequest(r))
			if err != nil {
				if err == platformconfig.ErrInvalidKey {
					return httpx.BadRequest("config key is required", nil)
				}
				return httpx.Internal("failed to save config flag", err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "config.flag_updated", key, map[string]any{
				"value": body.Value,
			})
			return httpx.WriteJSON(w, stdhttp.StatusOK, f)
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPut)
		}
	}))

	slog.Info("admin platform-config routes registered")
}
