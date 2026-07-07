package discover

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// kalshiOpenEventsFixture mimics /events?status=open&with_nested_markets=true:
// one auto-generated MVE parlay event (must be skipped) and one real
// multi-market event. Market -B omits event_ticker and rules_primary to
// exercise the event-level fallbacks.
const kalshiOpenEventsFixture = `{
  "events": [
    {
      "event_ticker": "KXMVESPORTSMULTIGAMEEXTENDED-S2026ABC",
      "title": "Parlay: three legs",
      "category": "Sports",
      "markets": [
        {
          "ticker": "KXMVESPORTSMULTIGAMEEXTENDED-S2026ABC-1",
          "event_ticker": "KXMVESPORTSMULTIGAMEEXTENDED-S2026ABC",
          "status": "active",
          "title": "Parlay leg",
          "mve_selected_legs": [{"ticker": "leg1"}]
        }
      ]
    },
    {
      "event_ticker": "KXNEWPOPE-70",
      "title": "Who will be the next Pope?",
      "category": "Politics",
      "markets": [
        {
          "ticker": "KXNEWPOPE-70-A",
          "event_ticker": "KXNEWPOPE-70",
          "status": "active",
          "title": "Will Cardinal A be selected as the next Pope?",
          "yes_sub_title": "Cardinal A",
          "rules_primary": "If Cardinal A is selected, resolves yes.",
          "yes_bid_dollars": "0.4500",
          "no_bid_dollars": "0.5300",
          "volume_fp": "1234.5",
          "volume_24h_fp": "234.5",
          "liquidity_dollars": "9876.10",
          "close_time": "2099-01-01T00:00:00Z",
          "updated_time": "2026-07-01T00:00:00Z",
          "market_type": "binary"
        },
        {
          "ticker": "KXNEWPOPE-70-B",
          "status": "active",
          "title": "",
          "yes_sub_title": "Cardinal B",
          "yes_bid_dollars": "0.1000",
          "no_bid_dollars": "0.8800",
          "volume_fp": "10",
          "close_time": "2099-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "cursor": ""
}`

// kalshiSettledEventsFixture mimics /events?status=settled: a settled event
// still nesting one active market (must be skipped in the settled pass) plus
// a settled event with markets:null (must not panic).
const kalshiSettledEventsFixture = `{
  "events": [
    {
      "event_ticker": "KXNFLRETIRE-RW",
      "title": "Will Player X announce retirement?",
      "category": "Sports",
      "markets": [
        {
          "ticker": "KXNFLRETIRE-RW-26",
          "event_ticker": "KXNFLRETIRE-RW",
          "status": "finalized",
          "result": "yes",
          "title": "Will Player X announce retirement before 2027?",
          "close_time": "2026-06-04T01:41:37Z",
          "expiration_time": "2026-06-05T00:00:00Z",
          "yes_bid_dollars": "0.9900"
        },
        {
          "ticker": "KXNFLRETIRE-RW-27",
          "status": "active",
          "title": "Will Player X announce retirement before 2028?",
          "close_time": "2027-06-04T01:41:37Z"
        }
      ]
    },
    {
      "event_ticker": "KXEMPTY-1",
      "title": "Settled event with no nested markets",
      "category": "Politics",
      "markets": null
    }
  ],
  "cursor": ""
}`

// TestFetchKalshi_EventsPivotSkipsMVE is the regression lock for the
// 2026-07-07 zero-market incident. The flat /markets listing became 100%
// auto-generated MVE parlays for 10+ pages (both statuses), so the old
// fetcher filtered every row, burned its whole page budget, and returned
// 0 markets with a nil error — a silent zero while Polymarket/Manifold
// kept importing. The fetcher must page /events?with_nested_markets=true
// instead, skip parlays, and still parse prices, categories, and
// resolutions from the nested market rows.
func TestFetchKalshi_EventsPivotSkipsMVE(t *testing.T) {
	resetBudget()

	var gotPaths []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPaths = append(gotPaths, r.URL.Path+"?"+r.URL.RawQuery)
		if r.URL.Path != "/events" {
			t.Errorf("fetcher hit %s, want /events (flat /markets is MVE-flooded)", r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if r.URL.Query().Get("with_nested_markets") != "true" {
			t.Errorf("missing with_nested_markets=true in query: %s", r.URL.RawQuery)
		}
		w.WriteHeader(http.StatusOK)
		switch r.URL.Query().Get("status") {
		case "open":
			_, _ = w.Write([]byte(kalshiOpenEventsFixture))
		case "settled":
			_, _ = w.Write([]byte(kalshiSettledEventsFixture))
		default:
			t.Errorf("unexpected status param in query: %s", r.URL.RawQuery)
			_, _ = w.Write([]byte(`{"events": [], "cursor": ""}`))
		}
	}))
	defer srv.Close()

	old := kalshiAPIBase
	kalshiAPIBase = srv.URL
	defer func() { kalshiAPIBase = old }()

	ms, err := FetchKalshi(10)
	if err != nil {
		t.Fatalf("FetchKalshi: %v", err)
	}

	byID := map[string]Market{}
	for _, m := range ms {
		if strings.HasPrefix(m.ExternalID, "KXMVE") || strings.HasPrefix(m.EventGroup, "KXMVE") {
			t.Errorf("MVE parlay leaked through the filter: %s (%s)", m.ExternalID, m.EventGroup)
		}
		byID[m.ExternalID] = m
	}
	if len(ms) != 3 {
		t.Fatalf("got %d markets, want 3 (A, B, finalized): %v", len(ms), byID)
	}

	a, ok := byID["KXNEWPOPE-70-A"]
	if !ok {
		t.Fatal("open market KXNEWPOPE-70-A missing")
	}
	if len(a.Prices) != 2 || a.Prices[0] != 0.45 || a.Prices[1] != 0.53 {
		t.Errorf("string-dollar prices misparsed: %v, want [0.45 0.53]", a.Prices)
	}
	if a.Category != "Politics" {
		t.Errorf("event-level category not applied: %q, want Politics", a.Category)
	}
	if a.Volume != 1234.5 || a.Liquidity != 9876.10 {
		t.Errorf("volume/liquidity misparsed: vol=%v liq=%v", a.Volume, a.Liquidity)
	}
	if a.Resolution != nil {
		t.Errorf("active market must not carry a Resolution: %+v", a.Resolution)
	}

	b, ok := byID["KXNEWPOPE-70-B"]
	if !ok {
		t.Fatal("open market KXNEWPOPE-70-B missing")
	}
	if b.Title != "Cardinal B" {
		t.Errorf("title fallback to yes_sub_title broken: %q", b.Title)
	}
	if b.EventGroup != "KXNEWPOPE-70" {
		t.Errorf("event_ticker fallback to enclosing event broken: %q", b.EventGroup)
	}

	rw, ok := byID["KXNFLRETIRE-RW-26"]
	if !ok {
		t.Fatal("finalized market KXNFLRETIRE-RW-26 missing")
	}
	if rw.Resolution == nil || rw.Resolution.Outcome != "yes" {
		t.Fatalf("finalized+result=yes must map to Resolution{yes}, got %+v", rw.Resolution)
	}
	wantResolved := time.Date(2026, time.June, 5, 0, 0, 0, 0, time.UTC)
	if !rw.Resolution.ResolvedAt.Equal(wantResolved) {
		t.Errorf("ResolvedAt should come from expiration_time: %v, want %v", rw.Resolution.ResolvedAt, wantResolved)
	}

	if _, leaked := byID["KXNFLRETIRE-RW-27"]; leaked {
		t.Error("active market nested in a settled event leaked into the settled pass")
	}

	if got := requestCount("kalshi"); got != 2 {
		t.Errorf("expected 1 request per status (2 total), got %d: %v", got, gotPaths)
	}
}

// TestFetchKalshi_ZeroUsableMarketsErrors locks the loud-failure behavior:
// if upstream drifts again and every fetched row is filtered (the 2026-07-07
// mode), FetchKalshi must return an error so the run lands in FetchErrors
// and the /api/v1/status marketSync block — never a silent healthy zero.
func TestFetchKalshi_ZeroUsableMarketsErrors(t *testing.T) {
	resetBudget()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		if r.URL.Query().Get("status") == "open" {
			// Only an MVE parlay event — everything gets filtered.
			_, _ = w.Write([]byte(`{
			  "events": [
			    {
			      "event_ticker": "KXMVESPORTSMULTIGAMEEXTENDED-S2026DEF",
			      "title": "Parlay",
			      "category": "Sports",
			      "markets": [{"ticker": "KXMVESPORTSMULTIGAMEEXTENDED-S2026DEF-1", "status": "active"}]
			    }
			  ],
			  "cursor": ""
			}`))
			return
		}
		_, _ = w.Write([]byte(`{"events": [], "cursor": ""}`))
	}))
	defer srv.Close()

	old := kalshiAPIBase
	kalshiAPIBase = srv.URL
	defer func() { kalshiAPIBase = old }()

	ms, err := FetchKalshi(10)
	if err == nil {
		t.Fatalf("expected loud error on 0 usable markets, got nil (markets=%d)", len(ms))
	}
	if !strings.Contains(err.Error(), "0 usable markets") {
		t.Errorf("error should name the zero-market condition: %v", err)
	}
	if len(ms) != 0 {
		t.Errorf("expected no markets, got %d", len(ms))
	}
}
