package replay

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

var (
	ErrCheckpointNotFound = errors.New("checkpoint not found")
	ErrReplayApplyFailed  = errors.New("replay apply failed")
)

type Checkpoint struct {
	Adapter   string                 `json:"adapter"`
	Stream    canonicalv1.StreamType `json:"stream"`
	Revision  int64                  `json:"revision"`
	Sequence  int64                  `json:"sequence"`
	UpdatedAt time.Time              `json:"updatedAt"`
}

type Store interface {
	Get(adapter string, stream canonicalv1.StreamType) (Checkpoint, error)
	Save(checkpoint Checkpoint) error
}

type ApplyFunc func(ctx context.Context, event canonicalv1.Envelope) error

type ReplayResult struct {
	Applied        int        `json:"applied"`
	Skipped        int        `json:"skipped"`
	LastCheckpoint Checkpoint `json:"lastCheckpoint"`
}

type Engine struct {
	store Store
	now   func() time.Time
}

func NewEngine(store Store) *Engine {
	return &Engine{
		store: store,
		now:   func() time.Time { return time.Now().UTC() },
	}
}

func (e *Engine) Checkpoint(adapter string, stream canonicalv1.StreamType) (Checkpoint, error) {
	adapterKey := strings.TrimSpace(strings.ToLower(adapter))
	if adapterKey == "" {
		return Checkpoint{}, fmt.Errorf("%w: adapter is required", ErrReplayApplyFailed)
	}
	if strings.TrimSpace(string(stream)) == "" {
		return Checkpoint{}, fmt.Errorf("%w: stream is required", ErrReplayApplyFailed)
	}
	return e.store.Get(adapterKey, stream)
}

func (e *Engine) Replay(
	ctx context.Context,
	adapter string,
	stream canonicalv1.StreamType,
	events []canonicalv1.Envelope,
	apply ApplyFunc,
) (ReplayResult, error) {
	adapterKey := strings.TrimSpace(strings.ToLower(adapter))
	if adapterKey == "" {
		return ReplayResult{}, fmt.Errorf("%w: adapter is required", ErrReplayApplyFailed)
	}
	if strings.TrimSpace(string(stream)) == "" {
		return ReplayResult{}, fmt.Errorf("%w: stream is required", ErrReplayApplyFailed)
	}
	if apply == nil {
		return ReplayResult{}, fmt.Errorf("%w: apply function is required", ErrReplayApplyFailed)
	}

	checkpoint, err := e.store.Get(adapterKey, stream)
	if err != nil {
		if !errors.Is(err, ErrCheckpointNotFound) {
			return ReplayResult{}, err
		}
		checkpoint = Checkpoint{
			Adapter:   adapterKey,
			Stream:    stream,
			Revision:  -1,
			Sequence:  -1,
			UpdatedAt: e.now(),
		}
	}

	ordered := append([]canonicalv1.Envelope(nil), events...)
	sort.SliceStable(ordered, func(i, j int) bool {
		if ordered[i].Revision != ordered[j].Revision {
			return ordered[i].Revision < ordered[j].Revision
		}
		return ordered[i].Sequence < ordered[j].Sequence
	})

	result := ReplayResult{
		LastCheckpoint: checkpoint,
	}

	for _, event := range ordered {
		if err := event.Validate(); err != nil {
			return result, fmt.Errorf("%w: invalid event: %v", ErrReplayApplyFailed, err)
		}

		if isBeforeOrEqual(event, result.LastCheckpoint) {
			result.Skipped++
			continue
		}

		if err := apply(ctx, event); err != nil {
			return result, fmt.Errorf("%w: revision=%d sequence=%d err=%v", ErrReplayApplyFailed, event.Revision, event.Sequence, err)
		}

		result.Applied++
		result.LastCheckpoint = Checkpoint{
			Adapter:   adapterKey,
			Stream:    stream,
			Revision:  event.Revision,
			Sequence:  event.Sequence,
			UpdatedAt: e.now(),
		}

		if err := e.store.Save(result.LastCheckpoint); err != nil {
			return result, err
		}
	}

	return result, nil
}

func isBeforeOrEqual(event canonicalv1.Envelope, checkpoint Checkpoint) bool {
	if event.Revision < checkpoint.Revision {
		return true
	}
	if event.Revision == checkpoint.Revision && event.Sequence <= checkpoint.Sequence {
		return true
	}
	return false
}
