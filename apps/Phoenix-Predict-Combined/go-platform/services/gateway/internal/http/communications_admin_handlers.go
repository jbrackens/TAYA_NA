package http

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/communications"
	"phoenix-revival/gateway/internal/notify"
	"phoenix-revival/platform/transport/httpx"
)

// communicationsStore is the seam the comms routes need; *communications.Store
// satisfies it. Kept as an interface so the handlers can be tested without a
// live database.
type communicationsStore interface {
	ListForUser(ctx context.Context, userID string, limit, offset int) ([]communications.Communication, error)
	Record(ctx context.Context, c communications.Communication) (communications.Communication, error)
	RecipientEmail(ctx context.Context, userID string) (string, error)
}

// allowedCommChannels is the closed set of communication channels (§20:
// email/SMS/push/in-app). Only email has a wired transport today; the others are
// recorded but not dispatched (see sendPlayerCommunication).
var allowedCommChannels = map[string]bool{"email": true, "sms": true, "push": true, "in_app": true}

// registerCommunicationsAdminRoutes wires the per-player communications surface
// (GAP-43, PAM spec §20 Notes, Documents, and Communication History; Scenario 12):
//
//	GET  /api/v1/admin/communications/{userId}  (users:read)  — sent-content history
//	POST /api/v1/admin/communications/{userId}  (users:write) — agent-initiated templated send
//
// The store reads/writes only its own player_communications table and resolves
// the recipient from punters read-only — no prediction/wallet core. Registered
// under its own /communications/ prefix (not the /punters/ subtree owned by the
// manual-dispatch punter-detail router).
func registerCommunicationsAdminRoutes(mux *stdhttp.ServeMux, store communicationsStore, notifier notify.Notifier) {
	if store == nil {
		return
	}
	// Per-actor throttle on the send (GAP-75, §27): a compromised admin session
	// or a looping caller must not be able to spam a player / the mail relay.
	sendLimiter := newUserRateLimiter(commsSendRateLimitPerMin(), commsSendRateLimitPerMin())
	handler := httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		var perm string
		switch r.Method {
		case stdhttp.MethodGet:
			perm = "users:read"
		case stdhttp.MethodPost:
			perm = "users:write"
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
		if err := requireAdminPermission(r, perm); err != nil {
			return err
		}

		userID := ""
		for _, prefix := range []string{"/api/v1/admin/communications/", "/admin/communications/"} {
			if strings.HasPrefix(r.URL.Path, prefix) {
				userID = strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
				break
			}
		}
		if userID == "" || strings.Contains(userID, "/") {
			return httpx.NotFound("communications require a user id")
		}

		if r.Method == stdhttp.MethodPost {
			// Key on the session-validated actor from context, NOT userIDFromRequest
			// (which falls back to the client-supplied X-User-ID header) — otherwise
			// a caller could rotate that header to mint a fresh bucket per request and
			// bypass the throttle (verification #23 MED). Empty (unauthenticated /
			// dev-anon) callers share one bucket, which is fail-closed.
			if !sendLimiter.Allow(httpx.UserIDFromContext(r.Context())) {
				return httpx.TooManyRequests("too many communications; please wait a moment and try again")
			}
			return sendPlayerCommunication(w, r, store, notifier, userID)
		}

		limit := 0
		if v := strings.TrimSpace(r.URL.Query().Get("limit")); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				limit = n
			}
		}
		offset := 0
		if v := strings.TrimSpace(r.URL.Query().Get("offset")); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				offset = n
			}
		}
		items, err := store.ListForUser(r.Context(), userID, limit, offset)
		if err != nil {
			return httpx.Internal("failed to load communication history", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": items})
	})
	mux.Handle("/api/v1/admin/communications/", handler)
	mux.Handle("/admin/communications/", handler)
}

// sendPlayerCommunication renders a registered template and dispatches it to a
// player, recording the full sent content to the history and auditing it
// (Scenario 12). Dispatch is FAIL-CLOSED: only the email channel has a wired
// transport, and it goes through the Notifier — which is the LogNotifier (logs
// only, no external send) unless SMTP is explicitly configured, so an
// unconfigured / launch deployment never blasts real users. Non-email channels
// are recorded but NOT dispatched (no wrong-channel delivery). The communication
// is ALWAYS recorded — the §20 sent-content history is the compliance artifact,
// independent of whether external delivery succeeded.
func sendPlayerCommunication(w stdhttp.ResponseWriter, r *stdhttp.Request, store communicationsStore, notifier notify.Notifier, userID string) error {
	var body struct {
		TemplateKey string            `json:"templateKey"`
		Channel     string            `json:"channel"`
		Data        map[string]string `json:"data"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return httpx.BadRequest("invalid request body", nil)
	}
	templateKey := strings.TrimSpace(body.TemplateKey)
	channel := strings.TrimSpace(strings.ToLower(body.Channel))
	if templateKey == "" {
		return httpx.BadRequest("templateKey is required", nil)
	}
	if !allowedCommChannels[channel] {
		return httpx.BadRequest("channel must be one of email, sms, push, in_app", nil)
	}

	if notificationTemplateStore == nil {
		return httpx.NewError(stdhttp.StatusServiceUnavailable, "templates_unavailable",
			"notification templates are not configured", nil, nil)
	}
	tmpl, err := notificationTemplateStore.Get(r.Context(), templateKey)
	if errors.Is(err, notify.ErrTemplateNotFound) {
		return httpx.BadRequest("unknown template", map[string]any{"templateKey": templateKey})
	}
	if err != nil {
		return httpx.Internal("failed to load template", err)
	}
	subject, msgBody := tmpl.Render(body.Data)

	email, err := store.RecipientEmail(r.Context(), userID)
	if errors.Is(err, communications.ErrRecipientNotFound) {
		return httpx.NotFound("punter not found")
	}
	if err != nil {
		return httpx.Internal("failed to resolve recipient", err)
	}

	status := "recorded"
	if channel == "email" && notifier != nil {
		if derr := notifier.Notify(r.Context(), []string{email}, subject, msgBody); derr != nil {
			status = "failed"
			slog.Warn("communications: dispatch failed", "user", userID, "template", templateKey, "error", derr)
		} else {
			status = "sent"
		}
	}

	comm, err := store.Record(r.Context(), communications.Communication{
		UserID:      userID,
		Channel:     channel,
		TemplateKey: templateKey,
		Subject:     subject,
		Body:        msgBody,
		Status:      status,
		ActorID:     userIDFromRequest(r),
	})
	if err != nil {
		return httpx.Internal("failed to record communication", err)
	}
	recordProviderOpsAuditAction(userIDFromRequest(r), "player.communication_sent", userID, map[string]any{
		"templateKey": templateKey,
		"channel":     channel,
		"status":      status,
	})
	return httpx.WriteJSON(w, stdhttp.StatusCreated, comm)
}
