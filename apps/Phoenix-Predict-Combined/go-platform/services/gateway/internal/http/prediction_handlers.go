package http

import (
	"encoding/json"
	"io"
	"log/slog"
	stdhttp "net/http"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

type marketLifecycleRequest struct {
	Reason string `json:"reason"`
}

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
		if cid := r.URL.Query().Get("categoryId"); cid != "" {
			filter.CategoryID = &cid
		}
		if status := r.URL.Query().Get("status"); status != "" {
			s := prediction.MarketStatus(status)
			filter.Status = &s
		}
		if ticker := r.URL.Query().Get("ticker"); ticker != "" {
			filter.Ticker = &ticker
		}
		if cb := r.URL.Query().Get("closeBefore"); cb != "" {
			if t, err := time.Parse(time.RFC3339, cb); err == nil {
				filter.CloseBefore = &t
			}
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
		path := r.URL.Path[len("/api/v1/markets/"):]
		if path == "" {
			return httpx.BadRequest("market id or ticker required", nil)
		}
		// Sub-path routing: /api/v1/markets/{idOrTicker}/trades
		parts := strings.SplitN(path, "/", 2)
		id := parts[0]
		sub := ""
		if len(parts) == 2 {
			sub = parts[1]
		}
		market, err := svc.GetMarketByTicker(r.Context(), id)
		if err != nil {
			market, err = svc.GetMarket(r.Context(), id)
			if err != nil {
				return httpx.NotFound("market not found")
			}
		}
		switch sub {
		case "":
			return httpx.WriteJSON(w, stdhttp.StatusOK, market)
		case "trades":
			limit := intQueryParam(r, "limit", 50)
			// Clamp limit to a sane range; the trade tape ships with the
			// new match_id column so clients can group issuance pairs.
			if limit > 200 {
				limit = 200
			}
			if limit < 1 {
				return httpx.BadRequest("limit must be >= 1", nil)
			}
			trades, err := svc.ListTrades(r.Context(), market.ID, limit)
			if err != nil {
				return httpx.Internal("failed to fetch trades", err)
			}
			if trades == nil {
				trades = []prediction.Trade{}
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, trades)
		case "orderbook":
			// Order-book depth: server-side capped at 100 (matches Kalshi).
			// Smaller defaults reduce payload for typical UI use.
			depth := intQueryParam(r, "depth", 20)
			if depth < 1 {
				return httpx.BadRequest("depth must be >= 1", nil)
			}
			book, err := svc.GetOrderBook(r.Context(), market.ID, depth)
			if err != nil {
				return httpx.Internal("failed to fetch orderbook", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, book)
		default:
			return httpx.NotFound("market subresource not found")
		}
	}))

	slog.Info("prediction routes registered")
}

// marketUpdateBroadcaster is the slice of ws.Notifier the order
// handlers need. Defined here (not imported from internal/ws) so the
// prediction HTTP layer stays loosely coupled — any test or future
// transport can plug in a stub.
//
// Includes the four event channels emitted on a successful order fill:
//   - market:<id>     — price/status snapshot for chart + ticker
//   - trades:<id>     — individual trade fill (timestamp, side, price, qty)
//   - portfolio:<uid> — the buyer's updated position row
//   - wallet:<uid>    — the buyer's new balance after the cost+fee debit
//
// All four are fire-and-forget per PLAN §8 — a missed publish is
// recoverable on the client by refetching, but emitting them is what
// makes the live order book / portfolio / balance feel real.
type marketUpdateBroadcaster interface {
	NotifyPredictionMarketUpdate(marketID string, data interface{})
	NotifyPredictionTrade(marketID string, data interface{})
	NotifyPredictionOrderBookUpdate(marketID string, data interface{})
	NotifyPortfolioUpdate(userID string, data interface{})
	NotifyWalletUpdate(userID string, data interface{})
}

// marketUpdatePayload is the wire shape published on `market:<id>` after
// a successful order OR a market lifecycle transition. Keep this in sync
// with the TS PredictionMarket shape on the frontend
// (api-client/src/prediction-types.ts) — the frontend merges these fields
// into local market state on receive.
//
// Status and Result are included so lifecycle transitions (open → halted →
// closed → settled / voided) propagate to subscribers without a refresh.
// Order-fill paths also include them — those don't change on a fill, but
// sending them is harmless and keeps the payload schema uniform.
type marketUpdatePayload struct {
	MarketID            string                   `json:"marketId"`
	Ticker              string                   `json:"ticker"`
	Status              prediction.MarketStatus  `json:"status"`
	Result              *prediction.MarketResult `json:"result,omitempty"`
	YesPriceCents       int                      `json:"yesPriceCents"`
	NoPriceCents        int                      `json:"noPriceCents"`
	LastTradePriceCents *int                     `json:"lastTradePriceCents,omitempty"`
	VolumeCents         int64                    `json:"volumeCents"`
	OpenInterestCents   int64                    `json:"openInterestCents"`
	Ts                  string                   `json:"ts"`
}

// buildOrderBookHintPayload is the wire shape published on `orderbook:<id>`
// after a successful exchange match. Carries best bid/ask for a quick-look
// update; clients refetch GET /markets/{id}/orderbook for full depth.
func buildOrderBookHintPayload(m *prediction.Market) map[string]any {
	return map[string]any{
		"marketId":         m.ID,
		"bestYesBidCents":  m.BestYesBidCents,
		"bestYesAskCents":  m.BestYesAskCents,
		"bestNoBidCents":   m.BestNoBidCents,
		"bestNoAskCents":   m.BestNoAskCents,
		"lastQuoteAt":      m.LastQuoteAt,
		"ts":               time.Now().UTC().Format(time.RFC3339),
	}
}

func buildMarketUpdatePayload(m *prediction.Market) marketUpdatePayload {
	return marketUpdatePayload{
		MarketID:            m.ID,
		Ticker:              m.Ticker,
		Status:              m.Status,
		Result:              m.Result,
		YesPriceCents:       m.YesPriceCents,
		NoPriceCents:        m.NoPriceCents,
		LastTradePriceCents: m.LastTradePriceCents,
		VolumeCents:         m.VolumeCents,
		OpenInterestCents:   m.OpenInterestCents,
		Ts:                  time.Now().UTC().Format(time.RFC3339),
	}
}

// buildTradeFillPayload is the wire shape published on `trades:<marketID>`
// after a fill. The TS PredictionTradeFeed component on the player app
// consumes this to render the live tape.
func buildTradeFillPayload(t *prediction.Trade) map[string]any {
	return map[string]any{
		"tradeId":     t.ID,
		"marketId":    t.MarketID,
		"side":        t.Side,
		"priceCents":  t.PriceCents,
		"quantity":    t.Quantity,
		"feeCents":    t.FeeCents,
		"isAmmTrade":  t.IsAMMTrade,
		"tradedAt":    t.TradedAt.UTC().Format(time.RFC3339),
		"ts":          time.Now().UTC().Format(time.RFC3339),
	}
}

// buildPortfolioUpdatePayload is the wire shape published on
// `portfolio:<userID>` after a fill. The TS portfolio store merges this
// onto the user's local position cache so a trade in one tab updates
// portfolio totals in another tab without a refetch.
//
// Only fields the client actually needs to merge are included — full
// position details still come from /api/v1/portfolio on demand.
func buildPortfolioUpdatePayload(o *prediction.Order, t *prediction.Trade) map[string]any {
	out := map[string]any{
		"userId":   o.UserID,
		"marketId": o.MarketID,
		"orderId":  o.ID,
		"side":     o.Side,
		"action":   o.Action,
		"ts":       time.Now().UTC().Format(time.RFC3339),
	}
	if t != nil {
		out["tradeId"] = t.ID
		out["filledQuantity"] = t.Quantity
		out["filledPriceCents"] = t.PriceCents
	}
	return out
}

func registerOrderRoutes(mux *stdhttp.ServeMux, svc *prediction.Service, notifier marketUpdateBroadcaster) {
	// --- Authenticated: Orders ---
	mux.Handle("/api/v1/orders", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodGet:
			userID := userIDFromRequest(r)
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
			if orders == nil {
				orders = []prediction.Order{}
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
			userID := userIDFromRequest(r)
			if userID == "" {
				return httpx.Unauthorized("authentication required")
			}
			var req prediction.PlaceOrderRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			// Explicit field validation. The struct already carries
			// `validate:"required,oneof=..."` tags, but no validator
			// is wired into the handler chain — without these checks,
			// invalid requests (e.g. missing `action`) reach the
			// repository INSERT and trigger a Postgres CHECK constraint
			// error like
			//   pq: new row for relation "prediction_orders" violates
			//   check constraint "prediction_orders_action_check"
			// which surfaces as a confusing 400 to the client. These
			// checks turn that into a clean, actionable error.
			if strings.TrimSpace(req.MarketID) == "" {
				return httpx.BadRequest("marketId is required", map[string]any{"field": "marketId"})
			}
			switch req.Side {
			case prediction.OrderSideYes, prediction.OrderSideNo:
			default:
				return httpx.BadRequest("side must be \"yes\" or \"no\"", map[string]any{"field": "side", "got": string(req.Side)})
			}
			switch req.Action {
			case prediction.OrderActionBuy, prediction.OrderActionSell:
			default:
				return httpx.BadRequest("action must be \"buy\" or \"sell\"", map[string]any{"field": "action", "got": string(req.Action)})
			}
			switch req.OrderType {
			case prediction.OrderTypeMarket, prediction.OrderTypeLimit:
			default:
				return httpx.BadRequest("orderType must be \"market\" or \"limit\"", map[string]any{"field": "orderType", "got": string(req.OrderType)})
			}
			if req.Quantity <= 0 {
				return httpx.BadRequest("quantity must be > 0", map[string]any{"field": "quantity", "got": req.Quantity})
			}
			if req.OrderType == prediction.OrderTypeLimit {
				if req.PriceCents == nil || *req.PriceCents < 1 || *req.PriceCents > 99 {
					return httpx.BadRequest("limit orders require priceCents in 1..99", map[string]any{"field": "priceCents"})
				}
			}
			// Exchange-engine field validation. These map 1:1 to schema
			// CHECK constraints from migration 019 — without validation here,
			// invalid values (e.g. timeInForce="abc") surface as Postgres
			// constraint violations downstream. Empty/zero values are fine;
			// the service applies defaults (gtc + cancel_taker).
			if req.TimeInForce != "" {
				switch req.TimeInForce {
				case prediction.TIFGTC, prediction.TIFIOC, prediction.TIFFOK:
				default:
					return httpx.BadRequest("timeInForce must be one of gtc, ioc, fok", map[string]any{"field": "timeInForce", "got": string(req.TimeInForce)})
				}
			}
			if req.SelfMatchAction != "" {
				switch req.SelfMatchAction {
				case prediction.SelfMatchCancelTaker, prediction.SelfMatchCancelMaker, prediction.SelfMatchCancelBoth:
				default:
					return httpx.BadRequest("selfMatchAction must be one of cancel_taker, cancel_maker, cancel_both", map[string]any{"field": "selfMatchAction", "got": string(req.SelfMatchAction)})
				}
			}
			// Market orders MUST carry a notional cap so accidental fat-finger
			// market orders can't drain a wallet. Polymarket enforces this by
			// requiring quote-denominated quantities; we use an explicit field.
			if req.OrderType == prediction.OrderTypeMarket && req.Action == prediction.OrderActionBuy {
				if req.NotionalCapCents == nil || *req.NotionalCapCents <= 0 {
					return httpx.BadRequest("market buy orders require notionalCapCents > 0", map[string]any{"field": "notionalCapCents"})
				}
			}
			order, trade, err := svc.PlaceOrder(r.Context(), req, userID)
			if err != nil {
				return httpx.BadRequest(err.Error(), nil)
			}

			// Broadcast the post-trade state on four channels.
			// All publishes are fire-and-forget per PLAN §8 — a missed
			// broadcast is recoverable on the client by refetching, and
			// the next trade re-publishes anyway.
			//
			//   market:<id>     — price/status snapshot for chart + ticker
			//   trades:<id>     — the new trade fill (price, qty, side, ts)
			//   portfolio:<uid> — buyer's updated position holdings + cost basis
			//   wallet:<uid>    — buyer's new balance after debit + fee
			//
			// Without these broadcasts a user watching their portfolio in
			// one tab would not see their own trade until they manually
			// refreshed. Defining the wider notifier interface but not
			// calling it (the prior state) was dead wiring.
			if notifier != nil {
				if updated, mErr := svc.GetMarket(r.Context(), req.MarketID); mErr == nil {
					notifier.NotifyPredictionMarketUpdate(req.MarketID, buildMarketUpdatePayload(updated))
					// Exchange-mode markets also publish a book-change hint
					// so subscribers know to refetch /orderbook. The payload
					// carries best bid/ask for a quick-look update.
					if updated.ExecutionMode == prediction.ExecutionModeOrderBook {
						notifier.NotifyPredictionOrderBookUpdate(req.MarketID, buildOrderBookHintPayload(updated))
					}
				}
				if trade != nil {
					notifier.NotifyPredictionTrade(req.MarketID, buildTradeFillPayload(trade))
				}
				notifier.NotifyPortfolioUpdate(userID, buildPortfolioUpdatePayload(order, trade))
				if balance := svc.WalletBalance(userID); balance >= 0 {
					notifier.NotifyWalletUpdate(userID, map[string]any{
						"userId":       userID,
						"balanceCents": balance,
						"reason":       "order_fill",
						"orderId":      order.ID,
					})
				}
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

	// POST /api/v1/orders/{id}/cancel — release reservation + mark cancelled.
	// The api-client's cancelOrder() has been calling this path since the
	// client was first written, but the server route was missing — calls
	// 404'd. Service.CancelOrder is fully implemented (releases the
	// wallet reservation in a tx for exchange orders); we just needed to
	// expose it. The catch-all on /api/v1/orders/ dispatches to this
	// handler when the path matches.
	mux.Handle("/api/v1/orders/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		// Path shape: /api/v1/orders/{id}/cancel
		const prefix = "/api/v1/orders/"
		const suffix = "/cancel"
		path := r.URL.Path
		if !strings.HasPrefix(path, prefix) || !strings.HasSuffix(path, suffix) {
			return httpx.NotFound("unknown orders subpath")
		}
		orderID := strings.TrimSuffix(strings.TrimPrefix(path, prefix), suffix)
		if orderID == "" || strings.Contains(orderID, "/") {
			return httpx.BadRequest("invalid order id", nil)
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		userID := userIDFromRequest(r)
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}
		if err := svc.CancelOrder(r.Context(), orderID, userID); err != nil {
			// Distinguish ownership / not-found / state-transition errors so
			// the frontend can surface a useful message.
			msg := err.Error()
			switch {
			case strings.Contains(msg, "not found"):
				return httpx.NotFound(msg)
			case strings.Contains(msg, "does not belong"):
				return httpx.Forbidden(msg)
			default:
				return httpx.BadRequest(msg, nil)
			}
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "cancelled"})
	}))

	slog.Info("order routes registered")
}

func registerPortfolioRoutes(mux *stdhttp.ServeMux, svc *prediction.Service) {
	mux.Handle("/api/v1/portfolio", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := userIDFromRequest(r)
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}
		positions, err := svc.ListPositions(r.Context(), userID)
		if err != nil {
			return httpx.Internal("failed to fetch data", err)
		}
		if positions == nil {
			positions = []prediction.Position{}
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, positions)
	}))

	mux.Handle("/api/v1/portfolio/summary", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := userIDFromRequest(r)
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}
		summary, err := svc.GetPortfolioSummary(r.Context(), userID)
		if err != nil {
			return httpx.Internal("failed to fetch data", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, summary)
	}))

	// Portfolio history — paginated settled payouts (winning + losing positions).
	mux.Handle("/api/v1/portfolio/history", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := userIDFromRequest(r)
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}
		page := intQueryParam(r, "page", 1)
		pageSize := intQueryParam(r, "pageSize", 20)
		payouts, total, err := svc.ListSettledPositions(r.Context(), userID, page, pageSize)
		if err != nil {
			return httpx.Internal("failed to fetch data", err)
		}
		if payouts == nil {
			payouts = []prediction.Payout{}
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]interface{}{
			"data": payouts,
			"meta": prediction.PageMeta{
				Page:     page,
				PageSize: pageSize,
				Total:    total,
				HasNext:  page*pageSize < total,
			},
		})
	}))

	slog.Info("portfolio routes registered")
}

func registerSettlementRoutes(mux *stdhttp.ServeMux, svc *prediction.Service) {
	// Admin: Create market
	mux.Handle("/api/v1/admin/markets", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var req prediction.CreateMarketRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		market, err := svc.CreateMarket(r.Context(), req)
		if err != nil {
			return httpx.BadRequest(err.Error(), nil)
		}
		return httpx.WriteJSON(w, stdhttp.StatusCreated, market)
	}))

	// Admin: Market lifecycle transitions
	mux.Handle("/api/v1/admin/markets/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/markets/")
		parts := strings.Split(path, "/")
		if len(parts) != 3 || parts[0] == "" || parts[1] != "lifecycle" || parts[2] == "" {
			return httpx.NotFound("route not found")
		}

		adminID := userIDFromRequest(r)
		actorID := actorIDPointer(adminID)
		reason, err := decodeLifecycleReason(r)
		if err != nil {
			return err
		}

		switch strings.ToLower(strings.TrimSpace(parts[2])) {
		case "open":
			if reason == "" {
				reason = "market opened by admin"
			}
			if err := svc.TransitionMarketStatus(r.Context(), parts[0], prediction.MarketStatusOpen, reason, actorID); err != nil {
				return httpx.BadRequest(err.Error(), nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"marketId": parts[0],
				"status":   prediction.MarketStatusOpen,
				"reason":   reason,
			})
		case "halt", "halted":
			if reason == "" {
				reason = "market halted by admin"
			}
			if err := svc.TransitionMarketStatus(r.Context(), parts[0], prediction.MarketStatusHalted, reason, actorID); err != nil {
				return httpx.BadRequest(err.Error(), nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"marketId": parts[0],
				"status":   prediction.MarketStatusHalted,
				"reason":   reason,
			})
		case "close", "closed":
			if reason == "" {
				reason = "market closed by admin"
			}
			if err := svc.TransitionMarketStatus(r.Context(), parts[0], prediction.MarketStatusClosed, reason, actorID); err != nil {
				return httpx.BadRequest(err.Error(), nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"marketId": parts[0],
				"status":   prediction.MarketStatusClosed,
				"reason":   reason,
			})
		case "void", "voided":
			if reason == "" {
				reason = "market voided by admin"
			}
			payouts, err := svc.VoidMarket(r.Context(), parts[0], reason, actorID)
			if err != nil {
				return httpx.BadRequest(err.Error(), nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"marketId": parts[0],
				"status":   prediction.MarketStatusVoided,
				"reason":   reason,
				"payouts":  payouts,
			})
		default:
			return httpx.BadRequest("unsupported lifecycle action", map[string]any{"action": parts[2]})
		}
	}))

	// Admin: Settle market
	mux.Handle("/api/v1/admin/settlements/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		marketID := r.URL.Path[len("/api/v1/admin/settlements/"):]
		if marketID == "" {
			return httpx.BadRequest("market id required", nil)
		}
		adminID := userIDFromRequest(r)
		var req prediction.ResolveMarketRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		settlement, payouts, err := svc.ResolveMarket(r.Context(), marketID, req, actorIDPointer(adminID))
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

// registerDashboardRoutes mounts admin dashboard aggregate endpoints. These are
// summary/aggregate signals computed on demand from raw prediction tables —
// not stored materializations.
func registerDashboardRoutes(mux *stdhttp.ServeMux, svc *prediction.Service) {
	// Admin: Volume + top movers over a recent window.
	// Query params:
	//   since   — Go duration, e.g. "24h", "7d" (default "24h"). Capped at 30d.
	//   topN    — number of top movers to return (default 5, max 50).
	mux.Handle("/api/v1/admin/dashboard/volume", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		sinceParam := strings.TrimSpace(r.URL.Query().Get("since"))
		if sinceParam == "" {
			sinceParam = "24h"
		}
		// Allow "7d" / "30d" by translating to hours; Go's time.ParseDuration
		// doesn't accept "d" units.
		if strings.HasSuffix(sinceParam, "d") {
			n, err := strconv.Atoi(strings.TrimSuffix(sinceParam, "d"))
			if err != nil || n <= 0 {
				return httpx.BadRequest("invalid since parameter", map[string]any{"since": sinceParam})
			}
			sinceParam = strconv.Itoa(n*24) + "h"
		}
		dur, err := time.ParseDuration(sinceParam)
		if err != nil || dur <= 0 {
			return httpx.BadRequest("invalid since parameter", map[string]any{"since": sinceParam})
		}
		const maxWindow = 30 * 24 * time.Hour
		if dur > maxWindow {
			dur = maxWindow
		}

		topN := intQueryParam(r, "topN", 5)
		if topN < 1 {
			topN = 1
		}
		if topN > 50 {
			topN = 50
		}

		stats, err := svc.DashboardVolumeStats(r.Context(), time.Now().Add(-dur), topN)
		if err != nil {
			return httpx.Internal("failed to load dashboard volume", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, stats)
	}))

	// Admin: Recent collateral drift alerts. One row per market with
	// adjustment ledger entries since `since`. Default 24h, capped at 30d.
	// Backoffice ops page consumes this to badge markets needing
	// investigation.
	mux.Handle("/api/v1/admin/prediction/drift-alerts", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		sinceParam := strings.TrimSpace(r.URL.Query().Get("since"))
		if sinceParam == "" {
			sinceParam = "24h"
		}
		if strings.HasSuffix(sinceParam, "d") {
			n, err := strconv.Atoi(strings.TrimSuffix(sinceParam, "d"))
			if err != nil || n <= 0 {
				return httpx.BadRequest("invalid since parameter", map[string]any{"since": sinceParam})
			}
			sinceParam = strconv.Itoa(n*24) + "h"
		}
		dur, err := time.ParseDuration(sinceParam)
		if err != nil || dur <= 0 {
			return httpx.BadRequest("invalid since parameter", map[string]any{"since": sinceParam})
		}
		if dur > 30*24*time.Hour {
			dur = 30 * 24 * time.Hour
		}
		alerts, err := svc.ListRecentDriftAlerts(r.Context(), dur)
		if err != nil {
			return httpx.Internal("failed to load drift alerts", err)
		}
		if alerts == nil {
			alerts = []prediction.CollateralDriftAlert{}
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]interface{}{
			"data":      alerts,
			"sinceText": sinceParam,
		})
	}))

	slog.Info("dashboard routes registered")
}

func decodeLifecycleReason(r *stdhttp.Request) (string, error) {
	if r.Body == nil {
		return "", nil
	}
	defer r.Body.Close()

	var req marketLifecycleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		if err == io.EOF {
			return "", nil
		}
		return "", httpx.BadRequest("invalid request body", nil)
	}
	return strings.TrimSpace(req.Reason), nil
}

func actorIDPointer(actorID string) *string {
	if actorID == "" {
		return nil
	}
	return &actorID
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

// userIDFromRequest returns the authenticated user ID for the request.
//
// Cookie auth (httpx.Auth middleware) puts the user ID in the request context.
// Bot auth (prediction.BotAuthMiddleware) puts it in the X-User-ID header.
// We check context first, then fall back to the header so the same handler
// works for both auth styles.
func userIDFromRequest(r *stdhttp.Request) string {
	if uid := httpx.UserIDFromContext(r.Context()); uid != "" {
		return uid
	}
	return r.Header.Get("X-User-ID")
}
