package http

import (
	"encoding/json"
	"errors"
	"io"
	stdhttp "net/http"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/bets"
	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

type placeBetRequest struct {
	UserID         string                `json:"userId"`
	RequestID      string                `json:"requestId,omitempty"`
	DeviceID       string                `json:"deviceId,omitempty"`
	SegmentID      string                `json:"segmentId,omitempty"`
	IPAddress      string                `json:"ipAddress,omitempty"`
	OddsPrecision  int                   `json:"oddsPrecision,omitempty"`
	AcceptAnyOdds  bool                  `json:"acceptAnyOdds,omitempty"`
	Items          []placeBetItemRequest `json:"items,omitempty"`
	MarketID       string                `json:"marketId"`
	SelectionID    string                `json:"selectionId"`
	StakeCents     int64                 `json:"stakeCents"`
	Odds           float64               `json:"odds"`
	FreebetID      string                `json:"freebetId,omitempty"`
	OddsBoostID    string                `json:"oddsBoostId,omitempty"`
	IdempotencyKey string                `json:"idempotencyKey"`
}

type placeBetItemRequest struct {
	MarketID      string  `json:"marketId"`
	SelectionID   string  `json:"selectionId"`
	StakeCents    int64   `json:"stakeCents"`
	Odds          float64 `json:"odds"`
	RequestLineID string  `json:"requestLineId,omitempty"`
}

type precheckBetRequest struct {
	UserID        string                `json:"userId"`
	RequestID     string                `json:"requestId,omitempty"`
	DeviceID      string                `json:"deviceId,omitempty"`
	SegmentID     string                `json:"segmentId,omitempty"`
	IPAddress     string                `json:"ipAddress,omitempty"`
	OddsPrecision int                   `json:"oddsPrecision,omitempty"`
	AcceptAnyOdds bool                  `json:"acceptAnyOdds,omitempty"`
	Items         []placeBetItemRequest `json:"items,omitempty"`
	MarketID      string                `json:"marketId"`
	SelectionID   string                `json:"selectionId"`
	StakeCents    int64                 `json:"stakeCents"`
	Odds          float64               `json:"odds"`
	FreebetID     string                `json:"freebetId,omitempty"`
	OddsBoostID   string                `json:"oddsBoostId,omitempty"`
}

type betBuilderQuoteRequest struct {
	UserID    string                      `json:"userId"`
	RequestID string                      `json:"requestId"`
	Legs      []betBuilderQuoteLegRequest `json:"legs"`
}

type betBuilderQuoteLegRequest struct {
	MarketID      string  `json:"marketId"`
	SelectionID   string  `json:"selectionId"`
	RequestedOdds float64 `json:"requestedOdds,omitempty"`
}

type betBuilderAcceptRequest struct {
	QuoteID        string `json:"quoteId"`
	UserID         string `json:"userId"`
	RequestID      string `json:"requestId"`
	StakeCents     int64  `json:"stakeCents"`
	IdempotencyKey string `json:"idempotencyKey,omitempty"`
	Reason         string `json:"reason,omitempty"`
}

type fixedExoticQuoteRequest struct {
	UserID     string                       `json:"userId"`
	RequestID  string                       `json:"requestId"`
	ExoticType string                       `json:"exoticType"`
	StakeCents int64                        `json:"stakeCents,omitempty"`
	Legs       []fixedExoticQuoteLegRequest `json:"legs"`
}

type fixedExoticQuoteLegRequest struct {
	Position      int     `json:"position,omitempty"`
	MarketID      string  `json:"marketId"`
	SelectionID   string  `json:"selectionId"`
	RequestedOdds float64 `json:"requestedOdds,omitempty"`
}

type fixedExoticAcceptRequest struct {
	QuoteID        string `json:"quoteId"`
	UserID         string `json:"userId"`
	RequestID      string `json:"requestId"`
	StakeCents     int64  `json:"stakeCents,omitempty"`
	IdempotencyKey string `json:"idempotencyKey,omitempty"`
	Reason         string `json:"reason,omitempty"`
}

type alternativeOddsOfferCreateRequest struct {
	UserID          string  `json:"userId"`
	RequestID       string  `json:"requestId"`
	DeviceID        string  `json:"deviceId,omitempty"`
	SegmentID       string  `json:"segmentId,omitempty"`
	IPAddress       string  `json:"ipAddress,omitempty"`
	OddsPrecision   int     `json:"oddsPrecision,omitempty"`
	MarketID        string  `json:"marketId"`
	SelectionID     string  `json:"selectionId"`
	StakeCents      int64   `json:"stakeCents"`
	RequestedOdds   float64 `json:"requestedOdds"`
	OfferedOdds     float64 `json:"offeredOdds,omitempty"`
	ExpiresInSecond int64   `json:"expiresInSeconds,omitempty"`
}

type alternativeOddsOfferDecisionRequest struct {
	UserID    string `json:"userId"`
	RequestID string `json:"requestId"`
	Reason    string `json:"reason,omitempty"`
}

type alternativeOddsOfferCommitRequest struct {
	UserID         string `json:"userId"`
	RequestID      string `json:"requestId"`
	IdempotencyKey string `json:"idempotencyKey,omitempty"`
	Reason         string `json:"reason,omitempty"`
}

type alternativeOddsOfferRepriceRequest struct {
	UserID           string  `json:"userId"`
	RequestID        string  `json:"requestId"`
	OfferedOdds      float64 `json:"offeredOdds"`
	ExpiresInSeconds int64   `json:"expiresInSeconds,omitempty"`
	Reason           string  `json:"reason,omitempty"`
}

type cashoutQuoteRequest struct {
	BetID               string `json:"betId"`
	UserID              string `json:"userId"`
	RequestID           string `json:"requestId"`
	ProviderAmountCents int64  `json:"providerAmountCents,omitempty"`
	ProviderRevision    int64  `json:"providerRevision,omitempty"`
	ProviderSource      string `json:"providerSource,omitempty"`
	ProviderExpiresAt   string `json:"providerExpiresAt,omitempty"`
}

type cashoutAcceptRequest struct {
	BetID         string `json:"betId"`
	UserID        string `json:"userId"`
	QuoteID       string `json:"quoteId"`
	RequestID     string `json:"requestId"`
	QuoteRevision int64  `json:"quoteRevision,omitempty"`
	Reason        string `json:"reason,omitempty"`
}

type settleBetRequest struct {
	WinningSelectionID   string   `json:"winningSelectionId"`
	WinningSelectionIDs  []string `json:"winningSelectionIds,omitempty"`
	WinningSelectionName string   `json:"winningSelectionName,omitempty"`
	ResultSource         string   `json:"resultSource,omitempty"`
	DeadHeatFactor       *float64 `json:"deadHeatFactor,omitempty"`
	Reason               string   `json:"reason,omitempty"`
}

type lifecycleBetRequest struct {
	Reason string `json:"reason,omitempty"`
}

func handleBetHistory(service *bets.Service, w stdhttp.ResponseWriter, r *stdhttp.Request) error {
	if r.Method != stdhttp.MethodGet {
		return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
	}

	userID := strings.TrimSpace(r.URL.Query().Get("userId"))
	if userID == "" {
		userID = strings.TrimSpace(r.URL.Query().Get("user_id"))
	}
	if userID == "" {
		return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
	}

	page := 1
	if raw := strings.TrimSpace(r.URL.Query().Get("page")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 {
			return httpx.BadRequest("invalid page query parameter", map[string]any{"field": "page"})
		}
		page = parsed
	}

	pageSize := 20
	pageSizeRaw := strings.TrimSpace(r.URL.Query().Get("pageSize"))
	if pageSizeRaw == "" {
		pageSizeRaw = strings.TrimSpace(r.URL.Query().Get("itemsPerPage"))
	}
	if pageSizeRaw == "" {
		pageSizeRaw = strings.TrimSpace(r.URL.Query().Get("limit"))
	}
	if pageSizeRaw != "" {
		parsed, err := strconv.Atoi(pageSizeRaw)
		if err != nil || parsed < 1 {
			return httpx.BadRequest("invalid pageSize query parameter", map[string]any{"field": "pageSize"})
		}
		pageSize = parsed
	}

	statuses := append([]string{}, r.URL.Query()["status"]...)
	statuses = append(statuses, r.URL.Query()["filters.status"]...)
	if raw := strings.TrimSpace(r.URL.Query().Get("filterStatus")); raw != "" {
		statuses = append(statuses, raw)
	}

	result, err := service.ListByUser(bets.BetHistoryQuery{
		UserID:   userID,
		Statuses: statuses,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return mapBetError(err)
	}
	return httpx.WriteJSON(w, stdhttp.StatusOK, result)
}

func registerBetRoutes(mux *stdhttp.ServeMux, service *bets.Service) {
	mux.Handle("/api/v1/bets", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		return handleBetHistory(service, w, r)
	}))

	mux.Handle("/api/v1/bets/history", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		return handleBetHistory(service, w, r)
	}))

	mux.Handle("/punters/bets", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		return handleBetHistory(service, w, r)
	}))

	mux.Handle("/api/v1/bets/cashout/quote", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var request cashoutQuoteRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}
		providerExpiresAt := time.Time{}
		if raw := strings.TrimSpace(request.ProviderExpiresAt); raw != "" {
			parsed, err := time.Parse(time.RFC3339, raw)
			if err != nil {
				return httpx.BadRequest("invalid providerExpiresAt", map[string]any{"field": "providerExpiresAt"})
			}
			providerExpiresAt = parsed
		}
		quote, err := service.QuoteCashout(bets.CashoutQuoteRequest{
			BetID:               request.BetID,
			UserID:              request.UserID,
			RequestID:           request.RequestID,
			ProviderAmountCents: request.ProviderAmountCents,
			ProviderRevision:    request.ProviderRevision,
			ProviderSource:      request.ProviderSource,
			ProviderExpiresAt:   providerExpiresAt,
		})
		if err != nil {
			return mapBetError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, quote)
	}))

	mux.Handle("/api/v1/bets/cashout/accept", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var request cashoutAcceptRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}
		bet, quote, err := service.AcceptCashout(bets.CashoutAcceptRequest{
			BetID:         request.BetID,
			UserID:        request.UserID,
			QuoteID:       request.QuoteID,
			RequestID:     request.RequestID,
			QuoteRevision: request.QuoteRevision,
			Reason:        request.Reason,
			ActorID:       request.UserID,
		})
		if err != nil {
			return mapBetError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"bet":   bet,
			"quote": quote,
		})
	}))

	mux.Handle("/api/v1/bets/cashout/quotes/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		quoteID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/v1/bets/cashout/quotes/"))
		if quoteID == "" {
			return httpx.BadRequest("quoteId is required", map[string]any{"field": "quoteId"})
		}
		quote, err := service.GetCashoutQuote(quoteID)
		if err != nil {
			return mapBetError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, quote)
	}))

	mux.Handle("/api/v1/bets/alternative-odds/offers", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodPost:
			var request alternativeOddsOfferCreateRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			offer, err := service.CreateAlternativeOddsOffer(bets.AlternativeOddsOfferCreateRequest{
				UserID:          request.UserID,
				RequestID:       request.RequestID,
				DeviceID:        request.DeviceID,
				SegmentID:       request.SegmentID,
				IPAddress:       request.IPAddress,
				OddsPrecision:   request.OddsPrecision,
				MarketID:        request.MarketID,
				SelectionID:     request.SelectionID,
				StakeCents:      request.StakeCents,
				RequestedOdds:   request.RequestedOdds,
				OfferedOdds:     request.OfferedOdds,
				ExpiresInSecond: request.ExpiresInSecond,
			})
			if err != nil {
				return mapBetError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, offer)
		case stdhttp.MethodGet:
			userID := strings.TrimSpace(r.URL.Query().Get("userId"))
			status := strings.TrimSpace(r.URL.Query().Get("status"))
			limit := 0
			if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
				parsed, err := strconv.Atoi(raw)
				if err != nil || parsed < 0 {
					return httpx.BadRequest("invalid limit query parameter", map[string]any{"field": "limit"})
				}
				limit = parsed
			}
			items := service.ListAlternativeOddsOffers(userID, status, limit)
			return httpx.WriteJSON(w, stdhttp.StatusOK, items)
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost, stdhttp.MethodGet)
		}
	}))

	mux.Handle("/api/v1/bets/alternative-odds/offers/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/bets/alternative-odds/offers/"), "/")
		if path == "" {
			return httpx.NotFound("alternative odds offer route not found")
		}
		parts := strings.Split(path, "/")
		offerID := strings.TrimSpace(parts[0])
		if offerID == "" {
			return httpx.BadRequest("offerId is required", map[string]any{"field": "offerId"})
		}

		if len(parts) == 1 {
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			offer, err := service.GetAlternativeOddsOffer(offerID)
			if err != nil {
				return mapBetError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, offer)
		}

		if len(parts) != 2 || r.Method != stdhttp.MethodPost {
			return httpx.NotFound("alternative odds offer route not found")
		}

		action := strings.TrimSpace(parts[1])
		switch action {
		case "accept":
			var request alternativeOddsOfferDecisionRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			offer, err := service.AcceptAlternativeOddsOffer(bets.AlternativeOddsOfferDecisionRequest{
				OfferID:   offerID,
				UserID:    request.UserID,
				RequestID: request.RequestID,
				Reason:    request.Reason,
			})
			if err != nil {
				return mapBetError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, offer)
		case "commit":
			var request alternativeOddsOfferCommitRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			offer, bet, err := service.CommitAlternativeOddsOffer(bets.AlternativeOddsOfferCommitRequest{
				OfferID:        offerID,
				UserID:         request.UserID,
				RequestID:      request.RequestID,
				IdempotencyKey: request.IdempotencyKey,
				Reason:         request.Reason,
				ActorID:        request.UserID,
			})
			if err != nil {
				return mapBetError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"offer": offer,
				"bet":   bet,
			})
		case "decline":
			var request alternativeOddsOfferDecisionRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			offer, err := service.DeclineAlternativeOddsOffer(bets.AlternativeOddsOfferDecisionRequest{
				OfferID:   offerID,
				UserID:    request.UserID,
				RequestID: request.RequestID,
				Reason:    request.Reason,
			})
			if err != nil {
				return mapBetError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, offer)
		case "reprice":
			var request alternativeOddsOfferRepriceRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			offer, err := service.RepriceAlternativeOddsOffer(bets.AlternativeOddsOfferRepriceRequest{
				OfferID:          offerID,
				UserID:           request.UserID,
				RequestID:        request.RequestID,
				OfferedOdds:      request.OfferedOdds,
				ExpiresInSeconds: request.ExpiresInSeconds,
				Reason:           request.Reason,
			})
			if err != nil {
				return mapBetError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, offer)
		default:
			return httpx.NotFound("alternative odds offer route not found")
		}
	}))

	mux.Handle("/api/v1/bets/precheck", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var request precheckBetRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		result, err := service.Precheck(bets.PrecheckRequest{
			UserID:        request.UserID,
			RequestID:     request.RequestID,
			DeviceID:      request.DeviceID,
			SegmentID:     request.SegmentID,
			IPAddress:     request.IPAddress,
			OddsPrecision: request.OddsPrecision,
			AcceptAnyOdds: request.AcceptAnyOdds,
			Items:         toPlaceBetItems(request.Items),
			MarketID:      request.MarketID,
			SelectionID:   request.SelectionID,
			StakeCents:    request.StakeCents,
			Odds:          request.Odds,
			FreebetID:     request.FreebetID,
			OddsBoostID:   request.OddsBoostID,
		})
		if err != nil {
			return mapBetError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, result)
	}))

	mux.Handle("/api/v1/bets/builder/quote", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var request betBuilderQuoteRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		result, err := service.QuoteBetBuilder(bets.BetBuilderQuoteRequest{
			UserID:    request.UserID,
			RequestID: request.RequestID,
			Legs:      toBetBuilderQuoteLegs(request.Legs),
		})
		if err != nil {
			return mapBetError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, result)
	}))

	mux.Handle("/api/v1/bets/builder/quotes/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		quoteID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/v1/bets/builder/quotes/"))
		if quoteID == "" {
			return httpx.BadRequest("quoteId is required", map[string]any{"field": "quoteId"})
		}

		quote, err := service.GetBetBuilderQuote(quoteID)
		if err != nil {
			return mapBetError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, quote)
	}))

	mux.Handle("/api/v1/bets/builder/accept", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var request betBuilderAcceptRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		bet, quote, err := service.AcceptBetBuilderQuote(bets.BetBuilderAcceptRequest{
			QuoteID:        request.QuoteID,
			UserID:         request.UserID,
			RequestID:      request.RequestID,
			StakeCents:     request.StakeCents,
			IdempotencyKey: request.IdempotencyKey,
			Reason:         request.Reason,
			ActorID:        request.UserID,
		})
		if err != nil {
			return mapBetError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"bet":   bet,
			"quote": quote,
		})
	}))

	mux.Handle("/api/v1/bets/exotics/fixed/quote", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var request fixedExoticQuoteRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		result, err := service.QuoteFixedExotic(bets.FixedExoticQuoteRequest{
			UserID:     request.UserID,
			RequestID:  request.RequestID,
			ExoticType: request.ExoticType,
			StakeCents: request.StakeCents,
			Legs:       toFixedExoticQuoteLegs(request.Legs),
		})
		if err != nil {
			return mapBetError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, result)
	}))

	mux.Handle("/api/v1/bets/exotics/fixed/quotes/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		quoteID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/v1/bets/exotics/fixed/quotes/"))
		if quoteID == "" {
			return httpx.BadRequest("quoteId is required", map[string]any{"field": "quoteId"})
		}

		quote, err := service.GetFixedExoticQuote(quoteID)
		if err != nil {
			return mapBetError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, quote)
	}))

	mux.Handle("/api/v1/bets/exotics/fixed/accept", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var request fixedExoticAcceptRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		bet, quote, err := service.AcceptFixedExoticQuote(bets.FixedExoticAcceptRequest{
			QuoteID:        request.QuoteID,
			UserID:         request.UserID,
			RequestID:      request.RequestID,
			StakeCents:     request.StakeCents,
			IdempotencyKey: request.IdempotencyKey,
			Reason:         request.Reason,
			ActorID:        request.UserID,
		})
		if err != nil {
			return mapBetError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"bet":   bet,
			"quote": quote,
		})
	}))

	mux.Handle("/api/v1/bets/place", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var request placeBetRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		placed, err := service.Place(bets.PlaceBetRequest{
			UserID:         request.UserID,
			RequestID:      request.RequestID,
			DeviceID:       request.DeviceID,
			SegmentID:      request.SegmentID,
			IPAddress:      request.IPAddress,
			OddsPrecision:  request.OddsPrecision,
			AcceptAnyOdds:  request.AcceptAnyOdds,
			Items:          toPlaceBetItems(request.Items),
			MarketID:       request.MarketID,
			SelectionID:    request.SelectionID,
			StakeCents:     request.StakeCents,
			Odds:           request.Odds,
			FreebetID:      request.FreebetID,
			OddsBoostID:    request.OddsBoostID,
			IdempotencyKey: request.IdempotencyKey,
			ActorID:        request.UserID,
		})
		if err != nil {
			return mapBetError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, placed)
	}))

	mux.Handle("/api/v1/bets/analytics", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := strings.TrimSpace(r.URL.Query().Get("userId"))
		if userID == "" {
			userID = strings.TrimSpace(r.URL.Query().Get("user_id"))
		}
		if userID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}
		analytics := service.AnalyticsForUser(userID)
		return httpx.WriteJSON(w, stdhttp.StatusOK, analytics)
	}))

	mux.Handle("/api/v1/bets/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		betID := strings.TrimPrefix(r.URL.Path, "/api/v1/bets/")
		if strings.TrimSpace(betID) == "" {
			return handleBetHistory(service, w, r)
		}
		if betID == "" {
			return httpx.NotFound("bet not found")
		}

		item, err := service.GetByID(betID)
		if err != nil {
			return mapBetError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, item)
	}))
}

func registerAdminBetRoutes(mux *stdhttp.ServeMux, service *bets.Service) {
	registerAdminBetLifecycleRoutes(mux, "/admin", service)
	registerAdminBetLifecycleRoutes(mux, "/api/v1/admin", service)
	registerAdminFixedExoticRoutes(mux, "/admin", service)
	registerAdminFixedExoticRoutes(mux, "/api/v1/admin", service)
}

func registerAdminBetLifecycleRoutes(mux *stdhttp.ServeMux, basePath string, service *bets.Service) {
	prefix := basePath + "/bets/"
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		path := strings.TrimPrefix(r.URL.Path, prefix)
		parts := strings.Split(strings.Trim(path, "/"), "/")
		if len(parts) != 3 || parts[1] != "lifecycle" {
			return httpx.NotFound("bet lifecycle route not found")
		}

		betID := strings.TrimSpace(parts[0])
		action := strings.TrimSpace(parts[2])
		if betID == "" {
			return httpx.BadRequest("betId is required", map[string]any{"field": "betId"})
		}

		switch action {
		case "settle":
			var request settleBetRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			winningSelectionID := normalizeWinningSelectionInput(
				request.WinningSelectionID,
				request.WinningSelectionIDs,
			)
			if winningSelectionID == "" {
				return httpx.BadRequest("winningSelectionId or winningSelectionIds is required", map[string]any{"field": "winningSelectionId"})
			}
			updated, err := service.Settle(bets.SettleBetRequest{
				BetID:                betID,
				WinningSelectionID:   winningSelectionID,
				WinningSelectionName: request.WinningSelectionName,
				ResultSource:         request.ResultSource,
				DeadHeatFactor:       request.DeadHeatFactor,
				Reason:               request.Reason,
				ActorID:              adminActorFromRequest(r),
			})
			if err != nil {
				return mapBetError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, updated)
		case "cancel":
			var request lifecycleBetRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil && !errors.Is(err, io.EOF) {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			updated, err := service.Cancel(bets.LifecycleBetRequest{
				BetID:   betID,
				Reason:  request.Reason,
				ActorID: adminActorFromRequest(r),
			})
			if err != nil {
				return mapBetError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, updated)
		case "refund":
			var request lifecycleBetRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil && !errors.Is(err, io.EOF) {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			updated, err := service.Refund(bets.LifecycleBetRequest{
				BetID:   betID,
				Reason:  request.Reason,
				ActorID: adminActorFromRequest(r),
			})
			if err != nil {
				return mapBetError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, updated)
		default:
			return httpx.NotFound("bet lifecycle route not found")
		}
	}))
}

func registerAdminFixedExoticRoutes(mux *stdhttp.ServeMux, basePath string, service *bets.Service) {
	quotesPath := basePath + "/exotics/fixed/quotes"

	mux.Handle(quotesPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		userID := strings.TrimSpace(r.URL.Query().Get("userId"))
		status := strings.TrimSpace(r.URL.Query().Get("status"))
		limit := 0
		if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
			parsed, err := strconv.Atoi(raw)
			if err != nil || parsed < 0 {
				return httpx.BadRequest("invalid limit query parameter", map[string]any{"field": "limit"})
			}
			limit = parsed
		}

		items := service.ListFixedExoticQuotes(userID, status, limit)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items": items,
		})
	}))

	mux.Handle(quotesPath+"/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}

		path := strings.Trim(strings.TrimPrefix(r.URL.Path, quotesPath+"/"), "/")
		if path == "" {
			return httpx.NotFound("fixed exotic quote route not found")
		}

		parts := strings.Split(path, "/")
		quoteID := strings.TrimSpace(parts[0])
		if quoteID == "" {
			return httpx.BadRequest("quoteId is required", map[string]any{"field": "quoteId"})
		}

		if len(parts) == 1 {
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			quote, err := service.GetFixedExoticQuote(quoteID)
			if err != nil {
				return mapBetError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, quote)
		}

		if len(parts) != 3 || parts[1] != "lifecycle" || parts[2] != "expire" {
			return httpx.NotFound("fixed exotic quote route not found")
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var request lifecycleBetRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil && !errors.Is(err, io.EOF) {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}
		updated, err := service.AdminExpireFixedExoticQuote(
			quoteID,
			request.Reason,
			adminActorFromRequest(r),
		)
		if err != nil {
			return mapBetError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, updated)
	}))
}

func mapBetError(err error) error {
	if errors.Is(err, bets.ErrInvalidAlternativeOfferRequest) {
		return httpx.BadRequest("invalid alternative odds offer request", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrInvalidBetBuilderRequest) {
		return httpx.BadRequest("invalid bet builder request", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrInvalidFixedExoticRequest) {
		return httpx.BadRequest("invalid fixed exotic request", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrUnsupportedFixedExoticType) {
		return httpx.BadRequest("unsupported fixed exotic type", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrInvalidCashoutRequest) {
		return httpx.BadRequest("invalid cashout request", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrInvalidBetRequest) {
		return httpx.BadRequest("invalid bet request", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrInvalidSettleRequest) {
		return httpx.BadRequest("invalid bet lifecycle request", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrSelectionNotFound) {
		return httpx.BadRequest("selection does not exist in market", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrStakeOutOfRange) {
		return httpx.BadRequest("stake is outside allowed range", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrOddsOutOfRange) {
		return httpx.BadRequest("odds are outside allowed range", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrOddsChanged) {
		return httpx.Conflict("odds changed and were rejected by policy", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrFreebetNotFound) {
		return httpx.NotFound("freebet not found")
	}
	if errors.Is(err, bets.ErrFreebetForbidden) {
		return httpx.Forbidden("freebet does not belong to user")
	}
	if errors.Is(err, bets.ErrFreebetNotEligible) {
		return httpx.Conflict("freebet is not eligible for this bet", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrOddsBoostNotFound) {
		return httpx.NotFound("odds boost not found")
	}
	if errors.Is(err, bets.ErrOddsBoostForbidden) {
		return httpx.Forbidden("odds boost does not belong to user")
	}
	if errors.Is(err, bets.ErrOddsBoostNotEligible) {
		return httpx.Conflict("odds boost is not eligible for this bet", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrMarketNotFound) || errors.Is(err, domain.ErrNotFound) {
		return httpx.NotFound("market or bet not found")
	}
	if errors.Is(err, bets.ErrAlternativeOfferNotFound) {
		return httpx.NotFound("alternative odds offer not found")
	}
	if errors.Is(err, bets.ErrCashoutQuoteNotFound) {
		return httpx.NotFound("cashout quote not found")
	}
	if errors.Is(err, bets.ErrBetBuilderQuoteNotFound) {
		return httpx.NotFound("bet builder quote not found")
	}
	if errors.Is(err, bets.ErrFixedExoticQuoteNotFound) {
		return httpx.NotFound("fixed exotic quote not found")
	}
	if errors.Is(err, bets.ErrMarketNotOpen) {
		return httpx.Forbidden("market is not open")
	}
	if errors.Is(err, bets.ErrCashoutNotEligible) {
		return httpx.Conflict("bet is not eligible for cashout", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrAlternativeOfferExpired) {
		return httpx.Conflict("alternative odds offer expired", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrCashoutQuoteExpired) {
		return httpx.Conflict("cashout quote expired", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrCashoutQuoteStale) {
		return httpx.Conflict("cashout quote stale", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrCashoutQuoteConflict) {
		return httpx.Conflict("cashout quote state conflict", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrAlternativeOfferStateConflict) {
		return httpx.Conflict("alternative odds offer state conflict", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrBetBuilderNotCombinable) {
		return httpx.Conflict("bet builder legs not combinable", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrSameGameComboFixtureMismatch) {
		return httpx.Conflict("same game combo requires legs from a single fixture", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrSameGameComboDuplicateMarket) {
		return httpx.Conflict("same game combo requires unique markets per leg", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrFixedExoticFixtureMismatch) {
		return httpx.Conflict("fixed exotic requires legs from a single fixture", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrFixedExoticDuplicateMarket) {
		return httpx.Conflict("fixed exotic requires unique markets per leg", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrFixedExoticQuoteExpired) {
		return httpx.Conflict("fixed exotic quote expired", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrFixedExoticQuoteConflict) {
		return httpx.Conflict("fixed exotic quote state conflict", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrBetBuilderQuoteExpired) {
		return httpx.Conflict("bet builder quote expired", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrBetBuilderQuoteConflict) {
		return httpx.Conflict("bet builder quote state conflict", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, wallet.ErrInsufficientFunds) {
		return httpx.Forbidden("insufficient funds")
	}
	if errors.Is(err, bets.ErrIdempotencyReplay) {
		return httpx.Conflict("bet idempotency key conflict", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, bets.ErrBetStateConflict) {
		return httpx.Conflict("bet lifecycle transition conflict", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	if errors.Is(err, wallet.ErrIdempotencyConflict) {
		return httpx.Conflict("wallet idempotency key conflict", map[string]any{"reasonCode": bets.RejectReasonCode(err)})
	}
	return httpx.Internal("bet operation failed", err)
}

func adminActorFromRequest(r *stdhttp.Request) string {
	candidates := []string{
		strings.TrimSpace(r.Header.Get("X-Admin-Actor")),
		strings.TrimSpace(r.Header.Get("X-Admin-User")),
		strings.TrimSpace(r.Header.Get("X-Actor-Id")),
	}
	for _, candidate := range candidates {
		if candidate != "" {
			return candidate
		}
	}
	return "admin"
}

func normalizeWinningSelectionInput(legacyWinningSelectionID string, winningSelectionIDs []string) string {
	if len(winningSelectionIDs) > 0 {
		normalizedIDs := make([]string, 0, len(winningSelectionIDs))
		seen := map[string]struct{}{}
		for _, selectionID := range winningSelectionIDs {
			value := strings.TrimSpace(selectionID)
			if value == "" {
				continue
			}
			key := strings.ToLower(value)
			if _, exists := seen[key]; exists {
				continue
			}
			seen[key] = struct{}{}
			normalizedIDs = append(normalizedIDs, value)
		}
		return strings.Join(normalizedIDs, ",")
	}
	return strings.TrimSpace(legacyWinningSelectionID)
}

func toPlaceBetItems(items []placeBetItemRequest) []bets.PlaceBetItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]bets.PlaceBetItem, 0, len(items))
	for _, item := range items {
		out = append(out, bets.PlaceBetItem{
			MarketID:      item.MarketID,
			SelectionID:   item.SelectionID,
			StakeCents:    item.StakeCents,
			Odds:          item.Odds,
			RequestLineID: item.RequestLineID,
		})
	}
	return out
}

func toBetBuilderQuoteLegs(items []betBuilderQuoteLegRequest) []bets.BetBuilderLegRequest {
	if len(items) == 0 {
		return nil
	}
	out := make([]bets.BetBuilderLegRequest, 0, len(items))
	for _, item := range items {
		out = append(out, bets.BetBuilderLegRequest{
			MarketID:      item.MarketID,
			SelectionID:   item.SelectionID,
			RequestedOdds: item.RequestedOdds,
		})
	}
	return out
}

func toFixedExoticQuoteLegs(items []fixedExoticQuoteLegRequest) []bets.FixedExoticLegRequest {
	if len(items) == 0 {
		return nil
	}
	out := make([]bets.FixedExoticLegRequest, 0, len(items))
	for _, item := range items {
		out = append(out, bets.FixedExoticLegRequest{
			Position:      item.Position,
			MarketID:      item.MarketID,
			SelectionID:   item.SelectionID,
			RequestedOdds: item.RequestedOdds,
		})
	}
	return out
}
