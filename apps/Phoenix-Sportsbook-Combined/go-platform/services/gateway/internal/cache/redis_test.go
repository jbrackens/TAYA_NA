package cache

import (
	"context"
	"testing"
	"time"
)

func TestRedisClientSetAndGet(t *testing.T) {
	redis, err := NewRedisClient("localhost:6379")
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redis.Close()

	// Clean up test key
	ctx := context.Background()
	redis.Delete(ctx, "test:key")

	// Test data
	testData := map[string]string{
		"name": "test",
		"id":   "123",
	}

	// Set value
	err = redis.Set(ctx, "test:key", testData, 10*time.Second)
	if err != nil {
		t.Fatalf("failed to set value: %v", err)
	}

	// Get value
	var retrieved map[string]string
	err = redis.Get(ctx, "test:key", &retrieved)
	if err != nil {
		t.Fatalf("failed to get value: %v", err)
	}

	if retrieved["name"] != "test" || retrieved["id"] != "123" {
		t.Errorf("retrieved value mismatch: %v", retrieved)
	}

	// Clean up
	redis.Delete(ctx, "test:key")
}

func TestRedisClientCacheMiss(t *testing.T) {
	redis, err := NewRedisClient("localhost:6379")
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redis.Close()

	ctx := context.Background()
	var retrieved map[string]string

	// Try to get non-existent key
	err = redis.Get(ctx, "non:existent:key", &retrieved)
	if err != ErrCacheMiss {
		t.Errorf("expected ErrCacheMiss, got %v", err)
	}
}

func TestRedisClientDelete(t *testing.T) {
	redis, err := NewRedisClient("localhost:6379")
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redis.Close()

	ctx := context.Background()
	testData := map[string]string{"test": "data"}

	// Set value
	err = redis.Set(ctx, "test:delete", testData, 10*time.Second)
	if err != nil {
		t.Fatalf("failed to set value: %v", err)
	}

	// Verify it's there
	var retrieved map[string]string
	err = redis.Get(ctx, "test:delete", &retrieved)
	if err != nil {
		t.Fatalf("value should exist before delete: %v", err)
	}

	// Delete it
	err = redis.Delete(ctx, "test:delete")
	if err != nil {
		t.Fatalf("failed to delete: %v", err)
	}

	// Verify it's gone
	err = redis.Get(ctx, "test:delete", &retrieved)
	if err != ErrCacheMiss {
		t.Errorf("expected ErrCacheMiss after delete, got %v", err)
	}
}

func TestRedisClientComplexTypes(t *testing.T) {
	redis, err := NewRedisClient("localhost:6379")
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redis.Close()

	ctx := context.Background()
	redis.Delete(ctx, "test:complex")

	// Test with nested struct
	type TestStruct struct {
		ID        string
		Count     int
		Active    bool
		Items     []string
		Metadata  map[string]interface{}
	}

	original := TestStruct{
		ID:     "123",
		Count:  42,
		Active: true,
		Items:  []string{"a", "b", "c"},
		Metadata: map[string]interface{}{
			"key1": "value1",
			"key2": 99,
		},
	}

	// Set
	err = redis.Set(ctx, "test:complex", original, 10*time.Second)
	if err != nil {
		t.Fatalf("failed to set complex type: %v", err)
	}

	// Get
	var retrieved TestStruct
	err = redis.Get(ctx, "test:complex", &retrieved)
	if err != nil {
		t.Fatalf("failed to get complex type: %v", err)
	}

	if retrieved.ID != original.ID || retrieved.Count != original.Count {
		t.Errorf("retrieved data mismatch: %v", retrieved)
	}

	redis.Delete(ctx, "test:complex")
}

func TestRedisClientTTL(t *testing.T) {
	redis, err := NewRedisClient("localhost:6379")
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redis.Close()

	ctx := context.Background()
	testData := map[string]string{"test": "data"}

	// Set with very short TTL
	err = redis.Set(ctx, "test:ttl", testData, 1*time.Second)
	if err != nil {
		t.Fatalf("failed to set: %v", err)
	}

	// Should exist immediately
	var retrieved map[string]string
	err = redis.Get(ctx, "test:ttl", &retrieved)
	if err != nil {
		t.Fatalf("value should exist: %v", err)
	}

	// Wait for expiration
	time.Sleep(1500 * time.Millisecond)

	// Should be expired
	err = redis.Get(ctx, "test:ttl", &retrieved)
	if err != ErrCacheMiss {
		t.Errorf("expected ErrCacheMiss after TTL expiration, got %v", err)
	}
}

func TestRedisClientDeleteMultiple(t *testing.T) {
	redis, err := NewRedisClient("localhost:6379")
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redis.Close()

	ctx := context.Background()
	testData := map[string]string{"test": "data"}

	// Set multiple keys
	redis.Set(ctx, "test:del:1", testData, 10*time.Second)
	redis.Set(ctx, "test:del:2", testData, 10*time.Second)
	redis.Set(ctx, "test:del:3", testData, 10*time.Second)

	// Delete all at once
	err = redis.Delete(ctx, "test:del:1", "test:del:2", "test:del:3")
	if err != nil {
		t.Fatalf("failed to delete multiple keys: %v", err)
	}

	// Verify all are gone
	var retrieved map[string]string
	for i := 1; i <= 3; i++ {
		key := "test:del:" + string(rune(48+i))
		err = redis.Get(ctx, key, &retrieved)
		if err != ErrCacheMiss {
			t.Errorf("expected ErrCacheMiss for key %s, got %v", key, err)
		}
	}
}
