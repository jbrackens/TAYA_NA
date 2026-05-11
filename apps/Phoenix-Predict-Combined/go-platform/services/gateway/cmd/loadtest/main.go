// loadtest fires concurrent order placements against a running gateway and
// reports throughput + latency percentiles. Use it to measure the realistic
// end-to-end cost of placing an order: HTTP → auth → service → wallet
// reserve → exchange.BuildPlan → PersistMatchAtomic → JSON response. The
// per-market advisory lock means orders against the same market serialise,
// so the bench measures the lock-contended hot path.
//
// Usage:
//
//	go run ./cmd/loadtest \
//	  -gateway http://localhost:18080 \
//	  -username demo@phoenix.local \
//	  -password demo123 \
//	  -ticker IMP-5D61C3F4 \
//	  -orders 200 \
//	  -concurrency 10
//
// The harness places resting limit-buy orders below the spread so they don't
// cross. That isolates the order-acceptance path. For match-path throughput
// pre-seed the book with one side and run with -concurrency 1 buying the
// opposite side (a follow-up exercise; this is the v1 baseline).
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type Config struct {
	Gateway     string
	Username    string
	Password    string
	Ticker      string // single-market mode (back-compat with v1)
	Tickers     string // comma-separated list for multi-market mode
	Orders      int
	Concurrency int
	Side        string
	PriceCents  int
	Quantity    int
	Timeout     time.Duration
}

func parseFlags() Config {
	var c Config
	flag.StringVar(&c.Gateway, "gateway", "http://localhost:18080", "gateway base URL")
	flag.StringVar(&c.Username, "username", "demo@phoenix.local", "login username")
	flag.StringVar(&c.Password, "password", "demo123", "login password")
	flag.StringVar(&c.Ticker, "ticker", "", "single market ticker (mutually exclusive with -tickers)")
	flag.StringVar(&c.Tickers, "tickers", "", "comma-separated tickers for multi-market sweep (validates linear lock scaling)")
	flag.IntVar(&c.Orders, "orders", 200, "total number of orders to place (split across tickers)")
	flag.IntVar(&c.Concurrency, "concurrency", 10, "concurrent workers (round-robin across tickers)")
	flag.StringVar(&c.Side, "side", "yes", "yes or no")
	flag.IntVar(&c.PriceCents, "price", 1, "limit price in cents (1-99)")
	flag.IntVar(&c.Quantity, "qty", 1, "quantity per order")
	flag.DurationVar(&c.Timeout, "timeout", 10*time.Second, "per-request timeout")
	flag.Parse()
	if c.Ticker == "" && c.Tickers == "" {
		log.Fatal("either -ticker or -tickers is required")
	}
	if c.Ticker != "" && c.Tickers != "" {
		log.Fatal("-ticker and -tickers are mutually exclusive")
	}
	return c
}

// httpClient builds a shared http.Client with cookie persistence so the
// auth session sticks across requests.
func httpClient(timeout time.Duration) *http.Client {
	jar, _ := cookiejar.New(nil)
	return &http.Client{
		Jar:     jar,
		Timeout: timeout,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 100,
			IdleConnTimeout:     90 * time.Second,
		},
	}
}

type loginResponse struct {
	AccessToken string `json:"accessToken"`
}

func login(client *http.Client, cfg Config) (string, error) {
	body, _ := json.Marshal(map[string]string{"username": cfg.Username, "password": cfg.Password})
	req, err := http.NewRequest("POST", cfg.Gateway+"/api/v1/auth/login/", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		buf, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("login %d: %s", resp.StatusCode, string(buf))
	}
	var lr loginResponse
	if err := json.NewDecoder(resp.Body).Decode(&lr); err != nil {
		return "", err
	}
	if lr.AccessToken == "" {
		return "", errors.New("empty access token")
	}
	return lr.AccessToken, nil
}

type marketResponse struct {
	ID string `json:"id"`
}

func resolveMarketID(client *http.Client, cfg Config, token string) (string, error) {
	req, _ := http.NewRequest("GET", cfg.Gateway+"/api/v1/markets/"+cfg.Ticker+"/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		buf, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("get market %d: %s", resp.StatusCode, string(buf))
	}
	var m marketResponse
	if err := json.NewDecoder(resp.Body).Decode(&m); err != nil {
		return "", err
	}
	return m.ID, nil
}

// readCSRFCookie pulls the csrf_token value from the client's cookie jar.
// Gateway sets it on login (non-HttpOnly so JS can read it). All POSTs must
// echo the value in the X-CSRF-Token header — see CSRF middleware in
// internal/http/.
func readCSRFCookie(client *http.Client, gateway string) (string, error) {
	u, err := url.Parse(gateway)
	if err != nil {
		return "", err
	}
	for _, c := range client.Jar.Cookies(u) {
		if c.Name == "csrf_token" {
			return c.Value, nil
		}
	}
	return "", errors.New("csrf_token cookie not set (did login succeed?)")
}

// placeOrder sends one order request and returns the elapsed time and an
// error if the response wasn't 2xx. The body matches the gateway's
// PlaceOrderRequest shape (see internal/http/prediction_handlers.go).
func placeOrder(client *http.Client, cfg Config, token, csrf, marketID string, n int) (time.Duration, error) {
	payload := map[string]any{
		"marketId":   marketID,
		"side":       cfg.Side,
		"action":     "buy",
		"orderType":  "limit",
		"quantity":   cfg.Quantity,
		"priceCents": cfg.PriceCents,
		// gtc so the order rests on the book; we're measuring acceptance,
		// not cancellation. The post-test cleanup task can sweep these.
		"timeInForce": "gtc",
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", cfg.Gateway+"/api/v1/orders/", bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-CSRF-Token", csrf)
	// Idempotency-Key is best-practice for retryable order POSTs; the gateway
	// uses it to dedupe so a retried order doesn't double-place. Vary per
	// request so the bench measures placements, not dedup hits.
	req.Header.Set("Idempotency-Key", fmt.Sprintf("loadtest-%d-%d", time.Now().UnixNano(), n))
	start := time.Now()
	resp, err := client.Do(req)
	if err != nil {
		return time.Since(start), err
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body) // drain
	dur := time.Since(start)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return dur, fmt.Errorf("status %d", resp.StatusCode)
	}
	return dur, nil
}

// resolveTickerList returns the list of tickers to test against. Single-
// market mode (-ticker FOO) returns [FOO]; multi-market mode (-tickers
// A,B,C) returns the comma-split list trimmed of whitespace.
func resolveTickerList(cfg Config) []string {
	if cfg.Ticker != "" {
		return []string{cfg.Ticker}
	}
	raw := strings.Split(cfg.Tickers, ",")
	out := make([]string, 0, len(raw))
	for _, t := range raw {
		t = strings.TrimSpace(t)
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

// resolveMarketIDByTicker is the per-ticker variant of resolveMarketID
// used by multi-market mode. Same code path as the gateway's market
// detail endpoint.
func resolveMarketIDByTicker(client *http.Client, gateway, token, ticker string) (string, error) {
	req, _ := http.NewRequest("GET", gateway+"/api/v1/markets/"+ticker+"/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		buf, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("get market %s: status %d: %s", ticker, resp.StatusCode, string(buf))
	}
	var m marketResponse
	if err := json.NewDecoder(resp.Body).Decode(&m); err != nil {
		return "", err
	}
	return m.ID, nil
}

func main() {
	cfg := parseFlags()
	client := httpClient(cfg.Timeout)

	tickers := resolveTickerList(cfg)
	fmt.Printf("loadtest: %d orders, concurrency=%d, tickers=%v, side=%s, price=%d¢, qty=%d\n",
		cfg.Orders, cfg.Concurrency, tickers, cfg.Side, cfg.PriceCents, cfg.Quantity)

	token, err := login(client, cfg)
	if err != nil {
		log.Fatalf("login: %v", err)
	}
	csrf, err := readCSRFCookie(client, cfg.Gateway)
	if err != nil {
		log.Fatalf("csrf: %v", err)
	}
	fmt.Printf("logged in (csrf=%s...)\n", csrf[:8])

	// Resolve each ticker to its UUID up front so the hot loop doesn't
	// pay for a lookup per request.
	marketIDs := make([]string, 0, len(tickers))
	for _, t := range tickers {
		id, err := resolveMarketIDByTicker(client, cfg.Gateway, token, t)
		if err != nil {
			log.Fatalf("resolve market %s: %v", t, err)
		}
		marketIDs = append(marketIDs, id)
		fmt.Printf("  %s -> %s\n", t, id)
	}
	fmt.Println()

	// Per-market counters so we can verify load actually spread evenly
	// across tickers (no single market starved by the round-robin).
	perMarketOK := make([]int64, len(marketIDs))
	perMarketFail := make([]int64, len(marketIDs))

	latencies := make([]time.Duration, 0, cfg.Orders)
	var mu sync.Mutex
	var ok, fail int64

	type job struct {
		seq       int
		marketIdx int
	}
	jobs := make(chan job, cfg.Orders)
	var wg sync.WaitGroup
	start := time.Now()

	for w := 0; w < cfg.Concurrency; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				dur, err := placeOrder(client, cfg, token, csrf, marketIDs[j.marketIdx], j.seq)
				mu.Lock()
				latencies = append(latencies, dur)
				mu.Unlock()
				if err != nil {
					atomic.AddInt64(&fail, 1)
					atomic.AddInt64(&perMarketFail[j.marketIdx], 1)
				} else {
					atomic.AddInt64(&ok, 1)
					atomic.AddInt64(&perMarketOK[j.marketIdx], 1)
				}
			}
		}()
	}

	// Round-robin tickers so load spreads evenly. The advisory lock is
	// keyed on market_id, so distinct markets shouldn't serialise on
	// each other — this is the whole point of multi-market mode.
	for i := 0; i < cfg.Orders; i++ {
		jobs <- job{seq: i, marketIdx: i % len(marketIDs)}
	}
	close(jobs)
	wg.Wait()
	total := time.Since(start)

	// Report
	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
	pct := func(p float64) time.Duration {
		if len(latencies) == 0 {
			return 0
		}
		idx := int(math.Ceil(p*float64(len(latencies)))) - 1
		if idx < 0 {
			idx = 0
		}
		if idx >= len(latencies) {
			idx = len(latencies) - 1
		}
		return latencies[idx]
	}

	throughput := float64(ok) / total.Seconds()
	var mean time.Duration
	if len(latencies) > 0 {
		var sum time.Duration
		for _, l := range latencies {
			sum += l
		}
		mean = sum / time.Duration(len(latencies))
	}

	fmt.Println("=== results ===")
	fmt.Printf("total time   %v\n", total.Round(time.Millisecond))
	fmt.Printf("ok / fail    %d / %d\n", ok, fail)
	fmt.Printf("throughput   %.1f orders/sec\n", throughput)
	fmt.Printf("latency      mean=%v  p50=%v  p95=%v  p99=%v  max=%v\n",
		mean.Round(time.Microsecond),
		pct(0.50).Round(time.Microsecond),
		pct(0.95).Round(time.Microsecond),
		pct(0.99).Round(time.Microsecond),
		pct(1.00).Round(time.Microsecond),
	)

	// Per-market split: surfaces uneven distribution if the round-robin
	// got knocked sideways by a hot worker, plus tells you which market
	// took the heat in multi-market mode.
	if len(marketIDs) > 1 {
		fmt.Println("\nper-market split:")
		for i, t := range tickers {
			fmt.Printf("  %-20s ok=%d fail=%d\n", t, perMarketOK[i], perMarketFail[i])
		}
	}

	if fail > 0 {
		os.Exit(1)
	}
}
