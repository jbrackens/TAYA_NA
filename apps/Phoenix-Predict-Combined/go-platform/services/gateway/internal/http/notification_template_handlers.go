package http

import (
	"context"
	"encoding/json"
	"log/slog"
	stdhttp "net/http"
	"strings"

	"phoenix-revival/gateway/internal/notify"
	"phoenix-revival/platform/transport/httpx"
)

// notificationTemplateStore is the process-wide handle senders use to resolve
// operator-editable copy; nil until a DB-backed store is wired at startup, in
// which case senders fall back to built-in text.
var notificationTemplateStore *notify.TemplateStore

// notificationTemplateAdmin is the consumer-side slice the admin routes need,
// so handler tests can stub it. *notify.TemplateStore satisfies it.
type notificationTemplateAdmin interface {
	List(ctx context.Context) ([]notify.Template, error)
	Get(ctx context.Context, key string) (*notify.Template, error)
	Upsert(ctx context.Context, t notify.Template, updatedBy string) (*notify.Template, error)
}

// registerNotificationTemplateAdminRoutes wires the back-office editor:
//
//	GET /api/v1/admin/notification-templates            -> list      (notifications:read)
//	GET /api/v1/admin/notification-templates/{key}      -> one       (notifications:read)
//	PUT /api/v1/admin/notification-templates/{key}      -> upsert    (notifications:write)
func registerNotificationTemplateAdminRoutes(mux *stdhttp.ServeMux, store notificationTemplateAdmin) {
	mux.Handle("/api/v1/admin/notification-templates", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "notifications:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		templates, err := store.List(r.Context())
		if err != nil {
			return httpx.Internal("failed to list notification templates", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"templates": templates})
	}))

	const prefix = "/api/v1/admin/notification-templates/"
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		key := strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
		if key == "" || strings.Contains(key, "/") {
			return httpx.NotFound("unknown notification-template path")
		}
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireAdminPermission(r, "notifications:read"); err != nil {
				return err
			}
			t, err := store.Get(r.Context(), key)
			if err != nil {
				if err == notify.ErrTemplateNotFound {
					return httpx.NotFound("notification template not found")
				}
				return httpx.Internal("failed to read notification template", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, t)
		case stdhttp.MethodPut:
			if err := requireAdminPermission(r, "notifications:write"); err != nil {
				return err
			}
			var body struct {
				Subject string `json:"subject"`
				Body    string `json:"body"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			// Copy is staff-authored back-office content, but keep it inside the
			// launch-safe wording guard like other admin free-text.
			if err := validateLaunchFacingReason("subject", strings.TrimSpace(body.Subject)); err != nil {
				return err
			}
			if err := validateLaunchFacingReason("body", strings.TrimSpace(body.Body)); err != nil {
				return err
			}
			t, err := store.Upsert(r.Context(), notify.Template{
				Key: key, Subject: body.Subject, Body: body.Body,
			}, userIDFromRequest(r))
			if err != nil {
				if err == notify.ErrInvalidTemplate {
					return httpx.BadRequest("key, subject, and body are required", nil)
				}
				return httpx.Internal("failed to save notification template", err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "notification_template.updated", key, nil)
			return httpx.WriteJSON(w, stdhttp.StatusOK, t)
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPut)
		}
	}))

	slog.Info("admin notification-template routes registered")
}
