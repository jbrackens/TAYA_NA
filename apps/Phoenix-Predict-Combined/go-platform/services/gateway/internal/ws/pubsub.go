package ws

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Publisher fans WebSocket broadcasts out to all gateway replicas via a
// shared bus. The contract is intentionally narrow:
//
//   - Publish is called from the hub goroutine for every Broadcast that needs
//     cross-replica delivery. It must be safe for concurrent use.
//   - Subscribe is called once during hub startup. The implementation MUST
//     loop on the subscription, calling onMessage for every received envelope,
//     and MUST tolerate transient Redis errors with a backoff reconnect.
//
// Failure semantics: Publish should return an error on transient failures;
// the hub falls back to local-only fanout so the originating instance's own
// clients still see the update. Subscribe should never return except on
// context cancellation — it must internally retry forever.
type Publisher interface {
	Publish(ctx context.Context, channel string, message []byte) error
	Subscribe(ctx context.Context, onMessage func(channel string, message []byte)) error
	Close() error
}

// RedisPublisher is a Publisher backed by Redis pubsub. It uses pattern
// subscription (PSUBSCRIBE prefix:*) so a single goroutine handles every
// hub channel without explicit per-channel SUBSCRIBE calls.
type RedisPublisher struct {
	client *redis.Client
	prefix string

	// closeCtx/closeCancel let Close() stop an in-progress Subscribe
	// reconnect loop. Without this, Close() returns while the loop
	// keeps issuing PSubscribe calls forever.
	closeCtx    context.Context
	closeCancel context.CancelFunc

	mu     sync.Mutex
	closed bool
	ps     *redis.PubSub
}

// NewRedisPublisher creates a Redis-backed Publisher. prefix is a string
// prepended to every channel name (e.g. "ws:gateway") so multiple environments
// or applications can share a Redis instance without crosstalk.
func NewRedisPublisher(client *redis.Client, prefix string) *RedisPublisher {
	if prefix == "" {
		prefix = "ws"
	}
	closeCtx, closeCancel := context.WithCancel(context.Background())
	return &RedisPublisher{
		client:      client,
		prefix:      strings.TrimRight(prefix, ":"),
		closeCtx:    closeCtx,
		closeCancel: closeCancel,
	}
}

// Publish sends a message to the shared bus. Every replica's Subscribe loop
// will receive it and fan out to its locally-connected clients.
func (r *RedisPublisher) Publish(ctx context.Context, channel string, message []byte) error {
	r.mu.Lock()
	closed := r.closed
	r.mu.Unlock()
	if closed {
		return errors.New("ws redis publisher: closed")
	}
	full := r.prefix + ":" + channel
	return r.client.Publish(ctx, full, message).Err()
}

// Subscribe enters a loop that delivers every received pubsub message to
// onMessage. Reconnects on transient errors with bounded backoff. Returns
// only when ctx is cancelled OR Close() is called on the publisher.
func (r *RedisPublisher) Subscribe(ctx context.Context, onMessage func(channel string, message []byte)) error {
	// Combine caller's ctx with our own closeCtx so Close() unblocks the
	// reconnect loop without forcing the caller to cancel ctx.
	subCtx, subCancel := context.WithCancel(ctx)
	defer subCancel()
	go func() {
		select {
		case <-r.closeCtx.Done():
			subCancel()
		case <-subCtx.Done():
		}
	}()
	ctx = subCtx

	pattern := r.prefix + ":*"
	backoff := time.Second
	const maxBackoff = 30 * time.Second

	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		ps := r.client.PSubscribe(ctx, pattern)
		// PSubscribe is lazy — Receive forces the round-trip and surfaces
		// connection errors before we start consuming.
		if _, err := ps.Receive(ctx); err != nil {
			_ = ps.Close()
			if ctx.Err() != nil {
				return ctx.Err()
			}
			slog.Error("ws redis publisher: PSUBSCRIBE failed, retrying",
				"pattern", pattern, "error", err, "backoff", backoff)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
			if backoff < maxBackoff {
				backoff *= 2
				if backoff > maxBackoff {
					backoff = maxBackoff
				}
			}
			continue
		}
		// Subscription healthy — reset backoff and pull messages until the
		// channel closes (which only happens on disconnect or ctx cancel).
		r.mu.Lock()
		r.ps = ps
		r.mu.Unlock()
		backoff = time.Second
		slog.Info("ws redis publisher: subscribed", "pattern", pattern)

		ch := ps.Channel()
		drained := false
		for !drained {
			select {
			case <-ctx.Done():
				_ = ps.Close()
				return ctx.Err()
			case msg, ok := <-ch:
				if !ok {
					drained = true
					break
				}
				// Strip the prefix so onMessage sees the original channel name.
				name := msg.Channel
				if strings.HasPrefix(name, r.prefix+":") {
					name = name[len(r.prefix)+1:]
				}
				onMessage(name, []byte(msg.Payload))
			}
		}
		_ = ps.Close()
		slog.Warn("ws redis publisher: subscription dropped, reconnecting", "pattern", pattern)
	}
}

// Close releases the underlying subscription if any and cancels any
// in-flight Subscribe loop. Idempotent.
func (r *RedisPublisher) Close() error {
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		return nil
	}
	r.closed = true
	ps := r.ps
	r.ps = nil
	r.mu.Unlock()

	r.closeCancel()
	if ps != nil {
		return ps.Close()
	}
	return nil
}

