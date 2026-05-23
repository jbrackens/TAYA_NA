package compliance

import (
	"context"
	"fmt"
	"os"
	"strings"
)

// IDVDecision is the outcome an identity-verification provider returns for a
// submitted document set.
type IDVDecision struct {
	Status    string // "approved", "pending", "declined"
	RiskLevel string // "low", "medium", "high", "unknown"
	Reason    string
}

// IDVProvider abstracts the identity-verification backend. The platform ships a
// ManualReviewProvider (a compliance operator approves in the back-office) as
// the default, plus a vendor adapter seam (Sumsub/Onfido/Persona) that activates
// when KYC_IDV_PROVIDER + credentials are configured. Keeping verification behind
// this interface means KYC persistence and the trade/withdrawal gates are real
// today, and a real automated vendor drops in without touching the service or
// handlers — only this seam and config change.
type IDVProvider interface {
	// Name identifies the provider for logs/audit.
	Name() string
	// Review evaluates a submitted document set. A "pending" status means the
	// verification is not yet conclusive (manual review queued, or an async
	// vendor check in flight). Implementations MUST NOT return "approved" unless
	// they have actually verified the identity.
	Review(ctx context.Context, userID string, docs []VerificationDocument) (IDVDecision, error)
}

// ManualReviewProvider queues every submission for human review: it never
// auto-approves. This is a complete, operable KYC path for a closed beta — a
// compliance operator approves/rejects in the back-office via
// PostgresKYCService.AdminDecision. It is the safe default when no automated
// vendor is configured.
type ManualReviewProvider struct{}

// Name identifies the manual-review provider.
func (ManualReviewProvider) Name() string { return "manual-review" }

// Review queues the submission for a back-office reviewer (always "pending").
func (ManualReviewProvider) Review(_ context.Context, _ string, docs []VerificationDocument) (IDVDecision, error) {
	if len(docs) == 0 {
		return IDVDecision{}, ErrInvalidDocument
	}
	return IDVDecision{Status: "pending", RiskLevel: "unknown", Reason: "queued for manual review"}, nil
}

// vendorIDVProvider is the seam for an automated KYC/IDV vendor. It is wired but
// intentionally unconfigured: until KYC_IDV_API_KEY (and a concrete client) are
// supplied, Review fails closed so the KYC service falls back to manual review
// rather than silently approving. This makes "real vendor KYC" a configuration +
// client-implementation task, not a re-architecture.
type vendorIDVProvider struct {
	name   string
	apiKey string
}

// Name identifies the configured (or intended) vendor.
func (p vendorIDVProvider) Name() string { return p.name }

// Review fails closed until a live client is implemented for the vendor. The
// caller (PostgresKYCService.VerifyIdentity) treats this error as "leave the
// user pending for manual review" — never as an approval.
func (p vendorIDVProvider) Review(_ context.Context, _ string, _ []VerificationDocument) (IDVDecision, error) {
	return IDVDecision{}, fmt.Errorf("idv provider %q not configured: set KYC_IDV_API_KEY and implement its client", p.name)
}

// NewIDVProviderFromEnv selects the provider from KYC_IDV_PROVIDER. Unset or
// "manual" => ManualReviewProvider. A named vendor (e.g. "sumsub") returns the
// vendor seam even without an API key, so a half-configured vendor fails closed
// (loud) instead of silently degrading to auto-approve.
func NewIDVProviderFromEnv() IDVProvider {
	name := strings.ToLower(strings.TrimSpace(os.Getenv("KYC_IDV_PROVIDER")))
	if name == "" || name == "manual" {
		return ManualReviewProvider{}
	}
	return vendorIDVProvider{name: name, apiKey: strings.TrimSpace(os.Getenv("KYC_IDV_API_KEY"))}
}
