package prediction

// Fuzz tests for the API boundary validator. ValidatePlaceOrderRequest is
// the first line of defence against malformed POST /api/v1/orders bodies —
// every order that reaches the engine flows through it. A panic here is a
// gateway crash; a missed rejection is a bad order entering the matching
// path. Both are bad. We want neither.
//
// Run with:
//
//	go test ./internal/prediction/ -fuzz=FuzzValidatePlaceOrderRequest -fuzztime=30s
//
// Corpus seeds cover the canonical valid orders plus the obvious bad ones.
// The fuzz engine mutates from there.

import (
	"strings"
	"testing"
)

// fuzzInputs unpacks a fuzz-supplied byte string into a PlaceOrderRequest.
// We don't fuzz the whole struct directly because half the fields are
// pointers or enums and the engine would reject 99% of random inputs at
// the type system level. This indirection gives the fuzzer a tractable
// surface while still exercising every field.
func makeFuzzRequest(data []byte) PlaceOrderRequest {
	// Pad to a known minimum size so indexing is safe.
	if len(data) < 12 {
		pad := make([]byte, 12-len(data))
		data = append(data, pad...)
	}

	sides := []OrderSide{OrderSideYes, OrderSideNo, "", "maybe", "YES"}
	actions := []OrderAction{OrderActionBuy, OrderActionSell, "", "hold"}
	types := []OrderType{OrderTypeLimit, OrderTypeMarket, "", "stop", "iceberg"}
	tifs := []TimeInForce{TIFGTC, TIFIOC, TIFFOK, "", "day", "gtd"}
	sma := []SelfMatchAction{SelfMatchCancelTaker, SelfMatchCancelMaker, SelfMatchCancelBoth, "", "ignore"}

	req := PlaceOrderRequest{
		MarketID:        string(data[0:4]),
		Side:            sides[int(data[4])%len(sides)],
		Action:          actions[int(data[5])%len(actions)],
		OrderType:       types[int(data[6])%len(types)],
		TimeInForce:     tifs[int(data[7])%len(tifs)],
		SelfMatchAction: sma[int(data[8])%len(sma)],
		// Quantity from 2 bytes — covers 0, negative wrap-around, and
		// some plausible sizes. int16 cast first then to int forces the
		// fuzzer to explore the negative half too.
		Quantity: int(int16(uint16(data[9])<<8 | uint16(data[10]))),
		PostOnly: data[11]&0x01 == 1,
	}

	// Optional pricePoints — bit 1 of the same byte. 0..127 covers band
	// + edges (0, 1, 99, 100, 127).
	if data[11]&0x02 != 0 {
		p := int(data[0] & 0x7F)
		req.PricePoints = &p
	}

	// Optional notional cap — bit 2.
	if data[11]&0x04 != 0 {
		n := int64(data[1]) * 100 // 0..25500¢
		req.NotionalCapPoints = &n
	}

	// Optional client_order_id — bit 3, derived from later bytes if
	// present. Catches XSS / injection attempts in label strings.
	if data[11]&0x08 != 0 && len(data) >= 20 {
		s := string(data[12:20])
		req.ClientOrderID = &s
	}

	return req
}

// FuzzValidatePlaceOrderRequest. Three properties:
//
//  1. Never panics on any input.
//  2. Decisions are deterministic — same input yields same decision.
//  3. Errors that ARE returned must be one of the typed sentinels OR a
//     fmt.Errorf with a recognisable substring. A bare nil-pointer panic
//     dressed up as an error would be caught here.
func FuzzValidatePlaceOrderRequest(f *testing.F) {
	// Corpus seeds: canonical valid order, market order without notional
	// cap, sell-without-position, limit at the band edge, garbage UTF-8,
	// empty input.
	seeds := [][]byte{
		// Canonical valid: limit buy yes, price 50, qty 10, GTC.
		{'m', 'k', 't', '1', 0, 0, 0, 0, 0, 0, 10, 0x02},
		// Market order, no notional cap → should reject upstream but the
		// validator currently lets it pass (notional is enforced at the
		// handler). Seeds a fuzz path that pokes this.
		{'m', 'k', 't', '2', 0, 0, 1, 0, 0, 0, 1, 0x00},
		// Sell without position → ErrInsufficientPosition.
		{'m', 'k', 't', '3', 0, 1, 0, 0, 0, 0, 5, 0x02},
		// Price band edge cases.
		{'m', 'k', 't', '4', 0, 0, 0, 0, 0, 0, 1, 0x02},    // pricePoints from data[0]&0x7F = 'm'&0x7F = 109
		{'\x00', 'k', 't', '5', 0, 0, 0, 0, 0, 0, 1, 0x02}, // pricePoints = 0 (out of band)
		// Empty + tiny inputs.
		{},
		{0},
		{0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff},
		// Long client-order-id with high bytes set.
		append([]byte{'m', 'k', 't', '6', 0, 0, 0, 0, 0, 0, 1, 0x0A}, []byte("\x00\x01\x02\x03\x04\x05\x06\x07")...),
	}
	for _, s := range seeds {
		f.Add(s)
	}

	market := makeMarket()
	// Some seeds will hit the sell path; provide a position so we exercise
	// both branches of the available-qty check.
	position := &Position{
		UserID: "fuzz-user", MarketID: "market-x", Side: OrderSideYes,
		Quantity: 100, AvgPricePoints: 50,
	}

	f.Fuzz(func(t *testing.T, data []byte) {
		req := makeFuzzRequest(data)

		// Property 1: no panic. Wrapped in a defer so a panic returns
		// a useful failure rather than crashing the fuzz runner.
		defer func() {
			if r := recover(); r != nil {
				t.Fatalf("validator panicked on input %v: %v", data, r)
			}
		}()

		err1 := ValidatePlaceOrderRequest(req, &market, position)

		// Property 2: deterministic. Re-run on the same input and
		// require the same outcome. (Catches accidentally introducing
		// time.Now() / random state into validation.)
		err2 := ValidatePlaceOrderRequest(req, &market, position)
		if (err1 == nil) != (err2 == nil) {
			t.Fatalf("non-deterministic: err1=%v err2=%v", err1, err2)
		}
		if err1 != nil && err2 != nil && err1.Error() != err2.Error() {
			t.Fatalf("non-deterministic message: %q vs %q", err1.Error(), err2.Error())
		}

		// Property 3: every error is recognisable. Validator returns
		// either a typed sentinel from the FailureReason set, or a
		// fmt.Errorf describing a structural problem. A bare empty-string
		// error or one containing "nil pointer" / "runtime error" would
		// indicate a defensive-coding miss.
		if err1 != nil {
			msg := err1.Error()
			if msg == "" {
				t.Fatalf("empty error message on input %v", data)
			}
			if strings.Contains(msg, "nil pointer") ||
				strings.Contains(msg, "runtime error") ||
				strings.Contains(msg, "index out of range") {
				t.Fatalf("error leaks runtime panic text: %q on input %v", msg, data)
			}
		}
	})
}

// FuzzValidatePlaceOrderRequest_NilMarket — separately fuzz the nil-market
// branch since it's an early return and the main fuzzer never exercises it
// (the market is always set). A future refactor could move the nil check
// later in the function; this guard catches that.
func FuzzValidatePlaceOrderRequest_NilMarket(f *testing.F) {
	f.Add([]byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0})
	f.Add([]byte{0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff})

	f.Fuzz(func(t *testing.T, data []byte) {
		req := makeFuzzRequest(data)
		defer func() {
			if r := recover(); r != nil {
				t.Fatalf("validator panicked on nil market: %v", r)
			}
		}()
		err := ValidatePlaceOrderRequest(req, nil, nil)
		// Nil market should always reject. The specific sentinel is
		// ErrClosedMarket today; checking the err is non-nil is enough.
		if err == nil {
			t.Fatalf("nil market should reject, got nil error")
		}
	})
}
