package http

import (
	"encoding/json"
	"log/slog"
	stdhttp "net/http"
	"strings"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

// registerKYCAdminRoutes wires the back-office KYC review action — the operable
// half of the manual-review IDV path:
//
//	POST /api/v1/admin/kyc/decision  -> {userId, approve, reason}
//
// Requires the validated admin session role. Approving marks the user verified
// (so the withdrawal + trading KYC gates pass); rejecting records the reason.
// This is what turns a "pending / documents submitted" submission into a real
// approve/deny decision a compliance operator makes. Only registered when KYC is
// DB-backed (a real persistent decision target).
func registerKYCAdminRoutes(mux *stdhttp.ServeMux, kyc *compliance.PostgresKYCService) {
	mux.Handle("/api/v1/admin/kyc/decision", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var req struct {
			UserID  string `json:"userId"`
			Approve bool   `json:"approve"`
			Reason  string `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		userID := strings.TrimSpace(req.UserID)
		if userID == "" {
			return httpx.BadRequest("userId is required", nil)
		}
		status, err := kyc.AdminDecision(r.Context(), userID, req.Approve, strings.TrimSpace(req.Reason))
		if err != nil {
			return httpx.BadRequest(err.Error(), nil)
		}
		adminID := userIDFromRequest(r)
		recordMoneyAuditEntry(adminID, "kyc.decision", userID, map[string]any{
			"approve": req.Approve,
			"status":  status.Status,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, status)
	}))
	slog.Info("admin KYC decision route registered")
}
