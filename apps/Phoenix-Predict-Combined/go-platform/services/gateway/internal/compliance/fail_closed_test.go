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

// RG twin of TestKYCFallbackForEnv (verification finding: only the KYC
// branch was routed through an env-aware fallback at first).
func TestRGFallbackForEnv(t *testing.T) {
	for _, tc := range []struct {
		env        string
		failClosed bool
	}{
		{"production", true},
		{"staging", true},
		{"development", false},
		{"", false},
	} {
		t.Run("env="+tc.env, func(t *testing.T) {
			svc := RGFallbackForEnv(tc.env)
			_, isFailClosed := svc.(*FailClosedResponsibleGamblingService)
			if isFailClosed != tc.failClosed {
				t.Fatalf("env %q: fail-closed=%v, want %v (got %T)", tc.env, isFailClosed, tc.failClosed, svc)
			}
		})
	}
}

// With RG state unreadable, every stake/deposit check answers no and every
// mutation errors — never a silent pass.
func TestFailClosedRGServiceDeniesEverything(t *testing.T) {
	svc := NewFailClosedResponsibleGamblingService()
	ctx := context.Background()

	if allowed, reason, err := svc.CheckBetAllowed(ctx, "u-1", 100); err != nil || allowed || reason == "" {
		t.Fatalf("CheckBetAllowed = (%v, %q, %v), want clean deny", allowed, reason, err)
	}
	if allowed, _, err := svc.CheckDepositAllowed(ctx, "u-1", 100); err != nil || allowed {
		t.Fatalf("CheckDepositAllowed should cleanly deny, got allowed=%v err=%v", allowed, err)
	}
	if err := svc.SetSelfExclusion(ctx, "u-1", true); err == nil {
		t.Fatal("SetSelfExclusion should fail closed")
	}
	if err := svc.RecordBet(ctx, "u-1", 100); err == nil {
		t.Fatal("RecordBet should fail closed")
	}
	if _, err := svc.GetPlayerRestrictions(ctx, "u-1"); err == nil {
		t.Fatal("GetPlayerRestrictions should fail closed")
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
