package handlers

import (
	"testing"
)

func TestDecodeSettleRequest_WithReason(t *testing.T) {
	req, err := decodeSettleRequest("out-1", "match ended", "")
	if err != nil {
		t.Fatalf("decodeSettleRequest error = %v", err)
	}
	if req.WinningOutcomeID != "out-1" {
		t.Fatalf("WinningOutcomeID = %q, want %q", req.WinningOutcomeID, "out-1")
	}
	if req.Reason != "match ended" {
		t.Fatalf("Reason = %q, want %q", req.Reason, "match ended")
	}
	if req.SettledAt != nil {
		t.Fatalf("SettledAt should be nil")
	}
}

func TestDecodeSettleRequest_EmptyWinningOutcome(t *testing.T) {
	req, err := decodeSettleRequest("", "reason", "")
	if err != nil {
		t.Fatalf("decodeSettleRequest error = %v", err)
	}
	// Empty winning_outcome_id passes here; service layer rejects it
	if req.WinningOutcomeID != "" {
		t.Fatalf("WinningOutcomeID = %q, want empty", req.WinningOutcomeID)
	}
}

func TestDecodeSettleRequest_ValidSettledAt(t *testing.T) {
	req, err := decodeSettleRequest("out-1", "", "2026-03-19T10:00:00Z")
	if err != nil {
		t.Fatalf("decodeSettleRequest error = %v", err)
	}
	if req.SettledAt == nil {
		t.Fatalf("SettledAt should not be nil")
	}
	if req.SettledAt.Year() != 2026 || req.SettledAt.Month() != 3 || req.SettledAt.Day() != 19 {
		t.Fatalf("SettledAt = %v, expected 2026-03-19", req.SettledAt)
	}
}

func TestDecodeSettleRequest_InvalidSettledAt(t *testing.T) {
	_, err := decodeSettleRequest("out-1", "", "not-a-date")
	if err == nil {
		t.Fatalf("expected error for invalid settled_at")
	}
}

func TestDecodeSettleRequest_TrimsWhitespace(t *testing.T) {
	req, err := decodeSettleRequest("  out-1  ", "  reason  ", "")
	if err != nil {
		t.Fatalf("decodeSettleRequest error = %v", err)
	}
	if req.WinningOutcomeID != "out-1" {
		t.Fatalf("WinningOutcomeID not trimmed: %q", req.WinningOutcomeID)
	}
	if req.Reason != "reason" {
		t.Fatalf("Reason not trimmed: %q", req.Reason)
	}
}
