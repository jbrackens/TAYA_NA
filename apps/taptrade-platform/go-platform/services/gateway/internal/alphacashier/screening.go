package alphacashier

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
)

// Audit CMP-01: the live cashier performed no sanctions/AML screening on the
// wallet addresses that move funds. This adds a fail-closed screening seam on
// the deposit (from) and withdrawal (destination) addresses. Like the KYC IDV
// seam, the default provider never auto-clears, and a real provider is wired by
// configuration — so enabling screening is a config change, not a code change.

// ScreeningStatus is the outcome of screening one address.
type ScreeningStatus string

const (
	ScreeningClear        ScreeningStatus = "clear"
	ScreeningManualReview ScreeningStatus = "manual_review"
	ScreeningSanctionsHit ScreeningStatus = "sanctions_hit"
	ScreeningUnavailable  ScreeningStatus = "unavailable"
)

// ErrAddressScreeningBlocked is returned when screening blocks a money
// movement (sanctions hit, or — under enforcement — manual-review/unavailable).
var ErrAddressScreeningBlocked = errors.New("address screening blocked this operation")

// AddressScreener screens a single on-chain address. Implementations must be
// fail-closed: on any internal error return ScreeningUnavailable (or an error),
// never ScreeningClear.
type AddressScreener interface {
	ScreenAddress(ctx context.Context, address string) (ScreeningStatus, error)
}

// manualReviewScreener is the default: it never auto-clears, mirroring the KYC
// ManualReviewProvider. Every address routes to manual review, so screening is
// effectively "block pending a real provider or a human" once enforcement is
// on — and a no-op while enforcement is off.
type manualReviewScreener struct{}

func (manualReviewScreener) ScreenAddress(context.Context, string) (ScreeningStatus, error) {
	return ScreeningManualReview, nil
}

// DefaultScreener returns the manual-review screener.
func DefaultScreener() AddressScreener { return manualReviewScreener{} }

// SetScreener wires an address screener. nil disables screening (no-op),
// matching the rail's default-off posture.
func (s *Service) SetScreener(screener AddressScreener) { s.screener = screener }

// screeningEnforced reports whether screening verdicts block. When false,
// screening still runs and logs but does not block (observe-only); when true,
// a non-clear verdict blocks the money movement.
func (s *Service) screeningEnforced() bool { return s.cfg.ScreeningEnforced }

// screenAddress runs the configured screener against one address and decides
// whether to block. No screener configured → allow (rail is off / unconfigured).
// surface and direction are for audit context only.
func (s *Service) screenAddress(ctx context.Context, userID, address, surface string) error {
	if s.screener == nil {
		return nil
	}
	addr := strings.TrimSpace(address)
	status, err := s.screener.ScreenAddress(ctx, addr)
	if err != nil {
		status = ScreeningUnavailable
		slog.ErrorContext(ctx, "address screening errored — treating as unavailable",
			"surface", surface, "user_id", userID, "error", err)
	}

	switch status {
	case ScreeningClear:
		return nil
	case ScreeningSanctionsHit:
		// Always blocks, even observe-only: a sanctions hit must never pass.
		slog.ErrorContext(ctx, "address screening: SANCTIONS HIT — blocking",
			"surface", surface, "user_id", userID)
		return fmt.Errorf("%w: sanctions screening hit", ErrAddressScreeningBlocked)
	case ScreeningManualReview, ScreeningUnavailable:
		if s.screeningEnforced() {
			slog.WarnContext(ctx, "address screening: non-clear under enforcement — blocking",
				"surface", surface, "user_id", userID, "status", status)
			return fmt.Errorf("%w: %s", ErrAddressScreeningBlocked, status)
		}
		slog.InfoContext(ctx, "address screening: non-clear, observe-only (enforcement off)",
			"surface", surface, "user_id", userID, "status", status)
		return nil
	default:
		// Unknown status is treated as unavailable → fail closed under
		// enforcement.
		if s.screeningEnforced() {
			return fmt.Errorf("%w: unknown screening status %q", ErrAddressScreeningBlocked, status)
		}
		return nil
	}
}
