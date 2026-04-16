package http

import (
	"encoding/json"
	"log/slog"
	stdhttp "net/http"
	"strconv"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

func registerPredictionRoutes(mux *stdhttp.ServeMux, svc *prediction.Service) {
	// --- Public: Discovery ---
	mux.Handle("/api/v1/discovery", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		result, err := svc.GetDiscovery(r.Context())
		if err != nil {
			return httpx.Internal("failed to fetch data", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, result)
	}))

	// --- Public: Categories ---
	mux.Handle("/api/v1/categories", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		cats, err := svc.ListCategories(r.Context(), true)
		if err != nil {
			return httpx.Internal("failed to fetch data", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, cats)
	}))

	mux.Handle("/api/v1/categories/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		slug := r.URL.Path[len("/api/v1/categories/"):]
		if slug == "" {
			return httpx.BadRequest("category slug required", nil)
		}
		cat, err := svc.GetCategory(r.Context(), slug)
		if err != nil {
			return httpx.NotFound("category not found")
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, cat)
	}))

	// --- Public: Events ---
	mux.Handle("/api/v1/events", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		filter := prediction.EventFilter{
			Page:     intQueryParam(r, "page", 1),
			PageSize: intQueryParam(r, "pageSize", 20),
		}
		if cat := r.URL.Query().Get("categoryId"); cat != "" {
			filter.CategoryID = &cat
		}
		if status := r.URL.Query().Get("status"); status != "" {
			s := prediction.EventStatus(status)
			filter.Status = &s
		}
		if r.URL.Query().Get("featured") == "true" {
			featured := true
			filter.Featured = &featured
		}
		events, total, err := svc.ListEvents(r.Context(), filter)
		if err != nil {
			return httpx.Internal("failed to fetch data", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]interface{}{
			"data": events,
			"meta": prediction.PageMeta{
				Page:     filter.Page,
				PageSize: filter.PageSize,
				Total:    total,
				HasNext:  filter.Page*filter.PageSize < total,
			},
		})
	}))

	mux.Handle("/api/v1/events/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		id := r.URL.Path[len("/api/v1/events/"):]
		if id == "" {
			return httpx.BadRequest("event id required", nil)
		}
		event, err := svc.GetEvent(r.Context(), id)
		if err != nil {
			return httpx.NotFound("event not found")
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, event)
	}))

	// --- Public: Markets ---
	mux.Handle("/api/v1/markets", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		filter := prediction.MarketFilter{
			Page:     intQueryParam(r, "page", 1),
			PageSize: intQueryParam(r, "pageSize", 20),
		}
		if eid := r.URL.Query().Get("eventId"); eid != "" {
			filter.EventID = &eid
		}
		if status := r.URL.Query().Get("status"); status != "" {
			s := prediction.MarketStatus(status)
			filter.Status = &s
		}
		if ticker := r.URL.Query().Get("ticker"); ticker != "" {
			filter.Ticker = &ticker
		}
		markets, total, err := svc.ListMarkets(r.Context(), filter)
		if err != nil {
			return httpx.Internal("failed to fetch data", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]interface{}{
			"data": markets,
			"meta": prediction.PageMeta{
				Page:     filter.Page,
				PageSize: filter.PageSize,
				Total:    total,
				HasNext:  filter.Page*filter.PageSize < total,
			},
		})
	}))

	mux.Handle("/api/v1/markets/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		id := r.URL.Path[len("/api/v1/markets/"):]
		if id == "" {
			return httpx.BadRequest("market id or ticker required", nil)
		}
		market, err := svc.GetMarketByTicker(r.Context(), id)
		if err != nil {
			// Try by ID
			market, err = svc.GetMarket(r.Context(), id)
			if err != nil {
				return httpx.NotFound("market not found")
			}
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, market)
	}))

	slog.Info("prediction routes registered")
}

func registerOrderRoutes(mux *stdhttp.ServeMux, svc *prediction.Service) {
	// --- Authenticated: Orders ---
	mux.Handle("/api/v1/orders", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodGet:
			userID := r.Header.Get("X-User-ID")
			if userID == "" {
				return httpx.Unauthorized("authentication required")
			}
			filter := prediction.OrderFilter{
				UserID:   userID,
				Page:     intQueryParam(r, "page", 1),
				PageSize: intQueryParam(r, "pageSize", 20),
			}
			if mid := r.URL.Query().Get("marketId"); mid != "" {
				filter.MarketID = &mid
			}
			if status := r.URL.Query().Get("status"); status != "" {
				s := prediction.OrderStatus(status)
				filter.Status = &s
			}
			orders, total, err := svc.ListOrders(r.Context(), filter)
			if err != nil {
				return httpx.Internal("failed to fetch data", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]interface{}{
				"data": orders,
				"meta": prediction.PageMeta{
					Page:     filter.Page,
					PageSize: filter.PageSize,
					Total:    total,
					HasNext:  filter.Page*filter.PageSize < total,
				},
			})

		case stdhttp.MethodPost:
			userID := r.Header.Get("X-User-ID")
			if userID == "" {
				return httpx.Unauthorized("authentication required")
			}
			var req prediction.PlaceOrderRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			order, trade, err := svc.PlaceOrder(r.Context(), req, userID)
			if err != nil {
				return httpx.BadRequest(err.Error(), nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]interface{}{
				"order": order,
				"trade": trade,
			})

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	mux.Handle("/api/v1/orders/preview", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var req prediction.PlaceOrderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		preview, err := svc.PreviewOrder(r.Context(), req)
		if err != nil {
			return httpx.BadRequest(err.Error(), nil)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, preview)
	}))

	slog.Info("order routes registered")
}

func registerPortfolioRoutes(mux *stdhttp.ServeMux, svc *prediction.Service) {
	mux.Handle("/api/v1/portfolio", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}
		positions, err := svc.ListPositions(r.Context(), userID)
		if err != nil {
			return httpx.Internal("failed to fetch data", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, positions)
	}))

	mux.Handle("/api/v1/portfolio/summary", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}
		summary, err := svc.GetPortfolioSummary(r.Context(), userID)
		if err != nil {
			return httpx.Internal("failed to fetch data", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, summary)
	}))

	slog.Info("portfolio routes registered")
}

func registerSettlementRoutes(mux *stdhttp.ServeMux, svc *prediction.Service) {
	// Admin: Market lifecycle transitions
	mux.Handle("/api/v1/admin/markets/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		// Parse: /api/v1/admin/markets/{id}/lifecycle/{action}
		// or:    /api/v1/admin/markets/{id}
		path := r.URL.Path[len("/api/v1/admin/markets/"):]
		// Simple create market
		if path == "" && r.Method == stdhttp.MethodPost {
			adminID := r.Header.Get("X-User-ID")
			var req prediction.CreateMarketRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			market, err := svc.CreateMarket(r.Context(), req)
			if err != nil {
				return httpx.BadRequest(err.Error(), nil)
			}
			_ = adminID
			return httpx.WriteJSON(w, stdhttp.StatusCreated, market)
		}
		return httpx.NotFound("route not found")
	}))

	// Admin: Settle market
	mux.Handle("/api/v1/admin/settlements/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		marketID := r.URL.Path[len("/api/v1/admin/settlements/"):]
		if marketID == "" {
			return httpx.BadRequest("market id required", nil)
		}
		adminID := r.Header.Get("X-User-ID")
		var req prediction.ResolveMarketRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		settlement, payouts, err := svc.ResolveMarket(r.Context(), marketID, req, &adminID)
		if err != nil {
			return httpx.BadRequest(err.Error(), nil)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]interface{}{
			"settlement": settlement,
			"payouts":    payouts,
		})
	}))

	slog.Info("settlement routes registered")
}

func intQueryParam(r *stdhttp.Request, key string, defaultVal int) int {
	val := r.URL.Query().Get(key)
	if val == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(val)
	if err != nil || n < 1 {
		return defaultVal
	}
	return n
}
