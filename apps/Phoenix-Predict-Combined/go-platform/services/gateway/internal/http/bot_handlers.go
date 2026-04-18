package http

import (
	"encoding/json"
	"log/slog"
	stdhttp "net/http"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

func registerBotRoutes(mux *stdhttp.ServeMux, svc *prediction.Service, repo prediction.Repository) {
	botAuth := prediction.NewBotAuthMiddleware(repo)

	// Bot: Issue API key — cookie-auth route (player creates their own bot key)
	mux.Handle("/api/v1/bot/keys", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		userID := userIDFromRequest(r)
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}

		switch r.Method {
		case stdhttp.MethodGet:
			keys, err := repo.ListAPIKeys(r.Context(), userID)
			if err != nil {
				return httpx.Internal("failed to list API keys", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, keys)

		case stdhttp.MethodPost:
			var req struct {
				Name    string   `json:"name"`
				Scopes  []string `json:"scopes"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			if req.Name == "" {
				return httpx.BadRequest("name is required", nil)
			}
			if len(req.Scopes) == 0 {
				req.Scopes = []string{"read"}
			}

			fullKey, prefix, hash, err := prediction.GenerateAPIKey()
			if err != nil {
				return httpx.Internal("failed to generate API key", err)
			}

			key := &prediction.APIKey{
				UserID:   userID,
				Name:     req.Name,
				KeyHash:  hash,
				KeyPrefix: prefix,
				Scopes:   req.Scopes,
				Active:   true,
			}

			if err := repo.CreateAPIKey(r.Context(), key); err != nil {
				return httpx.Internal("failed to create API key", err)
			}

			// Return the full key only on creation — never stored, never shown again
			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]interface{}{
				"id":     key.ID,
				"name":   key.Name,
				"prefix": key.KeyPrefix,
				"scopes": key.Scopes,
				"key":    fullKey,
				"note":   "Save this key — it will not be shown again",
			})

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	// Bot: Place order (API key auth, requires 'trade' scope)
	mux.Handle("/api/v1/bot/orders",
		botAuth.Wrap(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
			if r.Method != stdhttp.MethodPost {
				stdhttp.Error(w, `{"error":{"code":"method_not_allowed"}}`, stdhttp.StatusMethodNotAllowed)
				return
			}

			userID := r.Header.Get("X-User-ID")
			var req prediction.PlaceOrderRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				stdhttp.Error(w, `{"error":{"code":"bad_request","message":"invalid request body"}}`, stdhttp.StatusBadRequest)
				return
			}

			order, trade, err := svc.PlaceOrder(r.Context(), req, userID)
			if err != nil {
				stdhttp.Error(w, `{"error":{"code":"bad_request","message":"`+err.Error()+`"}}`, stdhttp.StatusBadRequest)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(stdhttp.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"order": order,
				"trade": trade,
			})
		}), "trade"))

	// Bot: Get positions (API key auth, requires 'read' scope)
	mux.Handle("/api/v1/bot/positions",
		botAuth.Wrap(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
			if r.Method != stdhttp.MethodGet {
				stdhttp.Error(w, `{"error":{"code":"method_not_allowed"}}`, stdhttp.StatusMethodNotAllowed)
				return
			}

			userID := r.Header.Get("X-User-ID")
			positions, err := svc.ListPositions(r.Context(), userID)
			if err != nil {
				stdhttp.Error(w, `{"error":{"code":"internal","message":"failed to list positions"}}`, stdhttp.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(positions)
		}), "read"))

	// Bot: Get markets (API key auth, requires 'read' scope)
	mux.Handle("/api/v1/bot/markets",
		botAuth.Wrap(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
			if r.Method != stdhttp.MethodGet {
				stdhttp.Error(w, `{"error":{"code":"method_not_allowed"}}`, stdhttp.StatusMethodNotAllowed)
				return
			}

			filter := prediction.MarketFilter{
				Page:     intQueryParam(r, "page", 1),
				PageSize: intQueryParam(r, "pageSize", 50),
			}
			if status := r.URL.Query().Get("status"); status != "" {
				s := prediction.MarketStatus(status)
				filter.Status = &s
			}

			markets, total, err := svc.ListMarkets(r.Context(), filter)
			if err != nil {
				stdhttp.Error(w, `{"error":{"code":"internal","message":"failed to list markets"}}`, stdhttp.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"data": markets,
				"meta": prediction.PageMeta{
					Page:     filter.Page,
					PageSize: filter.PageSize,
					Total:    total,
					HasNext:  filter.Page*filter.PageSize < total,
				},
			})
		}), "read"))

	slog.Info("bot API routes registered")
}
