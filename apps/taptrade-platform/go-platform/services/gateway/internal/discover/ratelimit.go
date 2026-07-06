package discover

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"
)

// Per-source request budgets and pagination caps. These keep us well under
// any documented upstream rate limit even on rapid dev iterations. Alpha
// scope: real product replaces this layer with per-source paid feeds.
const (
	maxRequestsPerSourcePerRun = 10
	maxRetriesOn429            = 3
	maxPagePerSource           = 10 // hard cap on pagination depth (10K markets)
	cacheTTL                   = 60 * time.Second
)

// budget tracks per-source request count + cached responses for a single
// process invocation. Cleared automatically by the ttl on cache lookups.
type budget struct {
	mu        sync.Mutex
	counts    map[string]int
	cache     map[string]cachedResponse
}

type cachedResponse struct {
	body  []byte
	stamp time.Time
}

var globalBudget = &budget{
	counts: map[string]int{},
	cache:  map[string]cachedResponse{},
}

// fetchWithBudget wraps httpGetJSON with per-source budget enforcement, a
// short-lived response cache, and exponential backoff on 429. The source
// label is internal-only — never appears in any user-visible field.
func fetchWithBudget(source, url string, out any) error {
	globalBudget.mu.Lock()
	if entry, ok := globalBudget.cache[url]; ok && time.Since(entry.stamp) < cacheTTL {
		globalBudget.mu.Unlock()
		return jsonUnmarshal(entry.body, out)
	}
	count := globalBudget.counts[source]
	if count >= maxRequestsPerSourcePerRun {
		globalBudget.mu.Unlock()
		return fmt.Errorf("budget exhausted for %s (max %d req/run)", source, maxRequestsPerSourcePerRun)
	}
	globalBudget.counts[source] = count + 1
	globalBudget.mu.Unlock()

	body, err := httpGetWithRetry(url, maxRetriesOn429)
	if err != nil {
		return err
	}

	globalBudget.mu.Lock()
	globalBudget.cache[url] = cachedResponse{body: body, stamp: time.Now()}
	globalBudget.mu.Unlock()

	return jsonUnmarshal(body, out)
}

// httpGetWithRetry honors Retry-After on 429, with exponential backoff if the
// upstream omits the header. Returns the raw body on success.
func httpGetWithRetry(url string, maxRetries int) ([]byte, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	delay := 500 * time.Millisecond
	for attempt := 0; attempt <= maxRetries; attempt++ {
		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			return nil, fmt.Errorf("build request: %w", err)
		}
		req.Header.Set("User-Agent", "demo-pm-seeder/0.1")
		req.Header.Set("Accept", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("get: %w", err)
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			retryAfter := delay
			if h := resp.Header.Get("Retry-After"); h != "" {
				if secs, perr := strconv.Atoi(h); perr == nil && secs > 0 && secs < 120 {
					retryAfter = time.Duration(secs) * time.Second
				}
			}
			resp.Body.Close()
			if attempt == maxRetries {
				return nil, fmt.Errorf("rate limited after %d retries", maxRetries)
			}
			time.Sleep(retryAfter)
			delay *= 2
			continue
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			body, _ := readAllLimited(resp.Body, 1024)
			resp.Body.Close()
			return nil, fmt.Errorf("status %d: %s", resp.StatusCode, string(body))
		}

		body, err := readAllLimited(resp.Body, 8<<20)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("read body: %w", err)
		}
		return body, nil
	}
	return nil, errors.New("unreachable")
}

// resetBudget clears per-source counts and the response cache. Used by tests
// and by sync runs that want to start with a fresh budget.
func resetBudget() {
	globalBudget.mu.Lock()
	defer globalBudget.mu.Unlock()
	globalBudget.counts = map[string]int{}
	globalBudget.cache = map[string]cachedResponse{}
}

// requestCount returns how many requests have been made against a source so
// far this process. Test helper.
func requestCount(source string) int {
	globalBudget.mu.Lock()
	defer globalBudget.mu.Unlock()
	return globalBudget.counts[source]
}
