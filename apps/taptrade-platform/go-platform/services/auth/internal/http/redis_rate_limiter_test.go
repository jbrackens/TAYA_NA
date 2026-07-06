package http

import (
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestRedisRateLimiterAllowsUnderLimit(t *testing.T) {
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	rl := newRedisRateLimiter(client, "test")

	for i := 0; i < 5; i++ {
		if !rl.Allow("key1", 5, time.Minute) {
			t.Fatalf("expected allow on attempt %d", i+1)
		}
	}
}

func TestRedisRateLimiterBlocksOverLimit(t *testing.T) {
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	rl := newRedisRateLimiter(client, "test")

	for i := 0; i < 3; i++ {
		rl.Allow("key2", 3, time.Minute)
	}

	if rl.Allow("key2", 3, time.Minute) {
		t.Fatal("expected block after exceeding limit")
	}
}

func TestRedisRateLimiterResetsAfterWindow(t *testing.T) {
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	rl := newRedisRateLimiter(client, "test")

	for i := 0; i < 3; i++ {
		rl.Allow("key3", 3, 2*time.Second)
	}

	// Advance miniredis past the window
	mr.FastForward(3 * time.Second)

	if !rl.Allow("key3", 3, 2*time.Second) {
		t.Fatal("expected allow after window reset")
	}
}

func TestRedisLockoutTrackerLocksAfterFailures(t *testing.T) {
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	lt := newRedisLockoutTracker(client)

	if lt.IsLocked("user1") {
		t.Fatal("should not be locked initially")
	}

	for i := 0; i < maxFailedAttempts; i++ {
		lt.RecordFailure("user1")
	}

	if !lt.IsLocked("user1") {
		t.Fatal("should be locked after max failures")
	}
}

func TestRedisLockoutTrackerClearsOnSuccess(t *testing.T) {
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	lt := newRedisLockoutTracker(client)

	for i := 0; i < maxFailedAttempts; i++ {
		lt.RecordFailure("user2")
	}

	lt.ClearFailures("user2")

	if lt.IsLocked("user2") {
		t.Fatal("should not be locked after clearing failures")
	}
}

func TestRedisLockoutTrackerUnlocksAfterDuration(t *testing.T) {
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	lt := newRedisLockoutTracker(client)

	for i := 0; i < maxFailedAttempts; i++ {
		lt.RecordFailure("user3")
	}

	mr.FastForward(lockoutDuration + time.Second)

	if lt.IsLocked("user3") {
		t.Fatal("should not be locked after duration expires")
	}
}
