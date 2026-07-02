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
			return serviceBadRequestError(err, nil)
		}
		adminID := userIDFromRequest(r)
		recordProviderOpsAuditAction(adminID, "kyc.decision", req.UserID, map[string]any{
			"approve": req.Approve,
			"status":  status.Status,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, status)
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
