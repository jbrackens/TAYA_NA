package http

import (
	"encoding/json"
	"errors"
	"log/slog"
	stdhttp "net/http"
	"strings"
	"time"

	"taptrade/gateway/internal/prediction"
	"taptrade/platform/transport/httpx"
)

// disputeNotifier is the slice of the WebSocket hub the dispute API needs, so
// the prediction/http boundary stays narrow and the handler is testable. A nil
// notifier disables the live push (the dispute is still persisted).
type disputeNotifier interface {
	NotifyDisputeFiled(marketID string, data interface{})
}

type disputeResponse struct {
	ID             string     `json:"id"`
	MarketID       string     `json:"marketId"`
	UserID         string     `json:"userId"`
	Reason         string     `json:"reason"`
	Status         string     `json:"status"`
	ResolutionNote *string    `json:"resolutionNote,omitempty"`
	BondPoints     int64      `json:"bondPoints"`
	Unit           string     `json:"unit"`
	CreatedAt      time.Time  `json:"createdAt"`
	ResolvedAt     *time.Time `json:"resolvedAt,omitempty"`
	ResolvedBy     *string    `json:"resolvedBy,omitempty"`
}

func disputePayload(d prediction.Dispute) disputeResponse {
	resolutionNote := d.ResolutionNote
	if resolutionNote != nil {
		redacted := redactLaunchProhibitedUserText(*resolutionNote)
		resolutionNote = &redacted
	}
	return disputeResponse{
		ID:             d.ID,
		MarketID:       d.MarketID,
		UserID:         d.UserID,
		Reason:         redactLaunchProhibitedUserText(d.Reason),
		Status:         d.Status,
		ResolutionNote: resolutionNote,
		BondPoints:     d.BondPoints,
		Unit:           "PTS",
		CreatedAt:      d.CreatedAt,
		ResolvedAt:     d.ResolvedAt,
		ResolvedBy:     d.ResolvedBy,
	}
}

func disputePayloads(disputes []prediction.Dispute) []disputeResponse {
	out := make([]disputeResponse, 0, len(disputes))
	for _, dispute := range disputes {
		out = append(out, disputePayload(dispute))
	}
	return out
}

// registerDisputeRoutes wires the user-facing dispute API (ADR-0004). A dispute
// can only be filed against a market in the proposed_resolution state, by a user
// who holds a position in it; an open dispute blocks FinalizeResolution.
func registerDisputeRoutes(mux *stdhttp.ServeMux, svc *prediction.Service, store prediction.ResolutionStore, notifier disputeNotifier) {
	// Per-user rate limit on dispute submissions (ADR-0004 #5). Reads count
	// against a token bucket; GETs are unaffected.
	perMin := disputeRateLimitPerMin()
	disputeLimiter := newUserRateLimiter(perMin, perMin)

	mux.Handle("/api/v1/disputes", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		userID := userIDFromRequest(r)
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}

		switch r.Method {
		case stdhttp.MethodGet:
			marketID := strings.TrimSpace(r.URL.Query().Get("marketId"))
			if marketID == "" {
				return httpx.BadRequest("marketId is required", map[string]any{"field": "marketId"})
			}
			disputes, err := store.ListDisputes(r.Context(), marketID)
			if err != nil {
				return httpx.Internal("failed to list disputes", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": disputePayloads(disputes)})

		case stdhttp.MethodPost:
			// Throttle dispute creation per user before any DB work.
			if !disputeLimiter.Allow(userID) {
				return httpx.TooManyRequests("too many dispute submissions; please wait a moment and try again")
			}
			var req struct {
				MarketID string `json:"marketId"`
				Reason   string `json:"reason"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			req.MarketID = strings.TrimSpace(req.MarketID)
			req.Reason = strings.TrimSpace(req.Reason)
			if req.MarketID == "" {
				return httpx.BadRequest("marketId is required", map[string]any{"field": "marketId"})
			}
			if req.Reason == "" {
				return httpx.BadRequest("reason is required", map[string]any{"field": "reason"})
			}
			if err := validateLaunchFacingReason("reason", req.Reason); err != nil {
				return err
			}

			// Only a proposed (not-yet-finalized) resolution is disputable.
			market, err := svc.GetMarket(r.Context(), req.MarketID)
			if err != nil {
				return httpx.NotFound("market not found")
			}
			if market.Status != prediction.MarketStatusProposedResolution {
				return httpx.Conflict("market is not in a disputable (proposed_resolution) state", nil)
			}

			// Eligibility: the user must hold a position in the market.
			positions, err := svc.ListPositions(r.Context(), userID)
			if err != nil {
				return httpx.Internal("failed to verify eligibility", err)
			}
			holds := false
			for _, p := range positions {
				if p.MarketID == req.MarketID && p.Quantity > 0 {
					holds = true
					break
				}
			}
			if !holds {
				return httpx.Forbidden("only holders of a position in this market may dispute")
			}

			// Authoritative create + FSM transition under the per-market lock,
			// serialized against finalize so a dispute can't be filed in the
			// window between finalize's dispute-check and its payout. The
			// status/eligibility checks above are a fast fail for UX; this is
			// the gate that actually holds.
			dispute, err := svc.FileDispute(r.Context(), req.MarketID, userID, req.Reason)
			if err != nil {
				if errors.Is(err, prediction.ErrMarketNotDisputable) {
					return httpx.Conflict("market is not in a disputable (proposed_resolution) state", nil)
				}
				return httpx.Internal("failed to create dispute", err)
			}
			// Push to the office review queue + market channel (ADR-0004 #7).
			if notifier != nil {
				notifier.NotifyDisputeFiled(req.MarketID, map[string]any{
					"disputeId": dispute.ID,
					"marketId":  dispute.MarketID,
					"userId":    dispute.UserID,
					"reason":    dispute.Reason,
					"createdAt": dispute.CreatedAt,
				})
			}
			return httpx.WriteJSON(w, stdhttp.StatusCreated, disputePayload(*dispute))

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	slog.Info("dispute routes registered")
}
