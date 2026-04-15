package http

import "time"

// RateLimiterBackend abstracts rate limiting to allow in-memory (dev) or
// Redis-backed (production, multi-instance) implementations.
type RateLimiterBackend interface {
	// Allow checks whether key is within the rate limit. Returns true and
	// records the attempt if under the limit; returns false if at or over.
	Allow(key string, limit int, window time.Duration) bool
}

// LockoutBackend abstracts account lockout tracking.
type LockoutBackend interface {
	// IsLocked returns true if the given username is currently locked out.
	IsLocked(username string) bool
	// RecordFailure records a failed login attempt. Triggers lockout when
	// the threshold is reached within the failure window.
	RecordFailure(username string)
	// ClearFailures clears all failure history for the username (called on
	// successful login).
	ClearFailures(username string)
}
