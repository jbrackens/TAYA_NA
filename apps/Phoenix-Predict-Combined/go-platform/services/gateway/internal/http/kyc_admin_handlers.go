package http

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

// kycAdminStore is what the back-office review routes need from the KYC
// service — a consumer-side interface so handler tests can stub it.
// *compliance.PostgresKYCService satisfies it.
type kycAdminStore interface {
	AdminDecision(ctx context.Context, userID string, approve bool, reason string) (*compliance.KYCStatus, error)
	GetVerificationStatus(ctx context.Context, userID string) (*compliance.KYCStatus, error)
	ListDocuments(ctx context.Context, userID string) ([]compliance.VerificationDocument, error)
	ListPendingReviews(ctx context.Context, limit, offset int) ([]compliance.PendingReview, error)
	GetDocumentFile(ctx context.Context, documentID string) (*compliance.DocumentFile, error)
	// P0-4 slice 3: identity + screening verdict for the review surface.
	GetIdentity(ctx context.Context, userID string) (*compliance.KYCIdentity, error)
	ReviewScreening(ctx context.Context, userID, outcome string) (previousStatus string, err error)
	// GAP-18: a reviewer asks the user for more/better documents (non-terminal).
	RequestMoreDocuments(ctx context.Context, userID, reason string) (*compliance.KYCStatus, error)
}

// kycScreeningConflictMessage maps the P0-4 approval-gate sentinels to a
// deliberate, reviewer-facing 409 message — never the raw service error
// (guard: TestGatewayHTTPHandlersDoNotEchoRawServiceErrors). Returns "" for
// any other error so the caller falls through to the normal mapping.
func kycScreeningConflictMessage(err error) string {
	switch {
	case errors.Is(err, compliance.ErrScreeningUnresolved):
		return "sanctions screening must be resolved before this identity can be approved"
	case errors.Is(err, compliance.ErrIdentityRequired):
		return "structured identity must be submitted before this identity can be approved"
	default:
		return ""
	}
}

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

// registerKYCAdminRoutes wires the back-office KYC review surface — the
// operable manual-review IDV path:
//
//	POST /api/v1/admin/kyc/decision                    -> {userId, approve, reason}   (compliance:write)
//	GET  /api/v1/admin/kyc/queue?limit&offset          -> pending reviews             (compliance:read)
//	GET  /api/v1/admin/kyc/users/{userId}              -> status + document metadata  (compliance:read)
//	GET  /api/v1/admin/kyc/documents/{docId}/content   -> document binary, audited    (compliance:read)
//
// Approving marks the user verified for guarded account/trading checks;
// rejecting records the reason. Only registered when KYC is DB-backed (a real
// persistent decision target).
func registerKYCAdminRoutes(mux *stdhttp.ServeMux, kyc kycAdminStore) {
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
			// P0-4 slice 3: an approval blocked by unresolved sanctions
			// screening is a state conflict the reviewer must resolve first
			// (screening review or identity submission), not a bad request.
			if msg := kycScreeningConflictMessage(err); msg != "" {
				return httpx.Conflict(msg, nil)
			}
			return serviceBadRequestError(err, nil)
		}
		adminID := userIDFromRequest(r)
		recordProviderOpsAuditAction(adminID, "kyc.decision", req.UserID, map[string]any{
			"approve": req.Approve,
			"status":  status.Status,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, status)
	}))

	// GAP-18 (§12): a reviewer asks the user for more/better documents without a
	// hard decline — moves the identity to the non-terminal 'documents_required'
	// state (which does NOT pass the KYC gate) so the user can re-submit.
	// compliance:write + audited; reason mandatory.
	mux.Handle("/api/v1/admin/kyc/request-documents", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:write"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var req struct {
			UserID string `json:"userId"`
			Reason string `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		req.UserID = strings.TrimSpace(req.UserID)
		req.Reason = strings.TrimSpace(req.Reason)
		if req.UserID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}
		if req.Reason == "" {
			return httpx.BadRequest("reason is required", map[string]any{"field": "reason"})
		}
		if err := validateLaunchFacingReason("reason", req.Reason); err != nil {
			return err
		}
		status, err := kyc.RequestMoreDocuments(r.Context(), req.UserID, req.Reason)
		if err != nil {
			return serviceBadRequestError(err, nil)
		}
		recordProviderOpsAuditAction(userIDFromRequest(r), "kyc.documents_requested", req.UserID, map[string]any{
			"status": status.Status,
			"reason": req.Reason,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, status)
	}))

	// P0-4 slice 3: a reviewer resolves a screening verdict — "cleared"
	// (false positive; approval becomes possible) or "confirmed" (real hit;
	// approval stays blocked). Sensitive compliance action: compliance:write
	// + audited with previous/next status and the mandatory reason.
	mux.Handle("/api/v1/admin/kyc/screening-review", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:write"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var req struct {
			UserID  string `json:"userId"`
			Outcome string `json:"outcome"`
			Reason  string `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		req.UserID = strings.TrimSpace(req.UserID)
		req.Outcome = strings.ToLower(strings.TrimSpace(req.Outcome))
		req.Reason = strings.TrimSpace(req.Reason)
		if req.UserID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}
		if req.Outcome != "cleared" && req.Outcome != "confirmed" {
			return httpx.BadRequest("outcome must be cleared or confirmed", map[string]any{"field": "outcome"})
		}
		if req.Reason == "" {
			return httpx.BadRequest("reason is required", map[string]any{"field": "reason"})
		}
		if err := validateLaunchFacingReason("reason", req.Reason); err != nil {
			return err
		}
		previous, err := kyc.ReviewScreening(r.Context(), req.UserID, req.Outcome)
		if err != nil {
			if msg := kycScreeningConflictMessage(err); msg != "" {
				return httpx.Conflict(msg, nil)
			}
			return serviceBadRequestError(err, nil)
		}
		recordProviderOpsAuditAction(userIDFromRequest(r), "kyc.screening_reviewed", req.UserID, map[string]any{
			"outcome":  req.Outcome,
			"previous": previous,
			"reason":   req.Reason,
		})
		identity, err := kyc.GetIdentity(r.Context(), req.UserID)
		if err != nil {
			return httpx.Internal("failed to reload identity", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"identity": identity})
	}))

	mux.Handle("/api/v1/admin/kyc/queue", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
		reviews, err := kyc.ListPendingReviews(r.Context(), limit, offset)
		if err != nil {
			return httpx.Internal("failed to list pending KYC reviews", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"reviews": reviews,
			"total":   len(reviews),
		})
	}))

	const usersPrefix = "/api/v1/admin/kyc/users/"
	mux.Handle(usersPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := strings.Trim(strings.TrimPrefix(r.URL.Path, usersPrefix), "/")
		if userID == "" || strings.Contains(userID, "/") {
			return httpx.NotFound("unknown KYC admin path")
		}
		status, err := kyc.GetVerificationStatus(r.Context(), userID)
		if err != nil {
			return serviceBadRequestError(err, nil)
		}
		docs, err := kyc.ListDocuments(r.Context(), userID)
		if err != nil {
			return serviceBadRequestError(err, nil)
		}
		// P0-4 slice 3: reviewers see the structured identity + screening
		// verdict (nil when the subject hasn't submitted identity yet).
		identity, err := kyc.GetIdentity(r.Context(), userID)
		if err != nil {
			return httpx.Internal("failed to load identity", err)
		}
		// Reading a specific person's KYC state is a per-subject compliance
		// access — audited like the decision itself (the aggregate queue is
		// not, to avoid an audit row per dashboard refresh).
		recordProviderOpsAuditAction(userIDFromRequest(r), "kyc.subject_viewed", userID, map[string]any{
			"status":        status.Status,
			"documentCount": len(docs),
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"status":    status,
			"documents": docs,
			"identity":  identity,
		})
	}))

	const documentsPrefix = "/api/v1/admin/kyc/documents/"
	mux.Handle(documentsPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, documentsPrefix), "/")
		parts := strings.Split(rest, "/")
		if len(parts) != 2 || parts[0] == "" || parts[1] != "content" {
			return httpx.NotFound("unknown KYC admin path")
		}
		file, err := kyc.GetDocumentFile(r.Context(), parts[0])
		if err != nil {
			if errors.Is(err, compliance.ErrDocumentNotFound) || errors.Is(err, compliance.ErrDocumentFileNotFound) {
				return httpx.NotFound("document file not found")
			}
			return serviceBadRequestError(err, nil)
		}
		// Viewing an identity document is itself a sensitive act — audit who
		// looked at whose document, always.
		adminID := userIDFromRequest(r)
		recordProviderOpsAuditAction(adminID, "kyc.document_viewed", file.UserID, map[string]any{
			"documentId": file.DocumentID,
			"sha256":     file.SHA256,
		})
		w.Header().Set("Content-Type", file.ContentType)
		w.Header().Set("Content-Length", strconv.FormatInt(file.SizeBytes, 10))
		w.Header().Set("Content-Disposition", "inline")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.WriteHeader(stdhttp.StatusOK)
		_, _ = w.Write(file.Content)
		return nil
	}))

	slog.Info("admin KYC review routes registered")
}
