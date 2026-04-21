package payments

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/compliance"
)

type stubPaymentService struct {
	depositCalls int
	webhookCalls int
	lastWebhook  WebhookPayload
}

func (s *stubPaymentService) InitiateDeposit(ctx context.Context, userID string, amountCents int64, paymentMethod string) (*DepositResult, error) {
	s.depositCalls++
	return &DepositResult{
		TransactionID: "dep:test",
		UserID:        userID,
		Amount:        amountCents,
		Status:        "approved",
		PaymentMethod: paymentMethod,
	}, nil
}

func (s *stubPaymentService) InitiateWithdrawal(context.Context, string, int64, string) (*WithdrawalResult, error) {
	return &WithdrawalResult{}, nil
}

func (s *stubPaymentService) GetPaymentMethods(context.Context, string) ([]PaymentMethod, error) {
	return nil, nil
}

func (s *stubPaymentService) GetTransactionStatus(context.Context, string) (*TransactionStatus, error) {
	return nil, nil
}

func (s *stubPaymentService) HandleWebhook(_ context.Context, payload WebhookPayload) error {
	s.webhookCalls++
	s.lastWebhook = payload
	return nil
}

func TestRegisterPaymentRoutes_DepositBlocksOnComplianceDenial(t *testing.T) {
	checker := compliance.NewMockResponsibleGamblingService()
	if err := checker.SetDepositLimit(context.Background(), "u-1", "daily", 1000); err != nil {
		t.Fatalf("SetDepositLimit returned error: %v", err)
	}
	if err := checker.RecordDeposit(context.Background(), "u-1", 100); err != nil {
		t.Fatalf("RecordDeposit returned error: %v", err)
	}

	DepositComplianceChecker = checker
	t.Cleanup(func() { DepositComplianceChecker = nil })

	service := &stubPaymentService{}
	mux := http.NewServeMux()
	RegisterPaymentRoutes(mux, service)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/deposit", strings.NewReader(`{"userId":"u-1","amountCents":901,"paymentMethod":"card"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when compliance denies deposit, got %d with body %s", rec.Code, rec.Body.String())
	}
	if service.depositCalls != 0 {
		t.Fatalf("expected payment service not to run when deposit is denied, got %d calls", service.depositCalls)
	}
}

func TestRegisterPaymentRoutes_WebhookRequiresSignature(t *testing.T) {
	t.Setenv(webhookSecretEnv, "whsec_test")

	service := &stubPaymentService{}
	mux := http.NewServeMux()
	RegisterPaymentRoutes(mux, service)

	body, err := json.Marshal(WebhookPayload{
		EventType:     "deposit.confirmed",
		TransactionID: "dep:test",
		UserID:        "u-1",
		Amount:        100,
		Status:        "approved",
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		t.Fatalf("marshal webhook body: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhook", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 when webhook signature is missing, got %d body=%s", rec.Code, rec.Body.String())
	}
	if service.webhookCalls != 0 {
		t.Fatalf("expected webhook service not to run when signature is missing, got %d calls", service.webhookCalls)
	}
}

func TestRegisterPaymentRoutes_WebhookAcceptsValidSignature(t *testing.T) {
	t.Setenv(webhookSecretEnv, "whsec_test")

	service := &stubPaymentService{}
	mux := http.NewServeMux()
	RegisterPaymentRoutes(mux, service)

	body, err := json.Marshal(WebhookPayload{
		EventType:     "deposit.confirmed",
		TransactionID: "dep:test",
		UserID:        "u-1",
		Amount:        100,
		Status:        "approved",
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		t.Fatalf("marshal webhook body: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhook", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(webhookSignatureHeader, signWebhookBody("whsec_test", body))
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for valid signed webhook, got %d body=%s", rec.Code, rec.Body.String())
	}
	if service.webhookCalls != 1 {
		t.Fatalf("expected webhook service to run once, got %d calls", service.webhookCalls)
	}
}
