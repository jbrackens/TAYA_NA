package prediction

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestBookLevels_EmptyInput(t *testing.T) {
	got := BookLevels(nil, 20)
	if len(got) != 0 {
		t.Errorf("nil input should return empty, got %d levels", len(got))
	}
	got = BookLevels([]AggregatedLevel{}, 20)
	if len(got) != 0 {
		t.Errorf("empty input should return empty, got %d levels", len(got))
	}
}

func TestBookLevels_RunningTotal(t *testing.T) {
	rows := []AggregatedLevel{
		{PricePoints: 60, Quantity: 100},
		{PricePoints: 58, Quantity: 50},
		{PricePoints: 55, Quantity: 30},
	}
	got := BookLevels(rows, 20)
	if len(got) != 3 {
		t.Fatalf("expected 3 levels, got %d", len(got))
	}
	wantTotals := []int{100, 150, 180}
	for i, w := range wantTotals {
		if got[i].Total != w {
			t.Errorf("level %d: total = %d, want %d", i, got[i].Total, w)
		}
	}
}

func TestBookLevels_DepthClamp(t *testing.T) {
	rows := make([]AggregatedLevel, 150)
	for i := range rows {
		rows[i] = AggregatedLevel{PricePoints: 99 - i%99, Quantity: 1}
	}
	// Request 200, expect clamp to 100.
	got := BookLevels(rows, 200)
	if len(got) != MaxOrderBookDepth {
		t.Errorf("depth 200 should clamp to %d, got %d", MaxOrderBookDepth, len(got))
	}
	// Request 0 (or negative) should clamp to 1.
	got = BookLevels(rows, 0)
	if len(got) != 1 {
		t.Errorf("depth 0 should clamp to 1, got %d", len(got))
	}
	// Request 5, expect 5.
	got = BookLevels(rows, 5)
	if len(got) != 5 {
		t.Errorf("depth 5 should yield 5, got %d", len(got))
	}
}

func TestBookLevels_SkipsZeroQuantity(t *testing.T) {
	rows := []AggregatedLevel{
		{PricePoints: 60, Quantity: 100},
		{PricePoints: 59, Quantity: 0}, // dust row, should be filtered
		{PricePoints: 58, Quantity: 50},
	}
	got := BookLevels(rows, 20)
	if len(got) != 2 {
		t.Errorf("expected 2 non-zero levels, got %d", len(got))
	}
	if got[1].Total != 150 {
		t.Errorf("total after skip = %d, want 150", got[1].Total)
	}
}

func TestAssembleOrderBook_StableJSONShape(t *testing.T) {
	// Empty book on every side — json should encode bids/asks as [], not null.
	book := AssembleOrderBook("m-x", nil, nil, nil, nil)
	b, err := json.Marshal(book)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	got := string(b)
	want := `{"marketId":"m-x","yes":{"bids":[],"asks":[]},"no":{"bids":[],"asks":[]}}`
	if got != want {
		t.Errorf("json shape mismatch:\n got: %s\nwant: %s", got, want)
	}
}

func TestOrderBookLevelJSONExposesPointAliases(t *testing.T) {
	level := OrderBookLevel{
		PricePoints: 64,
		Quantity:    12,
		Total:       20,
	}
	b, err := json.Marshal(level)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	got := string(b)
	for _, needle := range []string{
		`"pricePoints":64`,
		`"shares":12`,
		`"cumulativeShares":20`,
		`"notionalPoints":768`,
		`"totalNotionalPoints":1280`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(got, needle) {
			t.Fatalf("order book level missing %s in %s", needle, got)
		}
	}
	for _, retired := range []string{
		`"pricePointsCents"`,
		`"quantity"`,
		`"total"`,
	} {
		if strings.Contains(got, retired) {
			t.Fatalf("order book level should not emit retired alias %s in %s", retired, got)
		}
	}
}

func TestAssembleOrderBook_PopulatedSides(t *testing.T) {
	yesBids := BookLevels([]AggregatedLevel{{60, 10}, {58, 5}}, 20)
	yesAsks := BookLevels([]AggregatedLevel{{62, 8}}, 20)
	noBids := BookLevels([]AggregatedLevel{{40, 20}}, 20)
	noAsks := BookLevels([]AggregatedLevel{{42, 15}}, 20)

	book := AssembleOrderBook("m-x", yesBids, yesAsks, noBids, noAsks)
	if len(book.Yes.Bids) != 2 || len(book.Yes.Asks) != 1 {
		t.Errorf("yes side wrong: bids=%d asks=%d", len(book.Yes.Bids), len(book.Yes.Asks))
	}
	if book.Yes.Bids[0].PricePoints != 60 {
		t.Errorf("best yes bid should be 60, got %d", book.Yes.Bids[0].PricePoints)
	}
	if len(book.No.Bids) != 1 || len(book.No.Asks) != 1 {
		t.Errorf("no side wrong: bids=%d asks=%d", len(book.No.Bids), len(book.No.Asks))
	}
}
