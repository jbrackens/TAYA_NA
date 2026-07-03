package http

import (
	"context"
	"encoding/json"
	"log/slog"
	stdhttp "net/http"
	"strings"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

// rgAdminService is the slice of the responsible-gambling service the back-office
// needs: the cross-user read plus the problem-trading marker write (GAP-39).
// *compliance.PostgresResponsibleGamblingService and the fail-closed/mock
// services all satisfy it.
type rgAdminService interface {
	GetPlayerRestrictions(ctx context.Context, userID string) (*compliance.PlayerRestrictions, error)
	SetProblemTradingFlag(ctx context.Context, userID string, flagged bool, reason, flaggedBy string) error
}

// registerRGAdminRoutes wires the back-office read of a punter's
// responsible-gambling state for the Profile-360 Limits/self-exclusion tab:
//
//	GET /api/v1/admin/rg/restrictions?userId=  -> limits, cool-off, self-exclusion  (compliance:read)
//
// This is a distinct path from the /api/v1/admin/punters/ subtree (a prefix
// handler owned by the prediction admin routes). The user-facing RG routes at
// /api/v1/compliance/rg/* are session-bound (a user sees only their own
// state); this is the admin cross-user read, RBAC-gated instead.
func registerRGAdminRoutes(mux *stdhttp.ServeMux, rg rgAdminService) {
	mux.Handle("/api/v1/admin/rg/restrictions", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := strings.TrimSpace(r.URL.Query().Get("userId"))
		if userID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}
		restrictions, err := rg.GetPlayerRestrictions(r.Context(), userID)
		if err != nil {
			return serviceBadRequestError(err, nil)
		}
		// Reading another user's responsible-gambling state (self-exclusion,
		// limits) is a per-subject compliance access — audited like the KYC
		// per-subject read.
		recordProviderOpsAuditAction(userIDFromRequest(r), "rg.subject_viewed", userID, map[string]any{
			"isExcluded":  restrictions.IsExcluded,
			"isOnCoolOff": restrictions.IsOnCoolOff,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"restrictions": restrictions,
		})
	}))

	// GAP-39 (PAM §13 Responsible Gaming): a reviewer sets/clears the
	// problem-trading compliance marker on a player. A marker only — it does not
	// block trading (self-exclusion does). RBAC compliance:write + audited.
	//
	//	POST /api/v1/admin/rg/problem-trading  {userId, flagged, reason}
	mux.Handle("/api/v1/admin/rg/problem-trading", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:write"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var body struct {
			UserID  string `json:"userId"`
			Flagged bool   `json:"flagged"`
			Reason  string `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		userID := strings.TrimSpace(body.UserID)
		if userID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}
		reason := strings.TrimSpace(body.Reason)
		if body.Flagged && reason == "" {
			return httpx.BadRequest("reason is required when flagging", map[string]any{"field": "reason"})
		}
		actor := userIDFromRequest(r)
		if err := rg.SetProblemTradingFlag(r.Context(), userID, body.Flagged, reason, actor); err != nil {
			return serviceBadRequestError(err, nil)
		}
		recordProviderOpsAuditAction(actor, "rg.problem_trading_flag_set", userID, map[string]any{
			"flagged": body.Flagged,
			"reason":  reason,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"userId": userID, "flagged": body.Flagged})
	}))

	slog.Info("admin responsible-gambling routes registered")
}
