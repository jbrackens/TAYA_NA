package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

// stubKYCAdminStore lets the route tests exercise RBAC, routing, and response
// shaping without a database.
type stubKYCAdminStore struct {
	pending []compliance.PendingReview
	status  *compliance.KYCStatus
	docs    []compliance.VerificationDocument
	file    *compliance.DocumentFile
	fileErr error

	// P0-4 slice 3
	identity     *compliance.KYCIdentity
	decisionErr  error
	reviewPrev   string
	reviewErr    error
	gotReviewUID string
	gotOutcome   string
}

func (s *stubKYCAdminStore) AdminDecision(_ context.Context, userID string, approve bool, _ string) (*compliance.KYCStatus, error) {
	if s.decisionErr != nil {
		return nil, s.decisionErr
	}
	st := "declined"
	if approve {
		st = "approved"
	}
	return &compliance.KYCStatus{UserID: userID, Status: st}, nil
}

func (s *stubKYCAdminStore) GetIdentity(_ context.Context, _ string) (*compliance.KYCIdentity, error) {
	return s.identity, nil
}

func (s *stubKYCAdminStore) ReviewScreening(_ context.Context, userID, outcome string) (string, error) {
	s.gotReviewUID, s.gotOutcome = userID, outcome
	if s.reviewErr != nil {
		return "", s.reviewErr
	}
	return s.reviewPrev, nil
}

func (s *stubKYCAdminStore) GetVerificationStatus(_ context.Context, userID string) (*compliance.KYCStatus, error) {
	if s.status != nil {
		return s.status, nil
	}
	return &compliance.KYCStatus{UserID: userID, Status: "pending"}, nil
}

func (s *stubKYCAdminStore) ListDocuments(_ context.Context, _ string) ([]compliance.VerificationDocument, error) {
	return s.docs, nil
}

func (s *stubKYCAdminStore) ListPendingReviews(_ context.Context, _, _ int) ([]compliance.PendingReview, error) {
	return s.pending, nil
}

func (s *stubKYCAdminStore) GetDocumentFile(_ context.Context, _ string) (*compliance.DocumentFile, error) {
	if s.fileErr != nil {
		return nil, s.fileErr
	}
	return s.file, nil
}

func newKYCReviewHarness(store kycAdminStore) http.Handler {
	mux := http.NewServeMux()
	registerKYCAdminRoutes(mux, store)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func adminGet(handler http.Handler, path string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-kyc", "admin-kyc@tiangge.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	return res
}

func TestKYCAdminReviewRoutesRejectNonAdmins(t *testing.T) {
	// TestMain enables the dev anon bypass for the suite; this test is about
	// the role gate, so switch it off.
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	handler := newKYCReviewHarness(&stubKYCAdminStore{})
	for _, path := range []string{
		"/api/v1/admin/kyc/queue",
		"/api/v1/admin/kyc/users/u-1",
		"/api/v1/admin/kyc/documents/doc:1/content",
	} {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			req = req.WithContext(httpx.WithTestUser(req.Context(), "u-player", "player@test.local", "player"))
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
				t.Fatalf("expected player to be rejected on %s, got %d", path, res.Code)
			}
		})
	}
}

func TestKYCAdminQueueReturnsPendingReviews(t *testing.T) {
	handler := newKYCReviewHarness(&stubKYCAdminStore{
		pending: []compliance.PendingReview{
			{UserID: "u-1", Status: "pending", DocumentCount: 2, SubmittedAt: "2026-07-01"},
		},
	})
	res := adminGet(handler, "/api/v1/admin/kyc/queue?limit=10")
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Reviews []compliance.PendingReview `json:"reviews"`
		Total   int                        `json:"total"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode queue: %v", err)
	}
	if payload.Total != 1 || len(payload.Reviews) != 1 || payload.Reviews[0].UserID != "u-1" {
		t.Fatalf("unexpected queue payload: %s", res.Body.String())
	}
}

func TestKYCAdminUserDetailReturnsStatusAndDocuments(t *testing.T) {
	handler := newKYCReviewHarness(&stubKYCAdminStore{
		status: &compliance.KYCStatus{UserID: "u-7", Status: "pending"},
		docs: []compliance.VerificationDocument{
			{ID: "doc:9", UserID: "u-7", Type: "passport", Status: "submitted"},
		},
	})
	res := adminGet(handler, "/api/v1/admin/kyc/users/u-7")
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Status    compliance.KYCStatus             `json:"status"`
		Documents []compliance.VerificationDocument `json:"documents"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode detail: %v", err)
	}
	if payload.Status.UserID != "u-7" || len(payload.Documents) != 1 || payload.Documents[0].Type != "passport" {
		t.Fatalf("unexpected detail payload: %s", res.Body.String())
	}
}

func TestKYCAdminDocumentContentServesBinaryAndAudits(t *testing.T) {
	handler := newKYCReviewHarness(&stubKYCAdminStore{
		file: &compliance.DocumentFile{
			DocumentID:  "doc:3",
			UserID:      "u-9",
			Content:     []byte("%PDF-1.7 fake"),
			ContentType: "application/pdf",
			SHA256:      "abc123",
			SizeBytes:   13,
		},
	})
	res := adminGet(handler, "/api/v1/admin/kyc/documents/doc:3/content")
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if got := res.Header().Get("Content-Type"); got != "application/pdf" {
		t.Fatalf("expected pdf content type, got %q", got)
	}
	if res.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("identity documents must not be cacheable")
	}
	if res.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("identity documents must be served with nosniff")
	}
	if res.Body.String() != "%PDF-1.7 fake" {
		t.Fatalf("unexpected body %q", res.Body.String())
	}
}

func TestKYCAdminDocumentContentMissingIs404(t *testing.T) {
	handler := newKYCReviewHarness(&stubKYCAdminStore{fileErr: compliance.ErrDocumentFileNotFound})
	res := adminGet(handler, "/api/v1/admin/kyc/documents/doc:404/content")
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestKYCAdminDocumentBadPathIs404(t *testing.T) {
	handler := newKYCReviewHarness(&stubKYCAdminStore{})
	// (Double-slash paths like documents//content never reach the handler —
	// ServeMux 307-redirects them to the cleaned path first.)
	for _, path := range []string{
		"/api/v1/admin/kyc/documents/doc:3",          // missing /content
		"/api/v1/admin/kyc/documents/doc:3/download", // wrong action
	} {
		res := adminGet(handler, path)
		if res.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for %s, got %d", path, res.Code)
		}
	}
}
