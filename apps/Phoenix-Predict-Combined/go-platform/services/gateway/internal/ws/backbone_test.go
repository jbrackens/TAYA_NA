package ws

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

// TestLocalBackboneIsNoop: the in-process default delivers nothing through the
// backbone (the hub fans out locally itself), so single-instance behaviour is
// unchanged.
func TestLocalBackboneIsNoop(t *testing.T) {
	b := NewLocalBackbone()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := b.Publish(ctx, BackboneMessage{Channel: "market:1", Payload: []byte("x")}); err != nil {
		t.Fatalf("local publish should be a no-op, got: %v", err)
	}
	ch, err := b.Subscribe(ctx)
	if err != nil {
		t.Fatalf("local subscribe: %v", err)
	}
	select {
	case m, ok := <-ch:
		if ok {
			t.Fatalf("local backbone delivered %+v; it must never deliver", m)
		}
	case <-time.After(150 * time.Millisecond):
		// expected — nothing delivered
	}
	if !b.Healthy() {
		t.Fatal("local backbone should report healthy")
	}
}

// TestRedisBackboneCrossInstance: a publish on instance A reaches instance B's
// subscriber, and A does NOT receive its own echo (the hub already fanned that
// out locally). The cross-instance ARCH-01 / P2-07 acceptance at the backbone
// layer, plus the degraded-mode invariant (local delivery never depends on the
// backbone echo).
func TestRedisBackboneCrossInstance(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	defer mr.Close()

	newBB := func() *RedisBackbone {
		return NewRedisBackbone(redis.NewClient(&redis.Options{Addr: mr.Addr()}))
	}
	a := newBB()
	b := newBB()
	defer a.Close()
	defer b.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	aCh, err := a.Subscribe(ctx)
	if err != nil {
		t.Fatalf("a subscribe: %v", err)
	}
	bCh, err := b.Subscribe(ctx)
	if err != nil {
		t.Fatalf("b subscribe: %v", err)
	}
	time.Sleep(100 * time.Millisecond) // let SUBSCRIBE register before PUBLISH

	if err := a.Publish(ctx, BackboneMessage{Channel: "market:42", Payload: []byte("hello")}); err != nil {
		t.Fatalf("publish: %v", err)
	}

	// B (the other instance) must receive it.
	select {
	case m := <-bCh:
		if m.Channel != "market:42" || string(m.Payload) != "hello" {
			t.Fatalf("B received wrong message: %+v", m)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("B did not receive A's cross-instance publish")
	}

	// A (the publisher) must NOT receive its own echo.
	select {
	case m := <-aCh:
		t.Fatalf("A received its own echo %+v; publisher echoes must be skipped", m)
	case <-time.After(300 * time.Millisecond):
		// expected — self-echo skipped
	}

	if !a.Healthy() {
		t.Fatal("redis backbone should be healthy after a successful publish")
	}
}
