package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

func TestDisputePayloadRedactsLegacyUnsafeReasonAndNote(t *testing.T) {
	note := "crypto payout review note"
	payload := disputePayload(prediction.Dispute{
		ID:             "disp-legacy-copy",
		MarketID:       "mkt-legacy-copy",
		UserID:         "u-legacy-copy",
		Reason:         "cash payout challenge",
		Status:         "open",
		ResolutionNote: &note,
		BondCents:      1500,
		CreatedAt:      time.Date(2026, 4, 23, 14, 58, 0, 0, time.UTC),
	})

	if payload.Reason != launchRedactedUserText {
		t.Fatalf("unsafe dispute reason should be redacted, got %q", payload.Reason)
	}
	if payload.ResolutionNote == nil || *payload.ResolutionNote != launchRedactedUserText {
		t.Fatalf("unsafe dispute resolution note should be redacted, got %#v", payload.ResolutionNote)
	}
	if payload.BondPointsCents != 1500 || payload.Unit != "PTS" {
		t.Fatalf("stable dispute point fields should remain intact, got %+v", payload)
	}
}

func TestFileDisputeReasonRejectsMoneyWordingBeforeLookup(t *testing.T) {
	mux := http.NewServeMux()
	registerDisputeRoutes(mux, nil, nil, nil)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/disputes", strings.NewReader(`{
		"marketId":"missing-market",
		"reason":"cash payout challenge"
	}`))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "u-dispute-unsafe", "holder@taptrade.local", "user"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe dispute reason status 400, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe dispute reason error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "reason" {
		t.Fatalf("expected reason error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "cash payout") {
		t.Fatalf("unsafe dispute reason should not be echoed: %s", res.Body.String())
	}
}
