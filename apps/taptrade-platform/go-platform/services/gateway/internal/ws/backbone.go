package ws

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"sync/atomic"

	"github.com/redis/go-redis/v9"
)

// Backbone is the cross-instance event plane for the WebSocket hub (audit
// ARCH-01, P2-07). It carries hub broadcasts to OTHER gateway instances so a
// trade matched on instance A reaches subscribers connected to instance B.
//
// Design that satisfies all three plan requirements — single-instance
// behaviour unchanged, cross-instance delivery, AND "Redis down → local-only
// degraded, never crash": the hub fans out its OWN broadcasts locally and
// directly (never through the backbone, so local delivery is independent of
// Redis), and additionally Publishes them to the backbone for other instances.
// The backbone therefore delivers ONLY messages that originated elsewhere —
// each publisher tags its messages and subscribers skip their own echoes
// (Redis returns a PUBLISH to the publisher too).
//
//   - LocalBackbone (default, zero-config dev): Publish is a no-op and
//     Subscribe never delivers — there are no other instances, so the hub's
//     direct local fan-out is the whole path. Identical to the pre-backbone
//     gateway.
//   - RedisBackbone (multi-instance): Publish PUBLISHes (tagged); Subscribe
//     delivers other instances' messages. A Redis failure logs + flips
//     Healthy() false; the hub's local fan-out already happened, so local
//     clients are unaffected. Flag-gate WS_BACKBONE=redis|local.
type Backbone interface {
	// Publish sends a hub broadcast to OTHER instances. It must not be relied
	// on for local delivery (the hub fans out locally itself).
	Publish(ctx context.Context, msg BackboneMessage) error
	// Subscribe streams broadcasts that originated on other instances; the
	// channel closes when ctx is cancelled.
	Subscribe(ctx context.Context) (<-chan BackboneMessage, error)
	// Healthy reports whether cross-instance delivery is working (false =
	// degraded/local-only); surfaced in /readyz detail.
	Healthy() bool
	Close() error
}

// BackboneMessage is one fan-out unit: the logical channel (e.g. "market:<id>")
// and the raw payload the hub delivers to that channel's local subscribers.
type BackboneMessage struct {
	Channel string
	Payload []byte
}

// --- in-process default (zero-config dev, single instance) ---

// LocalBackbone is the default: no other instances exist, so Publish is a no-op
// and Subscribe never delivers. The hub's direct local fan-out is the sole
// delivery path — behaviour identical to the pre-backbone gateway.
type LocalBackbone struct{}

func NewLocalBackbone() *LocalBackbone { return &LocalBackbone{} }

func (*LocalBackbone) Publish(context.Context, BackboneMessage) error { return nil }

func (*LocalBackbone) Subscribe(ctx context.Context) (<-chan BackboneMessage, error) {
	ch := make(chan BackboneMessage)
	go func() {
		<-ctx.Done()
		close(ch)
	}()
	return ch, nil
}

func (*LocalBackbone) Healthy() bool { return true }
func (*LocalBackbone) Close() error  { return nil }

// --- Redis pub/sub (multi-instance) ---

const redisBackboneChannel = "ws:events"

// wireMessage tags each message with the publishing instance's id so a
// subscriber can skip its own echoes (the hub already fanned those out locally).
type wireMessage struct {
	Instance string `json:"i"`
	Channel  string `json:"c"`
	Payload  []byte `json:"p"`
}

// RedisBackbone fans hub broadcasts to other instances over one Redis pub/sub
// channel. Safe for concurrent use.
type RedisBackbone struct {
	client   *redis.Client
	instance string
	healthy  atomic.Bool
}

func NewRedisBackbone(client *redis.Client) *RedisBackbone {
	b := &RedisBackbone{client: client, instance: randomInstanceID()}
	b.healthy.Store(true)
	return b
}

func (b *RedisBackbone) Publish(ctx context.Context, msg BackboneMessage) error {
	data, err := json.Marshal(wireMessage{Instance: b.instance, Channel: msg.Channel, Payload: msg.Payload})
	if err != nil {
		return err
	}
	if err := b.client.Publish(ctx, redisBackboneChannel, data).Err(); err != nil {
		b.healthy.Store(false)
		return err
	}
	b.healthy.Store(true)
	return nil
}

func (b *RedisBackbone) Subscribe(ctx context.Context) (<-chan BackboneMessage, error) {
	sub := b.client.Subscribe(ctx, redisBackboneChannel)
	out := make(chan BackboneMessage, 256)
	go func() {
		defer close(out)
		defer func() { _ = sub.Close() }()
		in := sub.Channel()
		for {
			select {
			case <-ctx.Done():
				return
			case rm, ok := <-in:
				if !ok {
					return
				}
				var wm wireMessage
				if err := json.Unmarshal([]byte(rm.Payload), &wm); err != nil {
					slog.Warn("ws backbone: dropping malformed message", "error", err)
					continue
				}
				if wm.Instance == b.instance {
					continue // our own echo — local fan-out already delivered it
				}
				select {
				case out <- BackboneMessage{Channel: wm.Channel, Payload: wm.Payload}:
				default: // hub not draining — drop (PERF-03 policy)
				}
			}
		}
	}()
	return out, nil
}

func (b *RedisBackbone) Healthy() bool { return b.healthy.Load() }
func (b *RedisBackbone) Close() error  { return b.client.Close() }

func randomInstanceID() string {
	var buf [8]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "instance"
	}
	return hex.EncodeToString(buf[:])
}
