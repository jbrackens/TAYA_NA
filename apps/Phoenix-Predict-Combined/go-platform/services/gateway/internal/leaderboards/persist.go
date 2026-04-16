package leaderboards

import (
	"encoding/json"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

// StartAutoSave begins a background goroutine that persists state every interval.
func (s *Service) StartAutoSave(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			s.mu.RLock()
			s.saveToDisk()
			s.mu.RUnlock()
		}
	}()
}

type leaderboardSnapshot struct {
	Definitions         map[string]canonicalv1.LeaderboardDefinition `json:"definitions"`
	EventsByLeaderboard map[string][]canonicalv1.LeaderboardEvent    `json:"eventsByLeaderboard"`
	EventByIdempotency  map[string]canonicalv1.LeaderboardEvent      `json:"eventByIdempotency"`
	LeaderboardSequence int64                                        `json:"leaderboardSequence"`
	EventSequence       int64                                        `json:"eventSequence"`
}

// SetStatePath configures file-backed persistence. Call before any mutations.
func (s *Service) SetStatePath(path string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.statePath = path
}

func (s *Service) saveToDisk() {
	if s.statePath == "" {
		return
	}
	snap := leaderboardSnapshot{
		Definitions:         s.definitions,
		EventsByLeaderboard: s.eventsByLeaderboard,
		EventByIdempotency:  s.eventByIdempotency,
		LeaderboardSequence: s.leaderboardSequence,
		EventSequence:       s.eventSequence,
	}
	data, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		slog.Warn("leaderboards: failed to marshal snapshot", "error", err)
		return
	}
	dir := filepath.Dir(s.statePath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		slog.Warn("leaderboards: failed to create state dir", "error", err)
		return
	}
	if err := os.WriteFile(s.statePath, data, 0o644); err != nil {
		slog.Warn("leaderboards: failed to write snapshot", "error", err)
	}
}

func (s *Service) loadFromDisk() error {
	if s.statePath == "" {
		return nil
	}
	data, err := os.ReadFile(s.statePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	var snap leaderboardSnapshot
	if err := json.Unmarshal(data, &snap); err != nil {
		return err
	}
	if snap.Definitions != nil {
		s.definitions = snap.Definitions
	}
	if snap.EventsByLeaderboard != nil {
		s.eventsByLeaderboard = snap.EventsByLeaderboard
	}
	if snap.EventByIdempotency != nil {
		s.eventByIdempotency = snap.EventByIdempotency
	}
	s.leaderboardSequence = snap.LeaderboardSequence
	s.eventSequence = snap.EventSequence
	slog.Info("leaderboards: loaded definitions from snapshot", "count", len(s.definitions))
	return nil
}
