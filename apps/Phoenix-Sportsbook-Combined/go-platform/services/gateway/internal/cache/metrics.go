package cache

import (
	"fmt"
	"sort"
	"sync"
	"time"
)

// CacheMetric represents metrics for a single cache operation
type CacheMetric struct {
	Entity     string
	Hits       int64
	Misses     int64
	Errors     int64
	HitRate    float64
	LastUpdate string
}

// CacheMetrics tracks cache hit/miss/error statistics
type CacheMetrics struct {
	mu      sync.RWMutex
	metrics map[string]*CacheMetric
}

// NewCacheMetrics creates a new metrics tracker
func NewCacheMetrics() *CacheMetrics {
	return &CacheMetrics{
		metrics: make(map[string]*CacheMetric),
	}
}

// RecordHit records a cache hit
func (m *CacheMetrics) RecordHit(entity string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	metric := m.getOrCreateMetric(entity)
	metric.Hits++
	metric.LastUpdate = time.Now().UTC().Format(time.RFC3339Nano)
	m.updateHitRate(metric)
}

// RecordMiss records a cache miss
func (m *CacheMetrics) RecordMiss(entity string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	metric := m.getOrCreateMetric(entity)
	metric.Misses++
	metric.LastUpdate = time.Now().UTC().Format(time.RFC3339Nano)
	m.updateHitRate(metric)
}

// RecordError records a cache error
func (m *CacheMetrics) RecordError(entity string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	metric := m.getOrCreateMetric(entity)
	metric.Errors++
	metric.LastUpdate = time.Now().UTC().Format(time.RFC3339Nano)
}

// Snapshot returns a snapshot of all metrics
func (m *CacheMetrics) Snapshot() []CacheMetric {
	m.mu.RLock()
	defer m.mu.RUnlock()

	out := make([]CacheMetric, 0, len(m.metrics))
	for _, metric := range m.metrics {
		out = append(out, *metric)
	}

	sort.Slice(out, func(i, j int) bool {
		return out[i].Entity < out[j].Entity
	})

	return out
}

// GetMetric returns metrics for a specific entity
func (m *CacheMetrics) GetMetric(entity string) (CacheMetric, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	metric, ok := m.metrics[entity]
	if !ok {
		return CacheMetric{}, false
	}

	return *metric, true
}

// Reset clears all metrics
func (m *CacheMetrics) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.metrics = make(map[string]*CacheMetric)
}

// FormatPrometheus returns metrics in Prometheus format
func (m *CacheMetrics) FormatPrometheus() string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	out := "# HELP gateway_cache_hits_total Total cache hits.\n"
	out += "# TYPE gateway_cache_hits_total counter\n"
	out += "# HELP gateway_cache_misses_total Total cache misses.\n"
	out += "# TYPE gateway_cache_misses_total counter\n"
	out += "# HELP gateway_cache_errors_total Total cache errors.\n"
	out += "# TYPE gateway_cache_errors_total counter\n"
	out += "# HELP gateway_cache_hit_rate Current cache hit rate.\n"
	out += "# TYPE gateway_cache_hit_rate gauge\n"

	for _, metric := range m.metrics {
		labels := fmt.Sprintf(`entity="%s"`, metric.Entity)
		out += fmt.Sprintf("gateway_cache_hits_total{%s} %d\n", labels, metric.Hits)
		out += fmt.Sprintf("gateway_cache_misses_total{%s} %d\n", labels, metric.Misses)
		out += fmt.Sprintf("gateway_cache_errors_total{%s} %d\n", labels, metric.Errors)
		out += fmt.Sprintf("gateway_cache_hit_rate{%s} %.4f\n", labels, metric.HitRate)
	}

	return out
}

func (m *CacheMetrics) getOrCreateMetric(entity string) *CacheMetric {
	if metric, ok := m.metrics[entity]; ok {
		return metric
	}

	metric := &CacheMetric{
		Entity:     entity,
		LastUpdate: time.Now().UTC().Format(time.RFC3339Nano),
	}
	m.metrics[entity] = metric
	return metric
}

func (m *CacheMetrics) updateHitRate(metric *CacheMetric) {
	total := metric.Hits + metric.Misses
	if total == 0 {
		metric.HitRate = 0
	} else {
		metric.HitRate = float64(metric.Hits) / float64(total)
	}
}
