package http

import (
	"encoding/json"
	"log/slog"
	stdhttp "net/http"
	"strings"

	"taptrade/gateway/internal/compliance"
	"taptrade/platform/transport/httpx"
)

type kycAdminDecisionRequest struct {
	UserID  string `json:"userId"`
	Approve bool   `json:"approve"`
	Reason  string `json:"reason"`
}

func decodeKYCAdminDecisionRequest(r *stdhttp.Request) (kycAdminDecisionRequest, error) {
	var req kycAdminDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return req, httpx.BadRequest("invalid request body", nil)
	}
	req.UserID = strings.TrimSpace(req.UserID)
	req.Reason = strings.TrimSpace(req.Reason)
	if req.UserID == "" {
		return req, httpx.BadRequest("userId is required", nil)
	}
	if err := validateLaunchFacingReason("reason", req.Reason); err != nil {
		return req, err
	}
	return req, nil
}

// registerKYCAdminRoutes wires the back-office KYC review action — the operable
// half of the manual-review IDV path:
//
//	POST /api/v1/admin/kyc/decision  -> {userId, approve, reason}
//
// Requires the validated admin session role. Approving marks the user verified
// for guarded account/trading checks; rejecting records the reason.
// This is what turns a "pending / documents submitted" submission into a real
// approve/deny decision a compliance operator makes. Only registered when KYC is
// DB-backed (a real persistent decision target).
func registerKYCAdminRoutes(mux *stdhttp.ServeMux, kyc *compliance.PostgresKYCService) {
	mux.Handle("/api/v1/admin/kyc/decision", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:write"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		req, err := decodeKYCAdminDecisionRequest(r)
		if err != nil {
			return err
		}
		status, err := kyc.AdminDecision(r.Context(), req.UserID, req.Approve, req.Reason)
		if err != nil {
			return serviceBadRequestError(err, nil)
		}
		adminID := userIDFromRequest(r)
		recordProviderOpsAuditAction(adminID, "kyc.decision", req.UserID, map[string]any{
			"approve": req.Approve,
			"status":  status.Status,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, status)
	}))
	slog.Info("admin KYC decision route registered")
}
