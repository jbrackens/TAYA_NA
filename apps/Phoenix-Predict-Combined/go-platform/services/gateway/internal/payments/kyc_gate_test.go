package payments

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

// fakeKYC is a controllable compliance.KYCService for gate tests.
type fakeKYC struct {
	status string // unverified | pending | approved | declined | blocked
	err    error
}

func (f *fakeKYC) GetVerificationStatus(_ context.Context, userID string) (*compliance.KYCStatus, error) {
	if f.err != nil {
		return nil, f.err
	}
	return &compliance.KYCStatus{UserID: userID, Status: f.status}, nil
}
func (f *fakeKYC) VerifyIdentity(context.Context, string, []compliance.VerificationDocument) (*compliance.KYCResult, error) {
	return &compliance.KYCResult{Status: "approved"}, nil
}
func (f *fakeKYC) SubmitDocument(context.Context, string, compliance.VerificationDocument) (*compliance.VerificationDocument, error) {
	return &compliance.VerificationDocument{}, nil
}
func (f *fakeKYC) ListDocuments(context.Context, string) ([]compliance.VerificationDocument, error) {
	return nil, nil
}

// D-8 / LC-22: the KYC just-in-time gate on withdrawals. The gate must block
// an unverified cash-out once cumulative withdrawals cross the threshold,
// allow it below threshold, allow verified/pending users, stay inert when
// enforcement is off, and fail closed in prod when the KYC service errors.
func TestWithdraw_KYCJustInTimeGate(t *testing.T) {
	const threshold = "1000" // $10 cumulative

	doWithdraw := func(t *testing.T, kyc compliance.KYCService, enforce bool, env string, priorWithdrawn, amount int64, sessionUID string) (*httptest.ResponseRecorder, *stubPaymentService) {
		t.Helper()
		t.Setenv("KYC_ENFORCEMENT", map[bool]string{true: "true", false: "false"}[enforce])
		t.Setenv("KYC_WITHDRAWAL_THRESHOLD_CENTS", threshold)
		t.Setenv("ENVIRONMENT", env)
		prevGate := KYCGate
		KYCGate = kyc
		t.Cleanup(func() { KYCGate = prevGate })

		svc := &stubPaymentService{cumulativeWithdrawn: priorWithdrawn}
		mux := http.NewServeMux()
		RegisterPaymentRoutes(mux, svc)

		body := `{"userId":"u-1","amountCents":` + itoa(amount) + `,"paymentMethod":"card"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/withdraw", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if sessionUID != "" {
			req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec, svc
	}

	t.Run("below threshold: allowed even unverified", func(t *testing.T) {
		rec, svc := doWithdraw(t, &fakeKYC{status: "unverified"}, true, "production", 0, 500, "u-1")
		if rec.Code != http.StatusCreated {
			t.Fatalf("under-threshold withdrawal must pass, got %d (%s)", rec.Code, rec.Body.String())
		}
		if svc.withdrawalCalls != 1 {
			t.Fatalf("expected withdrawal to proceed, calls=%d", svc.withdrawalCalls)
		}
	})

	t.Run("crossing threshold + unverified: blocked, no withdrawal", func(t *testing.T) {
		rec, svc := doWithdraw(t, &fakeKYC{status: "unverified"}, true, "production", 800, 500, "u-1")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("over-threshold unverified withdrawal must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
		if !strings.Contains(rec.Body.String(), "identity verification required") {
			t.Fatalf("expected KYC rejection message, got %s", rec.Body.String())
		}
		if svc.withdrawalCalls != 0 {
			t.Fatalf("blocked withdrawal must NOT initiate, calls=%d", svc.withdrawalCalls)
		}
	})

	t.Run("crossing threshold + approved: allowed", func(t *testing.T) {
		rec, svc := doWithdraw(t, &fakeKYC{status: "approved"}, true, "production", 800, 500, "u-1")
		if rec.Code != http.StatusCreated {
			t.Fatalf("verified user must pass the gate, got %d (%s)", rec.Code, rec.Body.String())
		}
		if svc.withdrawalCalls != 1 {
			t.Fatalf("expected withdrawal to proceed for verified user, calls=%d", svc.withdrawalCalls)
		}
	})

	t.Run("crossing threshold + pending: allowed (design: pending passes)", func(t *testing.T) {
		rec, _ := doWithdraw(t, &fakeKYC{status: "pending"}, true, "production", 800, 500, "u-1")
		if rec.Code != http.StatusCreated {
			t.Fatalf("pending verification must pass per the LC-22 decision, got %d (%s)", rec.Code, rec.Body.String())
		}
	})

	t.Run("enforcement OFF: over-threshold unverified still allowed", func(t *testing.T) {
		rec, svc := doWithdraw(t, &fakeKYC{status: "unverified"}, false, "production", 800, 500, "u-1")
		if rec.Code != http.StatusCreated || svc.withdrawalCalls != 1 {
			t.Fatalf("gate must be inert when KYC_ENFORCEMENT off, got %d calls=%d", rec.Code, svc.withdrawalCalls)
		}
	})

	t.Run("KYC service error fails CLOSED in production", func(t *testing.T) {
		rec, svc := doWithdraw(t, &fakeKYC{err: errors.New("kyc backend down")}, true, "production", 800, 500, "u-1")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("prod must fail closed on KYC error, got %d (%s)", rec.Code, rec.Body.String())
		}
		if svc.withdrawalCalls != 0 {
			t.Fatalf("fail-closed must not initiate withdrawal, calls=%d", svc.withdrawalCalls)
		}
	})

	t.Run("KYC service error fails OPEN in dev", func(t *testing.T) {
		rec, svc := doWithdraw(t, &fakeKYC{err: errors.New("kyc backend down")}, true, "", 800, 500, "u-1")
		if rec.Code != http.StatusCreated || svc.withdrawalCalls != 1 {
			t.Fatalf("dev must fail open on KYC error, got %d calls=%d (%s)", rec.Code, svc.withdrawalCalls, rec.Body.String())
		}
	})
}

func itoa(n int64) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}
