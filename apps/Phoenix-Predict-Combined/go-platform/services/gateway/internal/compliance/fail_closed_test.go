package compliance

import (
	"context"
	"testing"
)

// P0-2: when the Postgres KYC store is unavailable, deployed environments
// must degrade to denial, never to the approving in-memory mock.
func TestKYCFallbackForEnv(t *testing.T) {
	cases := []struct {
		env        string
		failClosed bool
	}{
		{"production", true},
		{"staging", true},
		{" Production ", true}, // tolerant of case/whitespace
		{"development", false},
		{"test", false},
		{"", false},
	}
	for _, tc := range cases {
		t.Run("env="+tc.env, func(t *testing.T) {
			svc := KYCFallbackForEnv(tc.env)
			_, isFailClosed := svc.(*FailClosedKYCService)
			if isFailClosed != tc.failClosed {
				t.Fatalf("env %q: fail-closed=%v, want %v (got %T)", tc.env, isFailClosed, tc.failClosed, svc)
			}
		})
	}
}

// The fail-closed service must actually refuse verification work, not just
// carry the name.
func TestFailClosedKYCServiceRefusesVerification(t *testing.T) {
	svc := NewFailClosedKYCService()

	if _, err := svc.VerifyIdentity(context.Background(), "u-1", nil); err == nil {
		t.Fatal("expected VerifyIdentity to fail closed")
	}
	if _, err := svc.SubmitDocument(context.Background(), "u-1", VerificationDocument{}); err == nil {
		t.Fatal("expected SubmitDocument to fail closed")
	}
	status, err := svc.GetVerificationStatus(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("status read should not error: %v", err)
	}
	if status.Status != "pending" {
		t.Fatalf("expected non-approved status, got %q", status.Status)
	}
}
