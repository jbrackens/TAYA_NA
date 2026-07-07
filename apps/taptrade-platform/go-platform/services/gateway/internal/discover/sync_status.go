package discover

import (
	"sync/atomic"
	"time"
)

// SyncStatus is the sanitized, publicly-exposable outcome of the most recent
// catalog sync run. Per the compliance note at the top of sync.go, upstream
// venue names must never surface here — counts and timestamps only. Wired
// into GET /api/v1/status so a silently failing sync (2026-07-07 budget
// incident) is observable from outside the box.
type SyncStatus struct {
	LastRunAt   time.Time `json:"lastRunAt"`
	OK          bool      `json:"ok"`
	Created     int       `json:"created"`
	Updated     int       `json:"updated"`
	FetchErrors int       `json:"fetchErrors"`
}

var lastSyncStatus atomic.Pointer[SyncStatus]

// RecordSyncStatus stores the outcome of a sync run for status reporting.
func RecordSyncStatus(s SyncStatus) {
	lastSyncStatus.Store(&s)
}

// LastSyncStatus returns the most recent recorded sync outcome, or nil if no
// run has completed since boot.
func LastSyncStatus() *SyncStatus {
	return lastSyncStatus.Load()
}
