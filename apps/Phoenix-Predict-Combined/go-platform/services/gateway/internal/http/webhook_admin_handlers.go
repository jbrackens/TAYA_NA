package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	stdhttp "net/http"
	"net/url"
	"strings"

	"phoenix-revival/gateway/internal/rbac"
	"phoenix-revival/gateway/internal/webhooks"
	"phoenix-revival/platform/transport/httpx"
)

// webhookEndpointStore is the narrow slice of webhooks.Store the admin routes
// need; *webhooks.SQLStore satisfies it. Kept small so the handler is
// unit-testable with a fake.
type webhookEndpointStore interface {
	CreateEndpoint(ctx context.Context, ep webhooks.Endpoint) (webhooks.Endpoint, error)
	ListEndpoints(ctx context.Context, userID string) ([]webhooks.Endpoint, error)
	SetEndpointActive(ctx context.Context, id, userID string, active bool) error
}

const webhookEndpointsPath = "/api/v1/admin/webhook-endpoints"

// registerWebhookAdminRoutes exposes operator-managed partner webhook endpoints
// (P3-03). Mirrors the partner-keys admin API: an operator with partners:write
// registers a receiver FOR a partner (any target userId) — the "onboard a
// partner without code changes" path — and partners:read lists them. The
// signing secret is returned once, on creation, and never shown again (only a
// masked hint on list). Admin-namespaced (/api/v1/admin/…), so it is exempt
// from the OpenAPI drift gate, like the other office-only admin routes.
func registerWebhookAdminRoutes(mux *stdhttp.ServeMux, rbacSvc *rbac.Service, store webhookEndpointStore) {
	// Collection: POST register, GET list.
	mux.Handle(webhookEndpointsPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodPost:
			if err := requireRBACPermission(r, rbacSvc, "partners:write"); err != nil {
				return err
			}
			var req struct {
				UserID string   `json:"userId"`
				URL    string   `json:"url"`
				Events []string `json:"events"`
				Secret string   `json:"secret"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			req.UserID = strings.TrimSpace(req.UserID)
			req.URL = strings.TrimSpace(req.URL)
			if req.UserID == "" {
				return httpx.BadRequest("userId is required (the partner this endpoint belongs to)", map[string]any{"field": "userId"})
			}
			if err := validateWebhookURL(req.URL); err != nil {
				return httpx.BadRequest(err.Error(), map[string]any{"field": "url"})
			}
			if bad := unknownEventTypes(req.Events); len(bad) > 0 {
				return httpx.BadRequest("unknown event type(s): "+strings.Join(bad, ", "), map[string]any{"field": "events"})
			}

			secret := strings.TrimSpace(req.Secret)
			if secret == "" {
				gen, err := webhooks.GenerateSecret()
				if err != nil {
					return httpx.Internal("failed to generate signing secret", err)
				}
				secret = gen
			}
			created, err := store.CreateEndpoint(r.Context(), webhooks.Endpoint{
				PartnerID: req.UserID,
				URL:       req.URL,
				Secret:    secret,
				Events:    req.Events,
				Active:    true,
			})
			if err != nil {
				return httpx.Internal("failed to create webhook endpoint", err)
			}

			recordMoneyAuditEntry(rbacActor(r), "partner.webhook.registered", req.UserID, map[string]any{
				"endpointId": created.ID,
				"url":        created.URL,
				"events":     created.Events,
			})
			slog.Info("webhook endpoint registered", "actor", rbacActor(r), "partner_user_id", req.UserID, "endpoint_id", created.ID)

			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
				"id":     created.ID,
				"userId": created.PartnerID,
				"url":    created.URL,
				"events": created.Events,
				"active": created.Active,
				"secret": secret,
				"note":   "Save this signing secret — it will not be shown again",
			})

		case stdhttp.MethodGet:
			if err := requireRBACPermission(r, rbacSvc, "partners:read"); err != nil {
				return err
			}
			userID := strings.TrimSpace(r.URL.Query().Get("userId"))
			if userID == "" {
				return httpx.BadRequest("userId query parameter is required", map[string]any{"field": "userId"})
			}
			eps, err := store.ListEndpoints(r.Context(), userID)
			if err != nil {
				return httpx.Internal("failed to list webhook endpoints", err)
			}
			out := make([]map[string]any, 0, len(eps))
			for _, ep := range eps {
				out = append(out, map[string]any{
					"id":           ep.ID,
					"url":          ep.URL,
					"events":       ep.Events,
					"active":       ep.Active,
					"secretMasked": maskSecret(ep.Secret),
				})
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"userId": userID, "endpoints": out})

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	// Item: PUT toggle active (pause/resume). Owner-scoped by userId.
	mux.Handle(webhookEndpointsPath+"/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPut {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPut)
		}
		if err := requireRBACPermission(r, rbacSvc, "partners:write"); err != nil {
			return err
		}
		id := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, webhookEndpointsPath+"/"))
		if id == "" || strings.Contains(id, "/") {
			return httpx.BadRequest("endpoint id is required in the path", nil)
		}
		var req struct {
			UserID string `json:"userId"`
			Active *bool  `json:"active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		req.UserID = strings.TrimSpace(req.UserID)
		if req.UserID == "" {
			return httpx.BadRequest("userId is required (the endpoint owner)", map[string]any{"field": "userId"})
		}
		if req.Active == nil {
			return httpx.BadRequest("active (boolean) is required", map[string]any{"field": "active"})
		}
		if err := store.SetEndpointActive(r.Context(), id, req.UserID, *req.Active); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return httpx.NotFound("webhook endpoint not found for that owner")
			}
			return httpx.Internal("failed to update webhook endpoint", err)
		}
		recordMoneyAuditEntry(rbacActor(r), "partner.webhook.toggled", req.UserID, map[string]any{
			"endpointId": id,
			"active":     *req.Active,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"id": id, "userId": req.UserID, "active": *req.Active})
	}))

	slog.Info("webhook admin API routes registered (register/list/toggle partner endpoints; partners:write/read)")
}

// validateWebhookURL requires a parseable http(s) URL with a host. https is
// expected in production (and can be enforced at the edge); http is permitted
// so local/demo receivers work.
func validateWebhookURL(raw string) error {
	if raw == "" {
		return errors.New("url is required")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return errors.New("url is not a valid URL")
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return errors.New("url must be http or https")
	}
	if u.Host == "" {
		return errors.New("url must include a host")
	}
	return nil
}

// unknownEventTypes returns any requested event types not in the canonical set.
// An empty list (subscribe-all) is valid and returns nothing.
func unknownEventTypes(events []string) []string {
	var bad []string
	for _, e := range events {
		if !webhooks.KnownEventTypes[e] {
			bad = append(bad, e)
		}
	}
	return bad
}

// maskSecret shows only the prefix so an operator can correlate without
// exposing the signing key on list.
func maskSecret(s string) string {
	if len(s) <= len(webhooks.SecretPrefix)+4 {
		return webhooks.SecretPrefix + "…"
	}
	return s[:len(webhooks.SecretPrefix)+4] + "…"
}
