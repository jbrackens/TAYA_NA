package prediction

// MaxOrderBookDepth caps the number of L2 price levels the API returns per
// side. Matches Kalshi's depth parameter range. Requests above this are
// silently clamped; depth < 1 returns an error at the handler.
const MaxOrderBookDepth = 100

// AggregatedLevel is one price level after GROUP BY price_points at the SQL
// layer. Quantity is the sum of `remaining_quantity` across all open/partial
// orders at that price. Rows arrive sorted: bids (Buy) DESC, asks (Sell) ASC.
type AggregatedLevel struct {
	PricePoints int
	Quantity    int
}

// BookLevels turns sorted AggregatedLevels into L2 OrderBookLevels with
// cumulative running totals. Caller is responsible for sort order:
//   - Buy/bids: input rows ordered by price DESC (best bid first)
//   - Sell/asks: input rows ordered by price ASC (best ask first)
//
// `depth` is clamped to [1, MaxOrderBookDepth]. Empty input returns an empty
// slice (callers should still wrap in OrderBookSide with non-nil bids/asks
// fields for stable JSON shape).
func BookLevels(rows []AggregatedLevel, depth int) []OrderBookLevel {
	if depth < 1 {
		depth = 1
	}
	if depth > MaxOrderBookDepth {
		depth = MaxOrderBookDepth
	}
	if len(rows) > depth {
		rows = rows[:depth]
	}
	out := make([]OrderBookLevel, 0, len(rows))
	cumulative := 0
	for _, r := range rows {
		if r.Quantity <= 0 {
			continue
		}
		cumulative += r.Quantity
		out = append(out, OrderBookLevel{
			PricePoints: r.PricePoints,
			Quantity:    r.Quantity,
			Total:       cumulative,
		})
	}
	return out
}

// AssembleOrderBook composes the four (side, action) aggregations into a
// single OrderBook. Each input slice must already be sorted appropriately
// (bids DESC, asks ASC) and clamped to depth via BookLevels.
func AssembleOrderBook(marketID string, yesBids, yesAsks, noBids, noAsks []OrderBookLevel) *OrderBook {
	return &OrderBook{
		MarketID: marketID,
		Yes: OrderBookSide{
			Bids: ensureNotNil(yesBids),
			Asks: ensureNotNil(yesAsks),
		},
		No: OrderBookSide{
			Bids: ensureNotNil(noBids),
			Asks: ensureNotNil(noAsks),
		},
	}
}

// ensureNotNil returns an empty slice instead of nil so JSON marshalling
// produces `[]` rather than `null`. Stable client shape.
func ensureNotNil(s []OrderBookLevel) []OrderBookLevel {
	if s == nil {
		return []OrderBookLevel{}
	}
	return s
}
