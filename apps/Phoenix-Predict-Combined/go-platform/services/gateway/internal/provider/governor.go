package provider

import (
	"context"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	defaultRateLimitRPS   = 20.0
	defaultRateLimitBurst = 5.0
)

type RateGovernor struct {
	enabled bool
	rps     float64
	burst   float64

	mu     sync.Mutex
	states map[string]rateBucketState
}

type rateBucketState struct {
	tokens float64
	last   time.Time
}

func NewRateGovernor(enabled bool, rps float64, burst float64) *RateGovernor {
	if rps <= 0 {
		rps = defaultRateLimitRPS
	}
	if burst < 1 {
		burst = defaultRateLimitBurst
	}
	return &RateGovernor{
		enabled: enabled,
		rps:     rps,
		burst:   burst,
		states:  map[string]rateBucketState{},
	}
}

func NewRateGovernorFromEnv(getenv func(string) string) *RateGovernor {
	if getenv == nil {
		return NewRateGovernor(true, defaultRateLimitRPS, defaultRateLimitBurst)
	}
	enabled := true
	if raw := strings.TrimSpace(getenv("GATEWAY_PROVIDER_RATE_LIMIT_ENABLED")); raw != "" {
		enabled = strings.EqualFold(raw, "true")
	}
	rps := parseFloatOrDefault(getenv("GATEWAY_PROVIDER_RATE_LIMIT_RPS"), defaultRateLimitRPS)
	burst := parseFloatOrDefault(getenv("GATEWAY_PROVIDER_RATE_LIMIT_BURST"), defaultRateLimitBurst)
	return NewRateGovernor(enabled, rps, burst)
}

func (g *RateGovernor) Wait(ctx context.Context, key string) (time.Duration, error) {
	if g == nil || !g.enabled {
		return 0, nil
	}

	started := time.Now()
	bucketKey := strings.TrimSpace(strings.ToLower(key))
	if bucketKey == "" {
		bucketKey = "global"
	}

	for {
		waitFor := g.reserve(bucketKey, time.Now())
		if waitFor <= 0 {
			return time.Since(started), nil
		}

		timer := time.NewTimer(waitFor)
		select {
		case <-ctx.Done():
			if !timer.Stop() {
				<-timer.C
			}
			return time.Since(started), ctx.Err()
		case <-timer.C:
		}
	}
}

func (g *RateGovernor) reserve(key string, now time.Time) time.Duration {
	g.mu.Lock()
	defer g.mu.Unlock()

	state, exists := g.states[key]
	if !exists {
		state = rateBucketState{
			tokens: g.burst,
			last:   now,
		}
	}

	elapsed := now.Sub(state.last).Seconds()
	if elapsed > 0 {
		state.tokens += elapsed * g.rps
		if state.tokens > g.burst {
			state.tokens = g.burst
		}
	}
	state.last = now

	if state.tokens >= 1 {
		state.tokens -= 1
		g.states[key] = state
		return 0
	}

	needed := (1 - state.tokens) / g.rps
	if needed < 0 {
		needed = 0
	}
	g.states[key] = state
	return time.Duration(needed * float64(time.Second))
}

func (g *RateGovernor) Enabled() bool {
	return g != nil && g.enabled
}

func parseFloatOrDefault(raw string, fallback float64) float64 {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return fallback
	}
	value, err := strconv.ParseFloat(trimmed, 64)
	if err != nil {
		return fallback
	}
	return value
}
