package discover

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"
	"time"
)

// TestFetchWithBudget_BudgetExhausted covers the per-source request cap.
// The cap protects upstream APIs from runaway / misconfigured sync runs.
// Hitting the cap in a single run is unusual but not impossible if a
// fetcher's pagination loop bugs out.
func TestFetchWithBudget_BudgetExhausted(t *testing.T) {
	resetBudget()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`[]`))
	}))
	defer srv.Close()

	var out []map[string]any
	for i := 0; i < maxRequestsPerSourcePerRun; i++ {
		// Different URLs so cache doesn't eat them.
		url := srv.URL + "/?i=" + strconv.Itoa(i)
		if err := fetchWithBudget("test_source", url, &out); err != nil {
			t.Fatalf("call %d unexpected error: %v", i, err)
		}
	}
	// Next call should fail with budget-exhausted.
	url := srv.URL + "/?i=" + strconv.Itoa(maxRequestsPerSourcePerRun)
	err := fetchWithBudget("test_source", url, &out)
	if err == nil {
		t.Fatal("expected budget-exhausted error, got nil")
	}
}

// TestFetchWithBudget_CacheHit verifies that a second call to the same URL
// within cacheTTL doesn't re-hit the upstream. Earlier docs claimed sync
// re-runs would hit cache; the in-process cache only covers within a single
// process, but within that process the cache must work.
func TestFetchWithBudget_CacheHit(t *testing.T) {
	resetBudget()

	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`[1, 2, 3]`))
	}))
	defer srv.Close()

	var out []int
	if err := fetchWithBudget("test_cache", srv.URL+"/x", &out); err != nil {
		t.Fatalf("first call: %v", err)
	}
	if err := fetchWithBudget("test_cache", srv.URL+"/x", &out); err != nil {
		t.Fatalf("second call: %v", err)
	}
	if calls != 1 {
		t.Errorf("cache miss: server got %d calls, want 1", calls)
	}
	if requestCount("test_cache") != 1 {
		t.Errorf("budget consumed twice: count=%d, want 1", requestCount("test_cache"))
	}
}

// TestFetchWithBudget_429Backoff covers the rate-limit retry path.
// Upstreams sometimes 429 us; we honor Retry-After when present, exponential
// backoff otherwise. Test reproduces the exact upstream signal.
func TestFetchWithBudget_429Backoff(t *testing.T) {
	resetBudget()

	var mu sync.Mutex
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		calls++
		c := calls
		mu.Unlock()
		if c <= 2 {
			w.Header().Set("Retry-After", "0") // backoff with no real wait
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error":"rate limited"}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`[42]`))
	}))
	defer srv.Close()

	var out []int
	start := time.Now()
	if err := fetchWithBudget("test_429", srv.URL+"/y", &out); err != nil {
		t.Fatalf("expected success after backoff, got %v", err)
	}
	if got := len(out); got != 1 || out[0] != 42 {
		t.Errorf("unexpected payload after backoff: %v", out)
	}
	if calls < 3 {
		t.Errorf("expected at least 3 calls (2 retries + success), got %d", calls)
	}
	if time.Since(start) > 5*time.Second {
		t.Errorf("backoff took too long: %v", time.Since(start))
	}
}

// TestFetchWithBudget_5xxPropagates verifies non-2xx, non-429 errors don't
// retry — they're real server errors that we should surface to the caller.
func TestFetchWithBudget_5xxPropagates(t *testing.T) {
	resetBudget()

	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	var out []int
	err := fetchWithBudget("test_5xx", srv.URL+"/z", &out)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if calls != 1 {
		t.Errorf("expected single call, got %d", calls)
	}
}

// TestSyncResetsBudgetPerRun is the regression lock for the 2026-07-07 demo
// incident: Sync() ran in-process on an hourly ticker but never reset the
// process-global request budget, so kalshi exhausted its cap at boot and
// every source was dead within hours — each later run failed instantly with
// "budget exhausted" and the catalog silently stopped updating. Sync() must
// start every run with a fresh budget.
func TestSyncResetsBudgetPerRun(t *testing.T) {
	resetBudget()

	// Exhaust a source as if a previous run had consumed the whole budget.
	globalBudget.mu.Lock()
	globalBudget.counts["polymarket"] = maxRequestsPerSourcePerRun
	globalBudget.counts["kalshi"] = maxRequestsPerSourcePerRun
	globalBudget.counts["manifold"] = maxRequestsPerSourcePerRun
	globalBudget.mu.Unlock()

	// A Sync run with all sources disabled (limit 0) must still clear the
	// budget so the next fetch is allowed. Using zero limits keeps the test
	// offline: no fetcher runs, no repo/network needed.
	_, _, err := Sync(context.Background(), nil, nil, map[string]int{})
	if err != nil {
		t.Fatalf("zero-limit sync should not error, got: %v", err)
	}

	if got := requestCount("polymarket"); got != 0 {
		t.Fatalf("polymarket budget not reset by Sync, count=%d", got)
	}
	if got := requestCount("kalshi"); got != 0 {
		t.Fatalf("kalshi budget not reset by Sync, count=%d", got)
	}
	if got := requestCount("manifold"); got != 0 {
		t.Fatalf("manifold budget not reset by Sync, count=%d", got)
	}
}
