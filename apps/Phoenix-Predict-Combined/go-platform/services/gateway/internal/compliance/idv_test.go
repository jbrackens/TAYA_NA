package compliance

import (
	"context"
	"testing"
)

func TestManualReviewProvider_NeverAutoApproves(t *testing.T) {
	p := ManualReviewProvider{}
	if p.Name() != "manual-review" {
		t.Fatalf("name = %q, want manual-review", p.Name())
	}
	dec, err := p.Review(context.Background(), "u-1", []VerificationDocument{{Type: "passport"}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.Status != "pending" {
		t.Fatalf("manual review must return pending, got %q", dec.Status)
	}
}

func TestManualReviewProvider_RejectsEmptyDocs(t *testing.T) {
	if _, err := (ManualReviewProvider{}).Review(context.Background(), "u-1", nil); err == nil {
		t.Fatal("expected ErrInvalidDocument for empty docs")
	}
}

func TestVendorIDVProvider_FailsClosedWhenUnconfigured(t *testing.T) {
	// A named-but-unconfigured vendor must error (fail closed) rather than
	// returning an approval — never silently onboard.
	p := vendorIDVProvider{name: "sumsub"}
	dec, err := p.Review(context.Background(), "u-1", []VerificationDocument{{Type: "passport"}})
	if err == nil {
		t.Fatal("unconfigured vendor must fail closed, got nil error")
	}
	if dec.Status == "approved" {
		t.Fatal("unconfigured vendor must never return approved")
	}
}

func TestNewIDVProviderFromEnv(t *testing.T) {
	t.Setenv("KYC_IDV_PROVIDER", "")
	if _, ok := NewIDVProviderFromEnv().(ManualReviewProvider); !ok {
		t.Fatal("unset provider should default to ManualReviewProvider")
	}
	t.Setenv("KYC_IDV_PROVIDER", "manual")
	if _, ok := NewIDVProviderFromEnv().(ManualReviewProvider); !ok {
		t.Fatal("'manual' should select ManualReviewProvider")
	}
	t.Setenv("KYC_IDV_PROVIDER", "sumsub")
	if got := NewIDVProviderFromEnv().Name(); got != "sumsub" {
		t.Fatalf("named vendor should be selected, got %q", got)
	}
}
